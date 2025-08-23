/**
 * PRIMARY AGENT - ORCHESTRATOR
 * 
 * This is the main orchestrator that manages the entire drug interaction checking flow.
 * It acts as a "project manager" - understanding context, breaking down tasks, routing to
 * subagents, and aggregating results.
 * 
 * KEY PRINCIPLES:
 * 1. Never executes tasks directly - always delegates to subagents
 * 2. Maintains conversation state and context
 * 3. Handles error recovery and graceful degradation
 * 4. Generates user-facing responses
 * 
 * AGENT FLOW:
 * Input → Parse → Normalize Drugs → Check Interactions → Assess Risk → Format Response
 */

import { StateGraph, END } from "@langchain/langgraph";
import { DrugNormalizerSubagent } from "../subagents/drug-normalizer.js";
import { InteractionCheckerSubagent } from "../subagents/interaction-checker.js";
import { PatientContextSubagent } from "../subagents/patient-context.js";
import { RiskAssessorSubagent } from "../subagents/risk-assessor.js";

/**
 * STATE SCHEMA
 * Defines the complete state that flows through the graph
 * Each node can read and modify this state
 */
const StateSchema = {
  // User Input
  raw_drugs: [],           // Raw drug names from user ["warfarin", "aspirin"]
  patient_id: null,        // Optional patient identifier
  
  // Processing State
  normalized_drugs: [],    // Normalized drug information from RxNorm
  interactions: [],        // Drug interaction data from FDA
  patient_context: null,   // Patient medical history and current meds
  
  // Task Tracking
  tasks: [],              // All tasks sent to subagents
  task_results: {},       // Results from subagent executions
  
  // Results
  risk_level: null,       // SAFE | WARNING | DANGER
  explanation: "",        // Human-readable explanation
  recommendations: [],    // Action items for the nurse
  
  // Metadata
  processing_steps: [],   // Audit trail of processing
  total_time_ms: 0,      // Total processing time
  errors: [],            // Any errors encountered
  
  // Control Flow
  next_node: "",         // Controls graph navigation
  should_retry: false,   // Retry flag for failed operations
  max_retries: 2,       // Maximum retry attempts
  current_retries: 0    // Current retry count
};

/**
 * Primary Agent Class
 * Orchestrates the entire drug interaction checking process
 */
