const axios = require('axios');

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
                            content: "あなたは上場企業の株主です。株主総会で経営陣に質問をする立場として、建設的で適切な質問をしてください。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.7
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

module.exports = ShareholderAgent;