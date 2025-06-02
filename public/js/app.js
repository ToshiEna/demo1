// Global variables
let currentSessionId = null;
let uploadedDocuments = [];
let isSimulationActive = false;
let messageCount = 0;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupFileUpload();
    loadSessions();
    updateSimulationStatus('まず IR資料をアップロードしてください');
}

function setupEventListeners() {
    // Document upload
    document.getElementById('document-upload').addEventListener('change', handleFileSelect);
    
    // Simulation controls
    document.getElementById('start-simulation').addEventListener('click', startSimulation);
    document.getElementById('pause-simulation').addEventListener('click', pauseSimulation);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    document.getElementById('end-simulation').addEventListener('click', endSimulation);
    
    // Session management
    document.getElementById('load-sessions').addEventListener('click', loadSessions);
    
    // Modal controls
    document.querySelector('.close').addEventListener('click', closeErrorModal);
    
    // Expected questions input
    document.getElementById('expected-questions').addEventListener('input', validateInput);
}

function setupFileUpload() {
    const dropzone = document.querySelector('.upload-dropzone');
    
    // Drag and drop handlers
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
        if (files.length > 0) {
            uploadFiles(files);
        } else {
            showError('PDFファイルのみアップロード可能です。');
        }
    });
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
}

async function uploadFiles(files) {
    showLoading(true);
    
    try {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('documents', file);
        });
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            uploadedDocuments = [...uploadedDocuments, ...result.files];
            updateUploadedFilesList();
            validateInput();
            showSuccess(`${files.length}件のファイルがアップロードされました。`);
        } else {
            throw new Error(result.error || 'アップロードに失敗しました。');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function updateUploadedFilesList() {
    const container = document.getElementById('uploaded-files');
    container.innerHTML = '';
    
    uploadedDocuments.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">📄</span>
                <div>
                    <div>${file.originalName}</div>
                    <small>${formatFileSize(file.size)} | ${new Date(file.uploadedAt).toLocaleString()}</small>
                </div>
            </div>
            <button class="file-remove" onclick="removeFile(${index})">削除</button>
        `;
        container.appendChild(fileItem);
    });
}

function removeFile(index) {
    uploadedDocuments.splice(index, 1);
    updateUploadedFilesList();
    validateInput();
}

function validateInput() {
    const hasDocuments = uploadedDocuments.length > 0;
    const startButton = document.getElementById('start-simulation');
    
    if (hasDocuments) {
        startButton.disabled = false;
        updateSimulationStatus('シミュレーションを開始できます', 'ready');
    } else {
        startButton.disabled = true;
        updateSimulationStatus('まず IR資料をアップロードしてください');
    }
}

async function startSimulation() {
    if (uploadedDocuments.length === 0) {
        showError('IR資料をアップロードしてからシミュレーションを開始してください。');
        return;
    }
    
    showLoading(true);
    
    try {
        const expectedQuestions = document.getElementById('expected-questions').value.trim();
        
        const response = await fetch('/api/simulation/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documents: uploadedDocuments.map(doc => doc.filename),
                expectedQuestions: expectedQuestions ? expectedQuestions.split('\n').filter(q => q.trim()) : []
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentSessionId = result.sessionId;
            isSimulationActive = true;
            messageCount = 0;
            
            // Update UI
            document.getElementById('chat-section').style.display = 'block';
            document.getElementById('session-id').textContent = `セッション: ${currentSessionId}`;
            document.getElementById('chat-messages').innerHTML = '';
            
            // Update button states
            updateSimulationControls(true);
            updateSimulationStatus('シミュレーション実行中...', 'active');
            
            // Start polling for messages
            pollSimulationMessages();
            
            showSuccess('シミュレーションが開始されました。');
        } else {
            throw new Error(result.error || 'シミュレーションの開始に失敗しました。');
        }
    } catch (error) {
        console.error('Simulation start error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function updateSimulationControls(isActive) {
    document.getElementById('start-simulation').disabled = isActive;
    document.getElementById('pause-simulation').disabled = !isActive;
    document.getElementById('next-question').disabled = !isActive;
    document.getElementById('end-simulation').disabled = !isActive;
}

async function pollSimulationMessages() {
    if (!isSimulationActive || !currentSessionId) return;
    
    try {
        const response = await fetch(`/api/simulation/${currentSessionId}`);
        const session = await response.json();
        
        if (response.ok) {
            updateChatMessages(session.messages);
            
            if (session.status === 'completed') {
                endSimulation();
                showSuccess('シミュレーションが完了しました。');
                return;
            }
            
            // Continue polling
            setTimeout(pollSimulationMessages, 2000);
        } else {
            console.error('Failed to poll messages:', session.error);
        }
    } catch (error) {
        console.error('Polling error:', error);
        // Continue polling even on errors
        setTimeout(pollSimulationMessages, 5000);
    }
}

function updateChatMessages(messages) {
    const chatContainer = document.getElementById('chat-messages');
    const currentMessageCount = chatContainer.children.length;
    
    // Add new messages
    for (let i = currentMessageCount; i < messages.length; i++) {
        const message = messages[i];
        addMessageToChat(message);
    }
    
    // Update message count
    messageCount = messages.length;
    document.getElementById('message-count').textContent = `メッセージ: ${messageCount}`;
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addMessageToChat(message) {
    const chatContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.type}`;
    
    const agentIcon = message.type === 'shareholder' ? '👥' : '🏢';
    const agentName = message.type === 'shareholder' ? '株主' : '会社側';
    
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <span class="agent-icon">${agentIcon}</span>
                <span>${agentName}</span>
            </div>
            <div class="message-text">${escapeHtml(message.content)}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
    `;
    
    chatContainer.appendChild(messageElement);
}

function pauseSimulation() {
    // For now, just stop polling
    isSimulationActive = false;
    updateSimulationStatus('シミュレーション一時停止中', 'ready');
    updateSimulationControls(false);
    document.getElementById('start-simulation').disabled = false;
    document.getElementById('start-simulation').textContent = '再開';
}

async function nextQuestion() {
    if (!currentSessionId) return;
    
    try {
        const response = await fetch(`/api/simulation/${currentSessionId}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'next_question'
            })
        });
        
        if (response.ok) {
            showSuccess('次の質問に進みます。');
        } else {
            const result = await response.json();
            showError(result.error || '操作に失敗しました。');
        }
    } catch (error) {
        console.error('Next question error:', error);
        showError('操作に失敗しました。');
    }
}

