const request = require('supertest');
const app = require('../server');
const ShareholderAgent = require('../src/ai/shareholderAgent');

describe('FAQ Generation Tests', () => {
    test('ShareholderAgent should generate FAQs from documents', async () => {
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
        
        const faqs = await ShareholderAgent.generateFAQsFromDocuments(mockDocuments);
        
        expect(faqs).toHaveLength(5);
        expect(faqs[0]).toHaveProperty('id');
        expect(faqs[0]).toHaveProperty('question');
        expect(faqs[0]).toHaveProperty('selected');
        expect(typeof faqs[0].question).toBe('string');
        expect(faqs[0].question.length).toBeGreaterThan(0);
    });

    test('ShareholderAgent should return default FAQs when generation fails', async () => {
        const emptyDocuments = [];
        
        const faqs = await ShareholderAgent.generateFAQsFromDocuments(emptyDocuments);
        
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

    test('ShareholderAgent should generate document-specific FAQs based on content', async () => {
        const specificContentDoc = [
            {
                id: 'specific-doc',
                originalName: 'specific_business_report.pdf',
                textContent: `
                株式会社テクノロジー・イノベーションズ　第75期決算説明会資料
                
                【業績ハイライト】
                - AI事業部門の売上が前年同期比300%増加
                - クラウドサービス事業の営業利益率が25%に改善
                - 新規開発したAIチャットボットサービス「SmartAssist」が市場で好評
                
                【事業戦略】
                - 2024年度よりヨーロッパ市場への本格参入を開始
                - 研究開発費を売上の20%まで増額し、量子コンピューティング分野への投資を拡大
                - 持続可能な社会実現のため、カーボンニュートラル達成を2030年に前倒し
                
                【リスク管理】
                - サイバーセキュリティ対策として、年間50億円の投資を実施
                - 地政学的リスクに備え、サプライチェーンの多様化を推進
                
                【株主還元】
                - 期末配当を1株あたり120円から150円に増配予定
                - 自己株式取得枠を100億円に設定し、株主価値向上を目指す
                `
            }
        ];
        
        const faqs = await ShareholderAgent.generateFAQsFromDocuments(specificContentDoc);
        
        expect(faqs).toHaveLength(5);
        
        // Check that generated questions are specific to the document content
        const questions = faqs.map(faq => faq.question);
        const allQuestionsText = questions.join(' ').toLowerCase();
        
        // Should include content-specific terms rather than generic ones
        const hasSpecificContent = (
            allQuestionsText.includes('ai') ||
            allQuestionsText.includes('クラウド') ||
            allQuestionsText.includes('ヨーロッパ') ||
            allQuestionsText.includes('量子') ||
            allQuestionsText.includes('カーボンニュートラル') ||
            allQuestionsText.includes('サイバーセキュリティ') ||
            allQuestionsText.includes('増配') ||
            allQuestionsText.includes('自己株式')
        );
        
        expect(hasSpecificContent).toBe(true);
        
        // Should not be just the default generic questions
        const isNotAllGeneric = !questions.every(q => 
            q === "今期の業績についてご説明いただけますか？" ||
            q === "今後の事業戦略についてお聞かせください。" ||
            q === "配当政策の変更予定はありますか？" ||
            q === "現在の主要なリスクと対策についてお聞かせください。" ||
            q === "競合他社と比較した当社の強みは何でしょうか？"
        );
        
        expect(isNotAllGeneric).toBe(true);
    });
});