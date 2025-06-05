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

    test('Integration test: Generate document-specific FAQs with complex content', async () => {
        // Test with more complex, realistic document content to ensure our extraction works
        const complexContentDoc = [
            {
                id: 'complex-doc',
                originalName: 'complex_annual_report.pdf',
                textContent: `
                株式会社グローバル・テック・ソリューション　年次報告書2023
                
                【事業概要】
                当社は、AI・IoT・クラウド技術を核とした次世代デジタルプラットフォームの開発・提供を行っております。
                
                【2023年度業績】
                ■ 売上高： 前年同期比35%増の1,250億円（過去最高）
                ■ 営業利益： 前年同期比42%増の185億円
                ■ AI事業セグメント： 売上高が前年同期比150%増の420億円
                ■ クラウドインフラ事業： 営業利益率28%の高収益事業に成長
                
                【戦略的取組み】
                ■ 2024年4月よりインド・東南アジア市場への本格参入を開始
                ■ 量子コンピューティング研究開発センターを東京・シリコンバレーに新設
                ■ カーボンニュートラル達成目標を2030年から2027年に前倒し
                ■ サイバーセキュリティ事業の強化に向け、年間80億円の投資を決定
                
                【株主還元方針】
                ■ 期末配当： 1株当たり95円から140円に47%増配
                ■ 中間配当： 1株当たり85円から110円に増配予定
                ■ 自己株式取得： 上限200億円の取得枠を設定し、機動的な還元を実施
                
                【リスクと対策】
                ■ 地政学的リスク： サプライチェーンの分散化により影響を最小化
                ■ 為替変動リスク： ヘッジ比率を従来の60%から80%に引き上げ
                ■ 人材確保リスク： グローバル採用強化と競争力ある報酬体系の構築
                `
            }
        ];
        
        const faqs = await ShareholderAgent.generateFAQsFromDocuments(complexContentDoc);
        
        expect(faqs).toHaveLength(5);
        
        // Verify questions are highly specific to the document content
        const questions = faqs.map(faq => faq.question);
        const allQuestionsText = questions.join(' ').toLowerCase();
        
        // Should reference very specific numbers and details from the document
        const hasVerySpecificContent = (
            allQuestionsText.includes('35%増') ||
            allQuestionsText.includes('150%増') ||
            allQuestionsText.includes('420億円') ||
            allQuestionsText.includes('インド') ||
            allQuestionsText.includes('東南アジア') ||
            allQuestionsText.includes('量子コンピューティング') ||
            allQuestionsText.includes('シリコンバレー') ||
            allQuestionsText.includes('2027年') ||
            allQuestionsText.includes('80億円') ||
            allQuestionsText.includes('140円') ||
            allQuestionsText.includes('47%増配') ||
            allQuestionsText.includes('200億円')
        );
        
        expect(hasVerySpecificContent).toBe(true);
        
        // Ensure we have good variety of question types
        const questionTypes = {
            performance: questions.some(q => q.includes('35%増') || q.includes('150%増') || q.includes('420億円')),
            strategy: questions.some(q => q.includes('インド') || q.includes('量子') || q.includes('シリコンバレー')),
            shareholder: questions.some(q => q.includes('140円') || q.includes('200億円') || q.includes('増配')),
            investment: questions.some(q => q.includes('80億円') || q.includes('研究開発')),
            risk: questions.some(q => q.includes('地政学') || q.includes('為替') || q.includes('人材確保'))
        };
        
        // Should have at least 3 different types of questions
        const typeCount = Object.values(questionTypes).filter(hasType => hasType).length;
        expect(typeCount).toBeGreaterThanOrEqual(3);
    });
});