const { extractDocumentTopics } = require('../src/utils/helpers');
const { extractTextFromFile } = require('../src/server/documentHandler');
const fs = require('fs');
const path = require('path');

describe('Character Encoding Fixes', () => {
    const tmpDir = path.join(__dirname, 'tmp_encoding');
    
    beforeAll(() => {
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }
    });
    
    afterAll(() => {
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
    
    test('should filter out garbled characters from topic extraction', async () => {
        const textWithGarbledChars = `
        売上高は前年同期比10%増加しました。
        + 0 . 7 p �e��Ђ̏��L�҂ɋA�����铖�����v 1,959 3,719 2,335 +19.2% 4,100 +10.2% �i �����j 12.3% 12.0% 13
        営業利益は20億円でした。新規事業への投資を計画しています。
        - �i�����j - 0 .5 % 1.4% -
        `;
        
        const topics = await extractDocumentTopics(textWithGarbledChars);
        
        // Should only extract clean Japanese topics, not garbled ones
        expect(topics.length).toBeGreaterThan(0);
        
        // Verify no garbled characters in results
        topics.forEach(topic => {
            expect(topic).not.toMatch(/�/);
        });
        
        // Should contain valid Japanese topics
        const topicsText = topics.join(' ');
        expect(topicsText).toMatch(/売上高|営業利益|新規事業|投資/);
    });
    
    test('should handle normal Japanese text correctly', async () => {
        const normalJapaneseText = `
        2023年度決算について報告いたします。
        当期の売上高は100億円となり、前年同期比15%の増収となりました。
        営業利益は20億円で、前年同期の18億円から11%の増益となっております。
        新規事業への投資を積極的に進めており、AI技術の開発に5億円を投入しました。
        株主の皆様への配当は1株当たり50円を予定しております。
        `;
        
        const topics = await extractDocumentTopics(normalJapaneseText);
        
        expect(topics.length).toBeGreaterThan(0);
        expect(topics.length).toBeLessThanOrEqual(5);
        
        // Should contain valid Japanese business topics
        const topicsText = topics.join(' ');
        expect(topicsText).toMatch(/売上|営業利益|新規事業|投資|配当/);
        
        // Should not contain garbled characters
        topics.forEach(topic => {
            expect(topic).not.toMatch(/�/);
        });
    });
    
    test('should extract clean text from text files', async () => {
        const testFile = path.join(tmpDir, 'test_japanese.txt');
        const cleanText = '売上高は前年同期比10%増加しました。営業利益は20億円でした。';
        
        fs.writeFileSync(testFile, cleanText, 'utf8');
        
        const result = await extractTextFromFile(testFile, 'text/plain');
        
        expect(result.text).toBe(cleanText);
        expect(result.text).not.toMatch(/�/);
    });
    
    test('should handle text with mixed clean and garbled content', async () => {
        const testFile = path.join(tmpDir, 'test_mixed.txt');
        const mixedText = `売上高は前年同期比10%増加しました。
�e��Ђ̏��L�҂ɋA�����铖�����v
営業利益は20億円でした。`;
        
        fs.writeFileSync(testFile, mixedText, 'utf8');
        
        const result = await extractTextFromFile(testFile, 'text/plain');
        
        // Should contain the clean lines but filter out garbled content
        expect(result.text).toContain('売上高');
        expect(result.text).toContain('営業利益');
        expect(result.text).not.toContain('�e��Ђ̏��L�҂ɋA�����铖�����v');
    });
});