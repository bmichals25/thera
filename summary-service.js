/**
 * Summary Service - Integrates with ElevenLabs webhooks to provide conversation summaries
 * This service processes conversation data and creates summaries that can be used by ElevenLabs
 */

class SummaryService {
    constructor() {
        this.conversationHistory = [];
        this.apiKey = null; // ElevenLabs API key
        this.webhookEndpoint = null; // ElevenLabs webhook endpoint
        this.summaryTemplate = {
            session_insights: {
                key_themes: [],
                emotional_state: "",
                actionable_insights: []
            },
            progress_tracking: {
                previous_goals: [],
                goal_progress: [],
                new_goals: []
            }
        };
    }

    // Initialize the service with API credentials
    initialize(apiKey, webhookEndpoint) {
        this.apiKey = apiKey;
        this.webhookEndpoint = webhookEndpoint;
        console.log("Summary service initialized");
        return this;
    }

    // Add a message to the conversation history
    addMessage(sender, text, timestamp = new Date().toISOString()) {
        this.conversationHistory.push({
            sender,
            text,
            timestamp
        });
    }

    // Clear conversation history
    clearHistory() {
        this.conversationHistory = [];
    }

    // Generate a summary of the conversation
    async generateSummary() {
        if (this.conversationHistory.length === 0) {
            console.warn("No conversation history to summarize");
            return null;
        }

        try {
            // Extract user messages and agent responses
            const userMessages = this.conversationHistory
                .filter(msg => msg.sender === 'user')
                .map(msg => msg.text);
            
            const agentMessages = this.conversationHistory
                .filter(msg => msg.sender === 'agent')
                .map(msg => msg.text);

            // Create a conversation transcript
            const transcript = this.conversationHistory
                .map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`)
                .join('\n');

            // Extract key themes (simplified implementation)
            const keyThemes = this._extractKeyThemes(userMessages.join(' ') + ' ' + agentMessages.join(' '));
            
            // Determine emotional state (simplified implementation)
            const emotionalState = this._analyzeEmotionalState(userMessages.join(' '));
            
            // Generate actionable insights (simplified implementation)
            const actionableInsights = this._generateActionableInsights(transcript);

            // Create the summary object
            const summary = {
                ...this.summaryTemplate,
                session_insights: {
                    key_themes: keyThemes,
                    emotional_state: emotionalState,
                    actionable_insights: actionableInsights
                },
                progress_tracking: {
                    previous_goals: this._extractPreviousGoals(transcript),
                    goal_progress: this._analyzeGoalProgress(transcript),
                    new_goals: this._identifyNewGoals(transcript)
                },
                conversation_statistics: {
                    total_messages: this.conversationHistory.length,
                    user_messages: userMessages.length,
                    agent_messages: agentMessages.length,
                    duration_minutes: this._calculateConversationDuration()
                },
                timestamp: new Date().toISOString()
            };

            // Send the summary to ElevenLabs if webhook is configured
            if (this.apiKey && this.webhookEndpoint) {
                await this._sendToElevenLabs(summary);
            }

            return summary;
        } catch (error) {
            console.error("Error generating summary:", error);
            return null;
        }
    }

    // Send the summary to ElevenLabs via webhook
    async _sendToElevenLabs(summary) {
        try {
            const response = await fetch(this.webhookEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey
                },
                body: JSON.stringify({
                    summary_data: summary,
                    metadata: {
                        source: 'therapy_app',
                        version: '1.0',
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`ElevenLabs webhook failed with status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Summary sent to ElevenLabs successfully:", data);
            return data;
        } catch (error) {
            console.error("Failed to send summary to ElevenLabs:", error);
            throw error;
        }
    }

    // Simple implementation of key theme extraction
    _extractKeyThemes(text) {
        // This is a placeholder implementation
        // In a real app, you'd use NLP techniques or an AI model
        const commonThemes = [
            "anxiety", "depression", "stress", "relationships", 
            "work", "family", "health", "wellness", "progress", 
            "coping", "self-care", "motivation"
        ];
        
        return commonThemes
            .filter(theme => text.toLowerCase().includes(theme))
            .slice(0, 5); // Limit to 5 themes
    }

