/**
 * SubtitleProcessor - Handles the creation and synchronization of subtitles
 * with the AI agent's voice playback.
 */
class SubtitleProcessor {
    constructor() {
        this.subtitlesContainer = document.getElementById('subtitlesContainer');
        this.currentSentence = '';
        this.currentWords = [];
        this.isDisplaying = false;
        this.wordIndex = 0;
        this.wordInterval = null;
        this.averageWordDuration = 300; // Default average time per word in ms
        this.enabled = true; // Subtitles enabled by default
        this.completeSentences = []; // Store all sentences for the current response
    }

    /**
     * Toggle subtitles on/off
     * @returns {boolean} New state (true = enabled, false = disabled)
     */
    toggleEnabled() {
        this.enabled = !this.enabled;
        
        // If disabling, hide the container
        if (!this.enabled && this.subtitlesContainer) {
            this.subtitlesContainer.style.display = 'none';
        } else if (this.enabled && this.subtitlesContainer) {
            this.subtitlesContainer.style.display = 'flex';
            
            // If we have sentences already, redisplay them
            if (this.completeSentences.length > 0 && !this.isDisplaying) {
                this.redisplayCompleteSentences();
            }
        }
        
        return this.enabled;
    }
    
    /**
     * Set the enabled state directly
     * @param {boolean} state - Whether subtitles should be enabled
     */
    setEnabled(state) {
        if (this.enabled !== state) {
            this.enabled = state;
            
            // Apply visibility
            if (this.subtitlesContainer) {
                this.subtitlesContainer.style.display = this.enabled ? 'flex' : 'none';
            }
            
            // Redisplay if enabling and we have content
            if (this.enabled && this.completeSentences.length > 0 && !this.isDisplaying) {
                this.redisplayCompleteSentences();
            }
        }
    }

    /**
     * Prepare a new sentence for word-by-word display
     * @param {string} sentence - The full sentence to display
     * @param {number} audioDuration - Duration of the audio in seconds
     * @param {boolean} isNewResponse - Whether this is the start of a new response
     */
    prepareSentence(sentence, audioDuration, isNewResponse = false) {
        // If disabled, don't do anything
        if (!this.enabled) return;
        
        // If this is a new response, clear previous sentences
        if (isNewResponse) {
            this.completeSentences = [];
            // Clear display immediately for new responses
            this.subtitlesContainer.innerHTML = '';
        }
        
        // Add this sentence to our complete sentences array
        this.completeSentences.push(sentence);
        
        // Save the current sentence and split into words
        this.currentSentence = sentence;
        this.currentWords = sentence.split(' ').filter(word => word.trim() !== '');
        
        // Calculate average time per word based on audio duration
        if (audioDuration && this.currentWords.length > 0) {
            this.averageWordDuration = (audioDuration * 1000) / this.currentWords.length;
        }

        // Create word elements but keep them hidden
        this.createWordElements();
    }

    /**
     * Create DOM elements for each word
     */
    createWordElements() {
        if (!this.subtitlesContainer) return;

        // Clear existing content
        this.subtitlesContainer.innerHTML = '';
        
        // Create a span for each word
        this.currentWords.forEach(word => {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = word;
            wordSpan.className = 'subtitle-word';
            this.subtitlesContainer.appendChild(wordSpan);
            
            // Add space after each word (except the last one)
            const space = document.createTextNode(' ');
            this.subtitlesContainer.appendChild(space);
        });
    }

    /**
     * Start displaying words one by one with timing
     */
    startWordDisplay() {
        if (!this.enabled || !this.subtitlesContainer || this.currentWords.length === 0) return;
        
        this.isDisplaying = true;
        this.wordIndex = 0;
        
        // Clear any existing interval
        if (this.wordInterval) {
            clearInterval(this.wordInterval);
        }
        
        // Function to show next word
        const showNextWord = () => {
            if (this.wordIndex < this.currentWords.length) {
                const wordElements = this.subtitlesContainer.querySelectorAll('.subtitle-word');
                if (wordElements[this.wordIndex]) {
                    wordElements[this.wordIndex].classList.add('visible');
                }
                this.wordIndex++;
            } else {
                // End of sentence
                clearInterval(this.wordInterval);
                this.isDisplaying = false;
                
                // Do not clear subtitles - keep them visible until the response completes
                // The clearSubtitles method will be called externally when appropriate
            }
        };
        
        // Start immediately with first word
        showNextWord();
        
        // Continue with interval for remaining words
        this.wordInterval = setInterval(showNextWord, this.averageWordDuration);
    }
    
    /**
     * Redisplay all complete sentences (used when toggling subtitles back on)
     */
    redisplayCompleteSentences() {
        if (!this.enabled || !this.subtitlesContainer || this.completeSentences.length === 0) return;
        
        // Join all sentences with a space
        const fullText = this.completeSentences.join(' ');
        
        // Clear container
        this.subtitlesContainer.innerHTML = '';
        
        // Create a single span with all text
        const textSpan = document.createElement('span');
        textSpan.textContent = fullText;
        textSpan.className = 'subtitle-word visible'; // Make visible immediately
        this.subtitlesContainer.appendChild(textSpan);
    }

    /**
     * Clear all subtitles
     */
    clearSubtitles() {
        if (this.wordInterval) {
            clearInterval(this.wordInterval);
            this.wordInterval = null;
        }
        
        this.isDisplaying = false;
        this.completeSentences = []; // Clear stored sentences
        
        if (this.subtitlesContainer) {
            // Clear completely
            this.subtitlesContainer.innerHTML = '';
        }
    }
}

// Export for use in other files
window.SubtitleProcessor = SubtitleProcessor;
