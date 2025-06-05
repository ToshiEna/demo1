const { AzureOpenAI } = require('openai');

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
            
            let response = "";
            
            // Try to use Azure OpenAI if configured, otherwise use improved mock response
            if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
                try {
                    const aiResponse = await this.callAzureOpenAI(responsePrompt);
                    response = aiResponse;
                } catch (error) {
                    console.warn('Azure OpenAI failed, falling back to mock response:', error.message);
                    response = await this.generateMockResponse(question, relevantContext);
                }
            } else {
                // Use improved mock response that incorporates document content
                response = await this.generateMockResponse(question, relevantContext);
            }
            
            // Ensure response is within 600-character limit
            return this.limitResponseLength(response, 600);
            
        } catch (error) {
            console.error('Failed to generate response:', error);
            return "申し訳ございませんが、現在お答えできません。後ほど詳細をご回答させていただきます。";
        }
    }
    
    limitResponseLength(response, maxLength) {
        if (response.length <= maxLength) {
            return response;
        }
        
        // Find a good place to cut off the response (end of sentence)
        const cutoffPoint = response.lastIndexOf('。', maxLength);
        if (cutoffPoint > maxLength - 50) { // If we can find a sentence end within 50 chars of limit
            return response.substring(0, cutoffPoint + 1);
        }
        
        // Otherwise, cut at maxLength with ellipsis
        return response.substring(0, maxLength - 3) + '...';
    }
    
    findRelevantDocumentContent(question) {
        // Return full document content instead of keyword-filtered sections
        // Let the AI model handle content analysis and extraction
        const documentSections = [];
        
        this.documents.forEach(doc => {
            documentSections.push({
                source: doc.originalName,
                content: doc.textContent,
                relevance: 1 // All content is considered relevant
            });
        });
        
        return documentSections;
    }
    

    
    buildConversationContext(messageHistory) {
        // Get recent conversation for context
        return messageHistory.slice(-4).map(msg => ({
            speaker: msg.type === 'shareholder' ? '株主' : '会社',
            content: msg.content
        }));
    }
    
    buildResponsePrompt(question, relevantContext, conversationContext) {
        // Simple text extraction from documents with 50,000 character limit
        let documentContext = "";
        if (this.documents && this.documents.length > 0) {
            documentContext = "アップロード資料の内容:\n";
            let totalLength = 0;
            const maxDocumentContextLength = 50000; // 5万文字の制限
            
            for (const doc of this.documents) {
                const docText = `[${doc.originalName}]\n${doc.textContent}\n\n`;
                if (totalLength + docText.length <= maxDocumentContextLength) {
                    documentContext += docText;
                    totalLength += docText.length;
                } else {
                    // If adding this document would exceed the limit, add partial content
                    const remainingSpace = maxDocumentContextLength - totalLength;
                    if (remainingSpace > 100) {
                        const partialText = doc.textContent.substring(0, remainingSpace - 50);
                        documentContext += `[${doc.originalName}]\n${partialText}...\n\n`;
                    }
                    break; // Stop processing more documents
                }
            }
        }
        
        // Build conversation history with limit
        let conversationHistory = "";
        if (conversationContext && conversationContext.length > 0) {
            conversationHistory = "過去の会話:\n";
            const maxConversationLength = 1000; // Rough token limit for conversation context
            let totalLength = 0;
            
            conversationContext.forEach(msg => {
                const msgText = `${msg.speaker}: ${msg.content}\n`;
                if (totalLength + msgText.length <= maxConversationLength) {
                    conversationHistory += msgText;
                    totalLength += msgText.length;
                }
            });
            conversationHistory += "\n";
        }
        
        // Construct the full prompt for AI
        const systemPrompt = `あなたは上場企業の経営陣として、株主総会で株主からの質問に誠実かつ建設的に回答してください。

【重要】以下の制約を厳格に守ってください:
1. 必ず提供されたアップロード資料の内容のみに基づいて回答する
2. 資料に記載されていない情報は一切使用しない
3. 推測や一般的な知識での補完は行わない
4. 資料に該当情報がない場合は「資料に記載がない」旨を明確に伝える
5. 具体的なデータや情報があれば資料から正確に引用する
6. 回答は600文字以内に収めてください
7. 質問に関連する情報を資料全体から適切に抽出・分析して回答する

【提供されたアップロード資料】:
${documentContext}

【これまでの会話履歴】:
${conversationHistory}`;

        const userPrompt = `株主からの質問: ${question}

上記の質問に対して、提供された関連資料の内容のみを根拠として適切に回答してください。資料に該当する情報がない場合は、その旨を率直にお伝えください。`;

        return {
            systemPrompt,
            userPrompt,
            question,
            relevantContext,
            conversationContext
        };
    }
    
    async generateMockResponse(question, relevantContext) {
        // Document-only response implementation - only respond based on uploaded document content
        
        const hasRelevantContent = relevantContext && relevantContext.length > 0;
        
        // If no relevant document content is found, explicitly state this limitation
        if (!hasRelevantContent) {
            return "申し訳ございませんが、ご質問の内容について、現在アップロードされている資料から関連する情報を見つけることができませんでした。より詳細な資料の提供をお願いいたします。";
        }
        
        // Simple relevance check for mock response - in production, AI would handle this
        const questionLower = question.toLowerCase();
        const businessKeywords = ['業績', '売上', '利益', '戦略', '計画', '今後', '配当', '株主', 'リスク', '課題', 'dx', 'デジタル'];
        const hasBusinessContext = businessKeywords.some(keyword => questionLower.includes(keyword));
        
        // For clearly irrelevant questions (like weather), return appropriate response
        const irrelevantKeywords = ['天気', '気温', '雨', '晴れ', '雪', '台風'];
        const isIrrelevant = irrelevantKeywords.some(keyword => questionLower.includes(keyword));
        
        if (isIrrelevant || (!hasBusinessContext && questionLower.length < 50)) {
            return "申し訳ございませんが、ご質問の内容について、現在アップロードされている資料から関連する情報を見つけることができませんでした。より詳細な資料の提供をお願いいたします。";
        }
        
        // Generate response based on full document content
        return this.generateDocumentBasedResponse(relevantContext, question);
    }
    
    generateDocumentBasedResponse(relevantContext, question, category = null) {
        // Generate response based purely on document content
        if (!relevantContext || relevantContext.length === 0) {
            return "申し訳ございませんが、ご質問の内容について、現在アップロードされている資料から関連する情報を見つけることができませんでした。";
        }
        
        // Since we now have full document content, provide a more comprehensive response
        const primaryDocument = relevantContext[0];
        
        // For mock response, provide a more detailed reference to the document content
        const contentPreview = primaryDocument.content.substring(0, 200);
        let response = `${primaryDocument.source}に記載されている内容に基づいてお答えいたします。「${contentPreview}${primaryDocument.content.length > 200 ? '...' : ''}」`;
        
        // If there are multiple documents, reference them as well
        if (relevantContext.length > 1) {
            const additionalDocs = relevantContext.slice(1, 3);
            const additionalInfo = additionalDocs
                .map(ctx => `また、${ctx.source}にも関連する記載がございます`)
                .join('。');
            response += `。${additionalInfo}`;
        }
        
        response += "。詳細につきましては、アップロードされた資料をご参照ください。";
        
        return response;
    }


    

    

    

    

    

    
    async callAzureOpenAI(responsePrompt) {
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
                        content: responsePrompt.systemPrompt
                    },
                    {
                        role: "user",
                        content: responsePrompt.userPrompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.3,
                model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
            });
            
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Azure OpenAI API error:', error);
            throw error;
        }
    }
}

module.exports = CompanyAgent;