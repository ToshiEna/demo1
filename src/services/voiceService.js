const sdk = require('microsoft-cognitiveservices-speech-sdk');

class VoiceService {
    constructor() {
        this.speechConfig = null;
        this.initializeSpeechConfig();
    }
    
    initializeSpeechConfig() {
        if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
            console.warn('Azure Speech Services not configured. Voice functionality will be disabled.');
            return;
        }
        
        this.speechConfig = sdk.SpeechConfig.fromSubscription(
            process.env.AZURE_SPEECH_KEY,
            process.env.AZURE_SPEECH_REGION
        );
        
        // Set default language to Japanese
        this.speechConfig.speechSynthesisLanguage = 'ja-JP';
    }
    
    /**
     * Convert text to speech and return audio data
     * @param {string} text - Text to convert to speech
     * @param {string} agentType - 'shareholder' or 'company' to determine voice profile
     * @returns {Promise<Buffer>} Audio data as buffer
     */
    async textToSpeech(text, agentType = 'company') {
        if (!this.speechConfig) {
            throw new Error('Azure Speech Services not configured');
        }
        
        // Configure different voices for different agent types
        const voiceName = this.getVoiceForAgent(agentType);
        this.speechConfig.speechSynthesisVoiceName = voiceName;
        
        return new Promise((resolve, reject) => {
            // Create speech synthesizer with null audio config to get raw audio data
            const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, null);
            
            synthesizer.speakTextAsync(
                text,
                (result) => {
                    synthesizer.close();
                    
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        // Convert ArrayBuffer to Buffer
                        const audioBuffer = Buffer.from(result.audioData);
                        resolve(audioBuffer);
                    } else if (result.reason === sdk.ResultReason.Canceled) {
                        const cancellation = sdk.CancellationDetails.fromResult(result);
                        reject(new Error(`Speech synthesis canceled: ${cancellation.reason}. ${cancellation.errorDetails}`));
                    } else {
                        reject(new Error(`Speech synthesis failed: ${result.reason}`));
                    }
                },
                (error) => {
                    synthesizer.close();
                    reject(new Error(`Speech synthesis error: ${error}`));
                }
            );
        });
    }
    
    /**
     * Get appropriate voice name for agent type
     * @param {string} agentType - 'shareholder' or 'company'
     * @returns {string} Voice name for Azure Speech Services
     */
    getVoiceForAgent(agentType) {
        // Use different Japanese voices for different agents
        const voices = {
            shareholder: 'ja-JP-KeitaNeural',     // Male voice for shareholder
            company: 'ja-JP-NanamiNeural'         // Female voice for company
        };
        
        return voices[agentType] || voices.company;
    }
    
    /**
     * Check if voice service is available
     * @returns {boolean} True if voice service is configured and available
     */
    isAvailable() {
        return this.speechConfig !== null;
    }
}

module.exports = VoiceService;