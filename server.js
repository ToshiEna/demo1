const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain' // .txt
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, and text files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit as per requirements
  }
});

// Import route handlers
const documentHandler = require('./src/server/documentHandler');
const simulationHandler = require('./src/server/simulationHandler');
const sessionHandler = require('./src/server/sessionHandler');
const voiceHandler = require('./src/server/voiceHandler');

// API Routes
app.post('/api/upload', upload.array('documents', 10), documentHandler.uploadDocuments);
app.get('/api/documents', documentHandler.getAllDocumentsForSelection);
app.post('/api/documents/generate-faq', documentHandler.generateFAQs);
app.post('/api/simulation/start', simulationHandler.startSimulation);
app.get('/api/simulation/:sessionId', simulationHandler.getSimulation);
app.post('/api/simulation/:sessionId/message', simulationHandler.sendMessage);
app.get('/api/sessions', sessionHandler.getSessions);
app.get('/api/sessions/:sessionId/export', sessionHandler.exportSession);

// Voice API Routes
app.post('/api/voice/text-to-speech', voiceHandler.textToSpeech);
app.get('/api/voice/status', voiceHandler.getVoiceStatus);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 50MB allowed.' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server only if not in test environment
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Shareholder Meeting Q&A Simulator running on port ${port}`);
    console.log(`Access the application at http://localhost:${port}`);
  });
}

module.exports = app;