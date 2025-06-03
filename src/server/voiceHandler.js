const VoiceService = require('../services/voiceService');

const voiceService = new VoiceService();

/**
 * Convert text to speech and return audio data
 */
async function textToSpeech(req, res) {
    try {
        const { text, agentType } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        // Validate agentType first before checking service availability
        const validAgentTypes = ['shareholder', 'company'];
        if (agentType && !validAgentTypes.includes(agentType)) {
            return res.status(400).json({ error: 'Invalid agent type. Must be "shareholder" or "company"' });
        }
        
        if (!voiceService.isAvailable()) {
            return res.status(503).json({ error: 'Voice service is not available. Please configure Azure Speech Services.' });
        }
        
        const audioBuffer = await voiceService.textToSpeech(text, agentType || 'company');
        
        // Set appropriate headers for audio response
        res.set({
            'Content-Type': 'audio/wav',
            'Content-Length': audioBuffer.length,
            'Accept-Ranges': 'bytes'
        });
        
        res.send(audioBuffer);
        
    } catch (error) {
        console.error('Text-to-speech error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Check if voice service is available
 */
function getVoiceStatus(req, res) {
    res.json({
        available: voiceService.isAvailable(),
        message: voiceService.isAvailable() 
            ? 'Voice service is available' 
            : 'Voice service is not configured. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables.'
    });
}

module.exports = {
    textToSpeech,
    getVoiceStatus
};