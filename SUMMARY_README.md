# ElevenLabs Summary Integration for Therapy App

This document explains how to use the ElevenLabs summary feature integration in the Therapy App.

## Overview

The summary feature provides automated session summaries for therapy conversations by:

1. Tracking conversation history during therapy sessions
2. Analyzing key themes, emotional states, and actionable insights
3. Integrating with ElevenLabs via webhooks for AI-enhanced summary generation
4. Presenting the summary in an easy-to-use interface

## Files Structure

- `summary-service.js` - Core summary generation functionality
- `webhook-handler.js` - Handles webhook communication with ElevenLabs
- `summary-ui.js` - User interface components for the summary feature
- `summary-integration.js` - Connects everything together

## Setup and Configuration

### Basic Setup

The system is designed to work out of the box with minimal configuration. The necessary scripts are included in `index.html`:

```html
<!-- ElevenLabs Summary Integration -->
<script src="summary-service.js"></script>
<script src="webhook-handler.js"></script>
<script src="summary-ui.js"></script>
<script src="summary-integration.js"></script>
```

### API Key Configuration

To use the ElevenLabs webhook feature, configure your API key:

```javascript
// Option 1: Set it globally before the scripts load
window.ELEVENLABS_API_KEY = 'your_api_key_here';

// Option 2: Configure it after initialization
window.configureSummarySystem({
    apiKey: 'your_api_key_here',
    webhookEndpoint: 'https://api.elevenlabs.io/v1/webhooks/summary'
});
```

## Using the Summary Feature

### Automatic Tracking

The system automatically tracks conversation history during therapy sessions by hooking into the app's message handling system.

### Manual Summary Generation

There are two ways to generate a summary:

1. Click the "Generate Summary" button in the bottom right corner
2. Use the summary button in the conversation controls (if available)

### Viewing and Downloading Summaries

When a summary is generated:

1. A modal appears showing the full summary with sections for:
   - Session Insights (key themes, emotional state, actionable insights)
   - Progress Tracking (previous goals, progress, new goals)
   - Conversation Statistics
   
2. Click the "Download Summary" button to save the summary as a JSON file

## ElevenLabs Webhook Integration

### Webhook Format

The summary tool sends data to ElevenLabs in the following format:

```json
{
  "summary_data": {
    "session_insights": {
      "key_themes": ["theme1", "theme2", ...],
      "emotional_state": "calm",
      "actionable_insights": ["insight1", "insight2", ...]
    },
    "progress_tracking": {
      "previous_goals": ["goal1", "goal2", ...],
      "goal_progress": ["progress1", "progress2", ...],
      "new_goals": ["new_goal1", "new_goal2", ...]
    },
    "conversation_statistics": {
      "total_messages": 24,
      "user_messages": 12,
      "agent_messages": 12, 
      "duration_minutes": 15
    },
    "timestamp": "2023-07-15T12:30:45.123Z"
  },
  "metadata": {
    "source": "therapy_app",
    "version": "1.0",
    "timestamp": "2023-07-15T12:30:45.123Z"
  }
}
```

### Testing the Webhook

To test the webhook functionality:

```javascript
// Open browser console and run:
window.testSummaryWebhook().then(response => console.log(response));
```

## Advanced Usage

### Manually Adding Messages

You can manually add messages to the summary service:

```javascript
window.addMessageToSummary('user', 'I've been feeling anxious about work lately');
window.addMessageToSummary('agent', 'I understand. Let's explore ways to manage that anxiety');
```

### Configuring Webhook Endpoint

If ElevenLabs provides a different webhook endpoint:

```javascript
window.configureSummarySystem({
    webhookEndpoint: 'https://new-api.elevenlabs.io/v1/custom/webhook/endpoint'
});
```

## Troubleshooting

### Summary Not Capturing Messages

If the summary isn't capturing messages:

1. Make sure the scripts are loaded in the correct order
2. Check that `window.voiceChatApp` is accessible globally
3. Verify in the console that "Connected to voice chat app for message tracking" appears

### Webhook Connection Issues

If you experience webhook connection problems:

1. Verify your API key is correct
2. Check the webhook endpoint URL
3. Look for error messages in the browser console
4. Try the `testSummaryWebhook()` function to diagnose issues

## Customization

The summary system can be customized by:

1. Modifying the UI styles in the `_addStyles()` method in `summary-ui.js`
2. Adjusting the summary template in the `SummaryService` constructor
3. Enhancing analysis logic in the various helper methods of `SummaryService`

## Security Considerations

- API keys should be stored securely and not committed to version control
- In production, webhook URLs should use HTTPS
- Consider implementing authentication for webhook endpoints

---

For technical support or questions about the implementation, please contact the development team. 