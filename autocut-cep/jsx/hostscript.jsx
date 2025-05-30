// AutoCut ExtendScript for Premiere Pro
// This script handles all communication with Premiere Pro's APIs

// Global variables
var autocut = {
    activeSequence: null,
    audioTracks: [],
    silenceSegments: [],
    exportPath: ""
};

// Initialize the extension
function initializeAutocut() {
    try {
        if (app.project.activeSequence) {
            autocut.activeSequence = app.project.activeSequence;
            updateStatus("Active sequence detected: " + autocut.activeSequence.name);
            return true;
        } else {
            updateStatus("No active sequence found. Please open a sequence.");
            return false;
        }
    } catch (e) {
        updateStatus("Error initializing: " + e.toString());
        return false;
    }
}

// Get sequence information
function getSequenceInfo() {
    if (!autocut.activeSequence) {
        if (!initializeAutocut()) {
            return null;
        }
    }
    
    try {
        var sequenceInfo = {
            name: autocut.activeSequence.name,
            duration: autocut.activeSequence.end,
            frameRate: autocut.activeSequence.timebase,
            audioTracks: []
        };
        
        // Get audio track information
        for (var i = 0; i < autocut.activeSequence.audioTracks.numTracks; i++) {
            var track = autocut.activeSequence.audioTracks[i];
            var trackInfo = {
                index: i,
                name: track.name || ("Audio " + (i + 1)),
                clips: []
            };
            
            // Get clips on this track
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
                if (clip.mediaType === "Audio" || clip.mediaType === "Video") {
                    trackInfo.clips.push({
                        name: clip.name,
                        start: clip.start.seconds,
                        end: clip.end.seconds,
                        duration: (clip.end.seconds - clip.start.seconds),
                        inPoint: clip.inPoint.seconds,
                        outPoint: clip.outPoint.seconds
                    });
                }
            }
            
            sequenceInfo.audioTracks.push(trackInfo);
        }
        
        return JSON.stringify(sequenceInfo);
    } catch (e) {
        updateStatus("Error getting sequence info: " + e.toString());
        return null;
    }
}

// Export audio for analysis
function exportAudioForAnalysis(trackIndex, outputPath) {
    if (!autocut.activeSequence) {
        updateStatus("No active sequence");
        return false;
    }
    
    try {
        // Create a new sequence for audio export
        var exportSequence = autocut.activeSequence.clone();
        
        // Disable all tracks except the selected audio track
        for (var i = 0; i < exportSequence.videoTracks.numTracks; i++) {
            exportSequence.videoTracks[i].setMute(true);
        }
        
        for (var i = 0; i < exportSequence.audioTracks.numTracks; i++) {
            if (trackIndex === -1 || i === trackIndex) {
                exportSequence.audioTracks[i].setMute(false);
            } else {
                exportSequence.audioTracks[i].setMute(true);
            }
        }
        
        // Set up export settings for audio
        var exporter = app.encoder;
        var exportPath = outputPath || (Folder.temp.fsName + "/autocut_audio_" + Date.now() + ".wav");
        
        // Configure audio export preset
        var audioPreset = "WAV - 48khz 16bit Stereo.epr"; // Standard audio preset
        
        if (exporter.launchEncoder()) {
            exporter.addSequenceToQueue(exportSequence, exportPath, audioPreset, "Audio Only");
            exporter.startBatch();
            
            autocut.exportPath = exportPath;
            updateStatus("Audio export started: " + exportPath);
            return exportPath;
        } else {
            updateStatus("Failed to launch encoder");
            return false;
        }
    } catch (e) {
        updateStatus("Error exporting audio: " + e.toString());
        return false;
    }
}

