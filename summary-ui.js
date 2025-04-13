/**
 * Summary UI - User interface components for the summary functionality
 * This module provides UI elements and handlers for displaying and controlling summary features
 */

class SummaryUI {
    constructor() {
        this.summaryService = null;
        this.webhookHandler = null;
        this.isInitialized = false;
        this.summaryContainer = null;
        this.sessionSummary = null;
        
        // DOM elements (will be created or assigned during initialization)
        this.summaryButton = null;
        this.summaryModal = null;
        this.summaryContent = null;
        this.closeButton = null;
        this.downloadButton = null;
        this.webhookStatusIndicator = null;
    }

    // Initialize the UI and connect to services
    initialize(summaryService, webhookHandler) {
        if (this.isInitialized) {
            console.warn("Summary UI already initialized");
            return this;
        }
        
        this.summaryService = summaryService;
        this.webhookHandler = webhookHandler;
        
        // Create UI elements if they don't exist
        this._createUIElements();
        
        // Register event handlers
        this._setupEventListeners();
        
        // Mark as initialized
        this.isInitialized = true;
        console.log("Summary UI initialized");
        
        return this;
    }

    // Create necessary UI elements
    _createUIElements() {
        // First check if container exists, if not create it
        this.summaryContainer = document.getElementById('summary-container');
        if (!this.summaryContainer) {
            this.summaryContainer = document.createElement('div');
            this.summaryContainer.id = 'summary-container';
            document.body.appendChild(this.summaryContainer);
        }
        
        // Create summary button
        this.summaryButton = document.createElement('button');
        this.summaryButton.id = 'summary-button';
        this.summaryButton.className = 'summary-button';
        this.summaryButton.innerHTML = '<span>Generate Summary</span>';
        this.summaryContainer.appendChild(this.summaryButton);
        
        // Create modal for displaying summary
        this.summaryModal = document.createElement('div');
        this.summaryModal.id = 'summary-modal';
        this.summaryModal.className = 'summary-modal';
        this.summaryModal.style.display = 'none';
        
        // Create modal content
        this.summaryContent = document.createElement('div');
        this.summaryContent.className = 'summary-content';
        
        // Create close button
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'summary-close-button';
        this.closeButton.innerHTML = '&times;';
        
        // Create download button
        this.downloadButton = document.createElement('button');
        this.downloadButton.className = 'summary-download-button';
        this.downloadButton.innerHTML = 'Download Summary';
        
        // Create webhook status indicator
        this.webhookStatusIndicator = document.createElement('div');
        this.webhookStatusIndicator.className = 'webhook-status';
        this.webhookStatusIndicator.innerHTML = 'ElevenLabs WebHook: <span class="status-indicator">Not Connected</span>';
        
        // Assemble modal
        this.summaryModal.appendChild(this.closeButton);
        this.summaryModal.appendChild(this.summaryContent);
        this.summaryModal.appendChild(this.downloadButton);
        this.summaryModal.appendChild(this.webhookStatusIndicator);
        
        // Add modal to container
        this.summaryContainer.appendChild(this.summaryModal);
        
        // Add styles if they don't exist
        this._addStyles();
    }

