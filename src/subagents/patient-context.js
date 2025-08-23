/**
 * PATIENT CONTEXT SUBAGENT
 * 
 * Pure function subagent that retrieves patient medical context from JSON database.
 * 
 * RESPONSIBILITIES:
 * - Fetch patient medical history
 * - Retrieve current medications
 * - Get relevant lab values
 * - Return structured patient data
 * 
 * PRINCIPLES:
 * - Stateless execution (no memory between calls)
 * - Deterministic output for same input
 * - No conversation context awareness
 * - Returns structured results with metadata
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Patient Context Subagent Class
 * Retrieves patient medical context from local JSON database
 */
export class PatientContextSubagent {
  constructor() {
    // Load patient data from JSON files
    this.loadData();
  }

  /**
   * Load patient data from JSON files
   */
  loadData() {
    try {
      const patientsPath = join(__dirname, '../../data/patients.json');
      const historiesPath = join(__dirname, '../../data/medical-histories.json');
      
      const patientsData = JSON.parse(readFileSync(patientsPath, 'utf8'));
      const historiesData = JSON.parse(readFileSync(historiesPath, 'utf8'));
      
      this.patients = patientsData.patients;
      this.histories = historiesData.medical_histories;
      
      // Create lookup maps for faster access
      this.patientMap = new Map();
      this.historyMap = new Map();
      
      this.patients.forEach(patient => {
        this.patientMap.set(patient.patient_id, patient);
      });
      
      this.histories.forEach(history => {
        this.historyMap.set(history.patient_id, history);
      });
    } catch (error) {
      console.error('Failed to load patient data:', error);
      this.patientMap = new Map();
      this.historyMap = new Map();
    }
  }

