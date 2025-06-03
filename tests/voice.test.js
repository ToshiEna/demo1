const request = require('supertest');
const server = require('../server');

describe('Voice API', () => {
    afterAll(async () => {
        // Give time for server to close properly
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    describe('GET /api/voice/status', () => {
        it('should return voice service status', async () => {
            const response = await request(server)
                .get('/api/voice/status')
                .expect(200);

            expect(response.body).toHaveProperty('available');
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.available).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
        });
    });

    describe('POST /api/voice/text-to-speech', () => {
        it('should return 400 when text is missing', async () => {
            const response = await request(server)
                .post('/api/voice/text-to-speech')
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Text is required');
        });

        it('should return 400 for invalid agent type', async () => {
            const response = await request(server)
                .post('/api/voice/text-to-speech')
                .send({
                    text: 'テストメッセージ',
                    agentType: 'invalid'
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid agent type. Must be "shareholder" or "company"');
        });

        it('should return 503 when voice service is not configured', async () => {
            const response = await request(server)
                .post('/api/voice/text-to-speech')
                .send({
                    text: 'テストメッセージ',
                    agentType: 'company'
                })
                .expect(503);

            expect(response.body.error).toBe('Voice service is not available. Please configure Azure Speech Services.');
        });
    });
});