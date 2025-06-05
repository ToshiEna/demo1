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
        // Extract key information from documents
        const context = this.documents.map(doc => {
            return {
                name: doc.originalName,
                content: doc.textContent.substring(0, 2000) // First 2000 characters
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
        // Mock implementation - in production, this would call Azure OpenAI
        
        if (questionPrompt.type === 'expected' && questionPrompt.expectedQuestion) {
            // Use expected question with some variation
            return questionPrompt.expectedQuestion.replace(/^[・\-\*]\s*/, '');
        }
        
        if (questionPrompt.type === 'initial') {
            // Generate initial question based on document content
            const sampleInitialQuestions = [
                "今期の業績についてご説明いただけますか？",
                "今年度の主要な成果と課題について教えてください。",
                "決算資料を拝見しましたが、売上高の変動要因は何でしょうか？",
                "今後の事業戦略についてお聞かせください。"
            ];
            return sampleInitialQuestions[Math.floor(Math.random() * sampleInitialQuestions.length)];
        }
        
        if (questionPrompt.type === 'followup') {
            // Generate follow-up questions
            const lastCompanyMessage = messageHistory.filter(m => m.type === 'company').slice(-1)[0];
            
            if (lastCompanyMessage) {
                const sampleFollowUps = [
                    "その点についてもう少し詳しく教えていただけますか？",
                    "具体的な数値や目標があれば教えてください。",
                    "それは株主にとってどのような影響がありますか？",
                    "今後の見通しはいかがでしょうか？",
                    "他社との比較ではどのような状況でしょうか？"
                ];
                return sampleFollowUps[Math.floor(Math.random() * sampleFollowUps.length)];
            }
        }
        
        // Fallback
        return "その他にご質問させていただきたい点がございます。";
    }
    
    // Generate FAQ questions from document content
    static generateFAQsFromDocuments(documents) {
        try {
            // Extract key information from documents for FAQ generation
            const combinedContent = documents.map(doc => doc.textContent).join('\n');
            
            // Generate 5 relevant shareholder questions based on document content
            const faqs = this.generateMockFAQs(combinedContent, documents);
            
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
    
    static generateMockFAQs(content, documents) {
        // Analyze document content to generate relevant questions
        const contentLower = content.toLowerCase();
        const questions = [];
        
        // Check for financial performance content
        if (contentLower.includes('売上') || contentLower.includes('利益') || contentLower.includes('収益')) {
            questions.push("今期の業績についてご説明いただけますか？");
        }
        
        // Check for strategy/business content  
        if (contentLower.includes('戦略') || contentLower.includes('事業') || contentLower.includes('計画')) {
            questions.push("今後の事業戦略についてお聞かせください。");
        }
        
        // Check for dividend/shareholder return content
        if (contentLower.includes('配当') || contentLower.includes('株主') || contentLower.includes('還元')) {
            questions.push("配当政策の変更予定はありますか？");
        }
        
        // Check for risk/challenge content
        if (contentLower.includes('リスク') || contentLower.includes('課題') || contentLower.includes('問題')) {
            questions.push("現在の主要なリスクと対策についてお聞かせください。");
        }
        
        // Check for competitive position content
        if (contentLower.includes('競合') || contentLower.includes('市場') || contentLower.includes('シェア')) {
            questions.push("競合他社と比較した当社の強みは何でしょうか？");
        }
        
        // Add additional questions if we don't have enough
        const additionalQuestions = [
            "今年度の主要な成果と課題について教えてください。",
            "新規事業の収益見通しはいかがですか？",
            "コスト削減の具体的な取り組みはありますか？",
            "ESGへの取り組み状況を教えてください。",
            "デジタル化への投資計画はいかがですか？"
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