  /**
   * Execute patient context retrieval task
   * 
   * @param {Object} task - Task specification from primary agent
   * @param {string} task.task_id - Unique identifier for this task
   * @param {string} task.task_type - Should be "patient_context_retrieval"
   * @param {Object} task.input - Input parameters
   * @param {string} task.input.patient_id - Patient identifier
   * @param {Object} task.constraints - Execution constraints
   * @param {number} task.constraints.timeout_ms - Maximum execution time
   * @param {Object} task.output_spec - Expected output format
   * 
   * @returns {Object} Structured response with status, result, metadata
   */
  async execute(task) {
    const startTime = Date.now();
    
    // Validate task structure
    if (task.task_type !== 'patient_context_retrieval') {
      return this.createErrorResponse(
        task.task_id,
        `Invalid task type: ${task.task_type}`,
        startTime
      );
    }
    
    if (!task.input?.patient_id) {
      return this.createErrorResponse(
        task.task_id,
        'Missing required input: patient_id',
        startTime
      );
    }
    
    try {
      // Apply timeout constraint
      const timeoutMs = task.constraints?.timeout_ms || 2000;
      const result = await this.withTimeout(
        this.retrievePatientContext(task.input.patient_id),
        timeoutMs
      );
      
      // Return structured response
      return {
        task_id: task.task_id,
        status: 'complete',
        result: result,
        metadata: {
          processing_time_ms: Date.now() - startTime,
          confidence: 1.0,
          source: 'local_database',
          api_version: '1.0.0',
          decisions_made: result.decisions || []
        },
        recommendations: {
          follow_up: result.follow_up || [],
          warnings: result.warnings || [],
          limitations: result.limitations || []
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        task.task_id,
        error.message,
        startTime
      );
    }
  }

  /**
   * Retrieve patient context from database
   * 
   * @param {string} patientId - Patient identifier
   * @returns {Object} Patient medical context
   */
  async retrievePatientContext(patientId) {
    const decisions = [];
    const warnings = [];
    const limitations = [];
    
    // Get patient data
    const patient = this.patientMap.get(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }
    
    decisions.push(`Retrieved patient record for ${patientId}`);
    
    // Get medical history
    const history = this.historyMap.get(patientId);
    if (!history) {
      warnings.push('Medical history not available');
      decisions.push('No medical history found');
    } else {
      decisions.push('Retrieved medical history');
    }
    
    // Build comprehensive patient context
    const context = {
      patient_id: patientId,
      demographics: {
        age: patient.age,
        gender: patient.gender,
        weight_kg: patient.weight_kg,
        height_cm: patient.height_cm,
        bmi: this.calculateBMI(patient.weight_kg, patient.height_cm)
      },
      
      allergies: patient.allergies || [],
      
      conditions: patient.conditions || [],
      
      current_medications: this.processMedications(patient.current_medications || []),
      
      lab_values: this.processLabValues(patient.lab_values || {}),
      
      risk_factors: this.identifyRiskFactors(patient, history),
      
      relevant_history: history ? {
        hospitalizations: history.hospitalizations || [],
        adverse_drug_reactions: history.adverse_drug_reactions || [],
        medication_adherence: history.medication_adherence || 'unknown',
        recent_changes: history.recent_changes || []
      } : null,
      
      interaction_considerations: this.generateInteractionConsiderations(patient, history),
      
      decisions,
      warnings,
      limitations
    };
    
    // Add specific warnings based on patient data
    if (patient.age >= 65) {
      warnings.push('Elderly patient - increased sensitivity to medications');
    }
    
    if (patient.conditions?.some(c => c.condition.includes('Kidney'))) {
      warnings.push('Renal impairment - dose adjustments may be needed');
    }
    
    if (patient.conditions?.some(c => c.condition.includes('Liver'))) {
      warnings.push('Hepatic impairment - monitor for drug accumulation');
    }
    
    return context;
  }

  /**
   * Calculate BMI
   */
  calculateBMI(weightKg, heightCm) {
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }

  /**
   * Process medications with additional context
   */
  processMedications(medications) {
    return medications.map(med => ({
      ...med,
      duration_days: this.calculateDuration(med.started),
      interaction_potential: this.assessInteractionPotential(med.drug_name)
    }));
  }

  /**
   * Calculate medication duration
   */
  calculateDuration(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Assess interaction potential of a medication
   */
  assessInteractionPotential(drugName) {
    const highRiskDrugs = ['warfarin', 'methotrexate', 'digoxin', 'lithium'];
    const moderateRiskDrugs = ['ssri', 'nsaid', 'ace inhibitor', 'statin'];
    
    const lowerDrug = drugName.toLowerCase();
    
    if (highRiskDrugs.some(drug => lowerDrug.includes(drug))) {
      return 'high';
    }
    
    if (moderateRiskDrugs.some(drug => lowerDrug.includes(drug))) {
      return 'moderate';
    }
    
    return 'low';
  }

  /**
   * Process lab values with clinical context
   */
  processLabValues(labValues) {
    const processed = {};
    
    for (const [key, data] of Object.entries(labValues)) {
      processed[key] = {
        ...data,
        age_days: this.calculateDuration(data.date),
        clinical_significance: this.assessLabSignificance(key, data)
      };
    }
    
    return processed;
  }

  /**
   * Assess clinical significance of lab values
   */
  assessLabSignificance(labType, data) {
    const assessments = [];
    
    switch (labType) {
      case 'INR':
        if (data.value > 3.0) {
          assessments.push('High INR - increased bleeding risk');
        } else if (data.value < 2.0 && data.target_range) {
          assessments.push('Subtherapeutic INR');
        }
        break;
        
      case 'creatinine':
        if (data.value > 1.5) {
          assessments.push('Elevated creatinine - renal impairment');
        }
        break;
        
      case 'eGFR':
        if (data.value < 60) {
          assessments.push('Reduced eGFR - chronic kidney disease');
        }
        if (data.value < 30) {
          assessments.push('Severe renal impairment');
        }
        break;
        
      case 'potassium':
        if (data.value > 5.0) {
          assessments.push('Hyperkalemia risk');
        } else if (data.value < 3.5) {
          assessments.push('Hypokalemia risk');
        }
        break;
        
      case 'ALT':
        if (data.value > 40) {
          assessments.push('Elevated liver enzymes');
        }
        break;
    }
    
    return assessments.length > 0 ? assessments : ['Within normal limits'];
  }

  /**
   * Identify patient-specific risk factors
   */
  identifyRiskFactors(patient, history) {
    const riskFactors = [];
    
    // Age-related risks
    if (patient.age >= 65) {
      riskFactors.push({
        factor: 'Advanced age',
        impact: 'Increased drug sensitivity, reduced clearance'
      });
    }
    
    // Condition-related risks
    if (patient.conditions?.some(c => c.condition.includes('Kidney'))) {
      riskFactors.push({
        factor: 'Renal impairment',
        impact: 'Reduced drug elimination, dose adjustment needed'
      });
    }
    
    if (patient.conditions?.some(c => c.condition.includes('Atrial Fibrillation'))) {
      riskFactors.push({
        factor: 'Atrial fibrillation',
        impact: 'Anticoagulation required, bleeding risk'
      });
    }
    
    if (patient.conditions?.some(c => c.condition.includes('Diabetes'))) {
      riskFactors.push({
        factor: 'Diabetes',
        impact: 'Drug interactions with antidiabetics, glucose monitoring needed'
      });
    }
    
    // History-related risks
    if (history?.adverse_drug_reactions?.length > 0) {
      riskFactors.push({
        factor: 'Previous adverse drug reactions',
        impact: 'Increased vigilance required for new medications'
      });
    }
    
    if (history?.medication_adherence === 'poor') {
      riskFactors.push({
        factor: 'Poor medication adherence',
        impact: 'Unpredictable drug levels, reduced efficacy'
      });
    }
    
    // Polypharmacy risk
    if (patient.current_medications?.length >= 5) {
      riskFactors.push({
        factor: 'Polypharmacy',
        impact: 'Increased interaction risk, adverse effect potential'
      });
    }
    
    return riskFactors;
  }

  /**
   * Generate interaction considerations based on patient context
   */
  generateInteractionConsiderations(patient, history) {
    const considerations = [];
    
    // Check for anticoagulation
    if (patient.current_medications?.some(m => 
      m.drug_name.toLowerCase().includes('warfarin') ||
      m.drug_name.toLowerCase().includes('rivaroxaban') ||
      m.drug_name.toLowerCase().includes('apixaban')
    )) {
      considerations.push('Patient on anticoagulation - monitor for bleeding interactions');
    }
    
    // Check for immunosuppression
    if (patient.current_medications?.some(m => 
      m.drug_name.toLowerCase().includes('methotrexate') ||
      m.drug_name.toLowerCase().includes('prednisone')
    )) {
      considerations.push('Immunosuppressed - avoid live vaccines, monitor for infections');
    }
    
    // Check for narrow therapeutic index drugs
    if (patient.current_medications?.some(m => 
      ['warfarin', 'digoxin', 'lithium', 'phenytoin'].some(drug => 
        m.drug_name.toLowerCase().includes(drug)
      )
    )) {
      considerations.push('Narrow therapeutic index drugs present - small changes can have significant effects');
    }
    
    // Check allergies
    if (patient.allergies?.includes('aspirin') || patient.allergies?.includes('NSAIDs')) {
      considerations.push('NSAID allergy - avoid all NSAIDs including COX-2 inhibitors');
    }
    
    return considerations;
  }

  /**
   * Apply timeout to async operation
   */
  async withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Create error response structure
   */
  createErrorResponse(taskId, errorMessage, startTime) {
    return {
      task_id: taskId,
      status: 'failed',
      result: null,
      error: errorMessage,
      metadata: {
        processing_time_ms: Date.now() - startTime,
        confidence: 0,
        source: 'local_database',
        api_version: '1.0.0'
      },
      recommendations: {
        follow_up: ['Verify patient ID', 'Check database connection'],
        warnings: ['Patient context retrieval failed'],
        limitations: ['Unable to provide patient-specific recommendations']
      }
    };
  }
}

export default PatientContextSubagent;