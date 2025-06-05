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
        expect(prompt.systemPrompt).toContain('アップロード資料の内容');
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
        // Should indicate that information is not available in documents
        expect(response).toContain('申し訳ございません');
        expect(response).toContain('資料から関連する情報を見つけることができませんでした');
    });

    test('should respond only with document-based content when relevant content is found', async () => {
        const question = '売上について教えてください';
        const response = await agent.generateResponse(question);
        
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(20);
        // Should reference the document source
        expect(response).toContain('annual_report.pdf');
        // Should not contain generic templated language
        expect(response).not.toContain('堅調に推移');
        expect(response).not.toContain('計画を上回る成果');
    });

    test('should not provide hardcoded responses when no document content matches', async () => {
        // Create agent with documents that don't contain weather information
        const weatherQuestion = '明日の天気はどうですか？';
        const response = await agent.generateResponse(weatherQuestion);
        
        // Should explicitly state that information is not available
        expect(response).toContain('申し訳ございません');
        expect(response).toContain('資料から関連する情報を見つけることができませんでした');
        // Should not contain any generic business responses
        expect(response).not.toContain('適切な対応を図っており');
        expect(response).not.toContain('検討を進めており');
    });

    test('should limit response to 600 characters', async () => {
        const question = '今年度の業績について詳しく教えてください';
        const response = await agent.generateResponse(question);
        
        expect(typeof response).toBe('string');
        expect(response.length).toBeLessThanOrEqual(600);
    });

    test('should properly truncate long responses at sentence boundaries', () => {
        const longResponse = 'これは非常に長い文章です。'.repeat(50); // Creates a very long response
        const truncated = agent.limitResponseLength(longResponse, 100);
        
        expect(truncated.length).toBeLessThanOrEqual(100);
        expect(typeof truncated).toBe('string');
    });

    test('should limit document context to 50,000 characters', () => {
        // Create agent with very long document content
        const longContent = 'これは非常に長い文書のテストです。'.repeat(3500); // About 59,500 characters
        const longDocuments = [
            {
                id: 'doc1',
                originalName: 'very_long_report.pdf',
                textContent: longContent
            }
        ];
        
        const longContentAgent = new CompanyAgent(longDocuments);
        const prompt = longContentAgent.buildResponsePrompt('テスト質問', [], []);
        
        // Extract document context from system prompt
        const documentContextMatch = prompt.systemPrompt.match(/【提供されたアップロード資料】:\n([\s\S]*?)\n\n【これまでの会話履歴】:/);
        expect(documentContextMatch).toBeTruthy();
        
        const documentContext = documentContextMatch[1];
        expect(documentContext.length).toBeLessThanOrEqual(50100); // Allow small buffer for formatting
        expect(longContent.length).toBeGreaterThan(50000); // Verify original was longer than limit
    });
});