// Global variables
let currentSessionId = null;
let uploadedDocuments = [];
let generatedFAQs = [];
let isSimulationActive = false;
let messageCount = 0;
let currentMessages = []; // Store current messages for sequential playback

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
    
    // FAQ controls
    document.getElementById('select-all-faqs').addEventListener('click', selectAllFAQs);
    document.getElementById('deselect-all-faqs').addEventListener('click', deselectAllFAQs);
    document.getElementById('regenerate-faqs').addEventListener('click', regenerateFAQs);
    
    // Existing documents
    document.getElementById('load-existing-docs').addEventListener('click', loadExistingDocuments);
    
    // Sequential Q&A playback
    document.getElementById('play-qa-sequence').addEventListener('click', playQASequence);
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
        
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'text/plain' // .txt
        ];
        
        const files = Array.from(e.dataTransfer.files).filter(file => allowedTypes.includes(file.type));
        if (files.length > 0) {
            uploadFiles(files);
        } else {
            showError('PDF、Word、テキストファイルのみアップロード可能です。');
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
        // Check for duplicate files before uploading
        const duplicateFiles = [];
        const filesToUpload = [];
        
        files.forEach(file => {
            const isDuplicate = uploadedDocuments.some(uploaded => uploaded.originalName === file.name);
            if (isDuplicate) {
                duplicateFiles.push(file.name);
            } else {
                filesToUpload.push(file);
            }
        });
        
        if (duplicateFiles.length > 0) {
            showError(`以下のファイルは既にアップロード済みです: ${duplicateFiles.join(', ')}`);
            if (filesToUpload.length === 0) {
                return; // No files to upload
            }
        }
        
        if (filesToUpload.length === 0) {
            showError('アップロードする新しいファイルがありません。');
            return;
        }
        
        const formData = new FormData();
        filesToUpload.forEach(file => {
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
            
            // Generate FAQs from uploaded documents
            await generateFAQs();
            
            validateInput();
            
            let message = `${filesToUpload.length}件のファイルがアップロードされました。`;
            if (duplicateFiles.length > 0) {
                message += ` (${duplicateFiles.length}件の重複ファイルをスキップしました)`;
            }
            showSuccess(message);
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
        
        // Generate topics display
        const topicsHtml = file.topics && file.topics.length > 0 
            ? `<div class="file-topics">
                 <strong>主要トピックス:</strong>
                 <ul>
                   ${file.topics.map(topic => `<li>${topic.substring(0, 100)}${topic.length > 100 ? '...' : ''}</li>`).join('')}
                 </ul>
               </div>`
            : '<div class="file-topics"><em>トピックスが見つかりませんでした</em></div>';
        
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">📄</span>
                <div>
                    <div>${file.originalName}</div>
                    <small>${formatFileSize(file.size)} | ${new Date(file.uploadedAt).toLocaleString()}</small>
                    ${topicsHtml}
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

// FAQ Management Functions
async function generateFAQs() {
    try {
        showLoading(true, 'FAQ質問を生成中...');
        
        const documentIds = uploadedDocuments.map(doc => doc.id);
        
        const response = await fetch('/api/documents/generate-faq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documentIds: documentIds
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            generatedFAQs = result.faqs;
            displayFAQs();
            document.getElementById('faq-section').style.display = 'block';
            
            // Auto-expand the FAQ section when questions are generated
            const content = document.getElementById('faq-content');
            const icon = document.getElementById('faq-toggle-icon');
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            icon.classList.remove('collapsed');
            icon.classList.add('expanded');
            
            showSuccess(`${result.faqs.length}個の質問を自動生成しました。`);
        } else {
            throw new Error(result.error || 'FAQ生成に失敗しました。');
        }
    } catch (error) {
        console.error('FAQ generation error:', error);
        showError('FAQ生成中にエラーが発生しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function displayFAQs() {
    const tbody = document.getElementById('faq-table-body');
    tbody.innerHTML = '';
    
    generatedFAQs.forEach(faq => {
        const row = document.createElement('tr');
        row.dataset.faqId = faq.id;
        
        if (faq.selected) {
            row.classList.add('selected');
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="faq-checkbox" ${faq.selected ? 'checked' : ''} 
                       onchange="toggleFAQSelection(${faq.id})">
            </td>
            <td class="faq-number">${faq.id}</td>
            <td class="faq-question">${faq.question}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateSelectedCount();
}

function toggleFAQSelection(faqId) {
    const faq = generatedFAQs.find(f => f.id === faqId);
    if (faq) {
        faq.selected = !faq.selected;
        
        // Update UI
        const row = document.querySelector(`tr[data-faq-id="${faqId}"]`);
        if (faq.selected) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
        
        updateSelectedCount();
    }
}

function selectAllFAQs() {
    generatedFAQs.forEach(faq => faq.selected = true);
    displayFAQs();
}

function deselectAllFAQs() {
    generatedFAQs.forEach(faq => faq.selected = false);
    displayFAQs();
}

async function regenerateFAQs() {
    if (uploadedDocuments.length === 0) {
        showError('FAQ再生成するには、まず資料をアップロードしてください。');
        return;
    }
    
    await generateFAQs();
}

function updateSelectedCount() {
    const selectedCount = generatedFAQs.filter(faq => faq.selected).length;
    document.getElementById('selected-faq-count').textContent = selectedCount;
}

function getSelectedFAQs() {
    return generatedFAQs.filter(faq => faq.selected).map(faq => faq.question);
}

async function startSimulation() {
    if (uploadedDocuments.length === 0) {
        showError('IR資料をアップロードしてからシミュレーションを開始してください。');
        return;
    }
    
    showLoading(true);
    
    try {
        // Get questions from FAQ selection or manual input
        const selectedFAQs = getSelectedFAQs();
        const manualQuestions = document.getElementById('expected-questions').value.trim();
        
        let questionsToUse = [];
        
        if (selectedFAQs.length > 0) {
            // Use selected FAQs as priority
            questionsToUse = selectedFAQs;
            
            // Add manual questions if any
            if (manualQuestions) {
                const additionalQuestions = manualQuestions.split('\n').filter(q => q.trim());
                questionsToUse = [...questionsToUse, ...additionalQuestions];
            }
        } else if (manualQuestions) {
            // Use manual questions only
            questionsToUse = manualQuestions.split('\n').filter(q => q.trim());
        }
        // If no questions are provided, the AI will auto-generate during simulation
        
        const response = await fetch('/api/simulation/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documents: uploadedDocuments.map(doc => doc.filename),
                expectedQuestions: questionsToUse
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
    
    // Store messages globally for sequential playback
    currentMessages = messages;
    
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
                <button class="play-button" onclick="playMessageAudio('${message.id}', '${message.type}', this)" title="音声再生">
                    🔊
                </button>
            </div>
            <div class="message-text">${escapeHtml(message.content)}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
    `;
    
    // Store message text for audio playback
    messageElement.setAttribute('data-message-text', message.content);
    
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

function showLoading(show, message = '処理中...') {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.querySelector('p').textContent = message;
        overlay.style.display = 'block';
    } else {
        overlay.style.display = 'none';
    }
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

// Voice functionality
let currentAudio = null;
let voiceServiceAvailable = null;

/**
 * Check if voice service is available
 */
async function checkVoiceServiceStatus() {
    if (voiceServiceAvailable !== null) {
        return voiceServiceAvailable;
    }
    
    try {
        const response = await fetch('/api/voice/status');
        const result = await response.json();
        voiceServiceAvailable = result.available;
        return voiceServiceAvailable;
    } catch (error) {
        console.error('Failed to check voice service status:', error);
        voiceServiceAvailable = false;
        return false;
    }
}

/**
 * Play audio for a message
 * @param {string} messageId - Message ID
 * @param {string} agentType - 'shareholder' or 'company'
 * @param {HTMLElement} buttonElement - The play button element
 */
async function playMessageAudio(messageId, agentType, buttonElement) {
    try {
        // Check if voice service is available
        const isAvailable = await checkVoiceServiceStatus();
        if (!isAvailable) {
            showError('音声機能は利用できません。Azure Speech Servicesの設定を確認してください。');
            return;
        }
        
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            // Reset all play buttons
            document.querySelectorAll('.play-button').forEach(btn => {
                btn.textContent = '🔊';
                btn.disabled = false;
            });
        }
        
        // Get message text from the parent element
        const messageElement = buttonElement.closest('.message');
        const messageText = messageElement.getAttribute('data-message-text');
        
        if (!messageText) {
            showError('メッセージテキストが見つかりません。');
            return;
        }
        
        // Update button state
        buttonElement.textContent = '⏸️';
        buttonElement.disabled = true;
        
        // Request audio from server
        const response = await fetch('/api/voice/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: messageText,
                agentType: agentType
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '音声生成に失敗しました。');
        }
        
        // Create audio blob and play
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        currentAudio = new Audio(audioUrl);
        
        currentAudio.onended = () => {
            buttonElement.textContent = '🔊';
            buttonElement.disabled = false;
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
        };
        
        currentAudio.onerror = () => {
            buttonElement.textContent = '🔊';
            buttonElement.disabled = false;
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
            showError('音声の再生に失敗しました。');
        };
        
        await currentAudio.play();
        
    } catch (error) {
        console.error('Audio playback error:', error);
        buttonElement.textContent = '🔊';
        buttonElement.disabled = false;
        showError(error.message || '音声再生エラーが発生しました。');
    }
}

/**
 * Play Q&A messages in sequence (shareholder question followed by company answer)
 */
async function playQASequence() {
    try {
        // Check if voice service is available
        const isAvailable = await checkVoiceServiceStatus();
        if (!isAvailable) {
            showError('音声機能は利用できません。Azure Speech Servicesの設定を確認してください。');
            return;
        }
        
        // Check if there are messages to play
        if (!currentMessages || currentMessages.length === 0) {
            showError('再生するメッセージがありません。');
            return;
        }
        
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        
        // Reset all individual play buttons
        document.querySelectorAll('.play-button').forEach(btn => {
            btn.textContent = '🔊';
            btn.disabled = false;
        });
        
        const sequenceButton = document.getElementById('play-qa-sequence');
        sequenceButton.disabled = true;
        sequenceButton.textContent = '⏸️ 再生中...';
        
        // Group messages into Q&A pairs
        const qaPairs = [];
        for (let i = 0; i < currentMessages.length; i++) {
            const message = currentMessages[i];
            if (message.type === 'shareholder') {
                // Find the corresponding company response
                const companyResponse = currentMessages.find((m, idx) => 
                    idx > i && m.type === 'company');
                if (companyResponse) {
                    qaPairs.push({
                        question: message,
                        answer: companyResponse
                    });
                }
            }
        }
        
        if (qaPairs.length === 0) {
            showError('Q&Aペアが見つかりません。');
            resetSequenceButton();
            return;
        }
        
        // Play each Q&A pair sequentially
        for (let i = 0; i < qaPairs.length; i++) {
            const pair = qaPairs[i];
            
            // Play shareholder question
            await playMessageSequentially(pair.question.content, 'shareholder');
            
            // Small pause between question and answer
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Play company answer
            await playMessageSequentially(pair.answer.content, 'company');
            
            // Pause between Q&A pairs (except for the last one)
            if (i < qaPairs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        resetSequenceButton();
        
    } catch (error) {
        console.error('Sequential playback error:', error);
        showError(error.message || 'Q&A再生エラーが発生しました。');
        resetSequenceButton();
    }
}

/**
 * Reset the sequence button to initial state
 */
function resetSequenceButton() {
    const sequenceButton = document.getElementById('play-qa-sequence');
    sequenceButton.disabled = false;
    sequenceButton.textContent = '🔊 Q&A再生';
}

/**
 * Play a single message in sequence
 * @param {string} text - Text to play
 * @param {string} agentType - 'shareholder' or 'company'
 * @returns {Promise} Promise that resolves when audio finishes
 */
async function playMessageSequentially(text, agentType) {
    return new Promise(async (resolve, reject) => {
        try {
            // Request audio from server
            const response = await fetch('/api/voice/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    agentType: agentType
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '音声生成に失敗しました。');
            }
            
            // Create audio blob and play
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
            
            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                reject(new Error('音声の再生に失敗しました。'));
            };
            
            await audio.play();
            
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize voice service status check when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkVoiceServiceStatus();
});

// Existing Documents Management
let existingDocuments = [];

async function loadExistingDocuments() {
    try {
        showLoading(true, '既存資料を読み込み中...');
        
        const response = await fetch('/api/documents');
        const result = await response.json();
        
        if (response.ok) {
            existingDocuments = result.documents;
            displayExistingDocuments();
            
            const container = document.getElementById('existing-documents');
            container.style.display = 'block';
            
            document.getElementById('load-existing-docs').textContent = '既存資料を隠す';
            document.getElementById('load-existing-docs').onclick = hideExistingDocuments;
            
            showSuccess(`${result.documents.length}件の既存資料が見つかりました。`);
        } else {
            throw new Error(result.error || '既存資料の読み込みに失敗しました。');
        }
    } catch (error) {
        console.error('Load existing documents error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function hideExistingDocuments() {
    const container = document.getElementById('existing-documents');
    container.style.display = 'none';
    
    document.getElementById('load-existing-docs').textContent = '既存資料を表示';
    document.getElementById('load-existing-docs').onclick = loadExistingDocuments;
}

function displayExistingDocuments() {
    const container = document.getElementById('existing-documents');
    container.innerHTML = '';
    
    if (existingDocuments.length === 0) {
        container.innerHTML = '<p>既存の資料がありません。</p>';
        return;
    }
    
    existingDocuments.forEach(doc => {
        // Check if document is already selected
        const isSelected = uploadedDocuments.some(uploaded => uploaded.id === doc.id);
        
        const docItem = document.createElement('div');
        docItem.className = `existing-doc-item ${isSelected ? 'selected' : ''}`;
        
        // Generate topics display for existing documents
        const topicsDisplay = doc.topics && doc.topics.length > 0 
            ? `<div class="existing-doc-topics">
                 トピックス: ${doc.topics.slice(0, 2).map(t => t.substring(0, 50)).join(', ')}${doc.topics.length > 2 ? '...' : ''}
               </div>`
            : '<div class="existing-doc-topics">トピックス: なし</div>';
        
        docItem.innerHTML = `
            <input type="checkbox" class="existing-doc-select" 
                   ${isSelected ? 'checked disabled' : ''} 
                   onchange="toggleExistingDocumentSelection('${doc.id}', this)">
            <div class="existing-doc-info">
                <div><strong>${doc.originalName}</strong></div>
                <small>${formatFileSize(doc.size)} | ${new Date(doc.uploadedAt).toLocaleString()}</small>
                ${topicsDisplay}
            </div>
        `;
        
        container.appendChild(docItem);
    });
}

function toggleExistingDocumentSelection(docId, checkboxElement) {
    const doc = existingDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    if (checkboxElement.checked) {
        // Add to uploaded documents if not already there
        const alreadyExists = uploadedDocuments.some(uploaded => uploaded.id === doc.id);
        if (!alreadyExists) {
            uploadedDocuments.push(doc);
            updateUploadedFilesList();
            validateInput();
            
            // Generate FAQs if this is the first document
            if (uploadedDocuments.length === 1) {
                generateFAQs();
            }
            
            showSuccess(`${doc.originalName} を選択しました。`);
        }
    } else {
        // Remove from uploaded documents
        const index = uploadedDocuments.findIndex(uploaded => uploaded.id === doc.id);
        if (index > -1) {
            uploadedDocuments.splice(index, 1);
            updateUploadedFilesList();
            validateInput();
            showSuccess(`${doc.originalName} の選択を解除しました。`);
        }
    }
    
    // Update the existing documents display to reflect changes
    displayExistingDocuments();
}

// FAQ Section Toggle Functions
function toggleFAQSection() {
    const content = document.getElementById('faq-content');
    const icon = document.getElementById('faq-toggle-icon');
    
    if (content.classList.contains('collapsed')) {
        // Expand
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.classList.remove('collapsed');
        icon.classList.add('expanded');
    } else {
        // Collapse
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        icon.classList.remove('expanded');
        icon.classList.add('collapsed');
    }
}