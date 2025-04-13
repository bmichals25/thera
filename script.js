let voiceChatApp = null; // Hold the app instance

// Function to switch screens - moved outside to make it globally accessible
function setActiveScreen(activeScreenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const screenToShow = document.getElementById(activeScreenId);
    if (screenToShow) {
        screenToShow.classList.add('active');
    } else {
        console.error('Screen not found:', activeScreenId);
        // Default back to welcome screen on error
        document.getElementById('welcomeScreen').classList.add('active');
    }
}

// Helper function to fade audio volume smoothly
function fadeAudio(startVolume, targetVolume, duration = 300) {
    return new Promise(resolve => {
        const startTime = performance.now();
        const volumeChange = targetVolume - startVolume;
        
        // Clear any existing fade interval
        if (window.fadeInterval) clearInterval(window.fadeInterval);
        
        window.fadeInterval = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const ratio = Math.min(elapsed / duration, 1);
            
            // Apply easing for smoother fade (optional)
            const easeRatio = ratio * (2 - ratio);
            const newVolume = startVolume + volumeChange * easeRatio;
            
            backgroundMusic.volume = newVolume;
            
            if (ratio >= 1) {
                clearInterval(window.fadeInterval);
                window.fadeInterval = null;
                resolve();
            }
        }, 16); // ~60fps
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const startSessionBtn = document.getElementById('startSessionBtn');
    const logMoodBtn = document.getElementById('logMoodBtn');
    const endSessionButton = document.getElementById('endSessionButton');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const sessionScreen = document.getElementById('sessionScreen');
    const connectBtn = document.getElementById('connect-btn'); // Keep reference if needed
    const toggleChatButton = document.getElementById('toggleChatButton');
    const closeChatButton = document.getElementById('closeChatButton');
    const chatInterface = document.getElementById('chatInterface');
    const preSessionCheckinScreen = document.getElementById('preSessionCheckinScreen');
    const postSessionCheckinScreen = document.getElementById('postSessionCheckinScreen');
    const startSessionAfterCheckinButton = document.getElementById('startSessionAfterCheckin');
    const finishSessionButton = document.getElementById('finishSessionButton');
    const sessionTimerElement = document.getElementById('sessionTimer');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const musicToggleButton = document.getElementById('musicToggleButton');
    const musicToggleIcon = document.getElementById('musicToggleIcon');
    const ccToggleButton = document.getElementById('ccToggleButton');
    const levelsButton = document.getElementById('levelsButton');
    const levelsPopup = document.getElementById('levelsPopup');
    const closeLevelsPopup = document.getElementById('closeLevelsPopup');
    const musicVolumeSlider = document.getElementById('musicVolumeSlider');
    const agentVolumeSlider = document.getElementById('agentVolumeSlider');
    const reverbSlider = document.getElementById('reverbSlider');
    const preSessionMoodSlider = document.getElementById('preSessionMoodSlider');
    const preSessionMoodLabel = document.getElementById('preSessionMoodLabel');
    const preSessionMoodGraphic = document.getElementById('preSessionMoodGraphic');
    const postSessionMoodSlider = document.getElementById('postSessionMoodSlider');
    const postSessionMoodLabel = document.getElementById('postSessionMoodLabel');
    const postSessionMoodGraphic = document.getElementById('postSessionMoodGraphic');

    let preSessionFeeling = 'Neutral';
    let postSessionFeeling = 'Neutral';
    let sessionIntervalId = null;
    let sessionSeconds = 0;
    let isMusicMuted = false; // Start UNMUTED (music ON)
    const defaultMusicVolume = 0.5; // Default volume (50%)

    // Mood data
    const preSessionMoods = ['Stressed', 'Sad', 'Neutral', 'Okay', 'Happy'];
    const postSessionMoods = ['Worse', 'Same', 'Neutral', 'Better', 'Much Better'];
    
    // SVG mood face templates
    const moodFaces = {
        // Stressed/Worse - Frowning face with stressed eyebrows
        0: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="#FF6B6B"/>
                <circle cx="40" cy="50" r="7" fill="black"/>
                <circle cx="80" cy="50" r="7" fill="black"/>
                <path d="M30 85 Q60 65 90 85" stroke="black" stroke-width="5" fill="transparent"/>
                <path d="M35 35 L45 42" stroke="black" stroke-width="3"/>
                <path d="M85 35 L75 42" stroke="black" stroke-width="3"/>
            </svg>`,
        
        // Sad/Same - Regular sad face
        1: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="#9370DB"/>
                <circle cx="40" cy="45" r="7" fill="black"/>
                <circle cx="80" cy="45" r="7" fill="black"/>
                <path d="M40 85 Q60 75 80 85" stroke="black" stroke-width="5" fill="transparent"/>
            </svg>`,
        
        // Neutral
        2: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="#6BC5FF"/>
                <circle cx="40" cy="45" r="7" fill="black"/>
                <circle cx="80" cy="45" r="7" fill="black"/>
                <line x1="40" y1="80" x2="80" y2="80" stroke="black" stroke-width="5"/>
            </svg>`,
        
        // Okay/Better - Slightly smiling face
        3: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="#6BFF72"/>
                <circle cx="40" cy="45" r="7" fill="black"/>
                <circle cx="80" cy="45" r="7" fill="black"/>
                <path d="M40 75 Q60 85 80 75" stroke="black" stroke-width="5" fill="transparent"/>
            </svg>`,
        
        // Happy/Much Better - Wide smile face
        4: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="#FFDE59"/>
                <circle cx="40" cy="45" r="7" fill="black"/>
                <circle cx="80" cy="45" r="7" fill="black"/>
                <path d="M35 70 Q60 95 85 70" stroke="black" stroke-width="5" fill="transparent"/>
            </svg>`
    };

    // Initialize background music state
    if (backgroundMusic) {
        backgroundMusic.volume = defaultMusicVolume; // Start at default volume
        backgroundMusic.loop = true;
        // Update icon and title based on initial state (unmuted)
        if (musicToggleIcon) {
            // Music is ON, show icon indicating MUTE action
            // We'll set the actual classes in the HTML/toggle function for stack
            // musicToggleIcon.classList.remove('fa-music');
            // musicToggleIcon.classList.add('fa-volume-mute'); // Placeholder, will be replaced by stack setup
        }
        if (musicToggleButton) {
            // Music is ON, title indicates action to MUTE
             musicToggleButton.title = "Mute Music";
        }
    }
    if (musicVolumeSlider) {
        musicVolumeSlider.value = defaultMusicVolume * 100; // Match initial volume state (50%)
    }

    // --- Helper Functions ---
    // Function to format time
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // Function to start timer
    function startTimer() {
        if (sessionIntervalId) clearInterval(sessionIntervalId); // Clear existing timer
        sessionSeconds = 0;
        sessionTimerElement.textContent = formatTime(sessionSeconds);
        sessionIntervalId = setInterval(() => {
            sessionSeconds++;
            sessionTimerElement.textContent = formatTime(sessionSeconds);
        }, 1000);
        console.log("Timer started.");
    }

    // Function to stop timer
    function stopTimer() {
        if (sessionIntervalId) {
            clearInterval(sessionIntervalId);
            sessionIntervalId = null;
            console.log("Timer stopped. Duration:", formatTime(sessionSeconds));
        }
    }
    
    // Function to update mood display based on slider value
    function updateMoodDisplay(value, moodArray, labelElement, graphicElement) {
        const mood = moodArray[value];
        labelElement.textContent = mood;
        
        // Update SVG
        graphicElement.innerHTML = moodFaces[value];
        
        return mood;
    }
    
    // Initialize mood displays
    if (preSessionMoodGraphic) preSessionMoodGraphic.innerHTML = moodFaces[2]; // Neutral
    if (postSessionMoodGraphic) postSessionMoodGraphic.innerHTML = moodFaces[2]; // Neutral
    
    // --- Event Listeners ---
    // Pre-Session Mood Slider
    if (preSessionMoodSlider && preSessionMoodLabel && preSessionMoodGraphic) {
        preSessionMoodSlider.addEventListener('input', function() {
            preSessionFeeling = updateMoodDisplay(
                this.value, 
                preSessionMoods, 
                preSessionMoodLabel, 
                preSessionMoodGraphic
            );
            
            // Enable start button (it's now always enabled since mood is always selected)
            if (startSessionAfterCheckinButton) {
                startSessionAfterCheckinButton.disabled = false;
            }
        });
    }
    
    // Post-Session Mood Slider
    if (postSessionMoodSlider && postSessionMoodLabel && postSessionMoodGraphic) {
        postSessionMoodSlider.addEventListener('input', function() {
            postSessionFeeling = updateMoodDisplay(
                this.value, 
                postSessionMoods, 
                postSessionMoodLabel, 
                postSessionMoodGraphic
            );
            
            // Enable finish button (it's now always enabled since mood is always selected)
            if (finishSessionButton) {
                finishSessionButton.disabled = false;
            }
        });
    }

    // Start Flow: Welcome -> Pre-Checkin
    if (startSessionBtn && welcomeScreen && preSessionCheckinScreen) {
        startSessionBtn.addEventListener('click', () => {
            setActiveScreen('preSessionCheckinScreen');
        });
    }
    
    // Pre-Checkin -> Session
    const startSessionAfterCheckin = document.getElementById('startSessionAfterCheckin');
    if (startSessionAfterCheckin) {
        startSessionAfterCheckin.addEventListener('click', function() {
            // Check if we're just logging mood or starting a session
            if (this.dataset.returnTo === 'welcomeScreen') {
                // We're just logging mood, return to welcome screen
                setActiveScreen('welcomeScreen');
                
                // Record the mood value (in a real app, this would be saved to storage)
                const moodValue = document.getElementById('preSessionMoodSlider').value;
                const moodLabel = document.getElementById('preSessionMoodLabel').textContent;
                console.log('Mood logged:', moodLabel, moodValue);
                
                // Reset the button text for next time
                this.textContent = 'Start Session';
                delete this.dataset.returnTo;
            } else {
                // Normal flow - start the session
            setActiveScreen('sessionScreen');
            startTimer(); // Start timer when session screen becomes active

            // Start music playback (will play at default volume)
            if (backgroundMusic && backgroundMusic.paused) {
                 backgroundMusic.play().catch(e => console.error("Error playing background music on start:", e));
            }

            // Initialize and connect the VoiceChatApp
            if (!voiceChatApp) {
                voiceChatApp = new VoiceChatApp();
            }
            console.log('Starting ElevenLabs connection...');
            voiceChatApp.toggleConnection().then(() => {
                 // Set initial agent volume after connection
                 if (agentVolumeSlider) {
                     const initialAgentVol = parseInt(agentVolumeSlider.value, 10) / 100;
                     if (voiceChatApp && typeof voiceChatApp.setAgentVolume === 'function') {
                        voiceChatApp.setAgentVolume(initialAgentVol);
                     }
                 }
                 
                 // Set initial reverb level after connection
                 if (reverbSlider) {
                     const initialReverbLevel = parseInt(reverbSlider.value, 10) / 100;
                     if (voiceChatApp && typeof voiceChatApp.setReverbLevel === 'function') {
                         voiceChatApp.setReverbLevel(initialReverbLevel);
                     }
                 }
             });
                
                // If this is a continuation of a previous session, set up the context
                if (sessionStorage.getItem('continueFromSession') === 'true') {
                    const previousDate = sessionStorage.getItem('previousSessionDate');
                    const previousTags = sessionStorage.getItem('previousSessionTags');
                    const previousSummary = sessionStorage.getItem('previousSessionSummary');
                    const previousInsights = sessionStorage.getItem('previousSessionInsights');
                    const previousActions = sessionStorage.getItem('previousSessionActions');
                    
                    // In a real app, you would pass this context to your AI
                    console.log('Continuing session from:', previousDate);
                    console.log('Previous topics:', previousTags);
                    console.log('Previous summary:', previousSummary);
                    console.log('Previous insights:', previousInsights);
                    console.log('Previous actions:', previousActions);
                    
                    // Add a message to the conversation when starting a continued session
                    const conversationContainer = document.getElementById('conversation');
                    if (conversationContainer) {
                        // Clear existing messages
                        conversationContainer.innerHTML = '';
                        
                        // Add context message
                        const contextMessage = document.createElement('div');
                        contextMessage.className = 'message ai-message';
                        contextMessage.innerHTML = `<strong>Session Context:</strong> Continuing from our discussion on ${previousDate} about ${previousTags}. <br><br>Let's pick up where we left off. How are you feeling today?`;
                        conversationContainer.appendChild(contextMessage);
                    }
                    
                    // Reset the flag
                    sessionStorage.removeItem('continueFromSession');
                }
             
             // Reset pre-checkin state
             if (preSessionMoodSlider) preSessionMoodSlider.value = 2; // Reset to neutral
             if (preSessionMoodLabel) preSessionMoodLabel.textContent = 'Neutral';
             if (preSessionMoodGraphic) preSessionMoodGraphic.innerHTML = moodFaces[2];
             preSessionFeeling = 'Neutral';
            }
        });
    }

    // End Session Flow: Session -> Post-Checkin
    if (endSessionButton && sessionScreen && postSessionCheckinScreen) {
        endSessionButton.addEventListener('click', async () => {
            stopTimer(); // Stop timer when ending session

            if (voiceChatApp && voiceChatApp.isConnected) {
                console.log('Disconnecting ElevenLabs...');
                voiceChatApp.disconnect(); // Use disconnect specifically
            }

            // Close chat if open
             if (chatInterface && chatInterface.classList.contains('active')) {
                 chatInterface.classList.remove('active');
                 if (toggleChatButton) toggleChatButton.style.display = 'flex'; 
             }
            
            setActiveScreen('postSessionCheckinScreen');
            
            // Fade out and pause background music
            if (backgroundMusic && !backgroundMusic.paused) {
                const currentVolume = backgroundMusic.volume;
                // Handle case where fadeAudio might not be defined yet
                if (typeof fadeAudio === 'function') {
                    await fadeAudio(currentVolume, 0, 1000); // Slower 1-second fade
                    backgroundMusic.pause();
                } else {
                    // Fallback if fadeAudio isn't available
                    backgroundMusic.volume = 0;
                    backgroundMusic.pause();
                }
            }
            
            // Close levels popup if open
            if (levelsPopup && levelsPopup.classList.contains('active')) {
                 levelsPopup.classList.remove('active');
            }
            
            // Optional: Clear conversation history visually?
            const conversationContainer = document.getElementById('conversation');
            if(conversationContainer){
                 // Add the initial AI message back for the next session
                 conversationContainer.innerHTML = '<div class="message ai-message">Hello, I\'m here to listen. How are you feeling today?</div>';
            }
        });
    }

    // Handle finish session button
    if (finishSessionButton) {
        finishSessionButton.addEventListener('click', function() {
            // Get the final mood value
            const moodValue = document.getElementById('postSessionMoodSlider').value;
            const moodLabel = document.getElementById('postSessionMoodLabel').textContent;
            
            // In a real app, this would be saved to a database
            console.log('Session ended with mood:', moodLabel, moodValue);
            
            // Generate session recap data
            const sessionDate = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            // Calculate session duration from timer
            const timerText = document.getElementById('sessionTimer').textContent;
            const duration = timerText || '25 minutes'; // Fallback if timer not available
            
            // Determine mood indicator class based on post-session mood
            let moodClass, moodText;
            if (moodValue > 2) {
                moodClass = 'positive';
                moodText = 'Improved';
            } else if (moodValue < 2) {
                moodClass = 'negative';
                moodText = 'Worsened';
            } else {
                moodClass = 'neutral';
                moodText = 'Unchanged';
            }
            
            // Generate random tags based on the conversation (in a real app, this would come from AI analysis)
            // For demo purposes, we'll use random tags
            const possibleTags = [
                ['anxiety', 'stress'], 
                ['relationships', 'family'], 
                ['work', 'goals'], 
                ['sleep', 'health'],
                ['grief', 'emotions'],
                ['self-care', 'mindfulness']
            ];
            const selectedTags = possibleTags[Math.floor(Math.random() * possibleTags.length)];
            
            // Populate the session recap screen
            document.getElementById('recapDate').textContent = sessionDate;
            document.getElementById('recapDuration').textContent = duration;
            document.getElementById('moodAfter').textContent = moodText;
            
            // Set mood indicator class
            const recapMoodIndicator = document.getElementById('recapMoodIndicator');
            recapMoodIndicator.className = 'mood-indicator'; // Reset classes
            recapMoodIndicator.classList.add(moodClass);
            
            // Update tags
            const recapTags = document.getElementById('recapTags');
            recapTags.innerHTML = ''; // Clear existing tags
            selectedTags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                recapTags.appendChild(tagElement);
            });
            
            // Generate session content based on tags
            let summary, insights, actions;
            
            // Simple logic to determine content based on tags
            if (selectedTags.includes('anxiety') || selectedTags.includes('stress')) {
                summary = "In this session, we explored how anxiety affects your daily life and discussed strategies for managing stress. You identified some triggers and we worked on developing coping mechanisms.";
                insights = [
                    "Recognizing physical symptoms of anxiety",
                    "The connection between thoughts and anxiety levels",
                    "How avoidance behavior reinforces anxiety"
                ];
                actions = [
                    "Practice deep breathing for 5 minutes twice daily",
                    "Keep a thought record when feeling anxious",
                    "Gradually face one avoided situation this week"
                ];
            } else if (selectedTags.includes('relationships') || selectedTags.includes('family')) {
                summary = "We focused on your relationship dynamics and communication patterns. You shared challenges with setting boundaries and we explored more effective ways to express your needs.";
                insights = [
                    "The role of your past experiences in current relationship patterns",
                    "How indirect communication creates misunderstandings",
                    "The importance of balancing your needs with others'"
                ];
                actions = [
                    "Practice using 'I' statements in difficult conversations",
                    "Set one small boundary this week",
                    "Schedule dedicated time for important relationships"
                ];
            } else if (selectedTags.includes('grief') || selectedTags.includes('emotions')) {
                summary = "This session addressed your grief process. We discussed the complex emotions you're experiencing and normalized the non-linear nature of grief.";
                insights = [
                    "Grief affects emotional, physical, and cognitive functioning",
                    "There's no 'right way' to grieve",
                    "The importance of memorializing and meaning-making"
                ];
                actions = [
                    "Allow yourself 10 minutes daily to acknowledge your feelings",
                    "Create a small ritual to honor your loss",
                    "Reach out to one supportive person this week"
                ];
            } else if (selectedTags.includes('work') || selectedTags.includes('goals')) {
                summary = "We explored your career aspirations and the obstacles you're facing. You identified patterns of self-doubt and we worked on building confidence in your professional abilities.";
                insights = [
                    "How perfectionism impacts your career satisfaction",
                    "The gap between your perceived and actual abilities",
                    "The importance of defining success on your own terms"
                ];
                actions = [
                    "List three professional achievements you're proud of",
                    "Take one small step toward a career goal this week",
                    "Practice receiving feedback without self-criticism"
                ];
            } else if (selectedTags.includes('sleep') || selectedTags.includes('health')) {
                summary = "We discussed your health concerns, particularly focusing on sleep patterns and overall wellness. You identified factors affecting your rest and we explored strategies to improve your sleep hygiene.";
                insights = [
                    "The connection between stress and physical symptoms",
                    "How sleep quality affects mental and physical health",
                    "Small lifestyle changes can lead to significant health improvements"
                ];
                actions = [
                    "Establish a consistent sleep schedule",
                    "Create a calming bedtime routine",
                    "Track your sleep patterns and energy levels"
                ];
            } else {
                // Default content
                summary = "In this session, we explored your current challenges and discussed strategies for moving forward. You gained insights into your patterns and identified actionable steps for positive change.";
                insights = [
                    "Awareness is the first step toward change",
                    "Small, consistent actions create lasting results",
                    "Self-compassion supports your growth process"
                ];
                actions = [
                    "Practice daily mindfulness for 5 minutes",
                    "Notice and write down one positive moment each day",
                    "Implement one self-care activity this week"
                ];
            }
            
            // Update recap content
            document.getElementById('recapSummary').textContent = summary;
            
            // Update insights list
            const insightsList = document.getElementById('recapInsights');
            insightsList.innerHTML = ''; // Clear existing items
            insights.forEach(insight => {
                const li = document.createElement('li');
                li.textContent = insight;
                insightsList.appendChild(li);
            });
            
            // Update actions list
            const actionsList = document.getElementById('recapActions');
            actionsList.innerHTML = ''; // Clear existing items
            actions.forEach(action => {
                const li = document.createElement('li');
                li.textContent = action;
                actionsList.appendChild(li);
            });
            
            // Set a flag to indicate this is a post-session recap
            sessionStorage.setItem('isPostSessionRecap', 'true');
            
            // Navigate to the session recap screen
            setActiveScreen('sessionRecapScreen');
            
            // Show the floating Done button
            const doneButton = document.getElementById('doneRecapBtn');
            if (doneButton) {
                doneButton.classList.remove('hidden');
            }
            
            // Set up back button to return to home screen
            const backFromRecapBtn = document.getElementById('backFromRecapBtn');
            if (backFromRecapBtn) {
                backFromRecapBtn.onclick = function() {
                    setActiveScreen('welcomeScreen');
                };
            }
        });
    }

    // Handle the Done button click
    const doneRecapBtn = document.getElementById('doneRecapBtn');
    if (doneRecapBtn) {
        doneRecapBtn.addEventListener('click', function() {
            setActiveScreen('welcomeScreen');
            // Reset session data
            sessionStorage.removeItem('isPostSessionRecap');
        });
    }

    // Toggle Chat Panel
    if (toggleChatButton && chatInterface) {
        toggleChatButton.addEventListener('click', () => {
            console.log('Opening chat interface');
            chatInterface.classList.add('active');
            toggleChatButton.style.display = 'none'; // Hide button when panel open
        });
    }

    if (closeChatButton && chatInterface && toggleChatButton) {
        closeChatButton.addEventListener('click', () => {
            chatInterface.classList.remove('active');
             toggleChatButton.style.display = 'flex'; // Show button again
        });
    }

    // Toggle Levels Popup
    if (levelsButton && levelsPopup) {
        levelsButton.addEventListener('click', () => {
            levelsPopup.classList.toggle('active');
        });
    }
    if (closeLevelsPopup && levelsPopup) {
        closeLevelsPopup.addEventListener('click', () => {
            levelsPopup.classList.remove('active');
        });
    }

    // Music Mute/Unmute Toggle
    if (musicToggleButton && backgroundMusic && musicToggleIcon) {
        musicToggleButton.addEventListener('click', async () => {
            isMusicMuted = !isMusicMuted;
            
            if (isMusicMuted) {
                // --- MUTING --- 
                // Fade out music
                const currentVolume = backgroundMusic.volume;
                await fadeAudio(currentVolume, 0);
                musicVolumeSlider.value = 0; // Sync slider
                
                // Show music note icon when muted (music is OFF)
                musicToggleIcon.innerHTML = '<i class="fas fa-music"></i>';
                // Title indicates action to UNMUTE
                musicToggleButton.title = "Unmute Music";
            } else {
                // --- UNMUTING ---
                // Get target volume from slider (or default if slider is 0)
                let targetVolume = parseInt(musicVolumeSlider.value, 10) / 100;
                if (targetVolume === 0) {
                    targetVolume = defaultMusicVolume;
                    musicVolumeSlider.value = targetVolume * 100;
                }
                
                // Fade in music
                await fadeAudio(0, targetVolume);
                
                // Show no-music icon when playing (music is ON)
                musicToggleIcon.innerHTML = '<span class="mute-icon"></span>';
                // Title indicates action to MUTE
                musicToggleButton.title = "Mute Music";
            }
            console.log(`Music muted: ${isMusicMuted}, Volume: ${backgroundMusic.volume}`);
        });
        
        // Set initial icon based on the default state (unmuted)
        musicToggleIcon.innerHTML = '<span class="mute-icon"></span>'; // Music ON, show no-music icon
    }

    // Music Volume Slider
    if (musicVolumeSlider && backgroundMusic) {
        let volumeChangeTimeout;
        
        musicVolumeSlider.addEventListener('input', () => {
            const musicVolume = parseInt(musicVolumeSlider.value, 10) / 100;
            
            // Debounce rapid volume changes for smoother experience
            if (volumeChangeTimeout) clearTimeout(volumeChangeTimeout);
            
            volumeChangeTimeout = setTimeout(() => {
                // Apply volume change with fade if it's a significant change
                const currentVolume = backgroundMusic.volume;
                if (Math.abs(currentVolume - musicVolume) > 0.1) {
                    // Only use fade for larger changes to avoid delay on small adjustments
                    fadeAudio(currentVolume, musicVolume, 150);
                } else {
                    backgroundMusic.volume = musicVolume;
                }
            }, 20);
            
            // Update UI immediately without waiting for fade
            if (musicVolume > 0 && isMusicMuted) {
                isMusicMuted = false;
                // Update icon/title to reflect UNMUTED state (action is MUTE)
                if (musicToggleIcon) {
                    musicToggleIcon.innerHTML = '<span class="mute-icon"></span>';
                }
                if (musicToggleButton) musicToggleButton.title = "Mute Music";
            } else if (musicVolume === 0 && !isMusicMuted) {
                isMusicMuted = true;
                // Update icon/title to reflect MUTED state (action is UNMUTE)
                if (musicToggleIcon) {
                    musicToggleIcon.innerHTML = '<i class="fas fa-music"></i>';
                }
                if (musicToggleButton) musicToggleButton.title = "Unmute Music";
            }
            console.log(`Music volume slider: ${musicVolume}`);
        });
    }

    // Agent Volume Slider
    if (agentVolumeSlider) {
        agentVolumeSlider.addEventListener('input', () => {
            const agentVolume = parseInt(agentVolumeSlider.value, 10) / 100;
            if (voiceChatApp && typeof voiceChatApp.setAgentVolume === 'function') {
                voiceChatApp.setAgentVolume(agentVolume);
            } else {
                 console.warn("voiceChatApp not ready or setAgentVolume not available.");
            }
            console.log(`Agent volume slider: ${agentVolume}`);
        });
    }
    
    // Reverb Slider
    if (reverbSlider) {
        reverbSlider.addEventListener('input', () => {
            const reverbLevel = parseInt(reverbSlider.value, 10) / 100;
            if (voiceChatApp && typeof voiceChatApp.setReverbLevel === 'function') {
                voiceChatApp.setReverbLevel(reverbLevel);
            } else {
                console.warn("voiceChatApp not ready or setReverbLevel not available.");
            }
            console.log(`Reverb level slider: ${reverbLevel}`);
        });
    }

    // CC Toggle
    if (ccToggleButton) {
        // Set initial state (active by default)
        ccToggleButton.classList.add('active');
        
        // Handle button click
        ccToggleButton.addEventListener('click', () => {
            if (voiceChatApp && typeof voiceChatApp.toggleSubtitles === 'function') {
                voiceChatApp.toggleSubtitles();
            }
        });
    }

    // Log Mood button
    if (logMoodBtn) {
        logMoodBtn.addEventListener('click', () => {
            setActiveScreen('logMoodScreen'); // This would be a new screen in a real app
            alert('Mood logging would be implemented here in a complete app');
            // For now, just go back to welcome screen
            setActiveScreen('welcomeScreen');
        });
    }

    // Add event listeners for session cards (we can make them clickable to show details)
    const sessionCards = document.querySelectorAll('.session-cards .session-card');
    if (sessionCards) {
        sessionCards.forEach(card => {
            card.addEventListener('click', function() {
                // In a real app, this would show session details
                console.log('Session details clicked:', this.querySelector('.session-date').textContent);
                // Could implement modal or detailed view here
            });
        });
    }

    // Handle View All Sessions button
    const viewAllSessionsBtn = document.getElementById('viewAllSessionsBtn');
    const allSessionsScreen = document.getElementById('allSessionsScreen');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    
    if (viewAllSessionsBtn) {
        viewAllSessionsBtn.addEventListener('click', function() {
            // Navigate to the All Sessions screen instead of showing a popup
            setActiveScreen('allSessionsScreen');
        });
    }
    
    // Handle Back button on All Sessions screen
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', function() {
            // Navigate back to the home screen
            setActiveScreen('welcomeScreen');
        });
    }
    
    // Add event listeners for session cards in the all sessions screen
    const allSessionCards = document.querySelectorAll('#allSessionsScreen .session-card');
    if (allSessionCards) {
        allSessionCards.forEach(card => {
            card.addEventListener('click', function() {
                // Show the session recap for the clicked card
                showSessionRecap(this);
            });
        });
    }
    
    // Add session recap functionality for home screen cards
    const homeSessionCards = document.querySelectorAll('#welcomeScreen .session-card');
    if (homeSessionCards) {
        homeSessionCards.forEach(card => {
            card.addEventListener('click', function() {
                // Show the session recap for the clicked card
                showSessionRecap(this);
            });
        });
    }
    
    // Handle the back button on the session recap screen
    const backFromRecapBtn = document.getElementById('backFromRecapBtn');
    if (backFromRecapBtn) {
        backFromRecapBtn.addEventListener('click', function() {
            // Store the previously active screen to return to
            const returnScreen = sessionStorage.getItem('previousScreen') || 'welcomeScreen';
            setActiveScreen(returnScreen);
        });
    }
    
    // Handle the continue discussion button on the session recap screen
    const continueDiscussionBtn = document.getElementById('continueDiscussionBtn');
    if (continueDiscussionBtn) {
        continueDiscussionBtn.addEventListener('click', function() {
            // Get session context to pass to the new session
            const sessionDate = document.getElementById('recapDate').textContent;
            const sessionTags = Array.from(document.getElementById('recapTags').querySelectorAll('.tag'))
                .map(tag => tag.textContent)
                .join(', ');
            const sessionSummary = document.getElementById('recapSummary').textContent;
            
            // Store session context to use in the new session
            sessionStorage.setItem('continueFromSession', 'true');
            sessionStorage.setItem('previousSessionDate', sessionDate);
            sessionStorage.setItem('previousSessionTags', sessionTags);
            sessionStorage.setItem('previousSessionSummary', sessionSummary);
            
            // Get insights and action items to include in context
            const insights = Array.from(document.getElementById('recapInsights').querySelectorAll('li'))
                .map(li => li.textContent)
                .join('; ');
            const actions = Array.from(document.getElementById('recapActions').querySelectorAll('li'))
                .map(li => li.textContent)
                .join('; ');
                
            sessionStorage.setItem('previousSessionInsights', insights);
            sessionStorage.setItem('previousSessionActions', actions);
            
            // Navigate to pre-session check-in screen, then to session
            setActiveScreen('preSessionCheckinScreen');
            
            // Update the session start button text
            const startSessionButton = document.getElementById('startSessionAfterCheckin');
            if (startSessionButton) {
                startSessionButton.textContent = 'Continue Session';
            }
        });
    }
    
    // Function to show session recap and populate data from the clicked card
    function showSessionRecap(sessionCard) {
        // Store current screen to return to later
        const currentScreen = document.querySelector('.screen.active').id;
        sessionStorage.setItem('previousScreen', currentScreen);
        
        // Extract data from the clicked card
        const date = sessionCard.querySelector('.session-date').textContent;
        const duration = sessionCard.querySelector('.session-duration').textContent;
        
        // Get mood indicator class
        const moodIndicator = sessionCard.querySelector('.mood-indicator');
        const moodClass = moodIndicator.classList.contains('positive') ? 'positive' : 
                         moodIndicator.classList.contains('negative') ? 'negative' : 'neutral';
        
        // Get mood text based on class
        const moodText = moodClass === 'positive' ? 'Improved' : 
                        moodClass === 'negative' ? 'Worsened' : 'Unchanged';
        
        // Get tags
        const tags = Array.from(sessionCard.querySelectorAll('.tag')).map(tag => tag.textContent);
        
        // Populate the recap screen with data
        document.getElementById('recapDate').textContent = date;
        document.getElementById('recapDuration').textContent = duration.replace('<i class="fas fa-clock"></i>', '').trim();
        document.getElementById('moodAfter').textContent = moodText;
        
        // Update mood indicator class
        const recapMoodIndicator = document.getElementById('recapMoodIndicator');
        recapMoodIndicator.className = 'mood-indicator'; // Reset classes
        recapMoodIndicator.classList.add(moodClass);
        
        // Update tags
        const recapTags = document.getElementById('recapTags');
        recapTags.innerHTML = ''; // Clear existing tags
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            recapTags.appendChild(tagElement);
        });
        
        // Show predefined content based on session topic
        // In a real app, this would come from a database
        let summary, insights, actions;
        
        // Simple logic to determine content based on tags
        if (tags.includes('anxiety') || tags.includes('stress')) {
            summary = "In this session, we explored how anxiety affects your daily life and discussed strategies for managing stress. You identified some triggers and we worked on developing coping mechanisms.";
            insights = [
                "Recognizing physical symptoms of anxiety",
                "The connection between thoughts and anxiety levels",
                "How avoidance behavior reinforces anxiety"
            ];
            actions = [
                "Practice deep breathing for 5 minutes twice daily",
                "Keep a thought record when feeling anxious",
                "Gradually face one avoided situation this week"
            ];
        } else if (tags.includes('relationships') || tags.includes('family')) {
            summary = "We focused on your relationship dynamics and communication patterns. You shared challenges with setting boundaries and we explored more effective ways to express your needs.";
            insights = [
                "The role of your past experiences in current relationship patterns",
                "How indirect communication creates misunderstandings",
                "The importance of balancing your needs with others'"
            ];
            actions = [
                "Practice using 'I' statements in difficult conversations",
                "Set one small boundary this week",
                "Schedule dedicated time for important relationships"
            ];
        } else if (tags.includes('grief')) {
            summary = "This session addressed your grief process. We discussed the complex emotions you're experiencing and normalized the non-linear nature of grief.";
            insights = [
                "Grief affects emotional, physical, and cognitive functioning",
                "There's no 'right way' to grieve",
                "The importance of memorializing and meaning-making"
            ];
            actions = [
                "Allow yourself 10 minutes daily to acknowledge your feelings",
                "Create a small ritual to honor your loss",
                "Reach out to one supportive person this week"
            ];
        } else if (tags.includes('career') || tags.includes('goals')) {
            summary = "We explored your career aspirations and the obstacles you're facing. You identified patterns of self-doubt and we worked on building confidence in your professional abilities.";
            insights = [
                "How perfectionism impacts your career satisfaction",
                "The gap between your perceived and actual abilities",
                "The importance of defining success on your own terms"
            ];
            actions = [
                "List three professional achievements you're proud of",
                "Take one small step toward a career goal this week",
                "Practice receiving feedback without self-criticism"
            ];
        } else {
            // Default content
            summary = "In this session, we explored your current challenges and discussed strategies for moving forward. You gained insights into your patterns and identified actionable steps for positive change.";
            insights = [
                "Awareness is the first step toward change",
                "Small, consistent actions create lasting results",
                "Self-compassion supports your growth process"
            ];
            actions = [
                "Practice daily mindfulness for 5 minutes",
                "Notice and write down one positive moment each day",
                "Implement one self-care activity this week"
            ];
        }
        
        // Update recap content
        document.getElementById('recapSummary').textContent = summary;
        
        // Update insights list
        const insightsList = document.getElementById('recapInsights');
        insightsList.innerHTML = ''; // Clear existing items
        insights.forEach(insight => {
            const li = document.createElement('li');
            li.textContent = insight;
            insightsList.appendChild(li);
        });
        
        // Update actions list
        const actionsList = document.getElementById('recapActions');
        actionsList.innerHTML = ''; // Clear existing items
        actions.forEach(action => {
            const li = document.createElement('li');
            li.textContent = action;
            actionsList.appendChild(li);
        });
        
        // This is not a post-session recap
        sessionStorage.setItem('isPostSessionRecap', 'false');
        
        // Hide the floating Done button
        const doneButton = document.getElementById('doneRecapBtn');
        if (doneButton) {
            doneButton.classList.add('hidden');
        }
        
        // Navigate to the recap screen
        setActiveScreen('sessionRecapScreen');
    }

    // Streak popup functionality
    const streakIndicator = document.getElementById('streakIndicator');
    const streakPopup = document.getElementById('streakPopup');
    const closeStreakPopup = document.getElementById('closeStreakPopup');
    
    if (streakIndicator && streakPopup) {
        streakIndicator.addEventListener('click', function() {
            streakPopup.classList.add('active');
        });
    }
    
    if (closeStreakPopup && streakPopup) {
        closeStreakPopup.addEventListener('click', function() {
            streakPopup.classList.remove('active');
        });
    }
    
    // Close streak popup when clicking outside
    document.addEventListener('click', function(event) {
        if (streakPopup && streakPopup.classList.contains('active')) {
            // Check if the click was outside the streak popup and not on the streak indicator
            if (!streakPopup.contains(event.target) && !streakIndicator.contains(event.target)) {
                streakPopup.classList.remove('active');
            }
        }
    });
    
    // Profile dropdown functionality
    initProfileDropdown();
    
    // Settings toggles and controls
    const notificationToggle = document.getElementById('notificationToggle');
    if (notificationToggle) {
        notificationToggle.addEventListener('change', function() {
            console.log('Notifications:', this.checked ? 'enabled' : 'disabled');
        });
    }
    
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function() {
            // Toggle dark mode class on body
            document.body.classList.toggle('dark-mode', this.checked);
            console.log('Dark mode:', this.checked ? 'enabled' : 'disabled');
        });
    }
    
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            console.log('Language changed to:', this.value);
        });
    }
    
    const sessionDurationSelect = document.getElementById('sessionDurationSelect');
    if (sessionDurationSelect) {
        sessionDurationSelect.addEventListener('change', function() {
            console.log('Session duration changed to:', this.value, 'minutes');
        });
    }
    
    const defaultVolumeSlider = document.getElementById('defaultVolumeSlider');
    if (defaultVolumeSlider) {
        defaultVolumeSlider.addEventListener('input', function() {
            console.log('Default volume changed to:', this.value);
        });
    }
    
    const dataStorageSelect = document.getElementById('dataStorageSelect');
    if (dataStorageSelect) {
        dataStorageSelect.addEventListener('change', function() {
            console.log('Data storage duration changed to:', this.value === '0' ? 'Forever' : this.value + ' days');
        });
    }
    
    const downloadDataBtn = document.getElementById('downloadDataBtn');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', function() {
            console.log('Downloading user data...');
            alert('Your data will be prepared and downloaded as a ZIP file.');
        });
    }
    
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                console.log('Account deletion requested');
                alert('Your account has been scheduled for deletion. You will receive a confirmation email.');
                setActiveScreen('welcomeScreen');
            }
        });
    }

    // Initialize mood chart
    initMoodChart();
});

