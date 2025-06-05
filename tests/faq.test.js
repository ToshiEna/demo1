const request = require('supertest');
const app = require('../server');
const ShareholderAgent = require('../src/ai/shareholderAgent');

describe('FAQ Generation Tests', () => {
    test('ShareholderAgent should generate FAQs from documents', () => {
        const mockDocuments = [
            {
                id: 'test-doc-1',
                originalName: 'annual_report_2023.pdf',
                textContent: `
                決算報告書2023年度
                売上高は前年同期比15%増加し、過去最高の売上を記録いたしました。
                営業利益率も改善し、効率的な事業運営ができました。
                今後の事業戦略として、デジタル化への投資を積極的に進めてまいります。
                株主還元については、配当政策の見直しを検討しております。
                競合他社との差別化を図るため、技術開発に注力しております。
                リスク要因として、為替変動や原材料価格の高騰が懸念されます。
                `
            }
        ];
        
        const faqs = ShareholderAgent.generateFAQsFromDocuments(mockDocuments);
        
        expect(faqs).toHaveLength(5);
        expect(faqs[0]).toHaveProperty('id');
        expect(faqs[0]).toHaveProperty('question');
        expect(faqs[0]).toHaveProperty('selected');
        expect(typeof faqs[0].question).toBe('string');
        expect(faqs[0].question.length).toBeGreaterThan(0);
    });

    test('ShareholderAgent should return default FAQs when generation fails', () => {
        const emptyDocuments = [];
        
        const faqs = ShareholderAgent.generateFAQsFromDocuments(emptyDocuments);
        
        expect(faqs).toHaveLength(5);
        expect(faqs[0].question).toBe('今期の業績についてご説明いただけますか？');
    });

    test('POST /api/documents/generate-faq should require documentIds', async () => {
        const response = await request(app)
            .post('/api/documents/generate-faq')
            .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/document IDs/);
    });

    test('POST /api/documents/generate-faq should handle empty documentIds', async () => {
        const response = await request(app)
            .post('/api/documents/generate-faq')
            .send({ documentIds: [] });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/document IDs/);
    });

    test('POST /api/documents/generate-faq should handle invalid documentIds', async () => {
        const response = await request(app)
            .post('/api/documents/generate-faq')
            .send({ documentIds: ['invalid-id'] });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/valid documents/);
    });
});