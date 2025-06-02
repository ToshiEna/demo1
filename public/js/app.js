// Main application class
class ShareholderQASimulator {
    constructor() {
        this.uploadedDocuments = [];
        this.currentSession = null;
        this.simulationActive = false;
        this.simulationPaused = false;
        
        this.initializeEventListeners();
        this.loadDocuments();
        this.loadSessions();
    }

    initializeEventListeners() {
        // File upload events
        const fileInput = document.getElementById('file-input');
        const uploadZone = document.getElementById('upload-zone');

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop events
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFileSelect({ target: { files: e.dataTransfer.files } });
        });

        // Simulation control events
        document.getElementById('start-simulation').addEventListener('click', () => this.startSimulation());
        document.getElementById('pause-simulation').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('resume-simulation').addEventListener('click', () => this.resumeSimulation());
        document.getElementById('next-question').addEventListener('click', () => this.nextQuestion());
        document.getElementById('end-simulation').addEventListener('click', () => this.endSimulation());
    }

    async handleFileSelect(event) {
        const files = Array.from(event.target.files);
        
        for (const file of files) {
            if (file.type !== 'application/pdf') {
                this.showError('PDFファイルのみアップロード可能です。');
                continue;
            }
            
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('document', file);

        // Show progress
        const progressDiv = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressDiv.style.display = 'block';
        progressText.textContent = 'アップロード中...';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                progressFill.style.width = '100%';
                progressText.textContent = 'アップロード完了';
                
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 1500);

                this.uploadedDocuments.push(result);
                this.updateFilesList();
                this.updateSimulationStatus();
            } else {
                throw new Error(result.error || 'アップロードに失敗しました');
            }
        } catch (error) {
            progressDiv.style.display = 'none';
            this.showError('アップロードエラー: ' + error.message);
        }
    }

    updateFilesList() {
        const filesList = document.getElementById('files-list');
        
        if (this.uploadedDocuments.length === 0) {
            filesList.innerHTML = '<p>アップロード済みファイルはありません</p>';
            return;
        }

        filesList.innerHTML = this.uploadedDocuments.map(doc => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h4>${doc.filename}</h4>
                        <p>${doc.pages}ページ • ${new Date(doc.uploadDate || Date.now()).toLocaleString('ja-JP')}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateSimulationStatus() {
        const statusDiv = document.getElementById('simulation-status');
        const startButton = document.getElementById('start-simulation');
        
        if (this.uploadedDocuments.length === 0) {
            statusDiv.innerHTML = '<p>IR資料をアップロードしてください</p>';
            statusDiv.className = 'status-display';
            startButton.disabled = true;
        } else {
            statusDiv.innerHTML = `<p>準備完了: ${this.uploadedDocuments.length}件の資料がアップロード済み</p>`;
            statusDiv.className = 'status-display ready';
            startButton.disabled = false;
        }
    }

    async startSimulation() {
        try {
            const expectedQuestions = document.getElementById('expected-questions').value
                .split('\n')
                .filter(q => q.trim())
                .map(q => q.replace(/^[・•-]\s*/, '').trim());

            // Create session
            const sessionResponse = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentIds: this.uploadedDocuments.map(doc => doc.documentId),
                    expectedQuestions: expectedQuestions
                })
            });

            const sessionResult = await sessionResponse.json();
            if (!sessionResponse.ok) {
                throw new Error(sessionResult.error);
            }

            this.currentSession = sessionResult;

            // Start simulation
            const startResponse = await fetch(`/api/sessions/${sessionResult.sessionId}/start`, {
                method: 'POST'
            });

            const startResult = await startResponse.json();
            if (!startResponse.ok) {
                throw new Error(startResult.error);
            }

            this.simulationActive = true;
            this.updateUIForActiveSimulation();
            this.updateChatDisplay(startResult.dialogue);

            // Auto-generate first response
            setTimeout(() => this.generateResponse(), 2000);

        } catch (error) {
            this.showError('シミュレーション開始エラー: ' + error.message);
        }
    }

    async generateResponse() {
        if (!this.currentSession || !this.simulationActive || this.simulationPaused) return;

        this.showChatLoading(true);

        try {
            const response = await fetch(`/api/sessions/${this.currentSession.sessionId}/respond`, {
                method: 'POST'
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error);
            }

            this.showChatLoading(false);
            this.updateChatDisplay(result.dialogue);

            // Auto-continue after response (simulate follow-up)
            setTimeout(() => this.continueDialogue(), 3000);

        } catch (error) {
            this.showChatLoading(false);
            this.showError('応答生成エラー: ' + error.message);
        }
    }

    async continueDialogue() {
        if (!this.currentSession || !this.simulationActive || this.simulationPaused) return;

        this.showChatLoading(true);

        try {
            const response = await fetch(`/api/sessions/${this.currentSession.sessionId}/continue`, {
                method: 'POST'
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error);
            }

            this.showChatLoading(false);
            this.updateChatDisplay(result.dialogue);

            if (result.status === 'completed') {
                this.endSimulation();
                return;
            }

            // Auto-generate next response
            setTimeout(() => this.generateResponse(), 2000);

        } catch (error) {
            this.showChatLoading(false);
            this.showError('対話継続エラー: ' + error.message);
        }
    }

    updateChatDisplay(dialogue) {
        const chatMessages = document.getElementById('chat-messages');
        const chatSection = document.getElementById('chat-section');
        
        chatSection.style.display = 'block';

        chatMessages.innerHTML = dialogue.map(message => `
            <div class="message ${message.speaker}">
                <div class="message-avatar">
                    ${message.speaker === 'shareholder' ? '株' : '会'}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        ${message.speaker === 'shareholder' ? '株主' : '会社側'}
                    </div>
                    <div class="message-text">${message.content}</div>
                    <div class="message-time">
                        ${new Date(message.timestamp).toLocaleTimeString('ja-JP')}
                    </div>
                </div>
            </div>
        `).join('');

        // Auto-scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showChatLoading(show) {
        const loadingDiv = document.getElementById('chat-loading');
        loadingDiv.style.display = show ? 'block' : 'none';
    }

    updateUIForActiveSimulation() {
        const statusDiv = document.getElementById('simulation-status');
        statusDiv.innerHTML = '<p>シミュレーション実行中...</p>';
        statusDiv.className = 'status-display active';

        // Hide start button, show control buttons
        document.getElementById('start-simulation').style.display = 'none';
        document.getElementById('pause-simulation').style.display = 'inline-block';
        document.getElementById('next-question').style.display = 'inline-block';
        document.getElementById('end-simulation').style.display = 'inline-block';
    }

    pauseSimulation() {
        this.simulationPaused = true;
        document.getElementById('pause-simulation').style.display = 'none';
        document.getElementById('resume-simulation').style.display = 'inline-block';
        
        const statusDiv = document.getElementById('simulation-status');
        statusDiv.innerHTML = '<p>シミュレーション一時停止中</p>';
    }

    resumeSimulation() {
        this.simulationPaused = false;
        document.getElementById('resume-simulation').style.display = 'none';
        document.getElementById('pause-simulation').style.display = 'inline-block';
        
        const statusDiv = document.getElementById('simulation-status');
        statusDiv.innerHTML = '<p>シミュレーション実行中...</p>';
    }

    async nextQuestion() {
        // Force move to next question
        await this.continueDialogue();
    }

    async endSimulation() {
        if (!this.currentSession) return;

        try {
            await fetch(`/api/sessions/${this.currentSession.sessionId}/end`, {
                method: 'POST'
            });

            this.simulationActive = false;
            this.simulationPaused = false;
            this.currentSession = null;

            // Reset UI
            const statusDiv = document.getElementById('simulation-status');
            statusDiv.innerHTML = '<p>シミュレーション完了</p>';
            statusDiv.className = 'status-display';

            // Show start button, hide control buttons
            document.getElementById('start-simulation').style.display = 'inline-block';
            document.getElementById('pause-simulation').style.display = 'none';
            document.getElementById('resume-simulation').style.display = 'none';
            document.getElementById('next-question').style.display = 'none';
            document.getElementById('end-simulation').style.display = 'none';

            this.showChatLoading(false);
            this.loadSessions(); // Refresh session history

        } catch (error) {
            this.showError('シミュレーション終了エラー: ' + error.message);
        }
    }

    async loadDocuments() {
        try {
            const response = await fetch('/api/documents');
            const documents = await response.json();
            
            if (response.ok) {
                this.uploadedDocuments = documents;
                this.updateFilesList();
                this.updateSimulationStatus();
            }
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    }

    async loadSessions() {
        try {
            const response = await fetch('/api/sessions');
            const sessions = await response.json();
            
            if (response.ok) {
                this.updateSessionHistory(sessions);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }

    updateSessionHistory(sessions) {
        const historyDiv = document.getElementById('session-history');
        
        if (sessions.length === 0) {
            historyDiv.innerHTML = '<p>過去のシミュレーションセッションはありません</p>';
            return;
        }

        historyDiv.innerHTML = sessions.map(session => `
            <div class="session-item" onclick="app.viewSession('${session.id}')">
                <h4>セッション ${session.id.substring(0, 8)}...</h4>
                <p>
                    作成: ${new Date(session.createdAt).toLocaleString('ja-JP')} • 
                    ステータス: ${this.getStatusText(session.status)} • 
                    対話数: ${session.dialogueCount}
                </p>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'initialized': '初期化済み',
            'active': '実行中',
            'completed': '完了'
        };
        return statusMap[status] || status;
    }

    async viewSession(sessionId) {
        try {
            const response = await fetch(`/api/sessions/${sessionId}`);
            const session = await response.json();
            
            if (response.ok && session.dialogue.length > 0) {
                this.updateChatDisplay(session.dialogue);
                document.getElementById('chat-section').style.display = 'block';
                
                // Scroll to chat section
                document.getElementById('chat-section').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            this.showError('セッション表示エラー: ' + error.message);
        }
    }

    showError(message) {
        // Simple error display - in production, use a proper modal/toast
        alert(message);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ShareholderQASimulator();
});

// Export for global access
window.ShareholderQASimulator = ShareholderQASimulator;