// AutoCut ExtendScript - FIXED with QE API (like JumpCut)
// Apply cuts to timeline based on silence segments - WORKING VERSION
function applyCutsToTimeline(silenceSegments, trackIndex, padding) {
    if (!app.project.activeSequence) {
        updateStatus("No active sequence");
        return "false";
    }
    
    try {
        // ENABLE QE API - This is the key!
        app.enableQE();
        
        var segments = JSON.parse(silenceSegments);
        var paddingSeconds = (padding || 0) / 1000;
        var sequence = app.project.activeSequence;
        var qeSequence = qe.project.getActiveSequence();
        var cutsApplied = 0;
        
        updateStatus("Applying " + segments.length + " cuts with QE...");
        
        // Sort from end to beginning
        segments.sort(function(a, b) { return b.start - a.start; });
        
        var time = new Time();
        
        // First pass: Make all razor cuts
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            var startTime = Math.max(0, segment.start - paddingSeconds);
            var endTime = segment.end + paddingSeconds;
            
            // Create timecode strings (like JumpCut does)
            time.seconds = startTime;
            var startTimecode = time.getFormatted(sequence.getSettings().videoFrameRate, sequence.getSettings().videoDisplayFormat);
            
            time.seconds = endTime;
            var endTimecode = time.getFormatted(sequence.getSettings().videoFrameRate, sequence.getSettings().videoDisplayFormat);
            
            // Make razor cuts using QE API
            if (trackIndex === -1) {
                // All audio tracks
                for (var t = 0; t < sequence.audioTracks.numTracks; t++) {
                    qeSequence.getAudioTrackAt(t).razor(startTimecode);
                    qeSequence.getAudioTrackAt(t).razor(endTimecode);
                }
            } else if (trackIndex < sequence.audioTracks.numTracks) {
                // Specific track
                qeSequence.getAudioTrackAt(trackIndex).razor(startTimecode);
                qeSequence.getAudioTrackAt(trackIndex).razor(endTimecode);
            }
            cutsApplied++;
        }
        
        // Second pass: Remove silence clips (with ripple delete)
        removeQESilenceClips(segments, trackIndex, paddingSeconds, sequence);
        
        updateStatus("Applied " + cutsApplied + " cuts successfully!");
        return "true";
        
    } catch (e) {
        updateStatus("QE Error: " + e.toString());
        return "false";
    }
}

// Remove silence clips using standard API after QE razor cuts
function removeQESilenceClips(segments, trackIndex, paddingSeconds, sequence) {
    try {
        // Remove clips in silence ranges
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            var startTime = Math.max(0, segment.start - paddingSeconds);
            var endTime = segment.end + paddingSeconds;
            
            if (trackIndex === -1) {
                // All audio tracks
                for (var t = 0; t < sequence.audioTracks.numTracks; t++) {
                    removeClipsInTimeRange(sequence.audioTracks[t], startTime, endTime);
                }
            } else if (trackIndex < sequence.audioTracks.numTracks) {
                // Specific track
                removeClipsInTimeRange(sequence.audioTracks[trackIndex], startTime, endTime);
            }
        }
    } catch (e) {
        updateStatus("Remove clips error: " + e.toString());
    }
}

// Remove clips within time range (with ripple delete like JumpCut)
function removeClipsInTimeRange(track, startSeconds, endSeconds) {
    try {
        // Find and remove clips in silence range
        for (var i = track.clips.numItems - 1; i >= 0; i--) {
            var clip = track.clips[i];
            var clipStart = clip.start.seconds;
            var clipEnd = clip.end.seconds;
            
            // If clip is within silence range, remove with ripple
            if (clipStart >= startSeconds && clipEnd <= endSeconds) {
                clip.remove(true, true); // ripple delete = true, like JumpCut
            }
        }
    } catch (e) {
        // Continue with other clips
        updateStatus("Clip remove error: " + e.toString());
    }
}

