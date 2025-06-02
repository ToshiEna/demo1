const simulationHandler = require('./simulationHandler');
const fs = require('fs');
const path = require('path');

exports.getSessions = (req, res) => {
    try {
        const sessions = simulationHandler.getAllSessions();
        
        // Sort by creation date (newest first)
        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(sessions);
        
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
};

exports.exportSession = (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessions = simulationHandler.getAllSessions();
        const session = sessions.find(s => s.id === sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Generate text export
        const exportContent = generateSessionExport(session);
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="qa-session-${sessionId}.txt"`);
        
        res.send(exportContent);
        
    } catch (error) {
        console.error('Export session error:', error);
        res.status(500).json({ error: 'Failed to export session' });
    }
};

function generateSessionExport(session) {
    const lines = [];
    
    lines.push('======================================');
    lines.push('株主総会Q&Aシミュレーション セッションログ');
    lines.push('======================================');
    lines.push('');
    lines.push(`セッション ID: ${session.id}`);
    lines.push(`作成日時: ${new Date(session.createdAt).toLocaleString('ja-JP')}`);
    lines.push(`ステータス: ${session.status === 'completed' ? '完了' : session.status}`);
    lines.push(`メッセージ数: ${session.messageCount}`);
    lines.push('');
    lines.push('======================================');
    lines.push('質疑応答ログ');
    lines.push('======================================');
    lines.push('');
    
    session.messages.forEach((message, index) => {
        const speaker = message.type === 'shareholder' ? '株主' : '会社側';
        const timestamp = new Date(message.timestamp).toLocaleTimeString('ja-JP');
        
        lines.push(`[${index + 1}] ${speaker} (${timestamp})`);
        lines.push('-'.repeat(40));
        lines.push(message.content);
        lines.push('');
    });
    
    lines.push('======================================');
    lines.push('エクスポート完了');
    lines.push(`エクスポート日時: ${new Date().toLocaleString('ja-JP')}`);
    lines.push('======================================');
    
    return lines.join('\n');
}