    // Simple implementation of emotional state analysis
    _analyzeEmotionalState(text) {
        // This is a placeholder implementation
        // In a real app, you'd use sentiment analysis or an AI model
        const emotionIndicators = {
            "happy": ["happy", "joy", "excited", "pleased", "glad"],
            "sad": ["sad", "unhappy", "disappointed", "depressed", "down"],
            "anxious": ["anxious", "worried", "nervous", "afraid", "panic"],
            "angry": ["angry", "upset", "frustrated", "annoyed", "mad"],
            "calm": ["calm", "peaceful", "relaxed", "serene", "tranquil"]
        };
        
        let maxEmotion = "neutral";
        let maxCount = 0;
        
        Object.entries(emotionIndicators).forEach(([emotion, keywords]) => {
            const count = keywords.reduce((acc, keyword) => {
                return acc + (text.toLowerCase().split(keyword).length - 1);
            }, 0);
            
            if (count > maxCount) {
                maxCount = count;
                maxEmotion = emotion;
            }
        });
        
        return maxEmotion;
    }

    // Simple implementation of actionable insights generation
    _generateActionableInsights(transcript) {
        // This is a placeholder implementation
        // In a real app, you'd use NLP techniques or an AI model
        const insights = [];
        
        // Look for patterns indicating potential insights
        if (transcript.toLowerCase().includes("sleep")) {
            insights.push("Focus on improving sleep habits");
        }
        
        if (transcript.toLowerCase().includes("exercise") || 
            transcript.toLowerCase().includes("physical") || 
            transcript.toLowerCase().includes("activity")) {
            insights.push("Incorporate more physical activity into daily routine");
        }
        
        if (transcript.toLowerCase().includes("stress") || 
            transcript.toLowerCase().includes("anxious") || 
            transcript.toLowerCase().includes("worry")) {
            insights.push("Practice stress reduction techniques daily");
        }
        
        // Add a generic insight if none were found
        if (insights.length === 0) {
            insights.push("Continue current therapy approach and monitor progress");
        }
        
        return insights;
    }

    // Extract previous goals from transcript
    _extractPreviousGoals(transcript) {
        // This is a placeholder implementation
        // In a real app, you'd use more sophisticated NLP techniques
        const goals = [];
        
        // Simple regex pattern to find goal statements from previous sessions
        const goalPattern = /previous goal|last time.+?(wanted to|planned to|goal was)/gi;
        const matches = transcript.match(goalPattern);
        
        if (matches) {
            // Just return the matches as simple goals for this demo
            return matches.slice(0, 3).map(match => match.trim());
        }
        
        return goals;
    }

    // Analyze progress on goals
    _analyzeGoalProgress(transcript) {
        // This is a placeholder implementation
        const progress = [];
        
        // Simple check for progress indicators
        if (transcript.toLowerCase().includes("progress")) {
            progress.push("General progress detected in conversation");
        }
        
        if (transcript.toLowerCase().includes("improved") || 
            transcript.toLowerCase().includes("better") || 
            transcript.toLowerCase().includes("accomplished")) {
            progress.push("Client reports improvement in target areas");
        }
        
        if (transcript.toLowerCase().includes("struggle") || 
            transcript.toLowerCase().includes("difficult") || 
            transcript.toLowerCase().includes("challenge")) {
            progress.push("Client still facing challenges in some areas");
        }
        
        return progress;
    }

    // Identify new goals
    _identifyNewGoals(transcript) {
        // This is a placeholder implementation
        const goals = [];
        
        // Simple regex pattern to find new goal statements
        const goalPattern = /I want to|I would like to|my goal is|going to try to/gi;
        const matches = transcript.match(goalPattern);
        
        if (matches) {
            // Just return the matches as simple goals for this demo
            return matches.slice(0, 3).map(match => match.trim());
        }
        
        return goals;
    }

    // Calculate conversation duration in minutes
    _calculateConversationDuration() {
        if (this.conversationHistory.length < 2) {
            return 0;
        }
        
        const startTime = new Date(this.conversationHistory[0].timestamp);
        const endTime = new Date(this.conversationHistory[this.conversationHistory.length - 1].timestamp);
        
        // Return duration in minutes
        return Math.round((endTime - startTime) / (1000 * 60));
    }
}

// Export the service
window.SummaryService = SummaryService; 