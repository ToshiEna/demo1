const fs = require('fs');
const path = require('path');
const { extractTextFromFile } = require('../src/server/documentHandler');

// Test the text extraction functionality directly since file upload via supertest
// has issues with MIME type detection
describe('File Format Support', () => {
    let testFiles;
    const tmpDir = path.join(__dirname, 'tmp');

    beforeAll(() => {
        // Create temporary test files
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }

        // Create a test text file
        const textFile = path.join(tmpDir, 'test.txt');
        fs.writeFileSync(textFile, '売上高は前年同期比10%増加しました。営業利益は20億円でした。新規事業への投資を計画しています。');

        testFiles = { textFile };
    });

    afterAll(() => {
        // Clean up test files
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('should extract text from text files', async () => {
        const result = await extractTextFromFile(testFiles.textFile, 'text/plain');
        
        expect(result.text).toContain('売上高');
        expect(result.text).toContain('営業利益');
        expect(result.pageCount).toBeNull();
    });

    test('should handle unsupported file types', async () => {
        await expect(
            extractTextFromFile(testFiles.textFile, 'image/jpeg')
        ).rejects.toThrow('Unsupported file type');
    });

    test('should support Word document MIME types', async () => {
        // Test that the function recognizes Word MIME types (even if file doesn't exist)
        const fakeWordFile = path.join(tmpDir, 'fake.docx');
        
        await expect(
            extractTextFromFile(fakeWordFile, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        ).rejects.toThrow('Failed to extract text from file'); // Should fail due to file not existing, not unsupported type
        
        await expect(
            extractTextFromFile(fakeWordFile, 'application/msword')
        ).rejects.toThrow('Failed to extract text from file'); // Should fail due to file not existing, not unsupported type
    });

    test('should handle file read errors gracefully', async () => {
        const nonExistentFile = path.join(tmpDir, 'nonexistent.txt');
        
        await expect(
            extractTextFromFile(nonExistentFile, 'text/plain')
        ).rejects.toThrow('Failed to extract text from file');
    });
});