/**
 * DOSAGE VALIDATION SUBAGENT
 * 
 * Pure function subagent that validates drug dosages based on patient-specific factors.
 * 
 * RESPONSIBILITIES:
 * - Weight-based dosing calculations
 * - Age-appropriate dosing ranges
 * - Maximum daily dose warnings
 * - Frequency validation
 * - Special population adjustments (elderly, pediatric, renal, hepatic)
 * 
 * PRINCIPLES:
 * - Stateless execution (no memory between calls)
 * - Deterministic output for same input
 * - No conversation context awareness
 * - Returns structured results with metadata
 */

/**
 * Dosage Validation Subagent Class
 * Validates drug dosages against clinical guidelines and patient factors
 */
export class DosageValidatorSubagent {
  constructor() {
    // Clinical dosing database (in production, this would be a comprehensive database)
    this.dosingDatabase = {
      'warfarin': {
        adult_dose_range: { min: 2.5, max: 10, unit: 'mg', frequency: 'daily' },
        elderly_adjustment: 0.75, // 25% reduction
        weight_based: false,
        max_daily_dose: 10,
        renal_adjustment: {
          mild: 1.0,    // eGFR > 60
          moderate: 0.8, // eGFR 30-60
          severe: 0.6   // eGFR < 30
        },
        hepatic_adjustment: 0.5,
        monitoring_required: ['INR', 'bleeding signs'],
        contraindications: ['active bleeding', 'pregnancy']
      },
      'methotrexate': {
        adult_dose_range: { min: 7.5, max: 25, unit: 'mg', frequency: 'weekly' },
        elderly_adjustment: 0.8,
        weight_based: false,
        max_weekly_dose: 25,
        renal_adjustment: {
          mild: 1.0,
          moderate: 0.75,
          severe: 0.5
        },
        hepatic_adjustment: 0.3,
        monitoring_required: ['CBC', 'LFTs', 'creatinine'],
        contraindications: ['pregnancy', 'severe renal impairment']
      },
      'aspirin': {
        adult_dose_range: { min: 75, max: 325, unit: 'mg', frequency: 'daily' },
        elderly_adjustment: 1.0, // No adjustment needed
        weight_based: false,
        max_daily_dose: 4000, // For pain/fever
        pediatric_contraindicated: true,
        renal_adjustment: {
          mild: 1.0,
          moderate: 1.0,
          severe: 0.5
        },
        contraindications: ['active GI bleeding', 'severe asthma']
      },
      'sertraline': {
        adult_dose_range: { min: 25, max: 200, unit: 'mg', frequency: 'daily' },
        elderly_adjustment: 0.75,
        weight_based: false,
        max_daily_dose: 200,
        renal_adjustment: {
          mild: 1.0,
          moderate: 1.0,
          severe: 0.75
        },
        hepatic_adjustment: 0.5,
        monitoring_required: ['mood changes', 'suicidal ideation']
      },
      'tramadol': {
        adult_dose_range: { min: 25, max: 100, unit: 'mg', frequency: 'q4-6h' },
        elderly_adjustment: 0.75,
        weight_based: false,
        max_daily_dose: 400,
        renal_adjustment: {
          mild: 1.0,
          moderate: 0.75,
          severe: 0.5
        },
        contraindications: ['seizure disorder', 'MAOIs']
      },
      'atorvastatin': {
        adult_dose_range: { min: 10, max: 80, unit: 'mg', frequency: 'daily' },
        elderly_adjustment: 1.0,
        weight_based: false,
        max_daily_dose: 80,
        hepatic_adjustment: 0.5,
        monitoring_required: ['LFTs', 'CK'],
        contraindications: ['active liver disease']
      },
      'acetaminophen': {
        adult_dose_range: { min: 325, max: 1000, unit: 'mg', frequency: 'q4-6h' },
        elderly_adjustment: 1.0,
        weight_based: true,
        weight_dose_mg_kg: 15, // mg/kg per dose
        max_daily_dose: 4000,
        max_daily_dose_elderly: 3000,
        hepatic_adjustment: 0.5,
        contraindications: ['severe hepatic impairment']
      },
      'ibuprofen': {
        adult_dose_range: { min: 200, max: 800, unit: 'mg', frequency: 'q6-8h' },
        elderly_adjustment: 0.75,
        weight_based: false,
        max_daily_dose: 3200,
        renal_adjustment: {
          mild: 1.0,
          moderate: 0.75,
          severe: 0.5
        },
        contraindications: ['active GI bleeding', 'severe heart failure']
      }
    };

    // Frequency parsing patterns
    this.frequencyPatterns = {
      'daily': { times_per_day: 1, interval_hours: 24 },
      'once daily': { times_per_day: 1, interval_hours: 24 },
      'bid': { times_per_day: 2, interval_hours: 12 },
      'twice daily': { times_per_day: 2, interval_hours: 12 },
      'tid': { times_per_day: 3, interval_hours: 8 },
      'three times daily': { times_per_day: 3, interval_hours: 8 },
      'qid': { times_per_day: 4, interval_hours: 6 },
      'four times daily': { times_per_day: 4, interval_hours: 6 },
      'q4h': { times_per_day: 6, interval_hours: 4 },
      'q6h': { times_per_day: 4, interval_hours: 6 },
      'q8h': { times_per_day: 3, interval_hours: 8 },
      'q12h': { times_per_day: 2, interval_hours: 12 },
      'weekly': { times_per_day: 1/7, interval_hours: 168 },
      'prn': { times_per_day: null, interval_hours: null, as_needed: true }
    };
  }

