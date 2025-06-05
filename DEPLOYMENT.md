# Deployment Guide

## Prerequisites

- Node.js 16+ and npm
- Azure OpenAI service account (optional, for full AI functionality)

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd demo1
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure OpenAI credentials (optional)
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   Open http://localhost:3000 in your browser

## Configuration

### Environment Variables

- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key (optional)
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL (optional)
- `AZURE_OPENAI_DEPLOYMENT_NAME` - Deployment name (optional)
- `PORT` - Server port (default: 3000)

**Note**: The system works with mock AI responses even without Azure OpenAI configuration.

## Usage Workflow

1. **Upload IR Documents**
   - Click the upload area or drag & drop PDF, Word, or text files
   - Maximum 50MB per file
   - Multiple files supported

2. **Enter Expected Questions** (Optional)
   - Add anticipated shareholder questions
   - One question per line
   - System generates questions automatically if none provided

3. **Start Simulation**
   - Click "Q&Aシミュレーション開始"
   - Watch real-time Q&A between AI agents
   - Use controls to pause, skip, or end simulation

4. **Review Sessions**
   - View past simulation sessions
   - Export session logs as text files

## Production Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t qa-simulator .

# Run container
docker run -p 3000:3000 -e AZURE_OPENAI_API_KEY=your_key qa-simulator
```

### Traditional Deployment

```bash
# Install production dependencies
npm ci --only=production

# Start production server
NODE_ENV=production npm start
```

## Security Considerations

- **Data Isolation**: Each tenant's data is stored separately
- **File Validation**: PDF, Word, and text files up to 50MB are accepted
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Input Sanitization**: User inputs are sanitized to prevent XSS

## Monitoring

- Application logs: Check console output
- Session data: Stored in memory (use database for production)
- File uploads: Stored in `uploads/` directory

## Troubleshooting

### Common Issues

1. **Document Upload Fails**
   - Check file size (max 50MB)
   - Ensure file is valid PDF, Word (.docx/.doc), or text (.txt) format
   - Check disk space in uploads directory

2. **Simulation Doesn't Start**
   - Verify at least one document is uploaded
   - Check server logs for errors
   - Ensure port 3000 is available

3. **AI Responses Missing**
   - System uses mock responses by default
   - Configure Azure OpenAI for real AI responses
   - Check API key and endpoint configuration

### Performance Optimization

- **File Cleanup**: Old uploaded files are cleaned automatically
- **Memory Usage**: Sessions stored in memory (consider Redis for production)
- **Caching**: Document processing results can be cached

## Development

### Project Structure
```
├── public/           # Frontend assets
│   ├── index.html   # Main SPA page
│   ├── css/         # Stylesheets
│   └── js/          # Frontend JavaScript
├── src/
│   ├── server/      # Express route handlers
│   ├── ai/          # AI agent implementations
│   └── utils/       # Utility functions
├── tests/           # Unit tests
└── uploads/         # Uploaded documents
```

### Running Tests
```bash
npm test
```

### Code Style
- Use ESLint for JavaScript linting
- Follow Node.js best practices
- Implement proper error handling

## API Documentation

### Upload Documents
```
POST /api/upload
Content-Type: multipart/form-data
Body: documents (PDF, Word, or text files)
```

### Start Simulation
```
POST /api/simulation/start
Body: {
  documents: ["filename1.pdf"],
  expectedQuestions: ["Question 1", "Question 2"]
}
```

### Get Session
```
GET /api/simulation/:sessionId
Response: Session data with messages
```

### List Sessions
```
GET /api/sessions
Response: Array of session summaries
```

### Export Session
```
GET /api/sessions/:sessionId/export
Response: Text file download
```