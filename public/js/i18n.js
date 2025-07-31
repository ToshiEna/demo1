// Internationalization (i18n) system for multi-language support
class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'ja';
        this.translations = {};
        this.loadTranslations();
    }

    // Load translation data
    loadTranslations() {
        this.translations = {
            ja: {
                // Header
                'app.title': '株主総会想定問答シミュレーション',
                'app.subtitle': 'Shareholder Meeting Q&A Preparation System',
                'dark.mode.toggle': 'ダークモード切り替え',

                // Section 1: Document Upload
                'section.upload.title': '1. IR資料アップロード',
                'upload.new.title': '新しいファイルをアップロード',
                'upload.dropzone.text': 'PDF、Word、テキスト形式のIR資料をドラッグ&ドロップまたはクリックしてアップロード',
                'upload.dropzone.subtext': '決算資料、年次報告書など（最大50MB/ファイル）',
                'upload.existing.title': '既存の資料から選択',
                'upload.existing.button': '既存資料を表示',

                // Section 2: FAQ
                'section.faq.title': '2. 自動生成された質問一覧',
                'faq.description': 'アップロードされた資料から株主の目線で想定される質問を自動生成しました。シミュレーションで使用したい質問を選択してください。',
                'faq.table.select': '選択',
                'faq.table.number': '番号',
                'faq.table.question': '質問内容',
                'faq.select.all': '全て選択',
                'faq.deselect.all': '全て解除',
                'faq.regenerate': '質問を再生成',
                'faq.selected.count': '選択中: {count}件',

                // Section 3: Expected Questions
                'section.questions.title': '3. 想定質問入力（オプション）',
                'questions.placeholder': '株主から想定される質問を入力してください。複数の質問は改行で区切ってください。\n\n例：\n・今年度の業績が前年比で悪化している理由は？\n・新規事業の収益見通しはいかがですか？\n・配当政策の変更予定はありますか？',
                'questions.help': '入力しない場合は、AI が資料から自動的に質問を生成します',

                // Section 4: Simulation Control
                'section.control.title': '4. シミュレーション開始',
                'control.start': 'Q&Aシミュレーション開始',
                'control.pause': '一時停止',
                'control.next': '次の質問へ',
                'control.end': '終了',
                'status.upload.required': 'まず IR資料をアップロードしてください',

                // Section 5: Chat
                'section.chat.title': '5. Q&A シミュレーション',
                'chat.message.count': 'メッセージ: {count}',
                'chat.play.sequence': '🔊 Q&A再生',

                // Section 6: History
                'section.history.title': '6. セッション履歴',
                'history.load': '履歴を読み込み',

                // Common
                'loading': '処理中...',
                'error': 'エラー',
                'language.selector': '言語',
                'language.japanese': '日本語',
                'language.english': 'English'
            },
            en: {
                // Header
                'app.title': 'Shareholder Meeting Q&A Simulation',
                'app.subtitle': '株主総会想定問答シミュレーション',
                'dark.mode.toggle': 'Toggle Dark Mode',

                // Section 1: Document Upload
                'section.upload.title': '1. Upload IR Documents',
                'upload.new.title': 'Upload New Files',
                'upload.dropzone.text': 'Drag & drop or click to upload PDF, Word, or text format IR documents',
                'upload.dropzone.subtext': 'Financial reports, annual reports, etc. (Max 50MB/file)',
                'upload.existing.title': 'Select from Existing Documents',
                'upload.existing.button': 'Show Existing Documents',

                // Section 2: FAQ
                'section.faq.title': '2. Auto-Generated Question List',
                'faq.description': 'Questions expected from shareholders\' perspective have been automatically generated from uploaded documents. Please select questions to use in the simulation.',
                'faq.table.select': 'Select',
                'faq.table.number': 'No.',
                'faq.table.question': 'Question Content',
                'faq.select.all': 'Select All',
                'faq.deselect.all': 'Deselect All',
                'faq.regenerate': 'Regenerate Questions',
                'faq.selected.count': 'Selected: {count} items',

                // Section 3: Expected Questions
                'section.questions.title': '3. Expected Questions Input (Optional)',
                'questions.placeholder': 'Enter questions expected from shareholders. Separate multiple questions with line breaks.\n\nExample:\n• What are the reasons for this year\'s performance deterioration compared to last year?\n• What are the revenue prospects for new businesses?\n• Are there any plans to change the dividend policy?',
                'questions.help': 'If not entered, AI will automatically generate questions from the documents',

                // Section 4: Simulation Control
                'section.control.title': '4. Start Simulation',
                'control.start': 'Start Q&A Simulation',
                'control.pause': 'Pause',
                'control.next': 'Next Question',
                'control.end': 'End',
                'status.upload.required': 'Please upload IR documents first',

                // Section 5: Chat
                'section.chat.title': '5. Q&A Simulation',
                'chat.message.count': 'Messages: {count}',
                'chat.play.sequence': '🔊 Play Q&A',

                // Section 6: History
                'section.history.title': '6. Session History',
                'history.load': 'Load History',

                // Common
                'loading': 'Processing...',
                'error': 'Error',
                'language.selector': 'Language',
                'language.japanese': '日本語',
                'language.english': 'English'
            }
        };
    }

    // Get translated text
    t(key, params = {}) {
        let text = this.translations[this.currentLanguage][key] || key;
        
        // Replace placeholders like {count} with actual values
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });
        
        return text;
    }

    // Set current language and update UI
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.updateUI();
        }
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Update all translatable elements in the UI
    updateUI() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Update language selector
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            languageSelector.value = this.currentLanguage;
        }

        // Update dynamic content that might need refresh
        this.updateDynamicContent();
    }

    // Update dynamic content that changes during app usage
    updateDynamicContent() {
        // Update selected FAQ count
        const selectedCount = document.getElementById('selected-faq-count');
        if (selectedCount) {
            const count = selectedCount.getAttribute('data-count') || '0';
            const countElement = document.querySelector('[data-i18n="faq.selected.count"]');
            if (countElement) {
                countElement.textContent = this.t('faq.selected.count', { count });
            }
        }

        // Update message count
        const messageCountElement = document.getElementById('message-count');
        if (messageCountElement) {
            const count = messageCountElement.getAttribute('data-count') || '0';
            messageCountElement.textContent = this.t('chat.message.count', { count });
        }
    }
}

// Global i18n instance
const i18n = new I18n();