const AGENT_ID = 'AVnsdT3FNybXHMh42w8u';
const API_KEY = 'sk_aa6f61e2e19d3d69bfbba2eb691cb65d101e8b4a825247c4'; // Replace this with your actual API key
const WS_URL = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}&xi-api-key=${API_KEY}`;

// Helper function for robust ArrayBuffer to Base64 conversion
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

class VoiceChatApp {
    constructor() {
        this.ws = null;
        this.audioContext = null;
        this.audioProcessor = null;
        this.audioSource = null;
        this.analyserNode = null; // For agent playback
        this.volumeDataArray = null; // For agent playback
        this.visualizationFrameId = null; // For agent playback
        this.agentGainNode = null; // Gain node for agent volume
        this.reverbNode = null; // Reverb node for agent voice
        this.dryGainNode = null; // Dry signal path
        this.wetGainNode = null; // Wet (reverb) signal path
        this.reverbLevel = 0.05; // Default reverb level (0-1)

        this.userMicAnalyserNode = null; // For user mic input
        this.userMicDataArray = null; // For user mic input
        this.userMicVisualizationFrameId = null; // For user mic input
        this.userMicFreqBars = null; // Store references to the bars

        this.isConnected = false;
        this.micStream = null;
        this.currentPlaybackSource = null;
        this.playbackQueue = [];
        this.isPlayingAiAudio = false;
        this.targetSampleRate = 16000;
        
        // Subtitle processor
        this.subtitleProcessor = new SubtitleProcessor();
        this.currentAgentResponse = ''; // Store the current agent response for subtitles
        this.isNewResponse = true; // Flag to indicate if we're starting a new agent response

        // DOM Elements
        this.connectionStatus = document.getElementById('connection-status');
        this.recordingStatus = document.getElementById('recording-status');
        this.conversationContainer = document.getElementById('conversation');

        // Bind event listeners
    }

    async initializeAudio() {
        try {
            // Ensure AudioContext is available
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!window.AudioContext) {
                alert('Web Audio API is not supported in this browser.');
                return false;
            }
            this.audioContext = new AudioContext();

            // Create AnalyserNode for Agent Playback
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256; // Smaller FFT size for volume is fine
            this.volumeDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
            console.log("Agent Playback AnalyserNode created");

            // Create GainNode for Agent Playback Volume
            this.agentGainNode = this.audioContext.createGain();
            this.agentGainNode.gain.value = 0.5; // Default to 50% volume initially
            console.log("Agent Playback GainNode created");
            
            // Create reverb processing nodes
            await this.createReverbNodes();

            // Create AnalyserNode for User Mic Input
            this.userMicAnalyserNode = this.audioContext.createAnalyser();
            this.userMicAnalyserNode.fftSize = 128;
            this.userMicAnalyserNode.smoothingTimeConstant = 0.8; // More smoothing
            this.userMicDataArray = new Uint8Array(this.userMicAnalyserNode.frequencyBinCount); // length will be 64
            console.log("User Mic AnalyserNode created with frequencyBinCount:", this.userMicAnalyserNode.frequencyBinCount);

            // Get microphone stream
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            return true;
        } catch (error) {
            console.error('Error initializing audio:', error);
            alert('Failed to get microphone access. Please check permissions.');
            return false;
        }
    }
    
    // Create reverb nodes and load impulse response
    async createReverbNodes() {
        // Create convolver for reverb effect
        this.reverbNode = this.audioContext.createConvolver();
        
        // Create dry/wet mix nodes
        this.dryGainNode = this.audioContext.createGain();
        this.wetGainNode = this.audioContext.createGain();
        
        // Set initial mix (0 reverb)
        this.dryGainNode.gain.value = 1;
        this.wetGainNode.gain.value = 0;
        
        // Load impulse response
        try {
            // Create a basic impulse response for reverb
            // A real app might load an external impulse response file
            const impulseLength = this.audioContext.sampleRate * 2; // 2 second reverb
            const impulseResponse = this.audioContext.createBuffer(
                2, // Stereo
                impulseLength,
                this.audioContext.sampleRate
            );
            
            // Generate hall-like reverb impulse response
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulseResponse.getChannelData(channel);
                
                // Create a decaying impulse response
                for (let i = 0; i < impulseLength; i++) {
                    // Exponential decay
                    const decay = Math.exp(-i / (this.audioContext.sampleRate * 0.5));
                    // Some randomness for diffusion
                    channelData[i] = (Math.random() * 2 - 1) * decay;
                }
            }
            
            this.reverbNode.buffer = impulseResponse;
            console.log("Reverb impulse response created");
            
            // Apply the default reverb level after creating the impulse response
            this.setReverbLevel(this.reverbLevel);
        } catch (error) {
            console.error("Error creating reverb:", error);
            // Fallback - disable reverb if error
            this.wetGainNode.gain.value = 0;
            this.dryGainNode.gain.value = 1;
        }
    }
    
    // Set the reverb level (0-1)
    setReverbLevel(level) {
        this.reverbLevel = Math.max(0, Math.min(1, level));
        
        // Crossfade between dry and wet signal
        // Use equal power crossfade curve for more natural transition
        const dryLevel = Math.cos(this.reverbLevel * Math.PI/2);
        const wetLevel = Math.sin(this.reverbLevel * Math.PI/2);
        
        // Apply values with slight ramp for smooth transition
        this.dryGainNode.gain.linearRampToValueAtTime(
            dryLevel, 
            this.audioContext.currentTime + 0.1
        );
        this.wetGainNode.gain.linearRampToValueAtTime(
            wetLevel * 0.6, // Reduce wet signal a bit to avoid overloading
            this.audioContext.currentTime + 0.1
        );
        
        console.log(`Reverb level set to: ${level} (dry: ${dryLevel.toFixed(2)}, wet: ${wetLevel.toFixed(2)})`);
    }

    setupAudioProcessor() {
        console.log('Running setupAudioProcessor'); // Log entry
        if (!this.audioContext || !this.micStream) {
            console.error('Audio context or mic stream not ready in setupAudioProcessor');
            return; 
        }
        console.log('Audio context and mic stream are ready.'); // Log success

        this.audioSource = this.audioContext.createMediaStreamSource(this.micStream);
        const bufferSize = 4096;

        // Connect mic source to user mic analyser
        if (this.userMicAnalyserNode) {
            this.audioSource.connect(this.userMicAnalyserNode);
            console.log("Connected mic source to user mic analyser");
            // Note: We don't connect this analyser to destination,
            // it's just for reading data.
        }
        
        // Create ScriptProcessor (as before)
        this.audioProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

        this.audioProcessor.onaudioprocess = (event) => {
            if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
                return;
            }

            const inputData = event.inputBuffer.getChannelData(0); // Get Float32 data

            // --- PCM Conversion & Downsampling ---
            const pcmData = this.convertFloat32To16BitPCM(inputData);
            // -------------------------------------

            if (pcmData.byteLength > 0) {
                const base64Audio = arrayBufferToBase64(pcmData.buffer);
                console.log(`Sending audio chunk, length: ${base64Audio.length}`); // Log sent chunk info
                this.ws.send(JSON.stringify({
                    user_audio_chunk: base64Audio
                }));
            }
        };

         // Connect processing chain (mic source -> processor -> destination)
        this.audioSource.connect(this.audioProcessor);
        this.audioProcessor.connect(this.audioContext.destination); // Connect processor to output
        console.log("Audio processor connected and processing.");
    }

    // Helper to convert Float32 Array to 16-bit PCM Int16Array
    // Includes basic downsampling if necessary
    convertFloat32To16BitPCM(inputFloat32Array) {
        const sourceSampleRate = this.audioContext.sampleRate;
        const targetSampleRate = this.targetSampleRate;
        const ratio = sourceSampleRate / targetSampleRate;
        const outputLength = Math.floor(inputFloat32Array.length / ratio);
        const outputPCM16Array = new Int16Array(outputLength);

        let outputIndex = 0;
        let inputIndex = 0;

        while (outputIndex < outputLength) {
            // Simple downsampling: just take the nearest sample
            const nearestInputIndex = Math.round(inputIndex);
            if (nearestInputIndex < inputFloat32Array.length) {
                 const sample = inputFloat32Array[nearestInputIndex];
                 // Clamp and convert to 16-bit integer
                 const intSample = Math.max(-1, Math.min(1, sample)) * 32767;
                 outputPCM16Array[outputIndex] = intSample;
            } else {
                outputPCM16Array[outputIndex] = 0; // Handle edge case
            }
            outputIndex++;
            inputIndex += ratio;
        }
        return outputPCM16Array;
    }

    async toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            const audioReady = await this.initializeAudio();
            if (audioReady) {
                await this.connect();
            }
        }
    }

    async connect() {
        try {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                
                // Ensure AudioContext is running
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    console.log('Resuming AudioContext on connect');
                    this.audioContext.resume();
                }
                
                // Setup audio processor now that connection is open
                this.setupAudioProcessor(); 
                this.startUserMicVisualizationLoop(); // Start user mic viz
                this.updateUI();

                // Send bare minimum initial configuration
                this.ws.send(JSON.stringify({
                    type: 'conversation_initiation_client_data'
                }));
            };

            this.ws.onmessage = (event) => this.handleWebSocketMessage(event);
            this.ws.onclose = (event) => this.handleDisconnection(event);
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Connection error:', error);
            this.handleDisconnection();
        }
    }

    disconnect() {
        this.stopVisualizationLoop(); // Stop agent playback viz
        this.stopUserMicVisualizationLoop(); // Stop user mic viz
        // Stop and disconnect Web Audio nodes FIRST
        if (this.audioSource) {
            this.audioSource.disconnect();
            this.audioSource = null;
            console.log("Audio source disconnected.");
        }
        if (this.audioProcessor) {
            this.audioProcessor.disconnect(); // Important to stop onaudioprocess
            this.audioProcessor = null;
            console.log("Audio processor disconnected.");
        }
        // Stop mic stream tracks
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
            console.log("Mic stream stopped.");
        }
        // Suspend context AFTER nodes are disconnected if desired
        // if (this.audioContext && this.audioContext.state === 'running') {
        //     this.audioContext.suspend();
        // }

        // Stop playback and clear queue
        if (this.currentPlaybackSource) {
            try {
                this.currentPlaybackSource.stop();
            } catch (e) { /* Ignore */ }
            this.currentPlaybackSource = null;
        }
        this.playbackQueue = [];
        this.isPlayingAiAudio = false;

        // Close WebSocket LAST
        if (this.ws) {
            this.ws.close(1000, "Client disconnected"); // Send code 1000
        } else {
             this.handleDisconnection();
        }
    }

    handleDisconnection(closeEvent) {
        this.isConnected = false;
        this.stopVisualizationLoop(); // Stop agent playback viz
        this.stopUserMicVisualizationLoop(); // Stop user mic viz
        // Reset processor/source refs just in case disconnect wasn't clean
        this.audioProcessor = null;
        this.audioSource = null;
        this.micStream = null; // Assume mic stopped
        this.currentPlaybackSource = null; // Assume playback stopped
        this.playbackQueue = [];
        this.isPlayingAiAudio = false;
        this.updateUI();
        console.log('WebSocket disconnected:', closeEvent);
    }

    async handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'conversation_initiation_metadata':
                    console.log('Conversation initialized:', data);
                    // Set target sample rate based on metadata if available?
                    // Example: if (data.conversation_initiation_metadata_event?.user_input_audio_format?.includes('16000')) this.targetSampleRate = 16000;
                    break;

                case 'user_transcript':
                    console.log(`[${Date.now()}] Received user_transcript:`, data.user_transcription_event.user_transcript);
                    this.addMessage('user', data.user_transcription_event.user_transcript);
                    
                    // Set flag for next agent response - this will be a new response
                    this.isNewResponse = true;
                    
                    // Clear any existing subtitles when user speaks
                    if (this.subtitleProcessor) {
                        this.subtitleProcessor.clearSubtitles();
                    }
                    
                    // --- Removed Client-Side Interruption Logic --- 
                    // Rely on backend VAD and turn-taking to handle interruptions based on new user audio chunks being sent.
                    // --------------------------
                    break;

                case 'agent_response':
                    console.log('Received agent_response:', data.agent_response_event.agent_response);
                    this.addMessage('ai', data.agent_response_event.agent_response);
                    // Store the agent response for subtitles
                    this.currentAgentResponse = data.agent_response_event.agent_response;
                    
                    // Potentially clear queue here too IF agent_response *always* signals the very start of a new turn?
                    // For now, rely on user_transcript for interruption.
                    break;

                case 'audio':
                    try {
                        // Decode the incoming chunk
                        const audioData = atob(data.audio_event.audio_base_64);
                        const audioBytes = new Uint8Array(audioData.length);
                        for (let i = 0; i < audioData.length; i++) audioBytes[i] = audioData.charCodeAt(i);

                        const pcm16Data = new Int16Array(audioBytes.buffer);
                        const numSamples = pcm16Data.length;
                        const audioCtx = this.audioContext;
                        const targetSampleRate = 16000;
                        const receivedTimestamp = Date.now(); // Timestamp for identification
                        console.log(`[${receivedTimestamp}] Received audio chunk: ${numSamples} samples.`);

                        if (!audioCtx || audioCtx.state === 'closed') {
                            console.error(`[${receivedTimestamp}] AudioContext not available or closed for processing audio chunk.`);
                            return;
                        }
                        // Create an AudioBuffer for this chunk
                        const audioBuffer = audioCtx.createBuffer(1, numSamples, targetSampleRate);
                        const bufferChannelData = audioBuffer.getChannelData(0);
                        for (let i = 0; i < numSamples; i++) bufferChannelData[i] = pcm16Data[i] / 32768.0;

                        // Add an object containing buffer and timestamp to the queue
                        const queueItem = { buffer: audioBuffer, timestamp: receivedTimestamp };
                        this.playbackQueue.push(queueItem);
                        console.log(`[${receivedTimestamp}] Added buffer to queue. Queue length: ${this.playbackQueue.length}. Buffer duration: ${audioBuffer.duration}s`);

                        // Attempt to start playback if not already playing
                        this.tryStartPlayback();

                    } catch (e) {
                         console.error("Audio processing/queueing failed:", e);
                    }
                    break;

                case 'ping':
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({
                            type: 'pong',
                            event_id: data.ping_event.event_id
                        }));
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    tryStartPlayback() {
        if (!this.isPlayingAiAudio && this.playbackQueue.length > 0) {
            const nextItemTimestamp = this.playbackQueue[0].timestamp; // Peek at next item ID
            console.log(`[${Date.now()}] Starting playback sequence. Next chunk ID: ${nextItemTimestamp}`);
            this.isPlayingAiAudio = true;
            this.playNextChunk();
        } else {
            // console.log("Not starting playback: already playing or queue empty.");
        }
    }

    playNextChunk() {
        if (this.playbackQueue.length === 0) {
            console.log(`[${Date.now()}] Playback queue empty, stopping sequence.`);
            this.isPlayingAiAudio = false;
            this.currentPlaybackSource = null; // Ensure cleared
            return;
        }

        const queueItem = this.playbackQueue.shift(); // Get the next item { buffer, timestamp }
        const audioBuffer = queueItem.buffer;
        const chunkTimestamp = queueItem.timestamp;
        console.log(`[${chunkTimestamp}] Playing next chunk. Duration: ${audioBuffer.duration}s. Remaining in queue: ${this.playbackQueue.length}`);

        const audioCtx = this.audioContext;
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        // Setup audio graph: source -> gainNode -> [dry/wet split] -> destination
        source.connect(this.agentGainNode);
        
        // Connect to dry path (direct)
        this.agentGainNode.connect(this.dryGainNode);
        this.dryGainNode.connect(this.analyserNode);
        
        // Connect to wet path (through reverb)
        this.agentGainNode.connect(this.reverbNode);
        this.reverbNode.connect(this.wetGainNode);
        this.wetGainNode.connect(this.analyserNode);
        
        // Final connection to output
        this.analyserNode.connect(this.audioContext.destination);

        console.log("Agent audio source connected through GainNode, ReverbNode and AnalyserNode");

        this.currentPlaybackSource = source; // Track the current source

        // Prepare subtitles if this is the first chunk or we have a new agent response
        if (this.playbackQueue.length === 0 || this.currentAgentResponse) {
            if (this.subtitleProcessor && this.currentAgentResponse) {
                // Prepare the subtitle with the current agent response
                this.subtitleProcessor.prepareSentence(
                    this.currentAgentResponse, 
                    audioBuffer.duration + (this.playbackQueue.length > 0 ? 2 : 0), // Add buffer time if more chunks in queue
                    this.isNewResponse // Pass flag indicating if this is a new response
                );
                // Start displaying words
                this.subtitleProcessor.startWordDisplay();
                // Clear after use to prevent duplication
                this.currentAgentResponse = '';
                // Reset new response flag
                this.isNewResponse = false;
            }
        }

        source.onended = () => {
            console.log(`[${chunkTimestamp}] Chunk playback finished. Expected duration: ${audioBuffer.duration}s`);
            if (this.currentPlaybackSource === source) {
                this.currentPlaybackSource = null; 
                this.playNextChunk(); // Play next or stop visualization if queue empty
            } else {
                console.log(`[${chunkTimestamp}] An older source finished after a new one possibly started (or was interrupted).`);
            }
        };

        console.log(`[${chunkTimestamp}] Calling source.start()`);
        source.start();
        
        // Ensure visualization is running if we just started playback
        this.startVisualizationLoop();
    }

    startVisualizationLoop() {
        // Prevent multiple loops
        if (this.visualizationFrameId) {
            // console.log("Visualization loop already running.");
            return;
        }
        console.log("Starting visualization loop");
        const visualizerElement = document.getElementById('voiceVisualizer');
        if (!visualizerElement) {
            console.error("Visualizer element not found!");
            return;
        }

        const draw = () => {
            if (!this.analyserNode || !this.volumeDataArray) {
                this.stopVisualizationLoop();
                return;
            }
            
            // Check if still playing or queue has items
            if (!this.isPlayingAiAudio && this.playbackQueue.length === 0) {
                // Fade out effect
                 visualizerElement.style.transform = `scale(1)`; 
                console.log("Stopping visualization loop - playback ended");
                this.stopVisualizationLoop();
                return; // Stop the loop
            }

            this.analyserNode.getByteFrequencyData(this.volumeDataArray);

            // Calculate average volume (simple approach)
            let sum = 0;
            for (let i = 0; i < this.volumeDataArray.length; i++) {
                sum += this.volumeDataArray[i];
            }
            const averageVolume = sum / this.volumeDataArray.length;

            // Map volume to scale (adjust multiplier and base as needed)
            const scale = 1 + (averageVolume / 128) * 0.5; // Scale from 1.0 to 1.5
            visualizerElement.style.transform = `scale(${scale})`;
            
            // Request next frame
            this.visualizationFrameId = requestAnimationFrame(draw);
        };

        this.visualizationFrameId = requestAnimationFrame(draw);
    }

    stopVisualizationLoop() {
        if (this.visualizationFrameId) {
            cancelAnimationFrame(this.visualizationFrameId);
            this.visualizationFrameId = null;
            console.log("Visualization loop stopped.");
             // Reset scale smoothly? (Could use CSS transition)
            const visualizerElement = document.getElementById('voiceVisualizer');
            if (visualizerElement) {
                visualizerElement.style.transform = 'scale(1)';
            }
        }
    }

    // --- User Mic Visualization ---
    startUserMicVisualizationLoop() {
        if (this.userMicVisualizationFrameId) return; // Already running
        
         // Get references to the frequency bars ONCE
        if (!this.userMicFreqBars) {
             this.userMicFreqBars = document.querySelectorAll('#userMicVisualizer .freq-bar');
             if (!this.userMicFreqBars || this.userMicFreqBars.length === 0) {
                 console.error("User mic frequency bars not found!");
                 this.userMicFreqBars = null; // Reset if not found
                 return;
             }
             console.log(`Found ${this.userMicFreqBars.length} frequency bars.`);
        }
        
        console.log("Starting user mic visualization loop");
        // const visualizerElement = document.querySelector('#userMicVisualizer .user-mic-bar');
        if (!this.userMicAnalyserNode || !this.userMicDataArray) {
            console.error("User mic analyser not ready!");
            return;
        }

        const numBars = this.userMicFreqBars.length; // e.g., 32
        const freqBinCount = this.userMicAnalyserNode.frequencyBinCount; // e.g., 64

        const draw = () => {
            // Stop if disconnected or analyser gone
            if (!this.isConnected || !this.userMicAnalyserNode || !this.userMicDataArray || !this.userMicFreqBars) {
                // visualizerElement.style.width = '0%'; // Reset width
                 // Reset bars on stop
                if(this.userMicFreqBars) {
                    this.userMicFreqBars.forEach(bar => bar.style.transform = 'scaleY(0)');
                }
                this.stopUserMicVisualizationLoop();
                return;
            }

            this.userMicAnalyserNode.getByteFrequencyData(this.userMicDataArray); // Get frequency data (0-255)

            // Calculate average volume (similar to agent viz)
            /*
            let sum = 0;
            for (let i = 0; i < this.userMicDataArray.length; i++) {
                sum += this.userMicDataArray[i];
            }
            const averageVolume = sum / this.userMicDataArray.length;
            */

            // Map volume to width percentage (adjust multiplier as needed)
            // Let's make it more sensitive than the agent circle
            // const widthPercent = Math.min(100, (averageVolume / 128) * 150); // Scale width up to 100%
            // visualizerElement.style.width = `${widthPercent}%`;
            
             // Map frequency data to bar heights
            for (let i = 0; i < numBars; i++) {
                // Map 32 bars to 64 frequency bins (take average of 2 bins per bar, or just sample?)
                // Let's just sample every other bin for simplicity
                const dataIndex = Math.min(freqBinCount - 1, Math.floor(i * (freqBinCount / numBars))); // Simple mapping
                const freqValue = this.userMicDataArray[dataIndex];

                // Map the 0-255 value to a height percentage (e.g., 0-100%)
                // Add a minimum height so bars are always slightly visible?
                const minHeight = 2; // Minimum height percentage
                const maxHeight = 100;
                const heightPercent = minHeight + (freqValue / 255) * (maxHeight - minHeight);

                // Apply height using scaleY for better performance/animation
                const bar = this.userMicFreqBars[i];
                if (bar) {
                     bar.style.transform = `scaleY(${heightPercent / 100})`;
                }
            }

            this.userMicVisualizationFrameId = requestAnimationFrame(draw);
        };

        this.userMicVisualizationFrameId = requestAnimationFrame(draw);
    }

    stopUserMicVisualizationLoop() {
        if (this.userMicVisualizationFrameId) {
            cancelAnimationFrame(this.userMicVisualizationFrameId);
            this.userMicVisualizationFrameId = null;
            console.log("User mic visualization loop stopped.");
            // const visualizerElement = document.querySelector('#userMicVisualizer .user-mic-bar');
            // if (visualizerElement) {
            //     visualizerElement.style.width = '0%'; // Reset width smoothly via CSS transition
            // }
             // Reset bars smoothly using CSS transition
             if(this.userMicFreqBars) {
                this.userMicFreqBars.forEach(bar => bar.style.transform = 'scaleY(0)');
            }
        }
         // Don't reset this.userMicFreqBars here, keep the reference
    }

    addMessage(type, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${type}-message`);
        messageDiv.textContent = text;
        this.conversationContainer.appendChild(messageDiv);
        this.conversationContainer.scrollTop = this.conversationContainer.scrollHeight;
        this.updateUI();
    }

    updateUI() {
        this.connectionStatus.textContent = this.isConnected ? 'Connected' : 'Speaking Enabled'; // Update text
        this.connectionStatus.className = this.isConnected ? 'connected' : '';

        this.recordingStatus.textContent = this.isConnected ? 'Mic Active' : 'Mic Inactive'; 
        this.recordingStatus.className = this.isConnected ? 'recording' : ''; 
        
        // Stop visualization if disconnected manually
        if (!this.isConnected) {
            this.stopVisualizationLoop();
        }
    }

    // <<< NEW: Method to set agent volume
    setAgentVolume(volume) {
        // Ensure volume is between 0.0 and 1.0
        const clampedVolume = Math.max(0.0, Math.min(1.0, volume));
        if (this.agentGainNode) {
            // Use exponential ramp for smoother transitions (optional)
            this.agentGainNode.gain.exponentialRampToValueAtTime(
                clampedVolume,
                this.audioContext.currentTime + 0.1 // Ramp over 0.1 seconds
            );
             console.log(`Agent volume set to: ${clampedVolume}`);
        } else {
             console.warn("Agent GainNode not initialized, cannot set volume.");
        }
    }

    // Add method to toggle subtitles
    toggleSubtitles() {
        if (this.subtitleProcessor) {
            const isEnabled = this.subtitleProcessor.toggleEnabled();
            console.log(`Subtitles ${isEnabled ? 'enabled' : 'disabled'}`);
            
            // You could update a CC button visual state here if needed
            const ccButton = document.getElementById('ccToggleButton');
            if (ccButton) {
                if (isEnabled) {
                    ccButton.classList.add('active');
                    ccButton.setAttribute('title', 'Hide Captions');
                } else {
                    ccButton.classList.remove('active');
                    ccButton.setAttribute('title', 'Show Captions');
                }
            }
        }
    }
}