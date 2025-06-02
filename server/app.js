const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// In-memory storage for sessions (in production, use a database)
const sessions = new Map();
const documents = new Map();

// Routes

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Upload IR documents (FR-1)
app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    
    // Extract text from PDF
    const pdfData = await pdfParse(fileBuffer);
    const documentId = uuidv4();
    
    // Store document data
    documents.set(documentId, {
      id: documentId,
      filename: req.file.originalname,
      text: pdfData.text,
      uploadDate: new Date().toISOString(),
      metadata: {
        pages: pdfData.numpages,
        size: req.file.size
      }
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      documentId: documentId,
      filename: req.file.originalname,
      extractedText: pdfData.text.substring(0, 500) + '...', // Preview
      pages: pdfData.numpages
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process document: ' + error.message });
  }
});

// Get uploaded documents
app.get('/api/documents', (req, res) => {
  const documentList = Array.from(documents.values()).map(doc => ({
    id: doc.id,
    filename: doc.filename,
    uploadDate: doc.uploadDate,
    pages: doc.metadata.pages,
    size: doc.metadata.size
  }));
  
  res.json(documentList);
});

// Create simulation session (FR-5)
app.post('/api/sessions', (req, res) => {
  try {
    const { documentIds, expectedQuestions } = req.body;
    
    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: 'At least one document is required' });
    }

    // Validate documents exist
    const sessionDocuments = documentIds.map(id => {
      const doc = documents.get(id);
      if (!doc) {
        throw new Error(`Document ${id} not found`);
      }
      return doc;
    });

    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      documents: sessionDocuments,
      expectedQuestions: expectedQuestions || [],
      dialogue: [],
      status: 'initialized',
      createdAt: new Date().toISOString(),
      currentQuestionIndex: 0
    };

    sessions.set(sessionId, session);

    res.json({
      sessionId: sessionId,
      status: session.status,
      documentsCount: sessionDocuments.length,
      expectedQuestionsCount: session.expectedQuestions.length
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session: ' + error.message });
  }
});

// Start simulation (FR-5)
app.post('/api/sessions/:sessionId/start', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'active';
    session.startedAt = new Date().toISOString();

    // Generate first question from Shareholder Agent (FR-6)
    const firstQuestion = await generateShareholderQuestion(session);
    if (firstQuestion) {
      session.dialogue.push({
        id: uuidv4(),
        type: 'question',
        speaker: 'shareholder',
        content: firstQuestion,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      sessionId: session.id,
      status: session.status,
      dialogue: session.dialogue
    });

  } catch (error) {
    console.error('Start simulation error:', error);
    res.status(500).json({ error: 'Failed to start simulation: ' + error.message });
  }
});

// Get session status and dialogue
app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    dialogue: session.dialogue,
    documentsCount: session.documents.length,
    expectedQuestionsCount: session.expectedQuestions.length,
    createdAt: session.createdAt,
    startedAt: session.startedAt
  });
});

// Generate company response (FR-7)
app.post('/api/sessions/:sessionId/respond', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Get the latest question
    const lastDialogue = session.dialogue[session.dialogue.length - 1];
    if (!lastDialogue || lastDialogue.type !== 'question') {
      return res.status(400).json({ error: 'No question to respond to' });
    }

    // Generate company response
    const response = await generateCompanyResponse(session, lastDialogue.content);
    if (response) {
      session.dialogue.push({
        id: uuidv4(),
        type: 'answer',
        speaker: 'company',
        content: response,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      dialogue: session.dialogue
    });

  } catch (error) {
    console.error('Response generation error:', error);
    res.status(500).json({ error: 'Failed to generate response: ' + error.message });
  }
});

// Continue dialogue (generate follow-up question) (FR-8)
app.post('/api/sessions/:sessionId/continue', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Generate follow-up question or move to next topic
    const nextQuestion = await generateFollowUpQuestion(session);
    if (nextQuestion) {
      session.dialogue.push({
        id: uuidv4(),
        type: 'question',
        speaker: 'shareholder',
        content: nextQuestion,
        timestamp: new Date().toISOString()
      });
    } else {
      // End simulation if no more questions
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
    }

    res.json({
      dialogue: session.dialogue,
      status: session.status
    });

  } catch (error) {
    console.error('Continue dialogue error:', error);
    res.status(500).json({ error: 'Failed to continue dialogue: ' + error.message });
  }
});

// End simulation (FR-9)
app.post('/api/sessions/:sessionId/end', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'completed';
  session.completedAt = new Date().toISOString();

  res.json({
    sessionId: session.id,
    status: session.status,
    dialogue: session.dialogue
  });
});

// Get all sessions (FR-15)
app.get('/api/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(session => ({
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    dialogueCount: session.dialogue.length,
    documentsCount: session.documents.length
  }));

  res.json(sessionList);
});

// AI Integration functions (FR-17) - Mock implementations for now
async function generateShareholderQuestion(session) {
  // Mock implementation - in production, integrate with Azure OpenAI
  const documents = session.documents;
  const expectedQuestions = session.expectedQuestions;
  
  if (expectedQuestions.length > 0 && session.currentQuestionIndex < expectedQuestions.length) {
    return expectedQuestions[session.currentQuestionIndex];
  }

  // Mock auto-generated question based on documents
  const mockQuestions = [
    "今期の業績について、前年度と比較してどのような変化がありましたか？",
    "今後の成長戦略について詳しく教えてください。",
    "競合他社との差別化ポイントは何でしょうか？",
    "株主還元政策についてのお考えをお聞かせください。"
  ];
  
  return mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
}

async function generateCompanyResponse(session, question) {
  // Mock implementation - in production, integrate with Azure OpenAI
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate AI processing time
  
  return "ご質問ありがとうございます。当社としましては、株主の皆様のご期待にお応えできるよう、今後も持続的な成長を目指して取り組んでまいります。詳細につきましては、決算説明資料の通りでございますが、何かご不明な点がございましたら、お気軽にお尋ねください。";
}

async function generateFollowUpQuestion(session) {
  // Mock implementation - Check if we should continue or end
  if (session.dialogue.length >= 6) { // Limit to 3 Q&A pairs for demo
    return null; // End simulation
  }
  
  const followUpQuestions = [
    "その戦略の具体的なタイムラインはどのようになっていますか？",
    "リスク要因についてはどのようにお考えでしょうか？",
    "投資家としてはより詳細な数値目標を知りたいのですが。"
  ];
  
  return followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`株主総会Q&Aシミュレーションシステム server running on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
});

module.exports = app;