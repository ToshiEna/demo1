/**
 * Frontend functionality tests for Q&A sequential playback
 */

const fs = require('fs');
const path = require('path');

describe('Frontend Q&A Sequential Playback', () => {
    let htmlContent;
    let jsContent;

    beforeAll(() => {
        // Read the HTML and JS files
        htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
        jsContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
    });

    describe('HTML Structure', () => {
        it('should have the Q&A sequence playback button', () => {
            expect(htmlContent).toContain('id="play-qa-sequence"');
            expect(htmlContent).toContain('🔊 Q&A再生');
        });

        it('should have the button in the chat-controls section', () => {
            const chatControlsMatch = htmlContent.match(/<div class="chat-controls"[\s\S]*?<\/div>\s*<\/div>/);
            expect(chatControlsMatch).not.toBeNull();
            expect(chatControlsMatch[0]).toContain('play-qa-sequence');
        });
    });

    describe('JavaScript Functions', () => {
        it('should define the playQASequence function', () => {
            expect(jsContent).toContain('async function playQASequence()');
        });

        it('should define the playMessageSequentially function', () => {
            expect(jsContent).toContain('async function playMessageSequentially(text, agentType)');
        });

        it('should define the resetSequenceButton function', () => {
            expect(jsContent).toContain('function resetSequenceButton()');
        });

        it('should add event listener for the sequence button', () => {
            expect(jsContent).toContain("getElementById('play-qa-sequence').addEventListener('click', playQASequence)");
        });

        it('should have currentMessages global variable', () => {
            expect(jsContent).toContain('let currentMessages = [];');
        });
    });

    describe('CSS Styling', () => {
        it('should have CSS styles for the sequence button', () => {
            const cssContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
            expect(cssContent).toContain('#play-qa-sequence');
        });
    });

    describe('Function Logic', () => {
        it('should properly handle Q&A pairing logic', () => {
            // Check if the Q&A pairing logic is present
            expect(jsContent).toContain('message.type === \'shareholder\'');
            expect(jsContent).toContain('m.type === \'company\'');
            expect(jsContent).toContain('qaPairs.push');
        });

        it('should handle sequential playback with proper error handling', () => {
            expect(jsContent).toContain('try {');
            expect(jsContent).toContain('catch (error)');
            expect(jsContent).toContain('resetSequenceButton();');
        });

        it('should include proper audio cleanup', () => {
            expect(jsContent).toContain('URL.revokeObjectURL(audioUrl)');
            expect(jsContent).toContain('audio.onended');
            expect(jsContent).toContain('audio.onerror');
        });
    });
});