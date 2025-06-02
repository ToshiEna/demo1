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
            
            // Try to use Azure OpenAI if configured, otherwise use improved mock response
            if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
                try {
                    const aiResponse = await this.callAzureOpenAI(responsePrompt);
                    return aiResponse;
                } catch (error) {
                    console.warn('Azure OpenAI failed, falling back to mock response:', error.message);
                    return await this.generateMockResponse(question, relevantContext);
                }
            } else {
                // Use improved mock response that incorporates document content
                return await this.generateMockResponse(question, relevantContext);
            }
            
        } catch (error) {
            console.error('Failed to generate response:', error);
            return "申し訳ございませんが、現在お答えできません。後ほど詳細をご回答させていただきます。";
        }
    }
    
    findRelevantDocumentContent(question) {
        // Enhanced keyword-based search for relevant content
        const keywords = this.extractKeywords(question);
        const relevantSections = [];
        
        // Create expanded keyword map for better semantic matching
        const keywordExpansions = {
            '業績': ['売上', '利益', '営業利益', '収益', '収入'],
            '戦略': ['計画', '方針', '施策', '展開', '推進'],
            '今後': ['将来', '予定', '予想', '見込み', '目標'],
            '成長': ['拡大', '増加', '向上', '発展']
        };
        
        // Expand keywords to include related terms
        const expandedKeywords = [...keywords];
        keywords.forEach(keyword => {
            if (keywordExpansions[keyword]) {
                expandedKeywords.push(...keywordExpansions[keyword]);
            }
        });
        
        this.documents.forEach(doc => {
            const sentences = doc.textContent.split(/[。．\n]/).filter(s => s.trim().length > 10);
            
            sentences.forEach(sentence => {
                const relevanceScore = expandedKeywords.reduce((score, keyword) => {
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
        // Improved keyword extraction for Japanese text
        const commonWords = ['の', 'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より', 'について', 'では', 'です', 'ます', 'である', 'する', 'した', 'される', 'いる', 'ある', 'この', 'その', 'あの', 'どの', 'いかが', 'どう', 'なぜ', 'どこ', 'いつ', 'だれ', '何', 'てください', 'ください', 'ました', 'でしょうか', 'ですか'];
        
        // Simple approach: extract meaningful character sequences
        const cleanedQuestion = question.replace(/[？?！!。．、，]/g, '');
        const keywords = [];
        
        // Extract common business terms directly
        const businessTerms = ['業績', '売上', '売上高', '利益', '営業利益', '戦略', '計画', '成長', 'DX', '配当', '株主還元', 'リスク', '課題', '方針', '今後', '将来'];
        businessTerms.forEach(term => {
            if (cleanedQuestion.includes(term)) {
                keywords.push(term);
            }
        });
        
        // Also try character-based extraction for other potential keywords
        // Split by common particles and extract remaining meaningful parts
        const parts = cleanedQuestion.split(/[のはがをにでとからまでより]/);
        parts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed.length > 1 && !commonWords.includes(trimmed)) {
                keywords.push(trimmed);
            }
        });
        
        return [...new Set(keywords)].slice(0, 10); // Remove duplicates and take first 10
    }
    
    buildConversationContext(messageHistory) {
        // Get recent conversation for context
        return messageHistory.slice(-4).map(msg => ({
            speaker: msg.type === 'shareholder' ? '株主' : '会社',
            content: msg.content
        }));
    }
    
    buildResponsePrompt(question, relevantContext, conversationContext) {
        // Build context from document content
        let documentContext = "";
        if (relevantContext && relevantContext.length > 0) {
            documentContext = "関連資料の内容:\n";
            relevantContext.forEach((section, index) => {
                documentContext += `[${section.source}] ${section.content}\n`;
            });
            documentContext += "\n";
        }
        
        // Build conversation history
        let conversationHistory = "";
        if (conversationContext && conversationContext.length > 0) {
            conversationHistory = "過去の会話:\n";
            conversationContext.forEach(msg => {
                conversationHistory += `${msg.speaker}: ${msg.content}\n`;
            });
            conversationHistory += "\n";
        }
        
        // Construct the full prompt for AI
        const systemPrompt = `あなたは上場企業の経営陣として、株主総会で株主からの質問に誠実かつ建設的に回答してください。

回答の際は以下の点を重視してください:
1. 提供された関連資料の内容に基づいて回答する
2. 事実に基づかない情報は含めない
3. 具体的なデータや情報があれば引用する
4. 不明な点は素直に認め、後日回答する旨を伝える

${documentContext}${conversationHistory}`;

        const userPrompt = `株主からの質問: ${question}

上記の質問に対して、関連資料の内容を参考にして適切に回答してください。`;

        return {
            systemPrompt,
            userPrompt,
            question,
            relevantContext,
            conversationContext
        };
    }
    
    async generateMockResponse(question, relevantContext) {
        // Improved mock implementation that actually uses document content
        
        const questionLower = question.toLowerCase();
        let baseResponse = "";
        let hasRelevantContent = relevantContext && relevantContext.length > 0;
        
        // Generate content-aware responses based on question type and available context
        if (questionLower.includes('業績') || questionLower.includes('売上') || questionLower.includes('利益')) {
            baseResponse = this.generatePerformanceResponse(relevantContext);
        } else if (questionLower.includes('戦略') || questionLower.includes('計画') || questionLower.includes('今後')) {
            baseResponse = this.generateStrategyResponse(relevantContext);
        } else if (questionLower.includes('配当') || questionLower.includes('株主還元')) {
            baseResponse = this.generateDividendResponse(relevantContext);
        } else if (questionLower.includes('リスク') || questionLower.includes('課題')) {
            baseResponse = this.generateRiskResponse(relevantContext);
        } else {
            baseResponse = this.generateGenericResponse(question, relevantContext);
        }
        
        // If we have relevant document content, enhance the response with specific information
        if (hasRelevantContent) {
            const contextualInfo = this.extractContextualInformation(relevantContext, question);
            if (contextualInfo) {
                baseResponse += `\n\n${contextualInfo}`;
            }
        }
        
        return baseResponse;
    }
    
    extractContextualInformation(relevantContext, question) {
        // Extract and format the most relevant information from document context
        if (!relevantContext || relevantContext.length === 0) {
            return null;
        }
        
        const topContext = relevantContext[0]; // Most relevant context
        const sourceName = topContext.source;
        const content = topContext.content;
        
        // Format the contextual information appropriately
        return `詳細につきましては、${sourceName}において「${content.substring(0, 100)}${content.length > 100 ? '...' : ''}」と記載しており、これに基づいてご説明いたします。`;
    }
    
    generatePerformanceResponse(context) {
        const responses = [
            "今期の業績につきましては、売上高は前年同期比で堅調に推移しております。主力事業の好調に加え、新規事業の寄与により、計画を上回る成果を達成することができました。",
            "業績の詳細につきまして、売上面では市場拡大と競争力強化の取り組みが実を結び、着実な成長を実現しております。利益面でも効率化の推進により、収益性の向上を図っております。",
            "当期の業績は、全社一丸となった取り組みの結果、おおむね計画通りに進捗しております。特に主力製品の販売が好調で、市場シェアの拡大も実現できました。"
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Enhance response with specific document content if available
        if (context && context.length > 0) {
            const relevantInfo = context.find(c => 
                c.content.includes('売上') || 
                c.content.includes('利益') || 
                c.content.includes('業績') ||
                c.content.includes('収益')
            );
            
            if (relevantInfo) {
                return `${baseResponse} 具体的には、${relevantInfo.source}に記載されている通り、${relevantInfo.content}`;
            } else {
                return `${baseResponse} 詳細につきましては、${context[0].source}をご参照ください。`;
            }
        }
        
        return baseResponse;
    }
    
    generateStrategyResponse(context) {
        const responses = [
            "今後の戦略につきましては、中長期的な成長を見据え、既存事業の強化と新規領域への展開を両輪として推進してまいります。",
            "戦略的な取り組みとして、DXの推進、グローバル展開の加速、そして持続可能な経営の実現に注力してまいります。",
            "将来に向けた計画として、市場ニーズの変化に対応した製品・サービスの開発と、効率的な事業運営の確立を図ってまいります。"
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Enhance response with specific document content if available
        if (context && context.length > 0) {
            const relevantInfo = context.find(c => 
                c.content.includes('戦略') || 
                c.content.includes('計画') || 
                c.content.includes('今後') ||
                c.content.includes('方針')
            );
            
            if (relevantInfo) {
                return `${baseResponse} 当社の戦略文書にも記載されておりますが、${relevantInfo.content}`;
            } else {
                return `${baseResponse} 詳細な戦略については、${context[0].source}にて詳しく説明しております。`;
            }
        }
        
        return baseResponse;
    }
    
    generateDividendResponse(context) {
        const responses = [
            "配当政策につきましては、安定的かつ継続的な株主還元を基本方針としており、業績の向上に応じた配当の充実に努めてまいります。",
            "株主還元については、連結配当性向30%を目安として、安定配当の維持と業績連動による増配を組み合わせた政策を継続いたします。",
            "配当に関しては、将来の成長投資とのバランスを考慮しながら、株主の皆様のご期待にお応えできるよう努めてまいります。"
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Enhance response with specific document content if available
        if (context && context.length > 0) {
            const relevantInfo = context.find(c => 
                c.content.includes('配当') || 
                c.content.includes('株主還元') || 
                c.content.includes('配当性向') ||
                c.content.includes('還元')
            );
            
            if (relevantInfo) {
                return `${baseResponse} 具体的な配当方針については、${relevantInfo.source}に「${relevantInfo.content}」と明記しております。`;
            } else {
                return `${baseResponse} 配当の詳細な方針は${context[0].source}をご確認ください。`;
            }
        }
        
        return baseResponse;
    }
    
    generateRiskResponse(context) {
        const responses = [
            "リスク管理につきましては、市場環境の変化、競争激化、規制変更等を主要リスクとして認識し、適切な対策を講じております。",
            "事業運営上の課題として、人材確保、技術革新への対応、サプライチェーンの安定化等に取り組んでおります。",
            "リスク要因については、定期的な見直しと評価を行い、必要に応じて追加的な対策を実施してまいります。"
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Enhance response with specific document content if available
        if (context && context.length > 0) {
            const relevantInfo = context.find(c => 
                c.content.includes('リスク') || 
                c.content.includes('課題') || 
                c.content.includes('対策') ||
                c.content.includes('リスク要因')
            );
            
            if (relevantInfo) {
                return `${baseResponse} 当社が認識している具体的なリスクとして、${relevantInfo.source}に記載の通り、${relevantInfo.content}`;
            } else {
                return `${baseResponse} リスクの詳細については、${context[0].source}のリスク情報をご参照ください。`;
            }
        }
        
        return baseResponse;
    }
    
    generateGenericResponse(question, context) {
        const responses = [
            "ご質問いただいた点につきまして、当社では適切な対応を図っており、今後も継続的な改善に努めてまいります。",
            "お尋ねの件については、関係部門と連携して検討を進めており、適切な時期にご報告させていただきます。",
            "ご指摘の点は重要な課題として認識しており、全社を挙げて取り組んでまいります。"
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        if (context && context.length > 0) {
            // Try to find any relevant content that might relate to the question
            const mostRelevant = context[0];
            return baseResponse + ` なお、${mostRelevant.source}にも関連する記載がございますので、併せてご参照ください。「${mostRelevant.content.substring(0, 80)}${mostRelevant.content.length > 80 ? '...' : ''}」`;
        }
        
        return baseResponse;
    }
    
    async callAzureOpenAI(responsePrompt) {
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
                            content: responsePrompt.systemPrompt
                        },
                        {
                            role: "user",
                            content: responsePrompt.userPrompt
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