const { AzureOpenAI } = require('openai');

class ShareholderAgent {
    constructor(documents, expectedQuestions) {
        this.documents = documents;
        this.expectedQuestions = expectedQuestions;
        this.currentQuestionIndex = 0;
        this.conversationHistory = [];
    }
    
    async generateQuestion(messageHistory = []) {
        try {
            // Build context from documents
            const documentContext = this.buildDocumentContext();
            
            // Build conversation context
            const conversationContext = this.buildConversationContext(messageHistory);
            
            // Determine question source
            let questionPrompt;
            if (this.currentQuestionIndex < this.expectedQuestions.length) {
                // Use expected question as basis
                const expectedQuestion = this.expectedQuestions[this.currentQuestionIndex];
                questionPrompt = this.buildExpectedQuestionPrompt(expectedQuestion, documentContext, conversationContext);
                this.currentQuestionIndex++;
            } else if (messageHistory.length === 0) {
                // First question, no expected questions
                questionPrompt = this.buildInitialQuestionPrompt(documentContext);
            } else {
                // Follow-up question
                questionPrompt = this.buildFollowUpPrompt(documentContext, conversationContext);
            }
            
            // For now, generate mock questions since we don't have Azure OpenAI configured
            const question = await this.generateMockQuestion(questionPrompt, messageHistory);
            
            return question;
            
        } catch (error) {
            console.error('Failed to generate question:', error);
            return null;
        }
    }
    
    buildDocumentContext() {
        // Extract full document information for AI processing
        const context = this.documents.map(doc => {
            return {
                name: doc.originalName,
                content: doc.textContent // Full content instead of substring
            };
        });
        
        return context;
    }
    
    buildConversationContext(messageHistory) {
        // Get recent conversation for context
        return messageHistory.slice(-6).map(msg => ({
            speaker: msg.type,
            content: msg.content
        }));
    }
    
    buildExpectedQuestionPrompt(expectedQuestion, documentContext, conversationContext) {
        return {
            type: 'expected',
            expectedQuestion,
            documentContext,
            conversationContext
        };
    }
    
    buildInitialQuestionPrompt(documentContext) {
        return {
            type: 'initial',
            documentContext
        };
    }
    
    buildFollowUpPrompt(documentContext, conversationContext) {
        return {
            type: 'followup',
            documentContext,
            conversationContext
        };
    }
    
    async generateMockQuestion(questionPrompt, messageHistory) {
        // Enhanced question generation based on full document content
        
        if (questionPrompt.type === 'expected' && questionPrompt.expectedQuestion) {
            // Use expected question with some variation
            return questionPrompt.expectedQuestion.replace(/^[・\-\*]\s*/, '');
        }
        
        // For other types, generate questions based on document content
        if (questionPrompt.documentContext && questionPrompt.documentContext.length > 0) {
            // Use document content to generate contextual questions
            return await this.generateDocumentBasedQuestion(questionPrompt, messageHistory);
        }
        
        // Fallback
        return "その他にご質問させていただきたい点がございます。";
    }
    
    async generateDocumentBasedQuestion(questionPrompt, messageHistory) {
        // Generate questions based on document content analysis
        const documentContent = questionPrompt.documentContext
            .map(doc => doc.content)
            .join('\n');
        
        if (questionPrompt.type === 'initial') {
            // Generate initial question based on document content keywords
            return await this.generateInitialQuestionFromContent(documentContent);
        } else if (questionPrompt.type === 'followup') {
            // Generate follow-up question based on conversation and document content
            return await this.generateFollowUpQuestionFromContent(documentContent, messageHistory);
        }
        
        return "資料の内容についてご質問がございます。";
    }
    
