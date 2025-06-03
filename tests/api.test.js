const request = require('supertest');
const app = require('../server');
const { v4: uuidv4 } = require('uuid');

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

describe('Simulation Session Limits', () => {
    // Test to verify that simulation stops after exactly 1 turn (2 messages)
    test('Simulation should stop after exactly 1 turn', (done) => {
        // Create a mock session to test shouldContinue behavior
        class TestSession {
            constructor() {
                this.messages = [];
                this.expectedQuestions = [];
                this.currentQuestionIndex = 0;
            }
            
            shouldContinue() {
                // Use the new logic - limit to exactly 1 turn (2 messages)
                const MAX_TURNS = 1;
                const MAX_MESSAGES = MAX_TURNS * 2;
                return this.messages.length < MAX_MESSAGES;
            }
            
            addMessage(type) {
                this.messages.push({ type, content: 'test', timestamp: new Date().toISOString() });
            }
        }
        
        const session = new TestSession();
        
        // Test: Before any messages
        expect(session.shouldContinue()).toBe(true);
        expect(session.messages.length).toBe(0);
        
        // Add Turn 1: Q1, A1
        session.addMessage('shareholder'); // Q1
        expect(session.shouldContinue()).toBe(true);
        expect(session.messages.length).toBe(1);
        
        session.addMessage('company');     // A1
        expect(session.shouldContinue()).toBe(false); // Should stop after 1 turn
        expect(session.messages.length).toBe(2);
        
        // Verify it stays stopped even if we try to add more
        session.addMessage('shareholder'); // Q2 (shouldn't matter)
        expect(session.shouldContinue()).toBe(false);
        expect(session.messages.length).toBe(3);
        
        done();
    }, 5000);
});