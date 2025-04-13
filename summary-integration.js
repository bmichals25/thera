/**
 * Summary Integration - Main entry point for the ElevenLabs summary feature
 * This file initializes and connects all components of the summary system
 */

// Initialize all components when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if required classes exist
    if (!window.SummaryService || !window.WebhookHandler || !window.SummaryUI) {
        console.error("Required summary components not loaded");
        return;
    }
    
    // Integration point with the main app
    const voiceChatApp = window.voiceChatApp; // Assuming main app is exposed globally
    if (!voiceChatApp) {
        console.warn("Voice chat app not found, summary may not capture conversation history");
    }
    
    // Initialize services with default configuration
    const ELEVENLABS_API_KEY = window.ELEVENLABS_API_KEY || 'sk_aa6f61e2e19d3d69bfbba2eb691cb65d101e8b4a825247c4'; // Should be set in app.js
    const SUMMARY_WEBHOOK_URL = 'https://api.elevenlabs.io/v1/webhooks/summary'; // Example endpoint
    
    // Create and initialize summary service
    const summaryService = new window.SummaryService().initialize(
        ELEVENLABS_API_KEY,
        SUMMARY_WEBHOOK_URL
    );
    
    // Create and initialize webhook handler
    const webhookHandler = new window.WebhookHandler().initialize(
        summaryService
    );
    
    // Create and initialize UI
    const summaryUI = new window.SummaryUI().initialize(
        summaryService,
        webhookHandler
    );
    
    // Expose globally for debugging and manual integration
    window.summaryService = summaryService;
    window.webhookHandler = webhookHandler;
    window.summaryUI = summaryUI;
    
    console.log("Summary system initialized");
    
    // Connect to conversation events if voiceChatApp exists
    if (voiceChatApp) {
        // Hook into the addMessage method of VoiceChatApp to capture conversation
        const originalAddMessage = voiceChatApp.addMessage;
        
        voiceChatApp.addMessage = function(type, text) {
            // Call the original method first
            originalAddMessage.call(voiceChatApp, type, text);
            
            // Then capture the message for summarization
            const senderType = type === 'user' ? 'user' : 'agent';
            summaryService.addMessage(senderType, text);
        };
        
        console.log("Connected to voice chat app for message tracking");
    }
    
    // Add a button to the conversation UI to manually trigger summary generation
    // This is redundant with the SummaryUI, but provides multiple access points
    function addSummaryButton() {
        const existingButton = document.getElementById('generate-summary-button');
        if (existingButton) return; // Already added
        
        const conversationControls = document.querySelector('.conversation-controls');
        if (conversationControls) {
            const button = document.createElement('button');
            button.id = 'generate-summary-button';
            button.className = 'control-button';
            button.innerHTML = '<i class="fas fa-file-alt"></i> Summary';
            button.title = 'Generate session summary';
            
            button.addEventListener('click', function() {
                summaryUI.generateAndShowSummary();
            });
            
            conversationControls.appendChild(button);
            console.log("Added summary button to conversation controls");
        }
    }
    
    // Try to add the button now
    addSummaryButton();
    
    // Or try again when the DOM might be more fully loaded
    setTimeout(addSummaryButton, 1000);
});

// Define configureSummarySystem function for external use
function configureSummarySystem(config) {
    if (!window.summaryService || !window.webhookHandler) {
        console.error("Summary system not initialized");
        return false;
    }
    
    try {
        // Update API key if provided
        if (config.apiKey) {
            window.summaryService.apiKey = config.apiKey;
        }
        
        // Update webhook endpoint if provided
        if (config.webhookEndpoint) {
            window.summaryService.webhookEndpoint = config.webhookEndpoint;
        }
        
        console.log("Summary system configured with:", config);
        return true;
    } catch (error) {
        console.error("Error configuring summary system:", error);
        return false;
    }
}

// Define function to manually add messages to conversation history
function addMessageToSummary(sender, text) {
    if (!window.summaryService) {
        console.error("Summary service not initialized");
        return false;
    }
    
    try {
        window.summaryService.addMessage(sender, text);
        return true;
    } catch (error) {
        console.error("Error adding message to summary:", error);
        return false;
    }
}

// Define function to test webhook
async function testSummaryWebhook() {
    if (!window.webhookHandler) {
        console.error("Webhook handler not initialized");
        return null;
    }
    
    try {
        return await window.webhookHandler.mockElevenLabsWebhook();
    } catch (error) {
        console.error("Error testing webhook:", error);
        return null;
    }
}

// Expose utilities globally
window.configureSummarySystem = configureSummarySystem;
window.addMessageToSummary = addMessageToSummary;
window.testSummaryWebhook = testSummaryWebhook; 