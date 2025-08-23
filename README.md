# MedGuard AI - Phase 1: Drug Interaction Checker

🏥 **AI-powered medication safety system for healthcare professionals**

Built with LangGraph, MCP servers, and modern web technologies to prevent drug errors in clinical settings.

## 🎯 Project Overview

MedGuard AI Phase 1 is a drug interaction checker designed for nurse workflows in small clinics. It provides instant safety alerts when checking multiple medications together, considering patient context and clinical factors.

### Demo Goal
Show a nurse entering "warfarin + aspirin" and getting immediate "DANGER: Increased bleeding risk" alert with actionable recommendations.

## ✨ Features

- **⚡ Fast Response**: < 3 seconds for drug interaction checks
- **🧠 AI-Powered**: LangGraph agent orchestration with specialized subagents
- **👤 Patient Context**: Considers medical history, allergies, and lab values
- **📱 Nurse-Friendly**: Simple interface optimized for clinical workflows
- **🔍 Comprehensive**: RxNorm drug normalization + FDA adverse event data
- **📊 Detailed Results**: Risk levels (SAFE/WARNING/DANGER) with explanations

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Interface (Vanilla JS)               │
├─────────────────────────────────────────────────────────────┤
│                Express.js API Server                        │
├─────────────────────────────────────────────────────────────┤
│                Primary Agent (LangGraph)                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │    Drug     │Interaction  │  Patient    │    Risk     │  │
│  │ Normalizer  │  Checker    │  Context    │ Assessor    │  │
│  │ Subagent    │ Subagent    │ Subagent    │ Subagent    │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                MCP Server Infrastructure                    │
├─────────────────────────────────────────────────────────────┤
│           External APIs & Data Sources                      │
│   ┌─────────────┬─────────────┬─────────────────────────┐   │
│   │   RxNorm    │ FDA OpenFDA │     JSON Databases      │   │
│   │     API     │     API     │ (Patients & Scenarios)  │   │
│   └─────────────┴─────────────┴─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🧠 Agent Flow Pattern

### Primary Agent (Project Manager)
- **Never executes tasks directly**
- Understands context and user intent
- Breaks down complex requests into atomic tasks
- Routes tasks to specialized subagents
- Aggregates and interprets results
- Generates user-facing responses

### Subagents (Pure Functions)
- **Stateless execution** - no memory between calls
- **Single responsibility** - one task type per agent
- **Deterministic outputs** - same input = same output
- **Structured responses** - status, result, metadata, recommendations

## 📁 Project Structure

```
medguard-ai/
├── README.md                      # This file
├── ARCHITECTURE.md               # Detailed architecture documentation
├── package.json                  # Dependencies and scripts
├── .env.example                 # Environment configuration template
├── src/
│   ├── index.js                 # Main application server
│   ├── agents/
│   │   └── primary-agent.js     # LangGraph orchestrator
│   ├── subagents/
│   │   ├── drug-normalizer.js   # RxNorm API integration
│   │   ├── interaction-checker.js # FDA OpenFDA integration
│   │   ├── patient-context.js   # Patient data retrieval
│   │   └── risk-assessor.js     # Risk analysis and recommendations
│   └── mcp/
│       └── server.js            # MCP protocol implementation
├── data/
│   ├── patients.json           # Mock patient profiles
│   ├── medical-histories.json  # Detailed medical histories
│   └── mock-scenarios.json     # Test scenarios and expected results
└── public/
    ├── index.html              # Web interface
    ├── styles.css              # Modern UI styling
    └── app.js                  # Frontend application logic
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ (use nvm for installation)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medguard-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (optional for demo)
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Web Interface: http://localhost:3000
   - API Health Check: http://localhost:3000/api/health
   - MCP Server: http://localhost:3001/health

## 📝 Usage Examples

### Basic Drug Interaction Check

1. Open http://localhost:3000
2. Enter two drugs (e.g., "warfarin" and "aspirin")
3. Optionally select a patient for context
4. Click "Check Interactions"
5. Review the safety alert and recommendations

### Quick Test Scenarios

Click any of the pre-configured scenario buttons:
- **Warfarin + Aspirin**: Critical bleeding risk (DANGER)
- **Methotrexate + Trimethoprim**: Toxicity risk (DANGER)
- **Sertraline + Tramadol**: Serotonin syndrome risk (WARNING)
- **Statin + Macrolide**: Muscle toxicity risk (WARNING)

### API Usage

**Check Interactions Endpoint:**
```javascript
POST /api/check-interaction
Content-Type: application/json

{
  "drugs": ["warfarin", "aspirin"],
  "patient_id": "P001"
}
```

**Response:**
```javascript
{
  "risk_level": "DANGER",
  "explanation": "CRITICAL: Warfarin and aspirin have dangerous interaction...",
  "recommendations": [
    "DO NOT administer aspirin with warfarin",
    "Consider acetaminophen for pain relief instead",
    "Check current INR immediately"
  ],
  "processing_time_ms": 1250,
  "metadata": {
    "confidence": 0.95,
    "steps": ["parse_input", "normalize_drugs", "check_interactions", "assess_risk"]
  }
}
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all configuration options:

