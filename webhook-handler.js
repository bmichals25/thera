/**
 * Webhook Handler - Processes incoming ElevenLabs webhook requests
 * This service handles the communication between the therapy app and ElevenLabs
 */

class WebhookHandler {
    constructor() {
        this.summaryService = null;
        this.callbacks = {
            onSummaryRequest: null,
            onSummaryCreated: null,
            onError: null
        };
        
        // If running in Node.js server environment, this would bind Express routes
        // For the browser client, we'll use this to handle summary creation
    }

    // Initialize with the summary service and callbacks
    initialize(summaryService, callbacks = {}) {
        this.summaryService = summaryService;
        
        if (callbacks.onSummaryRequest) {
            this.callbacks.onSummaryRequest = callbacks.onSummaryRequest;
        }
        
        if (callbacks.onSummaryCreated) {
            this.callbacks.onSummaryCreated = callbacks.onSummaryCreated;
        }
        
        if (callbacks.onError) {
            this.callbacks.onError = callbacks.onError;
        }
        
        console.log("Webhook handler initialized");
        return this;
    }

    // Process an incoming webhook request from ElevenLabs
    async processWebhook(request) {
        try {
            console.log("Processing webhook request:", request);
            
            // Validate the request
            if (!this._validateRequest(request)) {
                throw new Error("Invalid webhook request format");
            }
            
            // Trigger the onSummaryRequest callback if provided
            if (this.callbacks.onSummaryRequest) {
                this.callbacks.onSummaryRequest(request);
            }
            
            // Generate a summary if we have a summary service
            let summary = null;
            if (this.summaryService) {
                summary = await this.summaryService.generateSummary();
            }
            
            // Prepare the response
            const response = {
                status: "success",
                summary_data: summary,
                metadata: {
                    processed_at: new Date().toISOString(),
                    request_id: request.id || request.request_id || crypto.randomUUID()
                }
            };
            
            // Trigger the onSummaryCreated callback if provided
            if (this.callbacks.onSummaryCreated && summary) {
                this.callbacks.onSummaryCreated(summary);
            }
            
            return response;
        } catch (error) {
            console.error("Error processing webhook:", error);
            
            // Trigger the onError callback if provided
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            
            // Return error response
            return {
                status: "error",
                error: error.message,
                metadata: {
                    processed_at: new Date().toISOString()
                }
            };
        }
    }
    
    // Setup route handlers if used in a server environment
    setupRoutes(app, endpoint = '/api/elevenlabs/webhook') {
        // This is a placeholder for server-side implementation
        // In a browser environment, this won't be used
        console.log(`Would set up endpoint ${endpoint} in a server environment`);
    }
    
    // Validate the incoming webhook request format
    _validateRequest(request) {
        // Basic validation - check that the request is an object
        if (!request || typeof request !== 'object') {
            return false;
        }
        
        // For ElevenLabs, we expect certain fields
        // This validation would need to be updated based on actual ElevenLabs webhook format
        // This is a placeholder
        return true;
    }
    
    // Create a test webhook request for development/testing
    createTestRequest(type = 'summary_request') {
        const requestTypes = {
            summary_request: {
                id: crypto.randomUUID(),
                type: 'summary_request',
                timestamp: new Date().toISOString(),
                agent_id: 'test-agent',
                conversation_id: 'test-conversation',
                user_id: 'test-user'
            }
        };
        
        return requestTypes[type] || requestTypes.summary_request;
    }
    
    // Mock the ElevenLabs webhook for testing
    async mockElevenLabsWebhook() {
        const testRequest = this.createTestRequest();
        console.log("Mocking ElevenLabs webhook request:", testRequest);
        
        const response = await this.processWebhook(testRequest);
        console.log("Mock webhook response:", response);
        
        return response;
    }
}

// Export the handler
window.WebhookHandler = WebhookHandler; 