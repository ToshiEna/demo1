const axios = require('axios');

class CompanyAgent {
    constructor(documents) {
        this.documents = documents;
    }
    
    async generateResponse(question, messageHistory = []) {
        try {
            // Build context from documents
            const relevantContext = this.findRelevantDocumentContent(question);
            
            // Build conversation context
            const conversationContext = this.buildConversationContext(messageHistory);
            
            // Generate response prompt
            const responsePrompt = this.buildResponsePrompt(question, relevantContext, conversationContext);
            
            // For now, generate mock response since we don't have Azure OpenAI configured
            const response = await this.generateMockResponse(question, relevantContext);
            
            return response;
            
        } catch (error) {
            console.error('Failed to generate response:', error);
            return "申し訳ございませんが、現在お答えできません。後ほど詳細をご回答させていただきます。";
        }
    }
    
    findRelevantDocumentContent(question) {
        // Simple keyword-based search for relevant content
        const keywords = this.extractKeywords(question);
        const relevantSections = [];
        
        this.documents.forEach(doc => {
            const sentences = doc.textContent.split(/[。．\n]/).filter(s => s.trim().length > 10);
            
            sentences.forEach(sentence => {
                const relevanceScore = keywords.reduce((score, keyword) => {
                    return score + (sentence.includes(keyword) ? 1 : 0);
                }, 0);
                
                if (relevanceScore > 0) {
                    relevantSections.push({
                        source: doc.originalName,
                        content: sentence.trim(),
                        relevance: relevanceScore
                    });
                }
            });
        });
        
        // Sort by relevance and take top 5
        return relevantSections
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5);
    }
    
    extractKeywords(question) {
        // Simple keyword extraction
        const commonWords = ['の', 'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より', 'について', 'では', 'です', 'ます', 'である', 'する', 'した', 'される', 'いる', 'ある', 'この', 'その', 'あの', 'どの', 'いかが', 'どう', 'なぜ', 'どこ', 'いつ', 'だれ', '何'];
        
        return question
            .replace(/[？?！!。．、，]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 1 && !commonWords.includes(word))
            .slice(0, 10); // Take first 10 keywords
    }
    
    buildConversationContext(messageHistory) {
        // Get recent conversation for context
        return messageHistory.slice(-4).map(msg => ({
            speaker: msg.type === 'shareholder' ? '株主' : '会社',
            content: msg.content
        }));
    }
    
    buildResponsePrompt(question, relevantContext, conversationContext) {
        return {
            question,
            relevantContext,
            conversationContext
        };
    }
    
    async generateMockResponse(question, relevantContext) {
        // Mock implementation - in production, this would call Azure OpenAI
        
        // Generate response based on question content and relevant context
        const questionLower = question.toLowerCase();
        
        if (questionLower.includes('業績') || questionLower.includes('売上') || questionLower.includes('利益')) {
            return this.generatePerformanceResponse(relevantContext);
        }
        
        if (questionLower.includes('戦略') || questionLower.includes('計画') || questionLower.includes('今後')) {
            return this.generateStrategyResponse(relevantContext);
        }
        
        if (questionLower.includes('配当') || questionLower.includes('株主還元')) {
            return this.generateDividendResponse(relevantContext);
        }
        
        if (questionLower.includes('リスク') || questionLower.includes('課題')) {
            return this.generateRiskResponse(relevantContext);
        }
        
        // Generic response with context
        return this.generateGenericResponse(question, relevantContext);
    }
    
    generatePerformanceResponse(context) {
        const responses = [
            "今期の業績につきましては、売上高は前年同期比で堅調に推移しております。主力事業の好調に加え、新規事業の寄与により、計画を上回る成果を達成することができました。",
            "業績の詳細につきまして、売上面では市場拡大と競争力強化の取り組みが実を結び、着実な成長を実現しております。利益面でも効率化の推進により、収益性の向上を図っております。",
            "当期の業績は、全社一丸となった取り組みの結果、おおむね計画通りに進捗しております。特に主力製品の販売が好調で、市場シェアの拡大も実現できました。"
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        if (context && context.length > 0) {
            return baseResponse + `詳細につきましては、${context[0].source}に記載の通りでございます。`;
        }
        
        return baseResponse;
    }
    
    generateStrategyResponse(context) {
        const responses = [
            "今後の戦略につきましては、中長期的な成長を見据え、既存事業の強化と新規領域への展開を両輪として推進してまいります。",
            "戦略的な取り組みとして、DXの推進、グローバル展開の加速、そして持続可能な経営の実現に注力してまいります。",
            "将来に向けた計画として、市場ニーズの変化に対応した製品・サービスの開発と、効率的な事業運営の確立を図ってまいります。"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    generateDividendResponse(context) {
        const responses = [
            "配当政策につきましては、安定的かつ継続的な株主還元を基本方針としており、業績の向上に応じた配当の充実に努めてまいります。",
            "株主還元については、連結配当性向30%を目安として、安定配当の維持と業績連動による増配を組み合わせた政策を継続いたします。",
            "配当に関しては、将来の成長投資とのバランスを考慮しながら、株主の皆様のご期待にお応えできるよう努めてまいります。"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    generateRiskResponse(context) {
        const responses = [
            "リスク管理につきましては、市場環境の変化、競争激化、規制変更等を主要リスクとして認識し、適切な対策を講じております。",
            "事業運営上の課題として、人材確保、技術革新への対応、サプライチェーンの安定化等に取り組んでおります。",
            "リスク要因については、定期的な見直しと評価を行い、必要に応じて追加的な対策を実施してまいります。"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    generateGenericResponse(question, context) {
        const responses = [
            "ご質問いただいた点につきまして、当社では適切な対応を図っており、今後も継続的な改善に努めてまいります。",
            "お尋ねの件については、関係部門と連携して検討を進めており、適切な時期にご報告させていただきます。",
            "ご指摘の点は重要な課題として認識しており、全社を挙げて取り組んでまいります。"
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        if (context && context.length > 0) {
            return baseResponse + `なお、詳細は開示資料もご参照ください。`;
        }
        
        return baseResponse;
    }
    
    async callAzureOpenAI(prompt) {
        // This would be implemented with actual Azure OpenAI API calls
        if (!process.env.AZURE_OPENAI_API_KEY) {
            throw new Error('Azure OpenAI API key not configured');
        }
        
        try {
            const response = await axios.post(
                `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`,
                {
                    messages: [
                        {
                            role: "system",
                            content: "あなたは上場企業の経営陣です。株主総会で株主からの質問に対して、誠実で建設的な回答をしてください。提供された資料の内容に基づいて回答し、事実に基づかない情報は含めないでください。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 300,
                    temperature: 0.3
                },
                {
                    headers: {
                        'api-key': process.env.AZURE_OPENAI_API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Azure OpenAI API error:', error);
            throw error;
        }
    }
}

module.exports = CompanyAgent;