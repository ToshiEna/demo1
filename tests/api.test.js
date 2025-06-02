const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
    test('GET / should return the main page', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
    });
    
    test('GET /api/sessions should return empty sessions initially', async () => {
        const response = await request(app).get('/api/sessions');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('POST /api/simulation/start should require documents', async () => {
        const response = await request(app)
            .post('/api/simulation/start')
            .send({
                documents: [],
                expectedQuestions: []
            });
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/documents/);
    });
    
    test('GET /api/simulation/invalid should return 404', async () => {
        const response = await request(app).get('/api/simulation/invalid-session-id');
        expect(response.status).toBe(404);
    });
});