#!/usr/bin/env python3
"""
AutoCut Whisper Service
Local HTTP server that provides silence detection using Whisper AI
"""

import os
import sys
import json
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import librosa
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhisperSilenceDetector:
    def __init__(self, model_name: str = "base"):
        """Initialize Whisper model for silence detection"""
        self.model_name = model_name
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load Whisper model"""
        try:
            logger.info(f"Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(self.model_name)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise
    
    def detect_silence(self, audio_path: str, silence_threshold: float = -40.0, 
                      min_duration: float = 0.5) -> List[Dict[str, float]]:
        """
        Detect silence segments in audio file
        
        Args:
            audio_path: Path to audio file
            silence_threshold: Silence threshold in dB
            min_duration: Minimum silence duration in seconds
            
        Returns:
            List of silence segments with start, end, duration
        """
        try:
            logger.info(f"Analyzing audio file: {audio_path}")
            
            # Load audio with librosa
            audio, sr = librosa.load(audio_path, sr=16000)
            logger.info(f"Audio loaded: duration={len(audio)/sr:.2f}s, sample_rate={sr}")
            
            # Convert to dB
            audio_db = librosa.amplitude_to_db(np.abs(audio))
            
            # Find silence segments
            silence_segments = []
            is_silent = audio_db < silence_threshold
            
            # Find continuous silence regions
            silence_start = None
            for i, silent in enumerate(is_silent):
                time = i / sr
                
                if silent and silence_start is None:
                    # Start of silence
                    silence_start = time
                elif not silent and silence_start is not None:
                    # End of silence
                    duration = time - silence_start
                    if duration >= min_duration:
                        silence_segments.append({
                            'start': silence_start,
                            'end': time,
                            'duration': duration,
                            'confidence': 0.9  # High confidence for amplitude-based detection
                        })
                    silence_start = None
            
            # Handle silence at the end
            if silence_start is not None:
                duration = len(audio) / sr - silence_start
                if duration >= min_duration:
                    silence_segments.append({
                        'start': silence_start,
                        'end': len(audio) / sr,
                        'duration': duration,
                        'confidence': 0.9
                    })
            
            logger.info(f"Found {len(silence_segments)} silence segments")
            return silence_segments
            
        except Exception as e:
            logger.error(f"Error detecting silence: {e}")
            raise
    
    def enhanced_silence_detection(self, audio_path: str, silence_threshold: float = -40.0,
                                 min_duration: float = 0.5) -> Dict[str, Any]:
        """
        Enhanced silence detection using Whisper transcription + amplitude analysis
        """
        try:
            # First, use amplitude-based detection
            amplitude_segments = self.detect_silence(audio_path, silence_threshold, min_duration)
            
            # Optionally use Whisper transcription for validation
            # This can help identify pauses in speech vs actual silence
            try:
                result = self.model.transcribe(audio_path)
                transcription_segments = result.get('segments', [])
                
                # Analyze gaps between transcription segments
                whisper_gaps = []
                for i in range(len(transcription_segments) - 1):
                    current_end = transcription_segments[i]['end']
                    next_start = transcription_segments[i + 1]['start']
                    gap_duration = next_start - current_end
                    
                    if gap_duration >= min_duration:
                        whisper_gaps.append({
                            'start': current_end,
                            'end': next_start,
                            'duration': gap_duration,
                            'confidence': 0.8,
                            'type': 'speech_gap'
                        })
                
                # Combine amplitude and Whisper-based detection
                all_segments = amplitude_segments + whisper_gaps
                
                # Remove overlapping segments and sort
                all_segments = self._merge_overlapping_segments(all_segments)
                
            except Exception as e:
                logger.warning(f"Whisper transcription failed, using amplitude-only: {e}")
                all_segments = amplitude_segments
            
            total_duration = librosa.get_duration(filename=audio_path)
            total_silence = sum(seg['duration'] for seg in all_segments)
            
            return {
                'success': True,
                'silenceSegments': all_segments,
                'totalSilenceDuration': total_silence,
                'originalDuration': total_duration,
                'timeSaved': total_silence,
                'method': 'whisper_enhanced'
            }
            
        except Exception as e:
            logger.error(f"Enhanced detection failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _merge_overlapping_segments(self, segments: List[Dict]) -> List[Dict]:
        """Merge overlapping silence segments"""
        if not segments:
            return []
        
        # Sort by start time
        segments.sort(key=lambda x: x['start'])
        
        merged = [segments[0]]
        for current in segments[1:]:
            last = merged[-1]
            
            # Check for overlap or adjacency
            if current['start'] <= last['end']:
                # Merge segments
                merged[-1] = {
                    'start': last['start'],
                    'end': max(last['end'], current['end']),
                    'duration': max(last['end'], current['end']) - last['start'],
                    'confidence': max(last['confidence'], current['confidence'])
                }
            else:
                merged.append(current)
        
        return merged

# Flask application
app = Flask(__name__)
CORS(app)

# Global detector instance
detector = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': detector.model_name if detector else 'not_loaded',
        'version': '1.0.0'
    })

@app.route('/start', methods=['POST'])
def start_service():
    """Start/restart the service"""
    global detector
    try:
        model_name = request.json.get('model', 'base') if request.json else 'base'
        detector = WhisperSilenceDetector(model_name)
        return jsonify({'status': 'started', 'model': model_name})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_audio():
    """Analyze audio for silence detection"""
    global detector
    
    if not detector:
        return jsonify({'success': False, 'error': 'Service not initialized'}), 400
    
    try:
        data = request.json
        audio_path = data.get('audioPath')
        silence_threshold = data.get('silenceThreshold', -40.0)
        min_duration = data.get('minDuration', 500) / 1000.0  # Convert ms to seconds
        
        if not audio_path or not os.path.exists(audio_path):
            return jsonify({'success': False, 'error': 'Invalid audio path'}), 400
        
        # Perform enhanced silence detection
        result = detector.enhanced_silence_detection(
            audio_path, silence_threshold, min_duration
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available Whisper models"""
    return jsonify({
        'models': ['tiny', 'base', 'small', 'medium', 'large'],
        'current': detector.model_name if detector else None
    })

def main():
    parser = argparse.ArgumentParser(description='AutoCut Whisper Service')
    parser.add_argument('--port', type=int, default=8888, help='Port to run the service on')
    parser.add_argument('--host', default='localhost', help='Host to bind the service to')
    parser.add_argument('--model', default='base', help='Whisper model to use')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    # Initialize detector
    global detector
    try:
        detector = WhisperSilenceDetector(args.model)
        logger.info(f"Whisper service starting on {args.host}:{args.port}")
        app.run(host=args.host, port=args.port, debug=args.debug)
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()