// Remove clips in silence ranges after razor cuts
function removeClipsInSilenceRanges(segments, trackIndex) {
    try {
        var sequence = app.project.activeSequence;
        
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            
            if (trackIndex === -1) {
                // All audio tracks
                for (var t = 0; t < sequence.audioTracks.numTracks; t++) {
                    removeClipsInRange(sequence.audioTracks[t], segment.start, segment.end);
                }
            } else if (trackIndex < sequence.audioTracks.numTracks) {
                // Specific track
                removeClipsInRange(sequence.audioTracks[trackIndex], segment.start, segment.end);
            }
        }
    } catch (e) {
        updateStatus("Remove error: " + e.toString());
    }
}

// Remove clips within a specific time range
function removeClipsInRange(track, startSeconds, endSeconds) {
    try {
        for (var i = track.clips.numItems - 1; i >= 0; i--) {
            var clip = track.clips[i];
            var clipStart = clip.start.seconds;
            var clipEnd = clip.end.seconds;
            
            // If clip is completely within silence range
            if (clipStart >= startSeconds && clipEnd <= endSeconds) {
                clip.remove(false, false);
            }
        }
    } catch (e) {
        // Continue with other clips
    }
}

// Simplified razor cut function that actually works
function applyCutToTrack(track, startTime, endTime) {
    try {
        // Create Time objects
        var cutStartTime = new Time();
        cutStartTime.seconds = startTime;
        var cutEndTime = new Time();
        cutEndTime.seconds = endTime;
        
        // Make razor cuts at silence boundaries
        track.razor(cutStartTime);
        track.razor(cutEndTime);
        
        // Find clips in the silence range and remove them
        for (var i = track.clips.numItems - 1; i >= 0; i--) {
            var clip = track.clips[i];
            var clipStart = clip.start.seconds;
            var clipEnd = clip.end.seconds;
            
            // If clip is entirely within silence range, remove it
            if (clipStart >= startTime && clipEnd <= endTime) {
                clip.remove(false, false); // Remove without ripple, without transition
                return true;
            }
        }
        
        return true;
    } catch (e) {
        updateStatus("Error cutting track: " + e.toString());
        return false;
    }
}

// Create markers for silence segments
function createSilenceMarkers(silenceSegments) {
    if (!autocut.activeSequence || !silenceSegments) {
        return false;
    }
    
    try {
        var segments = JSON.parse(silenceSegments);
        
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            var markerTime = new Time();
            markerTime.seconds = segment.start;
            
            var marker = autocut.activeSequence.markers.createMarker(markerTime);
            marker.name = "Silence " + (i + 1);
            marker.comments = "Duration: " + (segment.end - segment.start).toFixed(2) + "s";
            marker.setColorByIndex(1); // Red color for silence markers
        }
        
        updateStatus("Created " + segments.length + " silence markers");
        return true;
    } catch (e) {
        updateStatus("Error creating markers: " + e.toString());
        return false;
    }
}

// Utility function to update status
function updateStatus(message) {
    // This will be called from the panel to update status
    try {
        if (typeof CEPEngine !== 'undefined') {
            CEPEngine.evalScript('updateStatusFromHost("' + message + '")');
        }
    } catch (e) {
        // Fallback logging
        $.writeln("AutoCut: " + message);
    }
}

// Get project path for temporary files
function getProjectPath() {
    try {
        if (app.project.path) {
            return app.project.path;
        } else {
            return Folder.temp.fsName;
        }
    } catch (e) {
        return Folder.temp.fsName;
    }
}

// Check if we can access the sequence
function checkSequenceAccess() {
    try {
        if (app.project.activeSequence) {
            return {
                hasSequence: true,
                sequenceName: app.project.activeSequence.name,
                audioTrackCount: app.project.activeSequence.audioTracks.numTracks
            };
        } else {
            return {
                hasSequence: false,
                message: "No active sequence. Please open a sequence in Premiere Pro."
            };
        }
    } catch (e) {
        return {
            hasSequence: false,
            message: "Error accessing sequence: " + e.toString()
        };
    }
}