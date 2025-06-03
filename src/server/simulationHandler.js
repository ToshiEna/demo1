const { v4: uuidv4 } = require('uuid');
const documentHandler = require('./documentHandler');
const ShareholderAgent = require('../ai/shareholderAgent');
const CompanyAgent = require('../ai/companyAgent');

// Store simulation sessions in memory (in production, use a database)
const sessionsStore = new Map();

class SimulationSession {
    constructor(sessionId, documents, expectedQuestions) {
        this.id = sessionId;
        this.documents = documents;
        this.expectedQuestions = expectedQuestions;
        this.messages = [];
        this.status = 'starting'; // starting, active, paused, completed
        this.createdAt = new Date().toISOString();
        this.currentQuestionIndex = 0;
        this.shareholderAgent = new ShareholderAgent(documents, expectedQuestions);
        this.companyAgent = new CompanyAgent(documents);
    }
    
    async start() {
        try {
            this.status = 'active';
            
            // Initialize agents and start first interaction
            await this.generateNextInteraction();
            
        } catch (error) {
            console.error('Failed to start simulation:', error);
            this.status = 'error';
            throw error;
        }
    }
    
    async generateNextInteraction() {
        try {
            // Generate shareholder question
            const question = await this.shareholderAgent.generateQuestion(this.messages);
            
            if (question) {
                const questionMessage = {
                    id: uuidv4(),
                    type: 'shareholder',
                    content: question,
                    timestamp: new Date().toISOString()
                };
                this.messages.push(questionMessage);
                
                // Generate company response
                setTimeout(async () => {
                    try {
                        const response = await this.companyAgent.generateResponse(question, this.messages);
                        
                        const responseMessage = {
                            id: uuidv4(),
                            type: 'company',
                            content: response,
                            timestamp: new Date().toISOString()
                        };
                        this.messages.push(responseMessage);
                        
                        // Check if we should continue or end the simulation
                        if (this.shouldContinue()) {
                            // Schedule next interaction
                            setTimeout(() => {
                                this.generateNextInteraction();
                            }, 3000); // 3 second delay between interactions
                        } else {
                            this.status = 'completed';
                        }
                    } catch (error) {
                        console.error('Failed to generate company response:', error);
                    }
                }, 2000); // 2 second delay for response
            } else {
                // No more questions, end simulation
                this.status = 'completed';
            }
        } catch (error) {
            console.error('Failed to generate interaction:', error);
            this.status = 'error';
        }
    }
    
    shouldContinue() {
        // Limit simulation to exactly 1 turn (2 messages: 1 question + 1 response)
        const MAX_TURNS = 1;
        const MAX_MESSAGES = MAX_TURNS * 2; // Each turn has 1 question + 1 response
        
        // Stop after 1 turn regardless of expected questions
        return this.messages.length < MAX_MESSAGES;
    }
    
    addMessage(message) {
        this.messages.push({
            id: uuidv4(),
            ...message,
            timestamp: new Date().toISOString()
        });
    }
    
    toJSON() {
        return {
            id: this.id,
            status: this.status,
            createdAt: this.createdAt,
            messageCount: this.messages.length,
            messages: this.messages
        };
    }
}

exports.startSimulation = async (req, res) => {
    try {
        const { documents, expectedQuestions } = req.body;
        
        if (!documents || documents.length === 0) {
            return res.status(400).json({ error: 'No documents provided' });
        }
        
        // Get document data
        const documentData = documentHandler.getDocumentsByFilenames(documents);
        
        if (documentData.length === 0) {
            return res.status(400).json({ error: 'No valid documents found' });
        }
        
        // Create new simulation session
        const sessionId = uuidv4();
        const session = new SimulationSession(sessionId, documentData, expectedQuestions || []);
        
        // Store session
        sessionsStore.set(sessionId, session);
        
        // Start simulation
        await session.start();
        
        res.json({
            sessionId: sessionId,
            status: session.status,
            message: 'Simulation started successfully'
        });
        
    } catch (error) {
        console.error('Start simulation error:', error);
        res.status(500).json({ error: 'Failed to start simulation' });
    }
};

exports.getSimulation = (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessionsStore.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json(session.toJSON());
        
    } catch (error) {
        console.error('Get simulation error:', error);
        res.status(500).json({ error: 'Failed to get simulation' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { action } = req.body;
        
        const session = sessionsStore.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        if (action === 'next_question') {
            // Force move to next question
            session.currentQuestionIndex++;
            await session.generateNextInteraction();
        }
        
        res.json({
            message: 'Action completed',
            status: session.status
        });
        
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
};

exports.getAllSessions = () => {
    return Array.from(sessionsStore.values()).map(session => session.toJSON());
};