function endSimulation() {
    isSimulationActive = false;
    currentSessionId = null;
    
    updateSimulationControls(false);
    updateSimulationStatus('シミュレーション終了', 'ready');
    
    document.getElementById('start-simulation').disabled = false;
    document.getElementById('start-simulation').textContent = 'Q&Aシミュレーション開始';
    
    // Reload sessions to show the completed session
    setTimeout(loadSessions, 1000);
}

async function loadSessions() {
    try {
        const response = await fetch('/api/sessions');
        const sessions = await response.json();
        
        if (response.ok) {
            updateSessionsList(sessions);
        } else {
            console.error('Failed to load sessions:', sessions.error);
        }
    } catch (error) {
        console.error('Load sessions error:', error);
    }
}

function updateSessionsList(sessions) {
    const container = document.getElementById('session-list');
    container.innerHTML = '';
    
    if (sessions.length === 0) {
        container.innerHTML = '<p>過去のセッションはありません。</p>';
        return;
    }
    
    sessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session-item';
        sessionItem.innerHTML = `
            <div class="session-date">${new Date(session.createdAt).toLocaleString()}</div>
            <div class="session-stats">
                セッション ID: ${session.id} | 
                メッセージ数: ${session.messageCount} | 
                ステータス: ${session.status === 'completed' ? '完了' : '進行中'}
            </div>
        `;
        
        sessionItem.addEventListener('click', () => viewSession(session.id));
        container.appendChild(sessionItem);
    });
}

async function viewSession(sessionId) {
    try {
        const response = await fetch(`/api/simulation/${sessionId}`);
        const session = await response.json();
        
        if (response.ok) {
            // Switch to chat view and display session
            document.getElementById('chat-section').style.display = 'block';
            document.getElementById('session-id').textContent = `過去のセッション: ${sessionId}`;
            document.getElementById('chat-messages').innerHTML = '';
            
            updateChatMessages(session.messages);
            updateSimulationControls(false);
            updateSimulationStatus('過去のセッションを表示中', 'ready');
        } else {
            showError(session.error || 'セッションの読み込みに失敗しました。');
        }
    } catch (error) {
        console.error('View session error:', error);
        showError('セッションの読み込みに失敗しました。');
    }
}

// Utility functions
function updateSimulationStatus(message, type = '') {
    const statusElement = document.getElementById('simulation-status');
    statusElement.textContent = message;
    statusElement.className = `status-display ${type}`;
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'block' : 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').style.display = 'block';
}

function closeErrorModal() {
    document.getElementById('error-modal').style.display = 'none';
}

function showSuccess(message) {
    // Simple success notification - could be enhanced with a proper toast system
    updateSimulationStatus(message, 'ready');
    setTimeout(() => {
        if (!isSimulationActive) {
            validateInput();
        }
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}