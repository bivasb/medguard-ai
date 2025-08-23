# 🚀 MedGuard AI Demo Guide

## Quick Start

1. **Install & Run**
   ```bash
   cd medguard-ai
   npm install
   npm run dev
   ```

2. **Open Browser**
   Navigate to: `http://localhost:3000`

## 🎯 Demo Flow

### **Critical Demo Scenario** (Main Use Case)
1. Enter drugs: **"warfarin"** and **"aspirin"**
2. Select patient: **Eleanor Martinez (72F)**
3. Click **"Check Interactions"**
4. **Expected Result**: 
   - 🚨 **DANGER** alert
   - **"Increased bleeding risk"** explanation
   - Clear nursing recommendations
   - Response time < 3 seconds

### **Quick Test Scenarios**
Click any scenario button for instant demo:

- **🚨 Warfarin + Aspirin** → DANGER (bleeding risk)
- **⚠️ Methotrexate + Trimethoprim** → DANGER (toxicity)  
- **⚡ Sertraline + Tramadol** → WARNING (serotonin syndrome)
- **💊 Statin + Macrolide** → WARNING (muscle toxicity)

## 🎨 UI Features Showcased

### **GlowupMyResume-Inspired Design**
- ✨ Clean, modern white interface
- 🎨 Vibrant gradient accents (#0066ff to #8b5cf6)
- 🔄 Subtle animations and microinteractions
- 📱 Mobile-responsive design
- 🎯 Professional healthcare aesthetic

### **Interactive Elements**
- 🌟 Gradient brand text
- ⚡ Smooth hover transitions
- 💫 Floating background elements
- 🎪 Animated result badges
- ⏱️ Real-time processing indicators

## 🏥 Clinical Scenarios Explained

### **Patient Profiles Available**
- **P001**: Eleanor (72F) - AFib on warfarin
- **P002**: James (45M) - RA on methotrexate  
- **P003**: Sarah (28F) - Depression, NSAID allergies
- **P004**: Robert (65M) - Post-MI, dual antiplatelets
- **P005**: Maria (55F) - CKD Stage 3

### **Risk Levels**
- 🟢 **SAFE**: No significant interaction
- 🟡 **WARNING**: Monitor closely, consider alternatives
- 🔴 **DANGER**: Avoid combination, immediate action

## 📊 Architecture Highlights

### **Agent Flow Demo**
1. **Input**: User enters drug names
2. **Primary Agent**: Orchestrates the workflow
3. **Subagents**: Process in parallel
   - Drug Normalizer (RxNorm)
   - Interaction Checker (FDA)
   - Patient Context (JSON DB)
   - Risk Assessor (Clinical rules)
4. **Output**: Structured safety alert

### **Performance Metrics**
- ⚡ Target: < 3 seconds
- 🔄 Parallel processing
- 📱 Mobile optimized
- 🎯 Nurse-friendly workflow

## 🧪 Testing Commands

```bash
# Run test suite
npm test

# Test specific endpoints
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/check-interaction \
  -H "Content-Type: application/json" \
  -d '{"drugs": ["warfarin", "aspirin"], "patient_id": "P001"}'

# Start MCP server separately
npm run mcp:start
```

## 💡 Demo Tips

### **For Stakeholders**
- Emphasize **< 3 second** response time
- Show **real patient context** integration
- Highlight **actionable recommendations**
- Demonstrate **mobile responsiveness**

### **For Technical Audience**
- Explain **primary-subagent** architecture
- Show **MCP protocol** integration
- Discuss **LangGraph** orchestration
- Demo **API endpoints**

### **For Healthcare Users**
- Focus on **nurse workflow**
- Show **patient safety** features
- Explain **risk level** meanings
- Demo **scenario buttons**

## 🚨 Known Demo Limitations

- Uses **mock data** for FDA interactions
- **External APIs** may have rate limits
- **Patient data** is anonymized/fictional
- Designed for **demonstration purposes**

## 📞 Support

- Check `README.md` for full documentation
- Review `ARCHITECTURE.md` for technical details
- See `data/` folder for mock scenarios
- Check console for detailed logging

---

**Ready to demo the future of medication safety! 🏥✨**