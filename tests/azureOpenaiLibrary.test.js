const CompanyAgent = require('../src/ai/companyAgent');
const ShareholderAgent = require('../src/ai/shareholderAgent');

describe('Azure OpenAI Library Integration', () => {
    let companyAgent;
    let shareholderAgent;
    let mockDocuments;

    beforeEach(() => {
        mockDocuments = [
            {
                id: 'doc1',
                originalName: 'annual_report.pdf',
                textContent: '当社の売上高は前年比10%増加し、100億円に達しました。'
            }
        ];

        companyAgent = new CompanyAgent(mockDocuments);
        shareholderAgent = new ShareholderAgent(mockDocuments, ['業績について教えてください。']);
    });

    test('CompanyAgent.callAzureOpenAI should have correct method signature', () => {
        // Verify the method exists and is callable
        expect(typeof companyAgent.callAzureOpenAI).toBe('function');
        
        // Test that it handles missing API key appropriately
        const originalApiKey = process.env.AZURE_OPENAI_API_KEY;
        delete process.env.AZURE_OPENAI_API_KEY;
        
        const testPrompt = {
            systemPrompt: 'Test system prompt',
            userPrompt: 'Test user prompt'
        };
        
        expect(companyAgent.callAzureOpenAI(testPrompt)).rejects.toThrow('Azure OpenAI API key not configured');
        
        // Restore API key
        if (originalApiKey) {
            process.env.AZURE_OPENAI_API_KEY = originalApiKey;
        }
    });

    test('ShareholderAgent.callAzureOpenAI should have correct method signature', () => {
        // Verify the method exists and is callable
        expect(typeof shareholderAgent.callAzureOpenAI).toBe('function');
        
        // Test that it handles missing API key appropriately
        const originalApiKey = process.env.AZURE_OPENAI_API_KEY;
        delete process.env.AZURE_OPENAI_API_KEY;
        
        expect(shareholderAgent.callAzureOpenAI('Test prompt')).rejects.toThrow('Azure OpenAI API key not configured');
        
        // Restore API key
        if (originalApiKey) {
            process.env.AZURE_OPENAI_API_KEY = originalApiKey;
        }
    });

    test('CompanyAgent should still generate responses without Azure OpenAI configured', async () => {
        // Test that the agents fall back to mock responses when Azure OpenAI is not configured
        const response = await companyAgent.generateResponse('売上について教えてください。');
        
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
    });

    test('ShareholderAgent should still generate questions without Azure OpenAI configured', async () => {
        const question = await shareholderAgent.generateQuestion([]);
        
        expect(typeof question).toBe('string');
        expect(question.length).toBeGreaterThan(0);
    });
});