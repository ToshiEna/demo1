# Shareholder Meeting Q&A Simulation System

株主総会Q&Aシミュレーションシステム - AI-powered Q&A simulation system for shareholder meeting preparation

## Overview

This system helps listed companies' IR staff and executives prepare for shareholder meetings efficiently by using generative AI to simulate Q&A sessions between shareholder agents and company agents.

## Key Features

- **IR Document Upload**: Upload PDF documents (annual reports, earnings materials)
- **AI-Powered Simulation**: Two AI agents simulate realistic Q&A scenarios
  - Shareholder Agent: Generates questions from shareholder perspective
  - Company Agent: Generates responses from management perspective
- **Voice Playback**: Convert conversations to speech using Azure Speech Services
  - Distinct voice profiles for shareholder and company agents
  - Japanese text-to-speech with natural voices
  - Play button for each message in the chat interface
- **Real-time Chat Interface**: Interactive chat-style UI for simulation
- **Session Management**: Save and review past simulation sessions
- **Document Context**: AI responses based on uploaded IR materials
- **Multi-tenant Security**: Data isolation for different companies

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (SPA)
- **Backend**: Node.js, Express.js
- **AI Integration**: Azure OpenAI API
- **Voice Integration**: Azure Speech Services
- **Document Processing**: PDF text extraction
- **Real-time Communication**: Socket.IO
- **Security**: Multi-tenant data isolation

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with the following configuration:

```
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
AZURE_SPEECH_KEY=your_azure_speech_service_key
AZURE_SPEECH_REGION=your_azure_speech_service_region
PORT=3000
```

### Azure Speech Services Setup (for Voice Functionality)

To enable voice functionality, you need to set up Azure Speech Services:

1. **Create Azure Speech Service Resource**:
   - Go to [Azure Portal](https://portal.azure.com/)
   - Create a new "Speech Services" resource
   - Choose your subscription and resource group
   - Select a pricing tier (F0 free tier available for testing)
   - Note down the **Key** and **Region** from the resource overview

2. **Configure Environment Variables**:
   - `AZURE_SPEECH_KEY`: Your Speech Service key (Key 1 or Key 2)
   - `AZURE_SPEECH_REGION`: Your Speech Service region (e.g., "eastus", "westus2", "japaneast")

3. **Voice Profiles**:
   - **Shareholder Agent**: Uses Japanese male voice (ja-JP-KeitaNeural)
   - **Company Agent**: Uses Japanese female voice (ja-JP-NanamiNeural)

If Azure Speech Services are not configured, the voice functionality will be disabled gracefully, and the system will continue to work without audio playback.

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open http://localhost:3000 in your browser

3. Upload IR documents (PDF format)

4. Enter expected questions (optional)

5. Start Q&A simulation

6. **Voice Playback**: Click the 🔊 button next to any message to hear it spoken with voice synthesis

7. Review and export session logs

## Project Structure

```
├── public/           # Frontend static files
├── src/
│   ├── server/       # Backend server code
│   ├── ai/           # AI agent implementations
│   ├── utils/        # Utility functions
│   └── config/       # Configuration files
├── uploads/          # Uploaded documents storage
├── logs/            # Session logs
└── tests/           # Test files
```

## API Endpoints

- `POST /api/upload` - Upload IR documents
- `POST /api/simulation/start` - Start simulation session
- `GET /api/simulation/:sessionId` - Get session details
- `POST /api/simulation/:sessionId/message` - Send message in simulation
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:sessionId/export` - Export session log

## Features Implementation Status

### Core Features (MVP)
- [x] Project structure setup
- [ ] Document upload and processing
- [ ] Basic chat interface
- [ ] AI agent integration
- [ ] Session management
- [ ] Document context search

### Advanced Features
- [ ] Multi-tenant security
- [ ] Session export
- [ ] Source citation
- [ ] Performance optimization
- [ ] Error handling

## License

MIT License - see LICENSE file for details
