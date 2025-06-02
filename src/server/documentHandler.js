const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');

// Store document metadata in memory (in production, use a database)
const documentsStore = new Map();

exports.uploadDocuments = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = [];
        
        for (const file of req.files) {
            try {
                // Extract text from PDF
                const pdfBuffer = fs.readFileSync(file.path);
                const pdfData = await pdfParse(pdfBuffer);
                
                const fileMetadata = {
                    id: uuidv4(),
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimeType: file.mimetype,
                    uploadedAt: new Date().toISOString(),
                    textContent: pdfData.text,
                    pageCount: pdfData.numpages
                };
                
                // Store metadata
                documentsStore.set(fileMetadata.id, fileMetadata);
                
                uploadedFiles.push({
                    id: fileMetadata.id,
                    filename: fileMetadata.filename,
                    originalName: fileMetadata.originalName,
                    size: fileMetadata.size,
                    uploadedAt: fileMetadata.uploadedAt,
                    pageCount: fileMetadata.pageCount
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