    async generateInitialQuestionFromContent(documentContent) {
        // Try to generate AI-powered question first
        try {
            if (process.env.AZURE_OPENAI_API_KEY) {
                const prompt = `以下の企業資料を分析して、株主として最も重要で建設的な質問を1つ生成してください。質問は簡潔で具体的にしてください。

企業資料の内容:
${documentContent.substring(0, 3000)}

質問のみを出力してください。`;

                const question = await this.callAzureOpenAI(prompt);
                if (question && question.trim().length > 0) {
                    return question.trim();
                }
            }
        } catch (error) {
            console.error('Failed to generate AI question:', error);
        }

        // Fallback to keyword-based generation
        const contentLower = documentContent.toLowerCase();
        
        if (contentLower.includes('売上') || contentLower.includes('業績') || contentLower.includes('利益')) {
            return "今期の業績について詳しくご説明いただけますでしょうか？";
        } else if (contentLower.includes('戦略') || contentLower.includes('計画') || contentLower.includes('将来')) {
            return "今後の事業戦略についてお聞かせください。";
        } else if (contentLower.includes('配当') || contentLower.includes('株主還元')) {
            return "株主還元策についてご説明いただけますか？";
        } else if (contentLower.includes('リスク') || contentLower.includes('課題')) {
            return "現在の主要なリスクと対策についてお聞かせください。";
        } else if (contentLower.includes('投資') || contentLower.includes('設備') || contentLower.includes('開発')) {
            return "設備投資や研究開発の計画について教えてください。";
        } else {
            return "アップロードされた資料の内容について詳しくご説明いただけますでしょうか？";
        }
    }
    
    async generateFollowUpQuestionFromContent(documentContent, messageHistory) {
        // Try to generate AI-powered follow-up question first
        try {
            if (process.env.AZURE_OPENAI_API_KEY) {
                const lastCompanyMessage = messageHistory.filter(m => m.type === 'company').slice(-1)[0];
                const conversationContext = lastCompanyMessage ? 
                    `前回の回答: ${lastCompanyMessage.content}` : 
                    '初回の質問です。';

                const prompt = `以下の企業資料と会話の流れを基に、株主として適切なフォローアップ質問を1つ生成してください。

企業資料:
${documentContent.substring(0, 2500)}

会話の流れ:
${conversationContext}

株主として建設的で具体的なフォローアップ質問を生成してください。質問のみを出力してください。`;

                const question = await this.callAzureOpenAI(prompt);
                if (question && question.trim().length > 0) {
                    return question.trim();
                }
            }
        } catch (error) {
            console.error('Failed to generate AI follow-up question:', error);
        }

        // Fallback to original logic
        const lastCompanyMessage = messageHistory.filter(m => m.type === 'company').slice(-1)[0];
        const contentLower = documentContent.toLowerCase();
        
        if (lastCompanyMessage) {
            const lastResponseLower = lastCompanyMessage.content.toLowerCase();
            
            // Generate contextual follow-ups based on document content and previous response
            if (lastResponseLower.includes('業績') || lastResponseLower.includes('売上')) {
                if (contentLower.includes('計画') || contentLower.includes('目標')) {
                    return "来期の業績目標についてはいかがでしょうか？";
                } else {
                    return "その業績についてもう少し詳しく教えていただけますか？";
                }
            } else if (lastResponseLower.includes('戦略') || lastResponseLower.includes('計画')) {
                if (contentLower.includes('投資') || contentLower.includes('予算')) {
                    return "その戦略実行のための投資計画はいかがですか？";
                } else {
                    return "その戦略の具体的なスケジュールを教えてください。";
                }
            } else {
                // General follow-up questions based on document content
                if (contentLower.includes('リスク')) {
                    return "そのリスクへの対策についてはいかがでしょうか？";
                } else if (contentLower.includes('競合') || contentLower.includes('市場')) {
                    return "競合他社との比較ではどのような状況でしょうか？";
                } else {
                    return "それは株主にとってどのような影響がありますか？";
                }
            }
        }
        
        // Default follow-up based on document content
        return "資料に記載されている内容について、さらに詳しく教えていただけますか？";
    }
    
    // Generate FAQ questions from document content
    static async generateFAQsFromDocuments(documents) {
        try {
            // Extract key information from documents for FAQ generation
            const combinedContent = documents.map(doc => doc.textContent).join('\n');
            
            // Generate 5 relevant shareholder questions based on document content
            const faqs = await this.generateMockFAQs(combinedContent, documents);
            
            return faqs.map((question, index) => ({
                id: index + 1,
                question: question,
                selected: false
            }));
            
        } catch (error) {
            console.error('Failed to generate FAQs:', error);
            // Return default questions if generation fails
            return this.getDefaultFAQs();
        }
    }
    