  /**
   * Execute dosage validation task
   * 
   * @param {Object} task - Task specification from primary agent
   * @param {string} task.task_id - Unique identifier for this task
   * @param {string} task.task_type - Should be "dosage_validation"
   * @param {Object} task.input - Input parameters
   * @param {Object} task.input.drug - Drug information with proposed dosage
   * @param {Object} task.input.patient_context - Patient demographics and medical history
   * @param {Object} task.constraints - Execution constraints
   * @param {number} task.constraints.timeout_ms - Maximum execution time
   * @param {Object} task.output_spec - Expected output format
   * 
   * @returns {Object} Structured response with status, result, metadata
   */
  async execute(task) {
    const startTime = Date.now();
    
    // Validate task structure
    if (task.task_type !== 'dosage_validation') {
      return this.createErrorResponse(
        task.task_id,
        `Invalid task type: ${task.task_type}`,
        startTime
      );
    }
    
    if (!task.input?.drug || !task.input?.patient_context) {
      return this.createErrorResponse(
        task.task_id,
        'Missing required input: drug and patient_context',
        startTime
      );
    }
    
    try {
      // Apply timeout constraint
      const timeoutMs = task.constraints?.timeout_ms || 2000;
      const result = await this.withTimeout(
        this.validateDosage(
          task.input.drug,
          task.input.patient_context
        ),
        timeoutMs
      );
      
      // Return structured response
      return {
        task_id: task.task_id,
        status: 'complete',
        result: result,
        metadata: {
          processing_time_ms: Date.now() - startTime,
          confidence: result.confidence || 1.0,
          source: 'clinical_dosing_guidelines',
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
   * Validate dosage based on drug info and patient context
   * 
   * @param {Object} drug - Drug information including proposed dosage
   * @param {Object} patientContext - Patient demographics and medical data
   * @returns {Object} Dosage validation result
   */
  async validateDosage(drug, patientContext) {
    const decisions = [];
    const warnings = [];
    const limitations = [];
    
    // Get drug name (handle both normalized and original inputs)
    const drugName = (drug.generic_name || drug.drug_name || drug.name || '').toLowerCase();
    const proposedDose = this.parseDosage(drug.dose || drug.dosage);
    
    decisions.push(`Validating dosage for: ${drugName}`);
    decisions.push(`Proposed dose: ${JSON.stringify(proposedDose)}`);
    
    // Get clinical dosing guidelines
    const guidelines = this.getDosingGuidelines(drugName);
    if (!guidelines) {
      limitations.push(`No dosing guidelines available for ${drugName}`);
      return {
        validation_status: 'UNKNOWN',
        explanation: `Dosing guidelines not available for ${drugName}. Manual verification required.`,
        proposed_dose: proposedDose,
        recommendations: ['Consult drug reference for dosing guidance'],
        decisions,
        warnings: ['Dosing validation unavailable'],
        limitations,
        confidence: 0.3
      };
    }
    
    decisions.push('Retrieved clinical dosing guidelines');
    
    // Patient-specific adjustments
    const adjustments = this.calculatePatientAdjustments(guidelines, patientContext, decisions);
    
    // Calculate recommended dose range
    const recommendedRange = this.calculateRecommendedDose(guidelines, adjustments, patientContext);
    
    // Validate proposed dose
    const validation = this.validateProposedDose(proposedDose, recommendedRange, guidelines, patientContext);
    
    // Check for contraindications
    const contraindications = this.checkContraindications(guidelines, patientContext);
    
    // Generate final assessment
    let validationStatus = validation.status;
    let explanation = validation.explanation;
    let recommendations = validation.recommendations;
    
    // Override status if contraindications exist
    if (contraindications.length > 0) {
      validationStatus = 'CONTRAINDICATED';
      explanation = `CONTRAINDICATION: ${contraindications.join(', ')}. Do not administer.`;
      recommendations = ['Do not administer this medication', 'Consult physician for alternatives'];
      warnings.push('Absolute contraindication detected');
    }
    
    // Add monitoring requirements
    if (guidelines.monitoring_required) {
      recommendations.push(`Monitor: ${guidelines.monitoring_required.join(', ')}`);
    }
    
    return {
      validation_status: validationStatus,
      explanation,
      proposed_dose: proposedDose,
      recommended_dose_range: recommendedRange,
      patient_adjustments: adjustments,
      recommendations,
      contraindications,
      monitoring_required: guidelines.monitoring_required || [],
      decisions,
      warnings,
      limitations,
      confidence: contraindications.length > 0 ? 1.0 : validation.confidence
    };
  }

  /**
   * Parse dosage string into structured format
   */
  parseDosage(dosageString) {
    if (!dosageString) {
      return { dose: null, unit: null, frequency: null, parsed: false };
    }
    
    // Clean the dosage string
    const cleaned = dosageString.toLowerCase().trim();
    
    // Extract dose amount and unit
    const doseMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|units?)/i);
    const dose = doseMatch ? parseFloat(doseMatch[1]) : null;
    const unit = doseMatch ? doseMatch[2].toLowerCase() : null;
    
    // Extract frequency
    let frequency = null;
    let frequencyData = null;
    
    for (const [pattern, data] of Object.entries(this.frequencyPatterns)) {
      if (cleaned.includes(pattern)) {
        frequency = pattern;
        frequencyData = data;
        break;
      }
    }
    
    return {
      dose,
      unit,
      frequency,
      frequency_data: frequencyData,
      original_string: dosageString,
      parsed: dose !== null && unit !== null
    };
  }

  /**
   * Get dosing guidelines for a drug
   */
  getDosingGuidelines(drugName) {
    // Direct match first
    if (this.dosingDatabase[drugName]) {
      return this.dosingDatabase[drugName];
    }
    
    // Fuzzy match for partial names
    for (const [key, guidelines] of Object.entries(this.dosingDatabase)) {
      if (drugName.includes(key) || key.includes(drugName)) {
        return guidelines;
      }
    }
    
    return null;
  }

  /**
   * Calculate patient-specific dose adjustments
   */
  calculatePatientAdjustments(guidelines, patientContext, decisions) {
    const adjustments = {
      age_factor: 1.0,
      weight_factor: 1.0,
      renal_factor: 1.0,
      hepatic_factor: 1.0,
      overall_factor: 1.0,
      reasons: []
    };
    
    // Age adjustments
    if (patientContext.demographics?.age >= 65 && guidelines.elderly_adjustment) {
      adjustments.age_factor = guidelines.elderly_adjustment;
      adjustments.reasons.push(`Elderly patient (age ${patientContext.demographics.age}): dose reduced by ${Math.round((1 - guidelines.elderly_adjustment) * 100)}%`);
      decisions.push('Applied elderly dose adjustment');
    }
    
    // Weight adjustments (for weight-based dosing)
    if (guidelines.weight_based && patientContext.demographics?.weight_kg && guidelines.weight_dose_mg_kg) {
      const weightBasedDose = patientContext.demographics.weight_kg * guidelines.weight_dose_mg_kg;
      adjustments.weight_based_dose = weightBasedDose;
      adjustments.reasons.push(`Weight-based dosing: ${guidelines.weight_dose_mg_kg} mg/kg × ${patientContext.demographics.weight_kg} kg = ${weightBasedDose} mg`);
      decisions.push('Applied weight-based dosing calculation');
    }
    
    // Renal adjustments
    if (guidelines.renal_adjustment && patientContext.lab_values?.eGFR) {
      const egfr = patientContext.lab_values.eGFR.value;
      let renalCategory = 'mild';
      
      if (egfr < 30) {
        renalCategory = 'severe';
      } else if (egfr < 60) {
        renalCategory = 'moderate';
      }
      
      adjustments.renal_factor = guidelines.renal_adjustment[renalCategory] || 1.0;
      if (adjustments.renal_factor < 1.0) {
        adjustments.reasons.push(`Renal impairment (eGFR ${egfr}): dose reduced by ${Math.round((1 - adjustments.renal_factor) * 100)}%`);
        decisions.push(`Applied renal dose adjustment for eGFR ${egfr}`);
      }
    }
    
    // Hepatic adjustments
    if (guidelines.hepatic_adjustment && patientContext.lab_values?.ALT) {
      const alt = patientContext.lab_values.ALT.value;
      if (alt > 80) { // Significantly elevated
        adjustments.hepatic_factor = guidelines.hepatic_adjustment;
        adjustments.reasons.push(`Hepatic impairment (ALT ${alt}): dose reduced by ${Math.round((1 - guidelines.hepatic_adjustment) * 100)}%`);
        decisions.push('Applied hepatic dose adjustment');
      }
    }
    
    // Calculate overall adjustment factor
    adjustments.overall_factor = adjustments.age_factor * adjustments.renal_factor * adjustments.hepatic_factor;
    
    return adjustments;
  }

  /**
   * Calculate recommended dose range based on guidelines and adjustments
   */
  calculateRecommendedDose(guidelines, adjustments, patientContext) {
    let minDose = guidelines.adult_dose_range.min;
    let maxDose = guidelines.adult_dose_range.max;
    
    // Apply patient adjustments
    if (!guidelines.weight_based) {
      minDose = minDose * adjustments.overall_factor;
      maxDose = maxDose * adjustments.overall_factor;
    } else if (adjustments.weight_based_dose) {
      // For weight-based drugs, use calculated dose as both min and max
      minDose = adjustments.weight_based_dose * 0.8; // Allow 20% tolerance
      maxDose = adjustments.weight_based_dose * 1.2;
    }
    
    // Consider maximum daily dose limits
    let maxDailyDose = guidelines.max_daily_dose;
    
    // Special handling for elderly max daily dose
    if (patientContext.demographics?.age >= 65 && guidelines.max_daily_dose_elderly) {
      maxDailyDose = guidelines.max_daily_dose_elderly;
    }
    
    return {
      min_dose: Math.round(minDose * 100) / 100,
      max_dose: Math.round(maxDose * 100) / 100,
      unit: guidelines.adult_dose_range.unit,
      frequency: guidelines.adult_dose_range.frequency,
      max_daily_dose: maxDailyDose,
      weight_based: guidelines.weight_based || false
    };
  }

  /**
   * Validate proposed dose against recommended range
   */
  validateProposedDose(proposedDose, recommendedRange, guidelines, patientContext) {
    if (!proposedDose.parsed) {
      return {
        status: 'UNPARSEABLE',
        explanation: `Unable to parse dosage "${proposedDose.original_string}". Please verify format.`,
        recommendations: ['Clarify dosage format', 'Use standard dosing notation'],
        confidence: 0.2
      };
    }
    
    // Convert proposed dose to daily amount for comparison
    let dailyDose = proposedDose.dose;
    if (proposedDose.frequency_data && proposedDose.frequency_data.times_per_day) {
      dailyDose = proposedDose.dose * proposedDose.frequency_data.times_per_day;
    }
    
    // Check if dose is within recommended range
    const withinRange = proposedDose.dose >= recommendedRange.min_dose && 
                       proposedDose.dose <= recommendedRange.max_dose;
    
    // Check maximum daily dose
    const withinDailyLimit = !recommendedRange.max_daily_dose || dailyDose <= recommendedRange.max_daily_dose;
    
    let status = 'APPROPRIATE';
    let explanation = '';
    let recommendations = [];
    let confidence = 0.9;
    
    if (!withinRange && !withinDailyLimit) {
      status = 'INAPPROPRIATE';
      explanation = `Dose ${proposedDose.dose}${proposedDose.unit} is outside recommended range (${recommendedRange.min_dose}-${recommendedRange.max_dose}${recommendedRange.unit}) and exceeds maximum daily dose (${recommendedRange.max_daily_dose}${recommendedRange.unit}).`;
      recommendations.push('Adjust dose to within recommended range');
      recommendations.push('Consider dose reduction or frequency change');
    } else if (!withinRange) {
      status = 'SUBOPTIMAL';
      if (proposedDose.dose < recommendedRange.min_dose) {
        explanation = `Dose ${proposedDose.dose}${proposedDose.unit} is below recommended range (${recommendedRange.min_dose}-${recommendedRange.max_dose}${recommendedRange.unit}). May be subtherapeutic.`;
        recommendations.push('Consider dose increase for optimal efficacy');
      } else {
        explanation = `Dose ${proposedDose.dose}${proposedDose.unit} exceeds recommended range (${recommendedRange.min_dose}-${recommendedRange.max_dose}${recommendedRange.unit}). Increased risk of adverse effects.`;
        recommendations.push('Consider dose reduction to minimize side effects');
      }
      confidence = 0.8;
    } else if (!withinDailyLimit) {
      status = 'EXCESSIVE';
      explanation = `Daily dose (${dailyDose}${proposedDose.unit}) exceeds maximum recommended (${recommendedRange.max_daily_dose}${recommendedRange.unit}). High risk of toxicity.`;
      recommendations.push('Reduce frequency or individual dose');
      recommendations.push('Monitor for signs of toxicity');
      confidence = 0.95;
    } else {
      explanation = `Dose ${proposedDose.dose}${proposedDose.unit} ${proposedDose.frequency} is appropriate for this patient.`;
      recommendations.push('Dose is within recommended range');
      recommendations.push('Continue with standard monitoring');
    }
    
    return { status, explanation, recommendations, confidence };
  }

  /**
   * Check for absolute contraindications
   */
  checkContraindications(guidelines, patientContext) {
    const contraindications = [];
    
    if (!guidelines.contraindications) {
      return contraindications;
    }
    
    guidelines.contraindications.forEach(contraindication => {
      switch (contraindication) {
        case 'pregnancy':
          // Would need pregnancy status in patient context
          break;
        case 'active bleeding':
        case 'active GI bleeding':
          // Would check recent procedures/conditions
          break;
        case 'severe renal impairment':
          if (patientContext.lab_values?.eGFR?.value < 15) {
            contraindications.push('Severe renal impairment (eGFR < 15)');
          }
          break;
        case 'severe hepatic impairment':
        case 'active liver disease':
          if (patientContext.lab_values?.ALT?.value > 120) {
            contraindications.push('Severe hepatic impairment');
          }
          break;
        case 'seizure disorder':
          if (patientContext.conditions?.some(c => 
            c.condition.toLowerCase().includes('seizure') || 
            c.condition.toLowerCase().includes('epilepsy')
          )) {
            contraindications.push('History of seizure disorder');
          }
          break;
      }
    });
    
    return contraindications;
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
        source: 'clinical_dosing_guidelines',
        api_version: '1.0.0'
      },
      recommendations: {
        follow_up: ['Manual dosage verification required'],
        warnings: ['Automated dosage validation failed'],
        limitations: ['Unable to validate dosage']
      }
    };
  }
}

export default DosageValidatorSubagent;