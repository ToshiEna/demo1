const request = require('supertest');
const app = require('../server');

describe('Document Topics and Selection Features', () => {
    
    test('GET /api/documents should return empty list initially', async () => {
        const response = await request(app)
            .get('/api/documents')
            .expect(200);
        
        expect(response.body.message).toContain('Found 0 uploaded documents');
        expect(response.body.documents).toEqual([]);
    });
    
    test('extractDocumentTopics function should extract topics from Japanese text', async () => {
        const { extractDocumentTopics } = require('../src/utils/helpers');
        
        const sampleText = `
        2023年度決算について報告いたします。
        当期の売上高は100億円となり、前年同期比15%の増収となりました。
        営業利益は20億円で、前年同期の18億円から11%の増益となっております。
        新規事業への投資を積極的に進めており、AI技術の開発に5億円を投入しました。
        株主の皆様への配当は1株当たり50円を予定しております。
        `;
        
        const topics = await extractDocumentTopics(sampleText);
        
        expect(topics).toBeInstanceOf(Array);
        expect(topics.length).toBeGreaterThan(0);
        expect(topics.length).toBeLessThanOrEqual(5);
        
        // Should contain keywords like 売上, 営業利益, etc.
        const topicsText = topics.join(' ');
        expect(topicsText).toMatch(/売上|営業利益|新規事業|投資|配当/);
    });
    
    test('extractDocumentTopics should handle empty text', async () => {
        const { extractDocumentTopics } = require('../src/utils/helpers');
        
        const topics = await extractDocumentTopics('');
        expect(topics).toEqual([]);
        
        const topics2 = await extractDocumentTopics(null);
        expect(topics2).toEqual([]);
    });
    
    test('extractDocumentTopics should return limited number of topics', async () => {
        const { extractDocumentTopics } = require('../src/utils/helpers');
        
        const longText = Array(20).fill('売上高は100億円となりました。営業利益は増加しています。').join(' ');
        const topics = await extractDocumentTopics(longText, 3);
        
        expect(topics.length).toBeLessThanOrEqual(3);
    });
    
    test('extractDocumentTopics should provide meaningful summaries instead of raw numbers', async () => {
        const { extractDocumentTopics } = require('../src/utils/helpers');
        
        const sampleText = `
        2023年度決算について報告いたします。
        売上高は18.7%増加し、5,572億円となりました。
        営業利益は18.0%増の3,637億円、20.3%の成長率で+21.5%の改善を示しました。
        新規事業への投資により、18.7%の利益向上、+14.0%の成長を達成しました。
        `;
        
        const topics = await extractDocumentTopics(sampleText);
        
        expect(topics).toBeInstanceOf(Array);
        expect(topics.length).toBeGreaterThan(0);
        
        // Topics should be meaningful sentences, not just numbers
        topics.forEach(topic => {
            expect(topic).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/); // Contains Japanese characters
            expect(topic.length).toBeGreaterThan(10); // Meaningful length
            // Should not be just percentages and numbers
            expect(topic).not.toMatch(/^[\d\.\s%+\-]+$/);
        });
    });
    
});