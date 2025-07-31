const fs = require('fs');
const path = require('path');

// Test the i18n (internationalization) functionality integration
describe('Multi-Language (i18n) Integration', () => {
    
    describe('HTML Integration', () => {
        let htmlContent;

        beforeAll(() => {
            const htmlPath = path.join(__dirname, '../public/index.html');
            htmlContent = fs.readFileSync(htmlPath, 'utf8');
        });

        test('should include i18n.js script in HTML', () => {
            expect(htmlContent).toContain('<script src="js/i18n.js"></script>');
        });

        test('should have language selector in HTML', () => {
            expect(htmlContent).toContain('id="language-selector"');
            expect(htmlContent).toContain('value="ja"');
            expect(htmlContent).toContain('value="en"');
            expect(htmlContent).toContain('data-i18n="language.japanese"');
            expect(htmlContent).toContain('data-i18n="language.english"');
        });

        test('should have header controls for language selector', () => {
            expect(htmlContent).toContain('class="header-controls"');
            expect(htmlContent).toContain('class="language-selector"');
        });

        test('should have translatable elements with data-i18n attributes', () => {
            // Check for key translatable elements
            expect(htmlContent).toContain('data-i18n="app.title"');
            expect(htmlContent).toContain('data-i18n="app.subtitle"');
            expect(htmlContent).toContain('data-i18n="section.upload.title"');
            expect(htmlContent).toContain('data-i18n="section.faq.title"');
            expect(htmlContent).toContain('data-i18n="section.questions.title"');
            expect(htmlContent).toContain('data-i18n="section.control.title"');
            expect(htmlContent).toContain('data-i18n="section.chat.title"');
            expect(htmlContent).toContain('data-i18n="section.history.title"');
        });

        test('should have translatable buttons', () => {
            expect(htmlContent).toContain('data-i18n="control.start"');
            expect(htmlContent).toContain('data-i18n="control.pause"');
            expect(htmlContent).toContain('data-i18n="control.next"');
            expect(htmlContent).toContain('data-i18n="control.end"');
            expect(htmlContent).toContain('data-i18n="upload.existing.button"');
            expect(htmlContent).toContain('data-i18n="history.load"');
        });

        test('should have translatable placeholders', () => {
            expect(htmlContent).toContain('data-i18n-placeholder="questions.placeholder"');
        });

        test('should have translatable titles', () => {
            expect(htmlContent).toContain('data-i18n-title="dark.mode.toggle"');
        });

        test('should have FAQ section translation elements', () => {
            expect(htmlContent).toContain('data-i18n="faq.description"');
            expect(htmlContent).toContain('data-i18n="faq.table.select"');
            expect(htmlContent).toContain('data-i18n="faq.table.number"');
            expect(htmlContent).toContain('data-i18n="faq.table.question"');
            expect(htmlContent).toContain('data-i18n="faq.select.all"');
            expect(htmlContent).toContain('data-i18n="faq.deselect.all"');
            expect(htmlContent).toContain('data-i18n="faq.regenerate"');
        });
    });

    describe('CSS Integration', () => {
        let cssContent;

        beforeAll(() => {
            const cssPath = path.join(__dirname, '../public/css/style.css');
            cssContent = fs.readFileSync(cssPath, 'utf8');
        });

        test('should have language selector styling', () => {
            expect(cssContent).toContain('.language-selector');
            expect(cssContent).toContain('.header-controls');
        });

        test('should have proper language selector properties', () => {
            expect(cssContent).toContain('background: rgba(255, 255, 255, 0.2)');
            expect(cssContent).toContain('border-radius: 25px');
            expect(cssContent).toContain('cursor: pointer');
            expect(cssContent).toContain('backdrop-filter: blur(10px)');
        });

        test('should have hover effects for language selector', () => {
            expect(cssContent).toContain('.language-selector:hover');
            expect(cssContent).toContain('transform: translateY(-2px)');
        });
    });

    describe('JavaScript Integration', () => {
        let jsContent, i18nContent;

        beforeAll(() => {
            const jsPath = path.join(__dirname, '../public/js/app.js');
            const i18nPath = path.join(__dirname, '../public/js/i18n.js');
            jsContent = fs.readFileSync(jsPath, 'utf8');
            i18nContent = fs.readFileSync(i18nPath, 'utf8');
        });

        test('should have i18n.js file with proper structure', () => {
            expect(i18nContent).toContain('class I18n');
            expect(i18nContent).toContain('constructor()');
            expect(i18nContent).toContain('loadTranslations()');
            expect(i18nContent).toContain('setLanguage(lang)');
            expect(i18nContent).toContain('getCurrentLanguage()');
            expect(i18nContent).toContain('updateUI()');
            expect(i18nContent).toContain('t(key, params = {})');
        });

        test('should have Japanese translations', () => {
            expect(i18nContent).toContain("ja: {");
            expect(i18nContent).toContain("'app.title': '株主総会想定問答シミュレーション'");
            expect(i18nContent).toContain("'section.upload.title': '1. IR資料アップロード'");
            expect(i18nContent).toContain("'control.start': 'Q&Aシミュレーション開始'");
        });

        test('should have English translations', () => {
            expect(i18nContent).toContain("en: {");
            expect(i18nContent).toContain("'app.title': 'Shareholder Meeting Q&A Simulation'");
            expect(i18nContent).toContain("'section.upload.title': '1. Upload IR Documents'");
            expect(i18nContent).toContain("'control.start': 'Start Q&A Simulation'");
        });

        test('should have language change event handler in app.js', () => {
            expect(jsContent).toContain("addEventListener('change', handleLanguageChange)");
            expect(jsContent).toContain('function handleLanguageChange');
            expect(jsContent).toContain('function initializeLanguage');
            expect(jsContent).toContain('function updateThemeLabels');
        });

        test('should integrate i18n in app initialization', () => {
            expect(jsContent).toContain('initializeLanguage()');
            expect(jsContent).toContain("i18n.t('status.upload.required')");
        });

        test('should use i18n for dynamic content updates', () => {
            expect(jsContent).toContain("i18n.t('chat.message.count'");
            expect(jsContent).toContain("i18n.t('faq.selected.count'");
        });

        test('should have global i18n instance', () => {
            expect(i18nContent).toContain('const i18n = new I18n()');
        });
    });

    describe('Translation Completeness', () => {
        let i18nContent;

        beforeAll(() => {
            const i18nPath = path.join(__dirname, '../public/js/i18n.js');
            i18nContent = fs.readFileSync(i18nPath, 'utf8');
        });

        test('should have all required translation keys', () => {
            const requiredKeys = [
                'app.title',
                'app.subtitle',
                'section.upload.title',
                'section.faq.title',
                'section.questions.title',
                'section.control.title',
                'section.chat.title',
                'section.history.title',
                'control.start',
                'control.pause',
                'control.next',
                'control.end',
                'status.upload.required',
                'loading',
                'error',
                'language.selector',
                'language.japanese',
                'language.english'
            ];

            requiredKeys.forEach(key => {
                expect(i18nContent).toContain(`'${key}':`);
            });
        });

        test('should have parameterized translations', () => {
            expect(i18nContent).toContain('faq.selected.count');
            expect(i18nContent).toContain('chat.message.count');
            expect(i18nContent).toContain('{count}');
        });

        test('should handle placeholder replacements', () => {
            expect(i18nContent).toContain('Object.keys(params).forEach');
            expect(i18nContent).toContain('text.replace(new RegExp');
        });
    });

    describe('File Structure', () => {
        test('should have i18n.js file in correct location', () => {
            const i18nPath = path.join(__dirname, '../public/js/i18n.js');
            expect(fs.existsSync(i18nPath)).toBe(true);
        });

        test('should load i18n.js before app.js in HTML', () => {
            const htmlPath = path.join(__dirname, '../public/index.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            const i18nIndex = htmlContent.indexOf('<script src="js/i18n.js"></script>');
            const appIndex = htmlContent.indexOf('<script src="js/app.js"></script>');
            
            expect(i18nIndex).toBeLessThan(appIndex);
            expect(i18nIndex).toBeGreaterThan(-1);
            expect(appIndex).toBeGreaterThan(-1);
        });
    });
});