export class PrimaryAgent {
  constructor(config = {}) {
    this.config = {
      timeout_ms: 5000,
      enable_patient_context: true,
      verbose: true,
      ...config
    };
    
    // Initialize subagents
    this.drugNormalizer = new DrugNormalizerSubagent();
    this.interactionChecker = new InteractionCheckerSubagent();
    this.patientContext = new PatientContextSubagent();
    this.riskAssessor = new RiskAssessorSubagent();
    
    // Build the state graph
    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph state machine
   * Defines nodes (processing steps) and edges (transitions)
   */
  buildGraph() {
    const workflow = new StateGraph({
      channels: StateSchema
    });

    // === NODE DEFINITIONS ===
    
    /**
     * PARSE INPUT NODE
     * Extracts and validates drug names from user input
     */
    workflow.addNode("parse_input", async (state) => {
      const startTime = Date.now();
      this.log("📝 Parsing user input...");
      
      try {
        // Validate input
        if (!state.raw_drugs || state.raw_drugs.length < 2) {
          throw new Error("At least 2 drugs required for interaction check");
        }
        
        // Clean and prepare drug names
        const cleanedDrugs = state.raw_drugs.map(drug => 
          drug.trim().toLowerCase()
        );
        
        // Record processing step
        state.processing_steps.push({
          node: "parse_input",
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          input: state.raw_drugs,
          output: cleanedDrugs
        });
        
        state.raw_drugs = cleanedDrugs;
        state.next_node = "normalize_drugs";
        
        return state;
      } catch (error) {
        return this.handleError(state, error, "parse_input");
      }
    });

    /**
     * NORMALIZE DRUGS NODE
     * Sends drug names to normalizer subagent for RxNorm lookup
     */
    workflow.addNode("normalize_drugs", async (state) => {
      const startTime = Date.now();
      this.log("💊 Normalizing drug names via RxNorm...");
      
      try {
        // Create tasks for each drug (parallel execution)
        const normalizationTasks = state.raw_drugs.map((drug, index) => ({
          task_id: `normalize_${index}_${Date.now()}`,
          task_type: "drug_normalization",
          objective: "Normalize drug name to RxCUI",
          input: { drug_name: drug },
          constraints: {
            timeout_ms: 3000,
            max_retries: 2
          },
          output_spec: {
            format: "json",
            required_fields: ["rxcui", "generic_name", "brand_names"]
          }
        }));
        
        // Execute normalization tasks in parallel
        const results = await Promise.all(
          normalizationTasks.map(task => 
            this.drugNormalizer.execute(task)
          )
        );
        
        // Process results
        const normalizedDrugs = [];
        const errors = [];
        
        results.forEach((result, index) => {
          if (result.status === "complete") {
            normalizedDrugs.push({
              original: state.raw_drugs[index],
              ...result.result
            });
          } else {
            errors.push({
              drug: state.raw_drugs[index],
              error: result.error || "Normalization failed"
            });
          }
          
          // Store task result for audit
          state.task_results[result.task_id] = result;
        });
        
        // Check if we have enough normalized drugs
        if (normalizedDrugs.length < 2) {
          throw new Error(`Failed to normalize enough drugs. Errors: ${JSON.stringify(errors)}`);
        }
        
        state.normalized_drugs = normalizedDrugs;
        state.errors = [...state.errors, ...errors];
        
        // Record processing step
        state.processing_steps.push({
          node: "normalize_drugs",
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          tasks_sent: normalizationTasks.length,
          successful: normalizedDrugs.length,
          failed: errors.length
        });
        
        state.next_node = state.patient_id ? "get_patient_context" : "check_interactions";
        
        return state;
      } catch (error) {
        return this.handleError(state, error, "normalize_drugs");
      }
    });

    /**
     * GET PATIENT CONTEXT NODE
     * Retrieves patient medical history if patient_id provided
     */
    workflow.addNode("get_patient_context", async (state) => {
      const startTime = Date.now();
      this.log("👤 Retrieving patient context...");
      
      try {
        if (!state.patient_id) {
          state.next_node = "check_interactions";
          return state;
        }
        
        // Create patient context task
        const contextTask = {
          task_id: `patient_context_${Date.now()}`,
          task_type: "patient_context_retrieval",
          objective: "Retrieve patient medical history and current medications",
          input: { patient_id: state.patient_id },
          constraints: {
            timeout_ms: 2000,
            max_retries: 1
          },
          output_spec: {
            format: "json",
            required_fields: ["conditions", "current_medications", "allergies", "lab_values"]
          }
        };
        
        // Execute patient context retrieval
        const result = await this.patientContext.execute(contextTask);
        
        if (result.status === "complete") {
          state.patient_context = result.result;
          state.task_results[result.task_id] = result;
        } else {
          // Log error but continue without patient context
          state.errors.push({
            step: "patient_context",
            error: result.error || "Failed to retrieve patient context"
          });
        }
        
        // Record processing step
        state.processing_steps.push({
          node: "get_patient_context",
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          patient_id: state.patient_id,
          context_retrieved: result.status === "complete"
        });
        
        state.next_node = "check_interactions";
        
        return state;
      } catch (error) {
        // Non-critical error - continue without patient context
        state.errors.push({ step: "patient_context", error: error.message });
        state.next_node = "check_interactions";
        return state;
      }
    });

    /**
     * CHECK INTERACTIONS NODE
     * Queries FDA API for drug-drug interactions
     */
    workflow.addNode("check_interactions", async (state) => {
      const startTime = Date.now();
      this.log("⚠️  Checking drug interactions...");
      
      try {
        // Create interaction checking tasks for each drug pair
        const interactionTasks = [];
        const drugs = state.normalized_drugs;
        
        for (let i = 0; i < drugs.length; i++) {
          for (let j = i + 1; j < drugs.length; j++) {
            interactionTasks.push({
              task_id: `interaction_${i}_${j}_${Date.now()}`,
              task_type: "interaction_check",
              objective: "Check for drug-drug interactions",
              input: {
                drug1: drugs[i],
                drug2: drugs[j]
              },
              constraints: {
                timeout_ms: 3000,
                max_retries: 2
              },
              output_spec: {
                format: "json",
                required_fields: ["severity", "description", "mechanism"]
              }
            });
          }
        }
        
        // Execute interaction checks in parallel
        const results = await Promise.all(
          interactionTasks.map(task => 
            this.interactionChecker.execute(task)
          )
        );
        
        // Process interaction results
        const interactions = [];
        
        results.forEach((result, index) => {
          if (result.status === "complete" && result.result) {
            interactions.push(result.result);
          }
          state.task_results[result.task_id] = result;
        });
        
        state.interactions = interactions;
        
        // Record processing step
        state.processing_steps.push({
          node: "check_interactions",
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          pairs_checked: interactionTasks.length,
          interactions_found: interactions.length
        });
        
        state.next_node = "assess_risk";
        
        return state;
      } catch (error) {
        return this.handleError(state, error, "check_interactions");
      }
    });

    /**
     * ASSESS RISK NODE
     * Analyzes interactions and patient context to determine risk level
     */
    workflow.addNode("assess_risk", async (state) => {
      const startTime = Date.now();
      this.log("🔍 Assessing overall risk...");
      
      try {
        // Create risk assessment task
        const riskTask = {
          task_id: `risk_assessment_${Date.now()}`,
          task_type: "risk_assessment",
          objective: "Determine overall risk level and provide recommendations",
          input: {
            drugs: state.normalized_drugs,
            interactions: state.interactions,
            patient_context: state.patient_context
          },
          constraints: {
            timeout_ms: 2000,
            max_retries: 1
          },
          output_spec: {
            format: "json",
            required_fields: ["risk_level", "explanation", "recommendations"]
          }
        };
        
        // Execute risk assessment
        const result = await this.riskAssessor.execute(riskTask);
        
        if (result.status === "complete") {
          state.risk_level = result.result.risk_level;
          state.explanation = result.result.explanation;
          state.recommendations = result.result.recommendations;
          state.task_results[result.task_id] = result;
        } else {
          throw new Error("Risk assessment failed: " + (result.error || "Unknown error"));
        }
        
        // Record processing step
        state.processing_steps.push({
          node: "assess_risk",
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          risk_level: state.risk_level
        });
        
        state.next_node = "format_response";
        
        return state;
      } catch (error) {
        return this.handleError(state, error, "assess_risk");
      }
    });

    /**
     * FORMAT RESPONSE NODE
     * Prepares final user-facing response
     */
    workflow.addNode("format_response", async (state) => {
      const startTime = Date.now();
      this.log("📋 Formatting response...");
      
      try {
        // Calculate total processing time
        state.total_time_ms = state.processing_steps.reduce(
          (sum, step) => sum + (step.duration_ms || 0), 0
        );
        
        // Add final processing step
        state.processing_steps.push({
          node: "format_response",
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        });
        
        // Response is already formatted in state
        state.next_node = END;
        
        return state;
      } catch (error) {
        return this.handleError(state, error, "format_response");
      }
    });

    // === EDGE DEFINITIONS ===
    // Define how the graph flows between nodes
    
    workflow.addEdge("parse_input", "normalize_drugs");
    
    workflow.addConditionalEdges(
      "normalize_drugs",
      (state) => state.next_node,
      {
        "get_patient_context": "get_patient_context",
        "check_interactions": "check_interactions",
        "error": END
      }
    );
    
    workflow.addEdge("get_patient_context", "check_interactions");
    workflow.addEdge("check_interactions", "assess_risk");
    workflow.addEdge("assess_risk", "format_response");
    workflow.addEdge("format_response", END);
    
    // Set entry point
    workflow.setEntryPoint("parse_input");
    
    return workflow.compile();
  }

  /**
   * Execute the drug interaction check
   * Main entry point for the primary agent
   */
  async checkInteraction(drugs, patientId = null) {
    this.log("🚀 Starting drug interaction check");
    this.log(`Drugs: ${drugs.join(", ")}`);
    if (patientId) this.log(`Patient: ${patientId}`);
    
    const initialState = {
      ...StateSchema,
      raw_drugs: drugs,
      patient_id: patientId,
      processing_steps: [],
      errors: [],
      task_results: {}
    };
    
    try {
      // Execute the graph with timeout
      const result = await Promise.race([
        this.graph.invoke(initialState),
        this.timeout(this.config.timeout_ms)
      ]);
      
      this.log(`✅ Completed in ${result.total_time_ms}ms`);
      
      return {
        risk_level: result.risk_level,
        explanation: result.explanation,
        recommendations: result.recommendations,
        processing_time_ms: result.total_time_ms,
        errors: result.errors,
        metadata: {
          steps: result.processing_steps,
          tasks: Object.keys(result.task_results).length
        }
      };
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      
      return {
        risk_level: "ERROR",
        explanation: "Unable to complete drug interaction check",
        recommendations: ["Please try again or contact support"],
        error: error.message,
        processing_time_ms: Date.now() - initialState.processing_steps[0]?.timestamp || 0
      };
    }
  }

  /**
   * Handle errors gracefully
   */
  handleError(state, error, node) {
    this.log(`❌ Error in ${node}: ${error.message}`);
    
    state.errors.push({
      node,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Implement retry logic
    if (state.current_retries < state.max_retries) {
      state.current_retries++;
      state.should_retry = true;
      return state;
    }
    
    // Max retries exceeded - fail gracefully
    state.risk_level = "ERROR";
    state.explanation = `System error during ${node}. ${error.message}`;
    state.recommendations = ["Manual verification required"];
    state.next_node = "format_response";
    
    return state;
  }

  /**
   * Timeout helper
   */
  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
  }

  /**
   * Logging helper
   */
  log(message) {
    if (this.config.verbose) {
      console.log(`[PrimaryAgent] ${message}`);
    }
  }
}

export default PrimaryAgent;