    // Add CSS styles for the summary UI
    _addStyles() {
        if (!document.getElementById('summary-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'summary-styles';
            
            styleElement.textContent = `
                #summary-container {
                    position: relative;
                    z-index: 1000;
                }
                
                .summary-button {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background-color: #7E57C2;
                    color: white;
                    border: none;
                    border-radius: 50px;
                    padding: 10px 20px;
                    font-size: 14px;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                }
                
                .summary-button:hover {
                    background-color: #6A48B0;
                    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
                }
                
                .summary-modal {
                    display: none;
                    position: fixed;
                    z-index: 1001;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    overflow: auto;
                }
                
                .summary-content {
                    background-color: #f8f9fa;
                    margin: 5% auto;
                    padding: 20px;
                    width: 80%;
                    max-width: 700px;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                    color: #333;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                .summary-close-button {
                    color: #aaa;
                    float: right;
                    font-size: 28px;
                    font-weight: bold;
                    background: none;
                    border: none;
                    cursor: pointer;
                }
                
                .summary-close-button:hover {
                    color: #555;
                }
                
                .summary-download-button {
                    display: block;
                    margin: 20px auto;
                    padding: 10px 20px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .summary-download-button:hover {
                    background-color: #45a049;
                }
                
                .summary-section {
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #eee;
                }
                
                .summary-section-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 10px;
                }
                
                .summary-raw-content {
                    background-color: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                    border-left: 3px solid #7E57C2;
                    font-size: 16px;
                    line-height: 1.6;
                    margin-top: 10px;
                    white-space: pre-wrap;
                }
                
                .summary-list {
                    padding-left: 20px;
                    margin-top: 5px;
                }
                
                .summary-item {
                    margin-bottom: 5px;
                }
                
                .summary-timestamp {
                    color: #666;
                    font-size: 14px;
                    margin-top: 5px;
                }
                
                .webhook-status {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #666;
                }
                
                .status-indicator {
                    font-weight: bold;
                }
                
                .status-connected {
                    color: #4CAF50;
                }
                
                .status-error {
                    color: #F44336;
                }
                
                .status-processing {
                    color: #2196F3;
                }
            `;
            
            document.head.appendChild(styleElement);
        }
    }

    // Set up event listeners for UI elements
    _setupEventListeners() {
        // Summary button click
        this.summaryButton.addEventListener('click', () => this.generateAndShowSummary());
        
        // Close button click
        this.closeButton.addEventListener('click', () => this.hideModal());
        
        // Download button click
        this.downloadButton.addEventListener('click', () => this.downloadSummary());
        
        // Close modal when clicking outside content
        window.addEventListener('click', (event) => {
            if (event.target === this.summaryModal) {
                this.hideModal();
            }
        });
        
        // Set up webhook callbacks if handler exists
        if (this.webhookHandler) {
            this.webhookHandler.callbacks.onSummaryRequest = (request) => {
                this._updateWebhookStatus('Processing', 'status-processing');
            };
            
            this.webhookHandler.callbacks.onSummaryCreated = (summary) => {
                this._updateWebhookStatus('Connected', 'status-connected');
                this.sessionSummary = summary;
            };
            
            this.webhookHandler.callbacks.onError = (error) => {
                this._updateWebhookStatus('Error', 'status-error');
                console.error("Webhook error:", error);
            };
        }
    }

    // Generate summary and display modal
    async generateAndShowSummary() {
        try {
            // Show loading state
            this.summaryButton.disabled = true;
            this.summaryButton.innerHTML = '<span>Generating...</span>';
            
            // Generate summary
            if (this.summaryService) {
                this.sessionSummary = await this.summaryService.generateSummary();
            } else {
                throw new Error("Summary service not initialized");
            }
            
            // Display summary in modal
            this._displaySummary(this.sessionSummary);
            
            // Show modal
            this.showModal();
        } catch (error) {
            console.error("Error generating summary:", error);
            alert("Failed to generate summary. Please try again.");
        } finally {
            // Reset button state
            this.summaryButton.disabled = false;
            this.summaryButton.innerHTML = '<span>Generate Summary</span>';
        }
    }

    // Display the summary in the modal
    _displaySummary(summary) {
        if (!summary) {
            this.summaryContent.innerHTML = '<p>No summary available. Try generating one first.</p>';
            return;
        }
        
        let html = '<div class="summary-header">';
        html += '<h2>Session Summary</h2>';
        html += `<p class="summary-timestamp">Generated: ${new Date(summary.timestamp).toLocaleString()}</p>`;
        html += '</div>';
        
        // Session insights section
        html += '<div class="summary-section">';
        html += '<h3 class="summary-section-title">Session Insights</h3>';
        
        if (summary.session_insights) {
            // Key themes
            if (summary.session_insights.key_themes && summary.session_insights.key_themes.length > 0) {
                html += '<h4>Key Themes</h4>';
                html += '<ul class="summary-list">';
                summary.session_insights.key_themes.forEach(theme => {
                    html += `<li class="summary-item">${theme}</li>`;
                });
                html += '</ul>';
            }
            
            // Emotional state
            if (summary.session_insights.emotional_state) {
                html += '<h4>Emotional State</h4>';
                html += `<p>${summary.session_insights.emotional_state}</p>`;
            }
            
            // Actionable insights
            if (summary.session_insights.actionable_insights && summary.session_insights.actionable_insights.length > 0) {
                html += '<h4>Actionable Insights</h4>';
                html += '<ul class="summary-list">';
                summary.session_insights.actionable_insights.forEach(insight => {
                    html += `<li class="summary-item">${insight}</li>`;
                });
                html += '</ul>';
            }
        }
        
        html += '</div>';
        
        // Progress tracking section
        if (summary.progress_tracking) {
            html += '<div class="summary-section">';
            html += '<h3 class="summary-section-title">Progress Tracking</h3>';
            
            // Previous goals
            if (summary.progress_tracking.previous_goals && summary.progress_tracking.previous_goals.length > 0) {
                html += '<h4>Previous Goals</h4>';
                html += '<ul class="summary-list">';
                summary.progress_tracking.previous_goals.forEach(goal => {
                    html += `<li class="summary-item">${goal}</li>`;
                });
                html += '</ul>';
            }
            
            // Goal progress
            if (summary.progress_tracking.goal_progress && summary.progress_tracking.goal_progress.length > 0) {
                html += '<h4>Goal Progress</h4>';
                html += '<ul class="summary-list">';
                summary.progress_tracking.goal_progress.forEach(progress => {
                    html += `<li class="summary-item">${progress}</li>`;
                });
                html += '</ul>';
            }
            
            // New goals
            if (summary.progress_tracking.new_goals && summary.progress_tracking.new_goals.length > 0) {
                html += '<h4>New Goals</h4>';
                html += '<ul class="summary-list">';
                summary.progress_tracking.new_goals.forEach(goal => {
                    html += `<li class="summary-item">${goal}</li>`;
                });
                html += '</ul>';
            }
            
            html += '</div>';
        }
        
        // If we have raw summary content from ElevenLabs, display it
        if (summary.summary_content || summary.raw_summary) {
            html += '<div class="summary-section">';
            html += '<h3 class="summary-section-title">Session Summary</h3>';
            html += `<div class="summary-raw-content">${summary.summary_content || summary.raw_summary}</div>`;
            html += '</div>';
        }
        
        // Conversation statistics
        if (summary.conversation_statistics) {
            html += '<div class="summary-section">';
            html += '<h3 class="summary-section-title">Conversation Statistics</h3>';
            html += '<ul class="summary-list">';
            html += `<li class="summary-item">Total Messages: ${summary.conversation_statistics.total_messages}</li>`;
            html += `<li class="summary-item">User Messages: ${summary.conversation_statistics.user_messages}</li>`;
            html += `<li class="summary-item">Agent Messages: ${summary.conversation_statistics.agent_messages}</li>`;
            html += `<li class="summary-item">Duration: ${summary.conversation_statistics.duration_minutes} minutes</li>`;
            html += '</ul>';
            html += '</div>';
        }
        
        this.summaryContent.innerHTML = html;
    }

    // Show the summary modal
    showModal() {
        if (this.summaryModal) {
            this.summaryModal.style.display = 'block';
        }
    }

    // Hide the summary modal
    hideModal() {
        if (this.summaryModal) {
            this.summaryModal.style.display = 'none';
        }
    }

    // Download summary as JSON file
    downloadSummary() {
        if (!this.sessionSummary) {
            alert("No summary available to download");
            return;
        }
        
        try {
            // Create JSON blob
            const json = JSON.stringify(this.sessionSummary, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `therapy-summary-${new Date().toISOString().slice(0, 10)}.json`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error("Error downloading summary:", error);
            alert("Failed to download summary");
        }
    }

    // Update webhook status indicator
    _updateWebhookStatus(status, className) {
        if (this.webhookStatusIndicator) {
            const statusSpan = this.webhookStatusIndicator.querySelector('.status-indicator');
            if (statusSpan) {
                statusSpan.textContent = status;
                statusSpan.className = 'status-indicator ' + className;
            }
        }
    }

    // Test the webhook functionality
    async testWebhook() {
        if (!this.webhookHandler) {
            alert("Webhook handler not initialized");
            return null;
        }
        
        try {
            // Update status
            this._updateWebhookStatus('Testing...', 'status-processing');
            
            // Mock a webhook request
            const response = await this.webhookHandler.mockElevenLabsWebhook();
            
            // Update status based on response
            if (response.status === 'success') {
                this._updateWebhookStatus('Connected', 'status-connected');
            } else {
                this._updateWebhookStatus('Error', 'status-error');
            }
            
            return response;
        } catch (error) {
            console.error("Error testing webhook:", error);
            this._updateWebhookStatus('Error', 'status-error');
            return null;
        }
    }
}

// Export the UI component
window.SummaryUI = SummaryUI; 