// Function to initialize and render the mood chart
function initMoodChart() {
    const ctx = document.getElementById('moodChart');
    
    if (!ctx) return; // Exit if canvas not found
    
    // Mock data - in a real app, this would come from a database
    const moodData = [
        { day: 'Monday', value: 4 },    // Very happy (top)
        { day: 'Tuesday', value: 1 },   // Sad (bottom)
        { day: 'Wednesday', value: 2 },  // Neutral (middle)
        { day: 'Thursday', value: 3 },   // Happy
        { day: 'Friday', value: 4 },     // Very happy
        { day: 'Saturday', value: 3 },   // Happy
        { day: 'Sunday', value: 2 }      // Neutral
    ];
    
    // Draw the chart
    drawMoodChart(ctx, moodData);
    
    // Set up navigation buttons
    const prevBtn = document.querySelector('.chart-nav-btn.prev');
    const nextBtn = document.querySelector('.chart-nav-btn.next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            // In a real app, this would load the previous week's data
            alert('Would load previous week data');
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            // In a real app, this would load the next week's data
            alert('Would load next week data');
        });
    }
}

// Function to draw the mood chart
function drawMoodChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Skip drawing if no data
    if (!data || data.length === 0) return;
    
    // Calculate spacing between points
    const spaceBetweenPoints = width / (data.length - 1);
    
    // Define colors - brightened for better visibility
    const lineColor = '#6b89ff'; // Even brighter blue
    const pointColor = '#ffde59'; // Bright yellow
    
    // Draw the grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Brighter grid lines for better visibility
    ctx.lineWidth = 1;
    
    // Draw horizontal grid lines
    for (let i = 0; i < 5; i++) {
        const y = (height * i) / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw vertical grid lines
    for (let i = 0; i < data.length; i++) {
        const x = i * spaceBetweenPoints;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Start drawing the line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5; // Slightly thinner for cleaner look
    ctx.lineJoin = 'round';
    
    // Map the first point
    // Note: Points go from bottom to top (1 = bottom, 5 = top)
    let x = 0;
    let y = height - (data[0].value / 4) * height;
    ctx.moveTo(x, y);
    
    // Create a line through all points
    for (let i = 1; i < data.length; i++) {
        x = i * spaceBetweenPoints;
        y = height - (data[i].value / 4) * height;
        ctx.lineTo(x, y);
    }
    
    // Draw the line
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = pointColor;
    for (let i = 0; i < data.length; i++) {
        x = i * spaceBetweenPoints;
        y = height - (data[i].value / 4) * height;
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2); // Smaller points
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'; // Darker border for contrast
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

// Function to initialize profile dropdown
function initProfileDropdown() {
    const profileButton = document.querySelector('.profile-button');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    console.log('Profile button:', profileButton);
    console.log('Profile dropdown:', profileDropdown);
    
    if (profileButton) {
        profileButton.addEventListener('click', function(event) {
            console.log('Profile button clicked');
            // Prevent the click from propagating to document
            event.stopPropagation();
            
            // Toggle the dropdown
            if (profileDropdown) {
                console.log('Toggling dropdown');
                profileDropdown.classList.toggle('active');
            }
        });
        
        // Close the dropdown when clicking outside
        document.addEventListener('click', function(event) {
            console.log('Document clicked');
            if (!profileButton.contains(event.target) && profileDropdown && profileDropdown.classList.contains('active')) {
                console.log('Closing dropdown');
                profileDropdown.classList.remove('active');
            }
        });
    }
    
    // Edit Profile and Settings Navigation
    if (profileDropdown) {
        console.log('Setting up dropdown item handlers');
        
        const editProfileItem = profileDropdown.querySelector('.dropdown-item[data-action="edit-profile"]');
        if (editProfileItem) {
            console.log('Found edit profile item');
            editProfileItem.addEventListener('click', function(event) {
                console.log('Edit profile clicked');
                profileDropdown.classList.remove('active');
                setActiveScreen('editProfileScreen');
            });
        }
        
        const settingsItem = profileDropdown.querySelector('.dropdown-item[data-action="settings"]');
        if (settingsItem) {
            console.log('Found settings item');
            settingsItem.addEventListener('click', function(event) {
                console.log('Settings clicked');
                profileDropdown.classList.remove('active');
                setActiveScreen('settingsScreen');
            });
        }
    }
    
    // Back buttons for profile and settings screens
    const backFromProfileBtn = document.getElementById('backFromProfileBtn');
    if (backFromProfileBtn) {
        backFromProfileBtn.addEventListener('click', function() {
            setActiveScreen('welcomeScreen');
        });
    }
    
    const backFromSettingsBtn = document.getElementById('backFromSettingsBtn');
    if (backFromSettingsBtn) {
        backFromSettingsBtn.addEventListener('click', function() {
            setActiveScreen('welcomeScreen');
        });
    }
    
    // Save profile button
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            // Get form values
            const name = document.getElementById('profileName').value;
            const email = document.getElementById('profileEmail').value;
            const phone = document.getElementById('profilePhone').value;
            const bio = document.getElementById('profileBio').value;
            
            // In a real app, you would save these values to a database or local storage
            console.log('Saving profile:', { name, email, phone, bio });
            
            // Show success message
            alert('Profile updated successfully!');
            
            // Navigate back to welcome screen
            setActiveScreen('welcomeScreen');
        });
    }
}
