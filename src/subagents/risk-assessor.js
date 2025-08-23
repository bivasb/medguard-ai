/**
 * RISK ASSESSOR SUBAGENT
 * 
 * Pure function subagent that analyzes drug interactions and patient context 
 * to determine overall risk level and provide recommendations.
 * 
 * RESPONSIBILITIES:
 * - Analyze interaction severity
 * - Consider patient-specific factors
 * - Determine risk level (SAFE/WARNING/DANGER)
 * - Generate actionable recommendations
 * 
 * PRINCIPLES:
 * - Stateless execution (no memory between calls)
 * - Deterministic output for same input
 * - No conversation context awareness
 * - Returns structured results with metadata
 */

/**
 * Risk Assessor Subagent Class
 * Evaluates overall risk and generates clinical recommendations
 */
export class RiskAssessorSubagent {
  constructor() {
    // Risk scoring weights
    this.weights = {
      interaction_severity: 0.4,
      patient_factors: 0.3,
      drug_characteristics: 0.2,
      clinical_context: 0.1
    };
    
    // Risk thresholds
    this.thresholds = {
      danger: 0.7,
      warning: 0.4,
      safe: 0.2
    };
  }

  /**
   * Execute risk assessment task
   * 
   * @param {Object} task - Task specification from primary agent
   * @param {string} task.task_id - Unique identifier for this task
   * @param {string} task.task_type - Should be "risk_assessment"
   * @param {Object} task.input - Input parameters
   * @param {Array} task.input.drugs - Normalized drug information
   * @param {Array} task.input.interactions - Drug interaction data
   * @param {Object} task.input.patient_context - Patient medical context
   * @param {Object} task.constraints - Execution constraints
   * @param {number} task.constraints.timeout_ms - Maximum execution time
   * @param {Object} task.output_spec - Expected output format
   * 
   * @returns {Object} Structured response with status, result, metadata
   */
  async execute(task) {
    const startTime = Date.now();
    
    // Validate task structure
    if (task.task_type !== 'risk_assessment') {
      return this.createErrorResponse(
        task.task_id,
        `Invalid task type: ${task.task_type}`,
        startTime
      );
    }
    
    if (!task.input?.drugs || !task.input?.interactions) {
      return this.createErrorResponse(
        task.task_id,
        'Missing required input: drugs and interactions',
        startTime
      );
    }
    
    try {
      // Apply timeout constraint
      const timeoutMs = task.constraints?.timeout_ms || 2000;
      const result = await this.withTimeout(
        this.assessRisk(
          task.input.drugs,
          task.input.interactions,
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
          source: 'risk_assessment_engine',
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
   * Assess overall risk based on all factors
   * 
   * @param {Array} drugs - Normalized drug information
   * @param {Array} interactions - Drug interaction data
   * @param {Object} patientContext - Patient medical context
   * @returns {Object} Risk assessment result
   */
  async assessRisk(drugs, interactions, patientContext) {
    const decisions = [];
    const warnings = [];
    const limitations = [];
    
    // Calculate component scores
    const interactionScore = this.scoreInteractions(interactions, decisions);
    const patientScore = this.scorePatientFactors(patientContext, decisions);
    const drugScore = this.scoreDrugCharacteristics(drugs, decisions);
    const clinicalScore = this.scoreClinicalContext(drugs, interactions, patientContext, decisions);
    
    // Calculate weighted overall score
    const overallScore = 
      (interactionScore * this.weights.interaction_severity) +
      (patientScore * this.weights.patient_factors) +
      (drugScore * this.weights.drug_characteristics) +
      (clinicalScore * this.weights.clinical_context);
    
    decisions.push(`Overall risk score: ${(overallScore * 100).toFixed(1)}%`);
    
    // Determine risk level
    let riskLevel;
    if (overallScore >= this.thresholds.danger) {
      riskLevel = 'DANGER';
    } else if (overallScore >= this.thresholds.warning) {
      riskLevel = 'WARNING';
    } else {
      riskLevel = 'SAFE';
    }
    
    // Generate explanation
    const explanation = this.generateExplanation(
      riskLevel,
      drugs,
      interactions,
      patientContext,
      {
        interactionScore,
        patientScore,
        drugScore,
        clinicalScore,
        overallScore
      }
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskLevel,
      drugs,
      interactions,
      patientContext
    );
    
    // Add specific warnings based on findings
    if (patientContext?.allergies?.length > 0) {
      const relevantAllergies = this.checkForAllergyConflicts(drugs, patientContext.allergies);
      if (relevantAllergies.length > 0) {
        warnings.push(`Patient has allergies to: ${relevantAllergies.join(', ')}`);
        riskLevel = 'DANGER';
      }
    }
    
    // Check for duplicate therapy
    const duplicates = this.checkDuplicateTherapy(drugs, patientContext);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate therapy detected: ${duplicates.join(', ')}`);
    }
    
    return {
      risk_level: riskLevel,
      explanation,
      recommendations,
      risk_scores: {
        overall: (overallScore * 100).toFixed(1) + '%',
        interaction: (interactionScore * 100).toFixed(1) + '%',
        patient_factors: (patientScore * 100).toFixed(1) + '%',
        drug_characteristics: (drugScore * 100).toFixed(1) + '%',
        clinical_context: (clinicalScore * 100).toFixed(1) + '%'
      },
      confidence: this.calculateConfidence(interactions, patientContext),
      decisions,
      warnings,
      limitations,
      follow_up: this.generateFollowUpActions(riskLevel)
    };
  }

  /**
   * Score interaction severity
   */
  scoreInteractions(interactions, decisions) {
    if (!interactions || interactions.length === 0) {
      decisions.push('No documented interactions found');
      return 0;
    }
    
    let maxScore = 0;
    
    interactions.forEach(interaction => {
      let score = 0;
      
      switch (interaction.severity) {
        case 'MAJOR':
          score = 0.9;
          break;
        case 'MODERATE':
          score = 0.6;
          break;
        case 'MINOR':
          score = 0.3;
          break;
        default:
          score = 0.1;
      }
      
      // Adjust based on clinical significance
      if (interaction.serious_event_count > 10) {
        score = Math.min(1.0, score + 0.2);
      }
      
      maxScore = Math.max(maxScore, score);
    });
    
    decisions.push(`Highest interaction severity score: ${(maxScore * 100).toFixed(0)}%`);
    return maxScore;
  }

  /**
   * Score patient-specific risk factors
   */
  scorePatientFactors(patientContext, decisions) {
    if (!patientContext) {
      decisions.push('No patient context available');
      return 0.3; // Default moderate risk when no context
    }
    
    let score = 0;
    let factors = 0;
    
    // Age factor
    if (patientContext.demographics?.age >= 75) {
      score += 0.3;
      factors++;
      decisions.push('Elderly patient (≥75 years)');
    } else if (patientContext.demographics?.age >= 65) {
      score += 0.2;
      factors++;
      decisions.push('Older adult (65-74 years)');
    }
    
    // Renal function
    if (patientContext.lab_values?.eGFR?.value < 30) {
      score += 0.4;
      factors++;
      decisions.push('Severe renal impairment (eGFR < 30)');
    } else if (patientContext.lab_values?.eGFR?.value < 60) {
      score += 0.2;
      factors++;
      decisions.push('Moderate renal impairment (eGFR 30-59)');
    }
    
    // Hepatic function
    if (patientContext.lab_values?.ALT?.value > 80) {
      score += 0.3;
      factors++;
      decisions.push('Significant liver enzyme elevation');
    }
    
    // Polypharmacy
    const medCount = patientContext.current_medications?.length || 0;
    if (medCount >= 10) {
      score += 0.3;
      factors++;
      decisions.push(`Severe polypharmacy (${medCount} medications)`);
    } else if (medCount >= 5) {
      score += 0.2;
      factors++;
      decisions.push(`Polypharmacy (${medCount} medications)`);
    }
    
    // Previous adverse reactions
    if (patientContext.relevant_history?.adverse_drug_reactions?.length > 0) {
      score += 0.2;
      factors++;
      decisions.push('History of adverse drug reactions');
    }
    
    // Normalize score
    if (factors > 0) {
      score = score / factors;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Score drug characteristics
   */
  scoreDrugCharacteristics(drugs, decisions) {
    let score = 0;
    let factors = 0;
    
    drugs.forEach(drug => {
      // Check for narrow therapeutic index drugs
      const narrowTherapeuticDrugs = ['warfarin', 'digoxin', 'lithium', 'phenytoin', 'theophylline'];
      const drugName = (drug.generic_name || drug.original_input).toLowerCase();
      
      if (narrowTherapeuticDrugs.some(ntd => drugName.includes(ntd))) {
        score += 0.4;
        factors++;
        decisions.push(`Narrow therapeutic index drug: ${drug.generic_name || drug.original_input}`);
      }
      
      // Check for high-risk drug classes
      if (drugName.includes('anticoagulant') || drugName.includes('warfarin')) {
        score += 0.3;
        factors++;
      }
      
      if (drugName.includes('methotrexate') || drugName.includes('immunosuppressant')) {
        score += 0.3;
        factors++;
      }
    });
    
    // Normalize score
    if (factors > 0) {
      score = score / factors;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Score clinical context
   */
  scoreClinicalContext(drugs, interactions, patientContext, decisions) {
    let score = 0;
    
    // Check for contraindications based on conditions
    if (patientContext?.conditions) {
      patientContext.conditions.forEach(condition => {
        // Warfarin in patient with bleeding history
        if (condition.condition.includes('bleeding') && 
            drugs.some(d => (d.generic_name || '').toLowerCase().includes('warfarin'))) {
          score = Math.max(score, 0.8);
          decisions.push('Anticoagulant with bleeding history');
        }
        
        // NSAIDs in kidney disease
        if (condition.condition.includes('Kidney') && 
            drugs.some(d => this.isNSAID(d.generic_name || d.original_input))) {
          score = Math.max(score, 0.7);
          decisions.push('NSAID use with kidney disease');
        }
      });
    }
    
    // Check INR if on warfarin
    if (patientContext?.lab_values?.INR && 
        drugs.some(d => (d.generic_name || '').toLowerCase().includes('warfarin'))) {
      const inr = patientContext.lab_values.INR.value;
      if (inr > 3.5) {
        score = Math.max(score, 0.8);
        decisions.push(`High INR (${inr}) with warfarin`);
      }
    }
    
    return score;
  }

  /**
   * Generate human-readable explanation
   */
  generateExplanation(riskLevel, drugs, interactions, patientContext, scores) {
    const drugNames = drugs.map(d => d.generic_name || d.original_input).join(' and ');
    
    let explanation = '';
    
    switch (riskLevel) {
      case 'DANGER':
        explanation = `CRITICAL: ${drugNames} have a dangerous interaction. `;
        if (interactions[0]?.severity === 'MAJOR') {
          explanation += interactions[0].description || 'Major interaction detected. ';
        }
        if (scores.patientScore > 0.6) {
          explanation += 'Patient factors significantly increase risk. ';
        }
        explanation += 'Immediate action required.';
        break;
        
      case 'WARNING':
        explanation = `CAUTION: ${drugNames} have a moderate interaction risk. `;
        if (interactions[0]?.description) {
          explanation += interactions[0].description + ' ';
        }
        if (patientContext?.demographics?.age >= 65) {
          explanation += 'Age increases sensitivity. ';
        }
        explanation += 'Close monitoring recommended.';
        break;
        
      case 'SAFE':
        explanation = `${drugNames} can generally be used together safely. `;
        if (interactions.length === 0) {
          explanation += 'No significant interactions documented. ';
        }
        explanation += 'Standard monitoring appropriate.';
        break;
        
      default:
        explanation = 'Unable to fully assess risk. Manual review recommended.';
    }
    
    return explanation;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(riskLevel, drugs, interactions, patientContext) {
    const recommendations = [];
    
    switch (riskLevel) {
      case 'DANGER':
        recommendations.push('DO NOT administer these medications together');
        recommendations.push('Consult physician or pharmacist immediately');
        recommendations.push('Document interaction in patient record');
        
        // Specific alternatives based on drugs
        if (drugs.some(d => this.isNSAID(d.generic_name || d.original_input))) {
          recommendations.push('Consider acetaminophen for pain relief');
        }
        
        if (drugs.some(d => (d.generic_name || '').toLowerCase().includes('warfarin'))) {
          recommendations.push('Check INR before any changes');
          recommendations.push('Monitor for signs of bleeding');
        }
        break;
        
      case 'WARNING':
        recommendations.push('Use with caution - increased monitoring required');
        
        // Specific monitoring based on interaction
        if (interactions[0]?.mechanism?.includes('serotonin')) {
          recommendations.push('Monitor for serotonin syndrome symptoms');
          recommendations.push('Watch for: confusion, agitation, tremor, sweating');
        }
        
        if (interactions[0]?.mechanism?.includes('bleeding')) {
          recommendations.push('Monitor for signs of bleeding');
          recommendations.push('Check hemoglobin if bleeding suspected');
        }
        
        if (interactions[0]?.mechanism?.includes('CYP')) {
          recommendations.push('Consider dose adjustment');
          recommendations.push('Monitor for increased side effects');
        }
        
        recommendations.push('Document monitoring plan');
        recommendations.push('Educate patient on warning signs');
        break;
        
      case 'SAFE':
        recommendations.push('Proceed with standard administration');
        recommendations.push('Routine monitoring appropriate');
        
        if (patientContext?.demographics?.age >= 65) {
          recommendations.push('Start with lower doses in elderly');
        }
        
        if (patientContext?.lab_values?.eGFR?.value < 60) {
          recommendations.push('Verify renal dosing adjustments');
        }
        break;
    }
    
    // Add patient-specific recommendations
    if (patientContext?.relevant_history?.medication_adherence === 'poor') {
      recommendations.push('Ensure patient understanding and compliance');
    }
    
    return recommendations;
  }

  /**
   * Check for allergy conflicts
   */
  checkForAllergyConflicts(drugs, allergies) {
    const conflicts = [];
    
    drugs.forEach(drug => {
      const drugName = (drug.generic_name || drug.original_input).toLowerCase();
      
      allergies.forEach(allergy => {
        const allergyLower = allergy.toLowerCase();
        
        // Direct match
        if (drugName.includes(allergyLower)) {
          conflicts.push(allergy);
        }
        
        // Cross-reactivity checks
        if (allergyLower.includes('penicillin') && 
            (drugName.includes('cephalosporin') || drugName.includes('cef'))) {
          conflicts.push(`${allergy} (potential cross-reactivity with ${drugName})`);
        }
        
        if (allergyLower.includes('aspirin') && this.isNSAID(drugName)) {
          conflicts.push(`${allergy} (cross-reactivity with NSAIDs)`);
        }
      });
    });
    
    return [...new Set(conflicts)];
  }

  /**
   * Check for duplicate therapy
   */
  checkDuplicateTherapy(drugs, patientContext) {
    const duplicates = [];
    
    if (!patientContext?.current_medications) {
      return duplicates;
    }
    
    drugs.forEach(newDrug => {
      const newDrugName = (newDrug.generic_name || newDrug.original_input).toLowerCase();
      
      patientContext.current_medications.forEach(currentMed => {
        const currentDrugName = currentMed.drug_name.toLowerCase();
        
        // Check for same drug
        if (newDrugName === currentDrugName) {
          duplicates.push(`${newDrug.generic_name || newDrug.original_input} (already taking)`);
        }
        
        // Check for same class
        if (this.isSameClass(newDrugName, currentDrugName)) {
          duplicates.push(`${newDrug.generic_name || newDrug.original_input} (duplicate class with ${currentMed.drug_name})`);
        }
      });
    });
    
    return duplicates;
  }

  /**
   * Check if drugs are in the same class
   */
  isSameClass(drug1, drug2) {
    const classes = {
      ssri: ['sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram'],
      statin: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
      ace_inhibitor: ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
      beta_blocker: ['metoprolol', 'atenolol', 'propranolol', 'carvedilol'],
      ppi: ['omeprazole', 'pantoprazole', 'lansoprazole', 'esomeprazole']
    };
    
    for (const [className, drugs] of Object.entries(classes)) {
      if (drugs.some(d => drug1.includes(d)) && drugs.some(d => drug2.includes(d))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if drug is an NSAID
   */
  isNSAID(drugName) {
    const nsaids = ['ibuprofen', 'aspirin', 'naproxen', 'diclofenac', 'celecoxib', 'meloxicam', 'indomethacin'];
    const lower = drugName.toLowerCase();
    return nsaids.some(nsaid => lower.includes(nsaid));
  }

  /**
   * Calculate confidence in assessment
   */
  calculateConfidence(interactions, patientContext) {
    let confidence = 0.5;
    
    // Increase confidence with more data
    if (interactions && interactions.length > 0) {
      confidence += 0.2;
    }
    
    if (patientContext) {
      confidence += 0.2;
    }
    
    if (patientContext?.lab_values && Object.keys(patientContext.lab_values).length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Generate follow-up actions based on risk level
   */
  generateFollowUpActions(riskLevel) {
    switch (riskLevel) {
      case 'DANGER':
        return [
          'Document interaction alert in patient record',
          'Notify prescriber immediately',
          'Consider pharmacy consultation',
          'Schedule follow-up within 24 hours'
        ];
        
      case 'WARNING':
        return [
          'Document monitoring plan',
          'Set reminder for follow-up in 48-72 hours',
          'Educate patient on warning signs',
          'Consider dose adjustment if needed'
        ];
        
      case 'SAFE':
        return [
          'Proceed with routine care',
          'Standard follow-up appropriate'
        ];
        
      default:
        return ['Manual review recommended'];
    }
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
        source: 'risk_assessment_engine',
        api_version: '1.0.0'
      },
      recommendations: {
        follow_up: ['Manual risk assessment required'],
        warnings: ['Automated risk assessment failed'],
        limitations: ['Unable to determine risk level']
      }
    };
  }
}

export default RiskAssessorSubagent;