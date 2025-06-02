const CompanyAgent = require('../src/ai/companyAgent');

describe('CompanyAgent Document Reference', () => {
    let agent;
    let mockDocuments;

    beforeEach(() => {
        mockDocuments = [
            {
                id: 'doc1',
                originalName: 'annual_report.pdf',
                textContent: '当社の売上高は前年比10%増加し、100億円に達しました。営業利益は15億円となり、過去最高を記録いたします。'
            },
            {
                id: 'doc2', 
                originalName: 'strategy_plan.pdf',
                textContent: '今後の成長戦略として、DX推進と海外展開を重点施策として取り組みます。2025年までに売上高200億円を目指します。'
            }
        ];

        agent = new CompanyAgent(mockDocuments);
    });

    test('should reference document content in performance-related responses', async () => {
        const question = '今年度の業績はいかがでしたか？';
        const response = await agent.generateResponse(question);
        
        // Response should contain references to the document content
        expect(response).toContain('annual_report.pdf');
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(50);
    });

    test('should find relevant document content based on keywords', () => {
        const question = '売上高について教えてください';
        const relevantContent = agent.findRelevantDocumentContent(question);
        
        expect(Array.isArray(relevantContent)).toBe(true);
        expect(relevantContent.length).toBeGreaterThan(0);
        expect(relevantContent[0]).toHaveProperty('source');
        expect(relevantContent[0]).toHaveProperty('content');
        expect(relevantContent[0]).toHaveProperty('relevance');
    });

    test('should build proper response prompt with document context', () => {
        const question = 'DX戦略について説明してください';
        const relevantContext = agent.findRelevantDocumentContent(question);
        const conversationContext = [];
        
        const prompt = agent.buildResponsePrompt(question, relevantContext, conversationContext);
        
        expect(prompt).toHaveProperty('systemPrompt');
        expect(prompt).toHaveProperty('userPrompt');
        expect(prompt.systemPrompt).toContain('関連資料の内容');
        expect(prompt.userPrompt).toContain(question);
    });

    test('should reference specific document content in strategy responses', async () => {
        const question = '今後の成長戦略を教えてください';
        const response = await agent.generateResponse(question);
        
        // Response should reference strategy document
        expect(response).toContain('strategy_plan.pdf');
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(50);
    });

    test('should handle questions with no relevant document content gracefully', async () => {
        const question = '天気はどうですか？'; // Irrelevant question
        const response = await agent.generateResponse(question);
        
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(20);
    });
});