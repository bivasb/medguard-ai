# MedGuard AI Architecture

## Agent Flow Pattern Documentation

### Core Principle: Primary-Subagent Architecture

```
User Input → Primary Agent → Subagents → Primary Agent → User Response
                    ↓              ↑
              Orchestration    Pure Functions
```

## 1. Primary Agent (Orchestrator)

**Role**: Project Manager - Never executes tasks directly
- Understands user context and intent
- Breaks down complex requests into atomic tasks
- Routes tasks to appropriate subagents
- Aggregates and interprets results
- Maintains conversation state
- Generates user-facing responses

**Implementation**: LangGraph State Machine with nodes for:
- Input Analysis
- Task Decomposition
- Subagent Routing
- Result Aggregation
- Response Generation

## 2. Subagents (Pure Functions)

**Role**: Specialized Task Executors - No memory, no context
- Single responsibility principle
- Stateless execution
- Deterministic outputs
- No conversation awareness
- Return structured results

### Subagent Types in MedGuard:

#### 2.1 Drug Normalizer Subagent
- **Input**: Raw drug name string
- **Process**: RxNorm API lookup
- **Output**: Normalized drug info (RxCUI, generic name, brand names)

#### 2.2 Interaction Checker Subagent
- **Input**: Two normalized drug RxCUIs
- **Process**: FDA OpenFDA API query
- **Output**: Interaction severity and details

#### 2.3 Patient Context Subagent
- **Input**: Patient ID
- **Process**: JSON database lookup
- **Output**: Relevant medical history

#### 2.4 Risk Assessor Subagent
- **Input**: Interaction data + patient context
- **Process**: Rule-based risk calculation
- **Output**: Risk level (SAFE/WARNING/DANGER) + reasoning

## 3. Communication Protocol

### Task Request Structure (Primary → Subagent)
```json
{
  "task_id": "unique_identifier",
  "task_type": "drug_normalization",
  "objective": "Normalize drug name to RxCUI",
  "input": {
    "drug_name": "warfarin"
  },
  "constraints": {
    "timeout_ms": 3000,
    "max_retries": 2
  },
  "output_spec": {
    "format": "json",
    "required_fields": ["rxcui", "generic_name", "brand_names"]
  }
}
```

### Response Structure (Subagent → Primary)
```json
{
  "task_id": "unique_identifier",
  "status": "complete|partial|failed",
  "result": {
    "rxcui": "11289",
    "generic_name": "warfarin",
    "brand_names": ["Coumadin", "Jantoven"]
  },
  "metadata": {
    "processing_time_ms": 245,
    "confidence": 0.95,
    "source": "rxnorm_api",
    "api_version": "2024.01"
  },
  "recommendations": {
    "follow_up": ["verify_dosage_form"],
    "warnings": ["multiple_formulations_exist"],
    "limitations": ["brand_names_may_vary_by_region"]
  }
}
```

## 4. State Management

### LangGraph State Definition
```typescript
interface MedGuardState {
  // User Input
  raw_drugs: string[]
  patient_id?: string
  
  // Processing State
  normalized_drugs: DrugInfo[]
  interactions: InteractionData[]
  patient_context: PatientData
  
  // Results
  risk_level: "SAFE" | "WARNING" | "DANGER"
  explanation: string
  recommendations: string[]
  
  // Metadata
  processing_steps: ProcessingStep[]
  total_time_ms: number
}
```

## 5. Error Handling Strategy

### Graceful Degradation
1. Primary agent detects subagent failure
2. Attempts alternative data source if available
3. Provides partial results with clear limitations
4. Never crashes - always returns meaningful response

### Timeout Management
- Each subagent has strict timeout (default: 3 seconds)
- Primary agent has overall timeout (5 seconds)
- Partial results returned if timeout exceeded

## 6. Data Flow Example

**User Input**: "Check warfarin and aspirin interaction for patient P001"

```
1. Primary Agent receives input
   ↓
2. Decomposes into tasks:
   - Task A: Normalize "warfarin"
   - Task B: Normalize "aspirin"  
   - Task C: Get patient P001 context
   ↓
3. Parallel execution:
   - Drug Normalizer Subagent A → warfarin data
   - Drug Normalizer Subagent B → aspirin data
   - Patient Context Subagent → patient history
   ↓
4. Sequential execution:
   - Interaction Checker Subagent → drug interaction data
   ↓
5. Risk Assessment:
   - Risk Assessor Subagent → final risk level
   ↓
6. Primary Agent aggregates and formats response
   ↓
7. User receives: "DANGER: Increased bleeding risk..."
```

## 7. MCP Server Integration

### Role of MCP Servers
- Provide standardized API access
- Handle authentication and rate limiting
- Cache frequently requested data
- Transform API responses to standard format

### MCP Server Types
1. **RxNorm MCP Server**: Drug normalization and mapping
2. **FDA MCP Server**: Interaction and adverse event data
3. **Internal Data MCP Server**: Patient records and scenarios

## 8. Testing Strategy

### Unit Tests (Subagents)
- Test each subagent as pure function
- Verify deterministic outputs
- Mock external API calls

### Integration Tests (Primary Agent)
- Test complete flows with mock subagents
- Verify state transitions
- Test error handling paths

### End-to-End Tests
- Use mock scenario database
- Test real API integrations
- Measure response times

## 9. Performance Targets

- **Response Time**: < 3 seconds for drug interaction check
- **Parallel Processing**: All independent tasks run concurrently
- **Caching**: Common drug lookups cached for 24 hours
- **Rate Limiting**: Respect API limits with backoff strategy

## 10. Security Considerations

- No PHI stored in logs
- Patient IDs are anonymized references
- API keys stored in environment variables
- All external calls use HTTPS
- Input sanitization for drug names