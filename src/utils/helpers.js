const fs = require('fs');
const path = require('path');

/**
 * Ensure directory exists, create if not
 */
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean up old uploaded files
 */
function cleanupOldFiles(directory, maxAgeHours = 24) {
    if (!fs.existsSync(directory)) return;
    
    const files = fs.readdirSync(directory);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    
    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
            try {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up old file: ${file}`);
            } catch (error) {
                console.error(`Failed to cleanup file ${file}:`, error);
            }
        }
    });
}

/**
 * Extract text snippets from content based on keywords
 */
function extractRelevantSnippets(content, keywords, maxSnippets = 5, snippetLength = 200) {
    const sentences = content.split(/[。．\n]/).filter(s => s.trim().length > 10);
    const snippets = [];
    
    sentences.forEach(sentence => {
        const relevanceScore = keywords.reduce((score, keyword) => {
            return score + (sentence.toLowerCase().includes(keyword.toLowerCase()) ? 1 : 0);
        }, 0);
        
        if (relevanceScore > 0) {
            snippets.push({
                content: sentence.trim().substring(0, snippetLength),
                relevance: relevanceScore
            });
        }
    });
    
    return snippets
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, maxSnippets)
        .map(snippet => snippet.content);
}

/**
 * Sanitize user input
 */
function sanitizeInput(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    
    return input
        .trim()
        .substring(0, maxLength)
        .replace(/[<>\"']/g, ''); // Basic HTML/XSS prevention
}

/**
 * Generate session summary
 */
function generateSessionSummary(session) {
    const questionCount = session.messages.filter(m => m.type === 'shareholder').length;
    const responseCount = session.messages.filter(m => m.type === 'company').length;
    
    return {
        id: session.id,
        createdAt: session.createdAt,
        status: session.status,
        questionCount,
        responseCount,
        totalMessages: session.messages.length,
        duration: session.status === 'completed' ? 
            calculateSessionDuration(session.createdAt, session.messages) : null
    };
}

/**
 * Calculate session duration
 */
function calculateSessionDuration(startTime, messages) {
    if (!messages || messages.length === 0) return null;
    
    const start = new Date(startTime);
    const end = new Date(messages[messages.length - 1].timestamp);
    
    return Math.round((end - start) / 1000 / 60); // Duration in minutes
}

/**
 * Validate PDF file
 */
function validatePdfFile(file) {
    const errors = [];
    
    if (!file) {
        errors.push('No file provided');
        return errors;
    }
    
    if (file.mimetype !== 'application/pdf') {
        errors.push('File must be a PDF');
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
        errors.push('File size must be less than 50MB');
    }
    
    if (file.size === 0) {
        errors.push('File is empty');
    }
    
    return errors;
}

/**
 * Extract key topics from document content
 */
function extractDocumentTopics(textContent, maxTopics = 5) {
    if (!textContent || textContent.trim().length === 0) {
        return [];
    }

    const text = textContent.toLowerCase();
    
    // Japanese business document keywords that indicate important topics
    const topicKeywords = [
        '売上', '収益', '営業利益', '当期純利益', '業績', '決算', '財務',
        '新規事業', '戦略', '計画', '方針', '投資', '開発', '成長',
        '株主', '配当', '株価', '資本', '株式',
        '市場', '競合', '顧客', '事業環境', '業界',
        '技術', 'デジタル', 'AI', 'DX', 'イノベーション',
        'ESG', 'サステナビリティ', '環境', '社会貢献',
        'リスク', '課題', '対策', '改善', '効率化'
    ];
    
    // Extract sentences and score them based on keyword presence and position
    const sentences = textContent.split(/[。．\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200); // Filter reasonable length sentences
    
    const scoredSentences = sentences.map(sentence => {
        let score = 0;
        const lowerSentence = sentence.toLowerCase();
        
        // Score based on keyword presence
        topicKeywords.forEach(keyword => {
            if (lowerSentence.includes(keyword)) {
                score += 2;
            }
        });
        
        // Boost score for sentences with numbers (likely financial data)
        if (/\d+%|\d+億|\d+万|\d+円/.test(sentence)) {
            score += 1;
        }
        
        // Boost score for sentences mentioning years or future plans
        if (/20\d{2}年|今年度|来年度|次期|将来/.test(sentence)) {
            score += 1;
        }
        
        return {
            content: sentence.trim(),
            score: score
        };
    });
    
    // Return top scored sentences as topics
    return scoredSentences
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxTopics)
        .map(item => item.content);
}

/**
 * Rate limiting helper
 */
class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }
    
    isAllowed(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
        }
        
        const userRequests = this.requests.get(identifier);
        
        // Remove old requests outside the window
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
        this.requests.set(identifier, validRequests);
        
        if (validRequests.length >= this.maxRequests) {
            return false;
        }
        
        // Add current request
        validRequests.push(now);
        return true;
    }
}

module.exports = {
    ensureDirectoryExists,
    formatFileSize,
    cleanupOldFiles,
    extractRelevantSnippets,
    extractDocumentTopics,
    sanitizeInput,
    generateSessionSummary,
    calculateSessionDuration,
    validatePdfFile,
    RateLimiter
};