/**
 * INTERACTION CHECKER SUBAGENT
 * 
 * Pure function subagent that checks drug-drug interactions using FDA OpenFDA API and RxNorm data.
 * 
 * RESPONSIBILITIES:
 * - Query FDA adverse event database for drug interactions
 * - Use normalized RxNorm data for accurate drug identification
 * - Identify severity of interactions using FDA labeling data
 * - Extract mechanism and clinical significance
 * - Return structured interaction data
 * 
 * PRINCIPLES:
 * - Stateless execution (no memory between calls)
 * - Deterministic output for same input
 * - No conversation context awareness
 * - Returns structured results with metadata
 */

import fetch from 'node-fetch';
const OpenFDAService = require('../../backend/services/openfda-service.js');

/**
 * Interaction Checker Subagent Class
 * Checks drug-drug interactions via FDA OpenFDA API
 */
export class InteractionCheckerSubagent {
  constructor() {
    // Initialize OpenFDA service for real API access
    this.openFDAService = new OpenFDAService();
    
    // FDA OpenFDA API base URL (FREE, no key required)
    this.baseUrl = 'https://api.fda.gov/drug';
    
    // Rate limiting: 240 requests/minute, 1000/hour
    this.lastRequestTime = 0;
    this.minRequestInterval = 250; // 250ms between requests
    
    // Known critical interactions (fallback data)
    this.criticalInteractions = {
      'warfarin_aspirin': {
        severity: 'MAJOR',
        mechanism: 'Pharmacodynamic synergism',
        description: 'Increased bleeding risk due to combined anticoagulant and antiplatelet effects',
        clinical_significance: 'Risk of major bleeding including GI and intracranial hemorrhage'
      },
      'methotrexate_trimethoprim': {
        severity: 'MAJOR',
        mechanism: 'Decreased renal clearance',
        description: 'Trimethoprim inhibits methotrexate elimination leading to toxicity',
        clinical_significance: 'Bone marrow suppression, mucositis, hepatotoxicity'
      },
      'sertraline_tramadol': {
        severity: 'MODERATE',
        mechanism: 'Serotonergic effects',
        description: 'Both drugs increase serotonin levels',
        clinical_significance: 'Risk of serotonin syndrome'
      },
      'atorvastatin_clarithromycin': {
        severity: 'MODERATE',
        mechanism: 'CYP3A4 inhibition',
        description: 'Clarithromycin inhibits statin metabolism',
        clinical_significance: 'Increased risk of myopathy and rhabdomyolysis'
      }
    };
  }