- **PORT**: Web server port (default: 3000)
- **MCP_PORT**: MCP server port (default: 3001)
- **AGENT_TIMEOUT_MS**: Maximum processing time (default: 5000)
- **ENABLE_PATIENT_CONTEXT**: Include patient data (default: true)
- **VERBOSE**: Enable detailed logging (default: true)

### Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with auto-reload
npm run mcp:start  # Start MCP server standalone
npm test           # Run test scenarios
```

## 🧪 Testing

### Mock Scenarios

The system includes comprehensive test scenarios in `data/mock-scenarios.json`:

1. **Critical Interactions** (DANGER level)
   - Warfarin + Aspirin: Major bleeding risk
   - Methotrexate + Trimethoprim: Severe toxicity

2. **Moderate Interactions** (WARNING level)
   - Sertraline + Tramadol: Serotonin syndrome
   - Atorvastatin + Clarithromycin: Muscle toxicity

3. **Safe Combinations** (SAFE level)
   - Sertraline + Amoxicillin: No significant interaction

### Patient Profiles

Five mock patients with different risk profiles:
- **P001**: Elderly woman on anticoagulation (high risk)
- **P002**: Middle-aged man on immunosuppressants
- **P003**: Young woman with depression and drug allergies
- **P004**: Elderly man post-MI on multiple cardiac medications
- **P005**: Middle-aged woman with chronic kidney disease

### Running Tests

```bash
# Run automated test scenarios
npm test

# Test specific endpoints
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/check-interaction \
  -H "Content-Type: application/json" \
  -d '{"drugs": ["warfarin", "aspirin"], "patient_id": "P001"}'
```

## 📚 API Documentation

### Endpoints

**GET /api/health**
- Returns: Server health and status information

**POST /api/check-interaction**
- Body: `{ "drugs": ["drug1", "drug2"], "patient_id": "optional" }`
- Returns: Interaction analysis with risk level and recommendations

**POST /api/batch-check**
- Body: `{ "requests": [{ "drugs": [...], "patient_id": "..." }, ...] }`
- Returns: Array of interaction check results

**GET /api/patient/:patientId**
- Returns: Patient information and medical context

**GET /api/scenarios**
- Returns: Available test scenarios

**GET /api/agent/status**
- Returns: Primary agent status and configuration

### Response Formats

All API responses follow a consistent structure:

```javascript
{
  "risk_level": "SAFE|WARNING|DANGER",
  "explanation": "Human-readable explanation",
  "recommendations": ["action1", "action2"],
  "processing_time_ms": 1234,
  "metadata": {
    "confidence": 0.95,
    "steps": ["step1", "step2"]
  }
}
```

## 🔍 How It Works

### 1. Input Processing
- User enters drug names via web interface
- Primary agent validates and sanitizes input
- Drugs normalized using RxNorm API

### 2. Parallel Data Gathering
- **Drug Normalizer**: Converts brand → generic names, gets RxCUI
- **Patient Context**: Retrieves medical history, current meds, allergies
- **Interaction Checker**: Queries FDA adverse events database

### 3. Risk Assessment
- Analyzes interaction severity, patient factors, drug characteristics
- Calculates weighted risk score
- Determines risk level: SAFE (< 40%), WARNING (40-70%), DANGER (> 70%)

### 4. Response Generation
- Creates human-readable explanation
- Generates actionable recommendations
- Returns structured response in < 3 seconds

## 🎨 UI Design

The web interface is inspired by modern medical applications with:
- **Dark theme** optimized for clinical environments
- **Large, clear buttons** for easy interaction
- **Color-coded alerts** (green=safe, yellow=warning, red=danger)
- **Mobile-responsive** design for tablets
- **Accessibility features** for screen readers

## 📊 Performance

- **Target Response Time**: < 3 seconds
- **Parallel Processing**: All independent tasks run concurrently
- **Caching**: Common drug lookups cached for 24 hours
- **Rate Limiting**: Respects API limits with backoff strategy
- **Error Recovery**: Graceful degradation when services unavailable

## 🔒 Security & Privacy

- **No PHI Storage**: Patient IDs are anonymized references
- **HTTPS Only**: All external API calls use secure connections
- **Input Sanitization**: All user inputs validated and sanitized
- **Error Handling**: No sensitive information in error messages
- **API Keys**: Stored in environment variables only

## 🔮 Future Enhancements (Phase 2+)

- **Regional Health Data**: Integration with CDC surveillance data
- **ML-Powered Predictions**: Custom interaction models
- **EHR Integration**: Direct connection to hospital systems
- **Mobile Apps**: Native iOS/Android applications
- **Multi-language**: Support for Spanish and other languages
- **Clinical Decision Support**: Extended CDSS capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For questions, issues, or feature requests:

1. Check the [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation
2. Review existing issues in the repository
3. Create a new issue with detailed description and steps to reproduce

## 🏆 Acknowledgments

- **RxNorm API**: Free drug normalization service by NIH
- **FDA OpenFDA**: Open drug safety database
- **LangGraph**: Advanced agent orchestration framework
- **MCP Protocol**: Standardized model-context communication

---

**Built with ❤️ for healthcare professionals**

*This is a demonstration system. Always consult clinical resources and follow institutional protocols for medication safety.*