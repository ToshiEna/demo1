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
        .filter(s => s.length > 5) // Basic minimum length filter
        .filter(s => {
            // Skip sentences that are predominantly garbled characters
            const garbledCharCount = (s.match(/�/g) || []).length;
            const totalCharCount = s.length;
            
            // If the sentence has garbled characters, be more strict
            if (garbledCharCount > 0) {
                // If more than 15% of characters are garbled, skip this sentence
                const garbledRatio = garbledCharCount / totalCharCount;
                if (garbledRatio > 0.15) {
                    return false;
                }
                
                // For sentences with some garbled chars, require them to be longer and have Japanese characters
                const hasValidJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{3,}/.test(s);
                return s.length > 30 && hasValidJapanese;
            }
            
            // For clean sentences, apply normal length filtering
            return s.length > 10 && s.length < 200;
        });
    
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
    
    // Return top scored sentences as topics, excluding heavily garbled content
    return scoredSentences
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxTopics)
        .map(item => item.content);
}



module.exports = {
    extractDocumentTopics
};