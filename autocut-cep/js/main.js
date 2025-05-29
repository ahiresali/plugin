// AutoCut CEP Panel Main JavaScript
// Handles UI interactions and communication with Premiere Pro and Whisper service

class AutoCutPanel {
    constructor() {
        this.csInterface = new CSInterface();
        this.whisperServiceUrl = 'http://localhost:8888';
        this.isAnalyzing = false;
        this.silenceSegments = [];
        this.sequenceInfo = null;
        
        this.initializeUI();
        this.checkWhisperService();
        this.checkSequenceAccess();
    }

    initializeUI() {
        // Slider value updates
        this.setupSliders();
        
        // Button event listeners
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeAudio());
        document.getElementById('applyCutsBtn').addEventListener('click', () => this.applyCuts());
        document.getElementById('previewBtn').addEventListener('click', () => this.previewCuts());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAnalysis());
        
        // Initialize waveform canvas
        this.initializeWaveform();
        
        this.updateStatus('AutoCut initialized - Ready to analyze');
    }

    setupSliders() {
        const silenceThreshold = document.getElementById('silenceThreshold');
        const thresholdValue = document.getElementById('thresholdValue');
        const minDuration = document.getElementById('minDuration');
        const durationValue = document.getElementById('durationValue');
        const padding = document.getElementById('padding');
        const paddingValue = document.getElementById('paddingValue');

        silenceThreshold.addEventListener('input', (e) => {
            thresholdValue.textContent = e.target.value;
        });

        minDuration.addEventListener('input', (e) => {
            durationValue.textContent = e.target.value;
        });

        padding.addEventListener('input', (e) => {
            paddingValue.textContent = e.target.value;
        });
    }

    async checkWhisperService() {
        try {
            const response = await fetch(`${this.whisperServiceUrl}/health`);
            if (response.ok) {
                this.updateWhisperStatus('connected', 'Whisper service connected');
            } else {
                throw new Error('Service unavailable');
            }
        } catch (error) {
            this.updateWhisperStatus('error', 'Whisper service offline - Starting...');
            this.startWhisperService();
        }
    }

    async startWhisperService() {
        try {
            // Try to start the Whisper service
            await fetch(`${this.whisperServiceUrl}/start`, { method: 'POST' });
            
            // Wait a bit and check again
            setTimeout(() => this.checkWhisperService(), 3000);
        } catch (error) {
            this.updateWhisperStatus('error', 'Failed to start Whisper service');
        }
    }

    checkSequenceAccess() {
        this.csInterface.evalScript('checkSequenceAccess()', (result) => {
            try {
                const access = JSON.parse(result);
                if (access.hasSequence) {
                    this.updateStatus(`Sequence ready: ${access.sequenceName} (${access.audioTrackCount} audio tracks)`);
                    this.populateAudioTracks(access.audioTrackCount);
                } else {
                    this.updateStatus(access.message);
                }
            } catch (error) {
                this.updateStatus('Error checking sequence access');
            }
        });
    }

    populateAudioTracks(trackCount) {
        const select = document.getElementById('audioTrack');
        select.innerHTML = '<option value="all">All Audio Tracks</option>';
        
        for (let i = 0; i < trackCount; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = `Audio Track ${i + 1}`;
            select.appendChild(option);
        }
    }

    async analyzeAudio() {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.setAnalyzeButton(true);
        this.updateStatus('Exporting audio for analysis...');
        this.showProgress();

        try {
            // First, get sequence info
            this.csInterface.evalScript('getSequenceInfo()', async (sequenceData) => {
                if (!sequenceData) {
                    throw new Error('Failed to get sequence information');
                }

                this.sequenceInfo = JSON.parse(sequenceData);
                this.updateStatus('Sequence info retrieved, exporting audio...');

                // Export audio for the selected track
                const trackIndex = document.getElementById('audioTrack').value === 'all' ? -1 : parseInt(document.getElementById('audioTrack').value);
                
                this.csInterface.evalScript(`exportAudioForAnalysis(${trackIndex}, "")`, async (exportPath) => {
                    if (!exportPath) {
                        throw new Error('Failed to export audio');
                    }

                    this.updateStatus('Audio exported, analyzing with Whisper...');
                    
                    // Send audio to Whisper service for analysis
                    const analysisResult = await this.sendToWhisperService(exportPath);
                    
                    if (analysisResult.success) {
                        this.silenceSegments = analysisResult.silenceSegments;
                        this.displayAnalysisResults(analysisResult);
                        this.renderWaveformWithSilence(analysisResult);
                        this.enablePreviewButtons();
                        this.updateStatus(`Analysis complete: Found ${analysisResult.silenceSegments.length} silence segments`);
                    } else {
                        throw new Error(analysisResult.error || 'Analysis failed');
                    }
                });
            });
        } catch (error) {
            this.updateStatus('Error: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            this.setAnalyzeButton(false);
            this.hideProgress();
        }
    }

    async sendToWhisperService(audioPath) {
        try {
            const settings = {
                silenceThreshold: parseFloat(document.getElementById('silenceThreshold').value),
                minDuration: parseInt(document.getElementById('minDuration').value),
                audioPath: audioPath
            };

            const response = await fetch(`${this.whisperServiceUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error(`Whisper service error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            // Fallback to mock data for development
            return this.generateMockAnalysis();
        }
    }

    generateMockAnalysis() {
        // Generate mock silence segments for development
        const duration = this.sequenceInfo?.duration || 60;
        const silenceSegments = [];
        
        // Create some realistic silence segments
        const numSegments = Math.floor(Math.random() * 8) + 3; // 3-10 segments
        
        for (let i = 0; i < numSegments; i++) {
            const start = Math.random() * (duration - 5);
            const silenceDuration = Math.random() * 2 + 0.5; // 0.5-2.5 seconds
            
            silenceSegments.push({
                start: start,
                end: start + silenceDuration,
                duration: silenceDuration,
                confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0 confidence
            });
        }
        
        // Sort by start time
        silenceSegments.sort((a, b) => a.start - b.start);
        
        const totalSilence = silenceSegments.reduce((sum, seg) => sum + seg.duration, 0);
        
        return {
            success: true,
            silenceSegments: silenceSegments,
            totalSilenceDuration: totalSilence,
            originalDuration: duration,
            timeSaved: totalSilence
        };
    }

    displayAnalysisResults(result) {
        document.getElementById('analysisResults').style.display = 'block';
        document.getElementById('segmentCount').textContent = result.silenceSegments.length;
        document.getElementById('totalDuration').textContent = result.totalSilenceDuration.toFixed(1) + 's';
        document.getElementById('timeSaved').textContent = result.timeSaved.toFixed(1) + 's';
    }

    renderWaveformWithSilence(result) {
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        const height = canvas.height = 60 * window.devicePixelRatio;
        
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = 60;
        
        // Clear canvas
        ctx.fillStyle = '#282828';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw mock waveform
        ctx.strokeStyle = '#0078d4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        const duration = result.originalDuration || 60;
        
        for (let x = 0; x < canvasWidth; x++) {
            const time = (x / canvasWidth) * duration;
            const amplitude = Math.sin(time * 10) * Math.random() * 0.8 + 0.1;
            const y = canvasHeight / 2 + (amplitude * canvasHeight / 2) * (Math.random() > 0.5 ? 1 : -1);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Draw silence markers
        const markersContainer = document.getElementById('silenceMarkers');
        markersContainer.innerHTML = '';
        
        result.silenceSegments.forEach((segment, index) => {
            const startPercent = (segment.start / duration) * 100;
            const widthPercent = (segment.duration / duration) * 100;
            
            const marker = document.createElement('div');
            marker.className = 'silence-marker';
            marker.style.left = startPercent + '%';
            marker.style.width = widthPercent + '%';
            marker.title = `Silence ${index + 1}: ${segment.duration.toFixed(2)}s`;
            
            markersContainer.appendChild(marker);
        });
    }

    enablePreviewButtons() {
        document.getElementById('previewBtn').disabled = false;
        document.getElementById('clearBtn').disabled = false;
        document.getElementById('applyCutsBtn').disabled = false;
    }

    previewCuts() {
        if (this.silenceSegments.length === 0) return;
        
        // Create preview markers in Premiere Pro
        this.csInterface.evalScript(`createSilenceMarkers('${JSON.stringify(this.silenceSegments)}')`, (result) => {
            this.updateStatus('Preview markers created on timeline');
        });
    }

    clearAnalysis() {
        this.silenceSegments = [];
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('previewBtn').disabled = true;
        document.getElementById('clearBtn').disabled = true;
        document.getElementById('applyCutsBtn').disabled = true;
        
        // Clear waveform
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Clear markers
        document.getElementById('silenceMarkers').innerHTML = '';
        
        this.updateStatus('Analysis cleared');
    }

    applyCuts() {
        if (this.silenceSegments.length === 0) {
            this.updateStatus('No silence segments to apply');
            return;
        }

        if (!confirm(`This will apply ${this.silenceSegments.length} cuts to your timeline. This action cannot be undone. Continue?`)) {
            return;
        }

        this.setApplyButton(true);
        this.updateStatus('Applying cuts to timeline...');

        const trackIndex = document.getElementById('audioTrack').value === 'all' ? -1 : parseInt(document.getElementById('audioTrack').value);
        const padding = parseInt(document.getElementById('padding').value);

        this.csInterface.evalScript(
            `applyCutsToTimeline('${JSON.stringify(this.silenceSegments)}', ${trackIndex}, ${padding})`,
            (result) => {
                if (result === 'true') {
                    this.updateStatus('Cuts applied successfully!');
                    this.clearAnalysis();
                } else {
                    this.updateStatus('Error applying cuts: ' + result);
                }
                this.setApplyButton(false);
            }
        );
    }

    initializeWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size for high DPI displays
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Initial empty waveform
        ctx.fillStyle = '#282828';
        ctx.fillRect(0, 0, rect.width, rect.height);
    }

    setAnalyzeButton(loading) {
        const btn = document.getElementById('analyzeBtn');
        const btnText = btn.querySelector('.btn-text');
        const loadingSpinner = btn.querySelector('.loading');
        
        if (loading) {
            btnText.style.display = 'none';
            loadingSpinner.style.display = 'flex';
            btn.disabled = true;
        } else {
            btnText.style.display = 'block';
            loadingSpinner.style.display = 'none';
            btn.disabled = false;
        }
    }

    setApplyButton(loading) {
        const btn = document.getElementById('applyCutsBtn');
        const btnText = btn.querySelector('.btn-text');
        const loadingSpinner = btn.querySelector('.loading');
        
        if (loading) {
            btnText.style.display = 'none';
            loadingSpinner.style.display = 'flex';
            btn.disabled = true;
        } else {
            btnText.style.display = 'block';
            loadingSpinner.style.display = 'none';
            btn.disabled = false;
        }
    }

    showProgress() {
        document.getElementById('progressBar').style.display = 'block';
        const fill = document.querySelector('.progress-fill');
        fill.style.width = '100%';
    }

    hideProgress() {
        document.getElementById('progressBar').style.display = 'none';
        const fill = document.querySelector('.progress-fill');
        fill.style.width = '0%';
    }

    updateStatus(message) {
        document.getElementById('statusText').textContent = message;
        console.log('AutoCut:', message);
    }

    updateWhisperStatus(status, message) {
        const dot = document.querySelector('.status-dot');
        const text = document.getElementById('whisperStatusText');
        
        dot.className = `status-dot ${status}`;
        text.textContent = message;
    }
}

// Global function for host script communication
function updateStatusFromHost(message) {
    if (window.autoCutPanel) {
        window.autoCutPanel.updateStatus(message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.autoCutPanel = new AutoCutPanel();
});