const { AzureOpenAI } = require('openai');

/**
 * Generate AI-powered topic summaries from document content
 */
async function generateTopicSummaries(textContent, maxTopics = 5) {
    // Try to use Azure OpenAI if configured
    if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
        try {
            const client = new AzureOpenAI({
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                apiKey: process.env.AZURE_OPENAI_API_KEY,
                deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
                apiVersion: "2024-04-01-preview"
            });

            // Limit text content to avoid token limits (first 10,000 characters)
            const limitedText = textContent.substring(0, 10000);
            
            const prompt = `以下の企業文書から、株主にとって重要な主要トピックを${maxTopics}つ抽出し、それぞれを1-2文で要約してください。数字だけでなく、その背景や意味を含めた分かりやすい要約にしてください。

文書内容：
${limitedText}

要求：
- ${maxTopics}つの主要トピックを抽出
- 各トピックは1-2文で要約
- 数字の背景や意味を説明
- 株主の関心事項を重視
- 各行に1つのトピックを記載（番号なし）`;

            const response = await client.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "あなたは企業のIR資料を分析する専門アシスタントです。株主にとって重要な情報を分かりやすく要約します。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.3,
                model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
            });
            
            const summary = response.choices[0].message.content;
            if (summary && summary.trim().length > 0) {
                // Split the response into individual topics and clean them
                return summary.trim().split('\n')
                    .map(topic => topic.trim())
                    .filter(topic => topic.length > 0 && !topic.match(/^\d+[\.\)]/))  // Remove numbered items
                    .slice(0, maxTopics);
            }
        } catch (error) {
            console.warn('Failed to generate AI topic summaries, falling back to keyword extraction:', error.message);
        }
    }
    
    // Fallback to existing keyword-based extraction
    return extractDocumentTopicsKeyword(textContent, maxTopics);
}

/**
 * Extract key topics from document content using keyword-based approach
 */
function extractDocumentTopicsKeyword(textContent, maxTopics = 5) {
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

/**
 * Extract key topics from document content (main function that uses AI when available)
 */
async function extractDocumentTopics(textContent, maxTopics = 5) {
    if (!textContent || textContent.trim().length === 0) {
        return [];
    }
    return await generateTopicSummaries(textContent, maxTopics);
}

module.exports = {
    extractDocumentTopics,
    extractDocumentTopicsKeyword,
    generateTopicSummaries
};