    static async generateMockFAQs(content, documents) {
        // Try to generate AI-powered FAQs first
        try {
            if (process.env.AZURE_OPENAI_API_KEY) {
                const agent = new ShareholderAgent([], []);
                const prompt = `以下の企業資料を分析して、株主総会で株主が経営陣に質問すべき重要な質問を5つ生成してください。
質問は建設的で具体的であり、株主の利益を考慮したものにしてください。

企業資料:
${content.substring(0, 4000)}

以下の形式で5つの質問を出力してください:
1. [質問1]
2. [質問2] 
3. [質問3]
4. [質問4]
5. [質問5]`;

                const response = await agent.callAzureOpenAI(prompt);
                if (response && response.trim().length > 0) {
                    // Parse the numbered list response
                    const lines = response.trim().split('\n');
                    const questions = [];
                    
                    for (const line of lines) {
                        const match = line.match(/^\d+\.\s*(.+)$/);
                        if (match && match[1]) {
                            questions.push(match[1].trim());
                        }
                    }
                    
                    if (questions.length >= 3) {
                        return questions.slice(0, 5);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to generate AI FAQs:', error);
        }

        // Fallback to content-based generation when AI is not available
        // Handle empty or very short content
        if (!content || content.trim().length < 10) {
            return [
                "今期の業績についてご説明いただけますか？",
                "今後の事業戦略についてお聞かせください。",
                "配当政策の変更予定はありますか？",
                "現在の主要なリスクと対策についてお聞かせください。",
                "競合他社と比較した当社の強みは何でしょうか？"
            ];
        }
        
        return this.generateContextSpecificQuestions(content);
    }
    
    static generateContextSpecificQuestions(content) {
        const questions = [];
        const contentLower = content.toLowerCase();
        
        // Extract specific information from content using more sophisticated analysis
        const specificInfo = this.extractSpecificInformation(content);
        
        // Generate performance-related questions
        if (specificInfo.performanceData.length > 0) {
            const perfData = specificInfo.performanceData[0];
            questions.push(`${perfData}について、具体的な背景と今後の見通しを教えてください。`);
        } else if (contentLower.includes('売上') || contentLower.includes('利益') || contentLower.includes('収益') || contentLower.includes('業績')) {
            if (contentLower.includes('増加') || contentLower.includes('成長') || contentLower.includes('向上')) {
                questions.push("売上高増加の主な要因について詳しく教えてください。");
            } else if (contentLower.includes('減少') || contentLower.includes('低下') || contentLower.includes('減益')) {
                questions.push("業績悪化の要因と改善策について教えてください。");
            } else {
                questions.push("今期の業績についてご説明いただけますか？");
            }
        }
        
        // Generate strategy-related questions
        if (specificInfo.strategyData.length > 0) {
            const strategyData = specificInfo.strategyData[0];
            questions.push(`${strategyData}の具体的な実行計画と期待される効果について教えてください。`);
        } else if (contentLower.includes('戦略') || contentLower.includes('事業') || contentLower.includes('計画') || contentLower.includes('方針')) {
            if (contentLower.includes('dx') || contentLower.includes('デジタル') || contentLower.includes('ai')) {
                questions.push("DX戦略の進捗状況と今後の展開について教えてください。");
            } else if (contentLower.includes('海外') || contentLower.includes('グローバル') || contentLower.includes('国際')) {
                questions.push("海外展開戦略の具体的な計画はいかがですか？");
            } else {
                questions.push("中期経営計画の進捗状況について教えてください。");
            }
        }
        
        // Generate shareholder return questions
        if (specificInfo.shareholderData.length > 0) {
            const shareholderData = specificInfo.shareholderData[0];
            questions.push(`${shareholderData}の判断根拠と株主への影響について説明してください。`);
        } else if (contentLower.includes('配当') || contentLower.includes('株主') || contentLower.includes('還元') || contentLower.includes('自己株式')) {
            questions.push("株主還元方針の変更予定はありますか？");
        }
        
        // Generate risk-related questions
        if (specificInfo.riskData.length > 0) {
            const riskData = specificInfo.riskData[0];
            questions.push(`${riskData}に対する具体的な対策と影響度について教えてください。`);
        } else if (contentLower.includes('リスク') || contentLower.includes('課題') || contentLower.includes('問題') || contentLower.includes('対策')) {
            questions.push("現在の主要なリスクファクターと対応策について教えてください。");
        }
        
        // Generate investment-related questions
        if (specificInfo.investmentData.length > 0) {
            const investmentData = specificInfo.investmentData[0];
            questions.push(`${investmentData}の投資効果と収益への貢献について詳しく教えてください。`);
        } else if (contentLower.includes('投資') || contentLower.includes('開発') || contentLower.includes('研究') || contentLower.includes('設備')) {
            questions.push("設備投資や研究開発投資の計画について教えてください。");
        }
        
        // Fill remaining slots with contextual questions
        const additionalQuestions = [
            "市場における競争優位性はどのような点にありますか？",
            "ESGへの取り組み状況と今後の計画について教えてください。",
            "コスト削減の具体的な取り組みについて教えてください。",
            "新規事業の収益見通しはいかがですか？",
            "キャッシュフローの状況と資金調達計画はいかがですか？",
            "人材戦略と組織体制の強化についてお聞かせください。",
            "技術革新への投資と競争力向上策について教えてください。"
        ];
        
        // Ensure we have exactly 5 questions
        while (questions.length < 5) {
            const remainingQuestions = additionalQuestions.filter(q => !questions.includes(q));
            if (remainingQuestions.length > 0) {
                questions.push(remainingQuestions[0]);
            } else {
                break;
            }
        }
        
        return questions.slice(0, 5);
    }
    
    static extractSpecificInformation(content) {
        const result = {
            performanceData: [],
            strategyData: [],
            shareholderData: [],
            riskData: [],
            investmentData: []
        };
        
        // Split content into sentences for analysis
        const sentences = content.split(/[。．\n]/).filter(s => s.trim().length > 5);
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed.length < 10) continue;
            
            // Extract performance data
            if (/[0-9]+%.*?増加|[0-9]+%.*?減少|[0-9]+%.*?改善|[0-9]+%.*?向上|営業利益|売上高.*?[0-9]/.test(trimmed)) {
                result.performanceData.push(trimmed);
            }
            
            // Extract strategy data  
            if (/事業.*?参入|市場.*?参入|戦略.*?開始|投資.*?拡大|分野.*?投資|サービス.*?開発/.test(trimmed)) {
                result.strategyData.push(trimmed);
            }
            
            // Extract shareholder return data
            if (/配当.*?[0-9]|株式取得|還元.*?[0-9]|増配/.test(trimmed)) {
                result.shareholderData.push(trimmed);
            }
            
            // Extract risk data
            if (/リスク.*?として|対策.*?として|セキュリティ.*?投資|チェーン.*?多様化/.test(trimmed)) {
                result.riskData.push(trimmed);
            }
            
            // Extract investment data
            if (/研究開発費.*?[0-9]|投資.*?[0-9]|年間.*?投資/.test(trimmed)) {
                result.investmentData.push(trimmed);
            }
        }
        
        return result;
    }
    
    static getDefaultFAQs() {
        return [
            { id: 1, question: "今期の業績についてご説明いただけますか？", selected: false },
            { id: 2, question: "今後の事業戦略についてお聞かせください。", selected: false },
            { id: 3, question: "配当政策の変更予定はありますか？", selected: false },
            { id: 4, question: "現在の主要なリスクと対策についてお聞かせください。", selected: false },
            { id: 5, question: "競合他社と比較した当社の強みは何でしょうか？", selected: false }
        ];
    }
    
    async callAzureOpenAI(prompt) {
        // Implementation using Azure OpenAI library
        if (!process.env.AZURE_OPENAI_API_KEY) {
            throw new Error('Azure OpenAI API key not configured');
        }
        
        try {
            const client = new AzureOpenAI({
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                apiKey: process.env.AZURE_OPENAI_API_KEY,
                deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
                apiVersion: "2024-04-01-preview"
            });

            const response = await client.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "あなたは上場企業の株主です。株主総会で経営陣に質問をする立場として、建設的で適切な質問をしてください。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.7,
                model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
            });
            
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Azure OpenAI API error:', error);
            throw error;
        }
    }
}

module.exports = ShareholderAgent;