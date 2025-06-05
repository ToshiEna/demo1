const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { extractDocumentTopics } = require('../utils/helpers');

// Store document metadata in memory (in production, use a database)
const documentsStore = new Map();

// Function to extract text content from different file types
async function extractTextFromFile(filePath, mimeType) {
    try {
        switch (mimeType) {
            case 'application/pdf':
                const pdfBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(pdfBuffer);
                return {
                    text: pdfData.text,
                    pageCount: pdfData.numpages
                };
                
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
            case 'application/msword': // .doc
                const wordBuffer = fs.readFileSync(filePath);
                const wordResult = await mammoth.extractRawText({ buffer: wordBuffer });
                return {
                    text: wordResult.value,
                    pageCount: null // Word documents don't have a straightforward page count
                };
                
            case 'text/plain': // .txt
                const textContent = fs.readFileSync(filePath, 'utf8');
                return {
                    text: textContent,
                    pageCount: null // Text files don't have pages
                };
                
            default:
                throw new Error(`Unsupported file type: ${mimeType}`);
        }
    } catch (error) {
        throw new Error(`Failed to extract text from file: ${error.message}`);
    }
}

exports.uploadDocuments = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = [];
        
        for (const file of req.files) {
            try {
                // Extract text from document based on file type
                const extractedData = await extractTextFromFile(file.path, file.mimetype);
                
                // Extract key topics from document content
                const topics = extractDocumentTopics(extractedData.text);
                
                const fileMetadata = {
                    id: uuidv4(),
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimeType: file.mimetype,
                    uploadedAt: new Date().toISOString(),
                    textContent: extractedData.text,
                    pageCount: extractedData.pageCount,
                    topics: topics
                };
                
                // Store metadata
                documentsStore.set(fileMetadata.id, fileMetadata);
                
                uploadedFiles.push({
                    id: fileMetadata.id,
                    filename: fileMetadata.filename,
                    originalName: fileMetadata.originalName,
                    size: fileMetadata.size,
                    uploadedAt: fileMetadata.uploadedAt,
                    pageCount: fileMetadata.pageCount,
                    topics: topics
                });
                
                console.log(`Successfully processed document: ${file.originalname}`);
            } catch (error) {
                console.error(`Failed to process document ${file.originalname}:`, error);
                // Clean up the file if processing failed
                try {
                    fs.unlinkSync(file.path);
                } catch (unlinkError) {
                    console.error('Failed to clean up file:', unlinkError);
                }
            }
        }
        
        if (uploadedFiles.length === 0) {
            return res.status(400).json({ error: 'No documents could be processed' });
        }
        
        res.json({
            message: `Successfully uploaded ${uploadedFiles.length} document(s)`,
            files: uploadedFiles
        });
        
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: 'Failed to upload documents' });
    }
};

exports.getDocumentContent = (documentId) => {
    const document = documentsStore.get(documentId);
    return document ? document.textContent : null;
};

exports.getAllDocuments = () => {
    return Array.from(documentsStore.values());
};

exports.getDocumentsByFilenames = (filenames) => {
    const documents = [];
    for (const [id, doc] of documentsStore.entries()) {
        if (filenames.includes(doc.filename)) {
            documents.push(doc);
        }
    }
    return documents;
};

exports.generateFAQs = async (req, res) => {
    try {
        const { documentIds } = req.body;
        
        if (!documentIds || documentIds.length === 0) {
            return res.status(400).json({ error: 'No document IDs provided' });
        }
        
        // Get documents
        const documents = [];
        for (const id of documentIds) {
            const doc = documentsStore.get(id);
            if (doc) {
                documents.push(doc);
            }
        }
        
        if (documents.length === 0) {
            return res.status(400).json({ error: 'No valid documents found' });
        }
        
        // Import ShareholderAgent to generate FAQs
        const ShareholderAgent = require('../ai/shareholderAgent');
        
        // Generate FAQs from document content
        const faqs = await ShareholderAgent.generateFAQsFromDocuments(documents);
        
        res.json({
            message: `Successfully generated ${faqs.length} FAQ questions`,
            faqs: faqs,
            documentCount: documents.length
        });
        
    } catch (error) {
        console.error('FAQ generation error:', error);
        res.status(500).json({ error: 'Failed to generate FAQs' });
    }
};

exports.getAllDocumentsForSelection = async (req, res) => {
    try {
        const documents = Array.from(documentsStore.values()).map(doc => ({
            id: doc.id,
            filename: doc.filename,
            originalName: doc.originalName,
            size: doc.size,
            uploadedAt: doc.uploadedAt,
            pageCount: doc.pageCount,
            topics: doc.topics || []
        }));
        
        res.json({
            message: `Found ${documents.length} uploaded documents`,
            documents: documents
        });
        
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: 'Failed to retrieve documents' });
    }
};

// Export the text extraction function for testing
exports.extractTextFromFile = extractTextFromFile;