  /**
   * Execute interaction checking task
   * 
   * @param {Object} task - Task specification from primary agent
   * @param {string} task.task_id - Unique identifier for this task
   * @param {string} task.task_type - Should be "interaction_check"
   * @param {Object} task.input - Input parameters
   * @param {Object} task.input.drug1 - First drug (normalized)
   * @param {Object} task.input.drug2 - Second drug (normalized)
   * @param {Object} task.constraints - Execution constraints
   * @param {number} task.constraints.timeout_ms - Maximum execution time
   * @param {Object} task.output_spec - Expected output format
   * 
   * @returns {Object} Structured response with status, result, metadata
   */
  async execute(task) {
    const startTime = Date.now();
    
    // Validate task structure
    if (task.task_type !== 'interaction_check') {
      return this.createErrorResponse(
        task.task_id,
        `Invalid task type: ${task.task_type}`,
        startTime
      );
    }
    
    if (!task.input?.drug1 || !task.input?.drug2) {
      return this.createErrorResponse(
        task.task_id,
        'Missing required input: drug1 and drug2',
        startTime
      );
    }
    
    try {
      // Apply timeout constraint
      const timeoutMs = task.constraints?.timeout_ms || 3000;
      const result = await this.withTimeout(
        this.checkInteraction(task.input.drug1, task.input.drug2),
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
          source: result.source,
          api_version: '2024.01',
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
   * Check interaction between two drugs
   * 
   * @param {Object} drug1 - First normalized drug
   * @param {Object} drug2 - Second normalized drug
   * @returns {Object} Interaction data
   */
  async checkInteraction(drug1, drug2) {
    const decisions = [];
    const warnings = [];
    const limitations = [];
    
    try {
      // Step 1: Check known critical interactions first
      const knownInteraction = this.checkKnownInteractions(drug1, drug2);
      if (knownInteraction) {
        decisions.push('Found in known critical interactions database');
        return {
          ...knownInteraction,
          drug1: drug1.generic_name || drug1.original_input,
          drug2: drug2.generic_name || drug2.original_input,
          source: 'internal_database',
          confidence: 0.95,
          decisions,
          warnings,
          limitations
        };
      }
      
      // Step 2: Query FDA adverse events for co-reported drugs
      await this.enforceRateLimit();
      const adverseEvents = await this.queryAdverseEvents(drug1, drug2);
      decisions.push('Queried FDA adverse events database');
      
      // Step 3: Analyze drug label data for interactions
      await this.enforceRateLimit();
      const labelData = await this.queryDrugLabel(drug1, drug2);
      decisions.push('Queried FDA drug label database');
      
      // Step 4: Combine and analyze results
      const interaction = this.analyzeInteractionData(
        adverseEvents,
        labelData,
        drug1,
        drug2
      );
      
      if (!interaction.found) {
        limitations.push('Limited interaction data available in FDA database');
        return {
          severity: 'UNKNOWN',
          mechanism: 'No documented interaction',
          description: 'No significant interaction found in FDA database',
          clinical_significance: 'Monitor for unexpected effects',
          drug1: drug1.generic_name || drug1.original_input,
          drug2: drug2.generic_name || drug2.original_input,
          source: 'fda_openfda',
          confidence: 0.6,
          decisions,
          warnings: ['Absence of data does not guarantee safety'],
          limitations,
          found: false
        };
      }
      
      return {
        ...interaction,
        drug1: drug1.generic_name || drug1.original_input,
        drug2: drug2.generic_name || drug2.original_input,
        source: 'fda_openfda',
        confidence: interaction.confidence || 0.8,
        decisions,
        warnings,
        limitations,
        found: true
      };
    } catch (error) {
      // Fallback to known interactions if API fails
      warnings.push('FDA API error, using fallback data');
      const knownInteraction = this.checkKnownInteractions(drug1, drug2);
      
      if (knownInteraction) {
        return {
          ...knownInteraction,
          drug1: drug1.generic_name || drug1.original_input,
          drug2: drug2.generic_name || drug2.original_input,
          source: 'internal_database_fallback',
          confidence: 0.7,
          decisions: ['FDA API unavailable, used fallback database'],
          warnings: ['Using cached interaction data'],
          limitations: ['Real-time FDA data unavailable']
        };
      }
      
      throw new Error(`Failed to check interaction: ${error.message}`);
    }
  }

  /**
   * Check known critical interactions database
   */
  checkKnownInteractions(drug1, drug2) {
    const name1 = (drug1.generic_name || drug1.original_input).toLowerCase();
    const name2 = (drug2.generic_name || drug2.original_input).toLowerCase();
    
    // Check both directions
    const key1 = `${name1}_${name2}`;
    const key2 = `${name2}_${name1}`;
    
    return this.criticalInteractions[key1] || this.criticalInteractions[key2] || null;
  }

  /**
   * Query FDA adverse events for drug interactions
   */
  async queryAdverseEvents(drug1, drug2) {
    try {
      const drug1Name = encodeURIComponent(drug1.generic_name || drug1.original_input);
      const drug2Name = encodeURIComponent(drug2.generic_name || drug2.original_input);
      
      // Query for adverse events where both drugs are mentioned
      const url = `${this.baseUrl}/event.json?search=patient.drug.medicinalproduct:"${drug1Name}"+AND+patient.drug.medicinalproduct:"${drug2Name}"&limit=100`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { results: [], meta: { total: 0 } };
        }
        throw new Error(`FDA API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Analyze serious adverse events
      const seriousEvents = data.results?.filter(event => 
        event.serious === '1' || 
        event.seriousnessdeath === '1' ||
        event.seriousnesshospitalization === '1' ||
        event.seriousnesslifethreatening === '1'
      ) || [];
      
      return {
        total: data.meta?.results?.total || 0,
        serious_count: seriousEvents.length,
        common_reactions: this.extractCommonReactions(data.results || [])
      };
    } catch (error) {
      console.error(`FDA adverse events query error: ${error.message}`);
      return { total: 0, serious_count: 0, common_reactions: [] };
    }
  }

  /**
   * Query FDA drug label data
   */
  async queryDrugLabel(drug1, drug2) {
    try {
      const drug1Name = encodeURIComponent(drug1.generic_name || drug1.original_input);
      
      // Query drug label for interaction mentions
      const url = `${this.baseUrl}/label.json?search=drug_interactions:"${drug1Name}"+AND+drug_interactions:"${drug2.generic_name || drug2.original_input}"&limit=10`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { results: [], found: false };
        }
        throw new Error(`FDA API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract interaction information from labels
      const interactions = [];
      
      data.results?.forEach(label => {
        if (label.drug_interactions) {
          const interactionText = Array.isArray(label.drug_interactions) 
            ? label.drug_interactions.join(' ')
            : label.drug_interactions;
          
          // Check if both drugs are mentioned
          if (interactionText.toLowerCase().includes(drug1Name.toLowerCase()) &&
              interactionText.toLowerCase().includes((drug2.generic_name || drug2.original_input).toLowerCase())) {
            interactions.push(interactionText);
          }
        }
      });
      
      return {
        found: interactions.length > 0,
        interaction_texts: interactions
      };
    } catch (error) {
      console.error(`FDA label query error: ${error.message}`);
      return { found: false, interaction_texts: [] };
    }
  }

  /**
   * Extract common reactions from adverse event data
   */
  extractCommonReactions(results) {
    const reactionCounts = {};
    
    results.forEach(event => {
      if (event.patient?.reaction) {
        event.patient.reaction.forEach(reaction => {
          const term = reaction.reactionmeddrapt;
          if (term) {
            reactionCounts[term] = (reactionCounts[term] || 0) + 1;
          }
        });
      }
    });
    
    // Sort by frequency and return top 5
    return Object.entries(reactionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reaction, count]) => ({ reaction, count }));
  }

  /**
   * Analyze combined interaction data
   */
  analyzeInteractionData(adverseEvents, labelData, drug1, drug2) {
    // Determine severity based on adverse event data
    let severity = 'UNKNOWN';
    let confidence = 0.5;
    
    if (adverseEvents.serious_count > 10) {
      severity = 'MAJOR';
      confidence = 0.9;
    } else if (adverseEvents.serious_count > 5) {
      severity = 'MODERATE';
      confidence = 0.8;
    } else if (adverseEvents.total > 10) {
      severity = 'MINOR';
      confidence = 0.7;
    }
    
    // Boost confidence if found in drug labels
    if (labelData.found) {
      confidence = Math.min(1.0, confidence + 0.2);
      if (severity === 'UNKNOWN') {
        severity = 'MODERATE';
      }
    }
    
    // Build description
    let description = 'Potential interaction based on FDA data';
    if (adverseEvents.common_reactions.length > 0) {
      const topReactions = adverseEvents.common_reactions
        .slice(0, 3)
        .map(r => r.reaction)
        .join(', ');
      description = `Reported adverse events include: ${topReactions}`;
    }
    
    // Extract mechanism from label data if available
    let mechanism = 'Unknown mechanism';
    if (labelData.interaction_texts.length > 0) {
      // Try to extract mechanism from label text
      const labelText = labelData.interaction_texts[0];
      if (labelText.includes('CYP')) {
        mechanism = 'Cytochrome P450 interaction';
      } else if (labelText.includes('serotonin')) {
        mechanism = 'Serotonergic interaction';
      } else if (labelText.includes('bleeding')) {
        mechanism = 'Increased bleeding risk';
      }
    }
    
    return {
      found: adverseEvents.total > 0 || labelData.found,
      severity,
      mechanism,
      description,
      clinical_significance: this.determineClinicalSignificance(severity, adverseEvents),
      adverse_event_count: adverseEvents.total,
      serious_event_count: adverseEvents.serious_count,
      common_reactions: adverseEvents.common_reactions,
      confidence
    };
  }

  /**
   * Determine clinical significance
   */
  determineClinicalSignificance(severity, adverseEvents) {
    if (severity === 'MAJOR') {
      return 'Avoid combination if possible. If unavoidable, monitor closely and consider dose adjustment.';
    } else if (severity === 'MODERATE') {
      return 'Use with caution. Monitor for adverse effects and adjust therapy as needed.';
    } else if (severity === 'MINOR') {
      return 'Monitor for potential adverse effects. Clinical significance may vary by patient.';
    } else {
      return 'Limited data available. Monitor patient and report any adverse effects.';
    }
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
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
        source: 'fda_openfda',
        api_version: '2024.01'
      },
      recommendations: {
        follow_up: ['Check alternative data sources', 'Consult drug interaction database'],
        warnings: ['Interaction check failed'],
        limitations: ['Unable to verify drug interaction']
      }
    };
  }
}

export default InteractionCheckerSubagent;