/**
 * DRUG NORMALIZER SUBAGENT
 * 
 * Pure function subagent that normalizes drug names using RxNorm API.
 * 
 * RESPONSIBILITIES:
 * - Convert brand names to generic names
 * - Find RxCUI (RxNorm Concept Unique Identifier)
 * - Handle common misspellings and variations
 * - Return standardized drug information
 * 
 * PRINCIPLES:
 * - Stateless execution (no memory between calls)
 * - Deterministic output for same input
 * - No conversation context awareness
 * - Returns structured results with metadata
 */

import fetch from 'node-fetch';

/**
 * Drug Normalizer Subagent Class
 * Handles all drug name normalization tasks via RxNorm API
 */
export class DrugNormalizerSubagent {
  constructor() {
    // RxNorm API base URL (FREE, no key required)
    this.baseUrl = 'https://rxnav.nlm.nih.gov/REST';
    
    // Common drug name mappings for faster lookup
    this.commonMappings = {
      'coumadin': 'warfarin',
      'advil': 'ibuprofen',
      'motrin': 'ibuprofen',
      'tylenol': 'acetaminophen',
      'zoloft': 'sertraline',
      'lipitor': 'atorvastatin',
      'prilosec': 'omeprazole',
      'ultram': 'tramadol',
      'baby aspirin': 'aspirin',
      'asa': 'aspirin'
    };
  }

  /**
   * Execute normalization task
   * 
   * @param {Object} task - Task specification from primary agent
   * @param {string} task.task_id - Unique identifier for this task
   * @param {string} task.task_type - Should be "drug_normalization"
   * @param {Object} task.input - Input parameters
   * @param {string} task.input.drug_name - Drug name to normalize
   * @param {Object} task.constraints - Execution constraints
   * @param {number} task.constraints.timeout_ms - Maximum execution time
   * @param {Object} task.output_spec - Expected output format
   * 
   * @returns {Object} Structured response with status, result, metadata
   */
  async execute(task) {
    const startTime = Date.now();
    
    // Validate task structure
    if (task.task_type !== 'drug_normalization') {
      return this.createErrorResponse(
        task.task_id,
        `Invalid task type: ${task.task_type}`,
        startTime
      );
    }
    
    if (!task.input?.drug_name) {
      return this.createErrorResponse(
        task.task_id,
        'Missing required input: drug_name',
        startTime
      );
    }
    
    try {
      // Apply timeout constraint
      const timeoutMs = task.constraints?.timeout_ms || 3000;
      const result = await this.withTimeout(
        this.normalizeDrug(task.input.drug_name),
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
          source: 'rxnorm_api',
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
   * Normalize a drug name using RxNorm API
   * 
   * @param {string} drugName - Raw drug name to normalize
   * @returns {Object} Normalized drug information
   */
  async normalizeDrug(drugName) {
    const cleanName = drugName.trim().toLowerCase();
    const decisions = [];
    const warnings = [];
    const limitations = [];
    
    // Step 1: Check common mappings first (optimization)
    let searchName = cleanName;
    if (this.commonMappings[cleanName]) {
      searchName = this.commonMappings[cleanName];
      decisions.push(`Mapped "${cleanName}" to "${searchName}" using common mappings`);
    }
    
    try {
      // Step 2: Try approximate match for handling typos
      let rxcui = await this.findRxCuiApproximate(searchName);
      
      if (!rxcui) {
        // Step 3: Try exact match
        rxcui = await this.findRxCuiExact(searchName);
        decisions.push(`Used exact match search for "${searchName}"`);
      } else {
        decisions.push(`Found approximate match for "${searchName}"`);
      }
      
      if (!rxcui) {
        // Step 4: Try spell correction
        const corrected = await this.getSpellingSuggestions(searchName);
        if (corrected && corrected.length > 0) {
          rxcui = await this.findRxCuiExact(corrected[0]);
          decisions.push(`Used spelling correction: "${searchName}" → "${corrected[0]}"`);
          warnings.push(`Drug name was spell-corrected from "${searchName}" to "${corrected[0]}"`);
        }
      }
      
      if (!rxcui) {
        throw new Error(`Unable to find RxCUI for drug: ${drugName}`);
      }
      
      // Step 5: Get drug properties
      const properties = await this.getDrugProperties(rxcui);
      
      // Step 6: Get related brand/generic names
      const relatedNames = await this.getRelatedNames(rxcui);
      
      // Build response
      const result = {
        rxcui: rxcui,
        original_input: drugName,
        generic_name: properties.generic_name || searchName,
        brand_names: relatedNames.brand_names || [],
        drug_class: properties.drug_class || 'Unknown',
        active_ingredients: properties.ingredients || [],
        confidence: this.calculateConfidence(decisions, warnings),
        decisions: decisions,
        warnings: warnings,
        limitations: limitations
      };
      
      // Add limitations if any
      if (!properties.generic_name) {
        limitations.push('Generic name not found in RxNorm');
      }
      if (relatedNames.brand_names.length === 0) {
        limitations.push('No brand names found');
      }
      
      return result;
    } catch (error) {
      // Try fallback to basic mapping if API fails
      if (this.commonMappings[cleanName]) {
        warnings.push('RxNorm API unavailable, using cached mapping');
        return {
          rxcui: 'CACHED_' + Date.now(),
          original_input: drugName,
          generic_name: this.commonMappings[cleanName],
          brand_names: [],
          drug_class: 'Unknown',
          active_ingredients: [],
          confidence: 0.7,
          decisions: ['Used cached mapping due to API failure'],
          warnings: ['RxNorm API unavailable'],
          limitations: ['Limited drug information available']
        };
      }
      throw error;
    }
  }

  /**
   * Find RxCUI using approximate match
   */
  async findRxCuiApproximate(drugName) {
    try {
      const url = `${this.baseUrl}/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.approximateGroup?.candidate) {
        const candidate = Array.isArray(data.approximateGroup.candidate) 
          ? data.approximateGroup.candidate[0]
          : data.approximateGroup.candidate;
        return candidate.rxcui;
      }
      return null;
    } catch (error) {
      console.error(`RxNorm approximate match error: ${error.message}`);
      return null;
    }
  }

  /**
   * Find RxCUI using exact match
   */
  async findRxCuiExact(drugName) {
    try {
      const url = `${this.baseUrl}/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.idGroup?.rxnormId) {
        return Array.isArray(data.idGroup.rxnormId) 
          ? data.idGroup.rxnormId[0]
          : data.idGroup.rxnormId;
      }
      return null;
    } catch (error) {
      console.error(`RxNorm exact match error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get spelling suggestions for drug name
   */
  async getSpellingSuggestions(drugName) {
    try {
      const url = `${this.baseUrl}/spellingsuggestions.json?name=${encodeURIComponent(drugName)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.suggestionGroup?.suggestionList?.suggestion) {
        const suggestions = data.suggestionGroup.suggestionList.suggestion;
        return Array.isArray(suggestions) ? suggestions : [suggestions];
      }
      return [];
    } catch (error) {
      console.error(`RxNorm spelling suggestions error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get drug properties from RxCUI
   */
  async getDrugProperties(rxcui) {
    try {
      const url = `${this.baseUrl}/rxcui/${rxcui}/properties.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      const properties = data.properties || {};
      
      // Get additional allinfo for more details
      const allinfoUrl = `${this.baseUrl}/rxcui/${rxcui}/allinfo.json`;
      const allinfoResponse = await fetch(allinfoUrl);
      const allinfoData = await allinfoResponse.json();
      
      return {
        generic_name: properties.name,
        drug_class: allinfoData.rxcuiStatusHistory?.attributes?.drugClass || null,
        ingredients: this.extractIngredients(allinfoData),
        tty: properties.tty // Term Type (e.g., 'SCD' for Semantic Clinical Drug)
      };
    } catch (error) {
      console.error(`RxNorm properties error: ${error.message}`);
      return {};
    }
  }

  /**
   * Get related brand and generic names
   */
  async getRelatedNames(rxcui) {
    try {
      const url = `${this.baseUrl}/rxcui/${rxcui}/related.json?tty=BN+IN`;
      const response = await fetch(url);
      const data = await response.json();
      
      const brandNames = [];
      const genericNames = [];
      
      if (data.relatedGroup?.conceptGroup) {
        data.relatedGroup.conceptGroup.forEach(group => {
          if (group.conceptProperties) {
            group.conceptProperties.forEach(prop => {
              if (group.tty === 'BN') {
                brandNames.push(prop.name);
              } else if (group.tty === 'IN') {
                genericNames.push(prop.name);
              }
            });
          }
        });
      }
      
      return {
        brand_names: [...new Set(brandNames)],
        generic_names: [...new Set(genericNames)]
      };
    } catch (error) {
      console.error(`RxNorm related names error: ${error.message}`);
      return { brand_names: [], generic_names: [] };
    }
  }

  /**
   * Extract ingredients from drug data
   */
  extractIngredients(allinfoData) {
    const ingredients = [];
    
    if (allinfoData.allRelatedGroup?.conceptGroup) {
      allinfoData.allRelatedGroup.conceptGroup.forEach(group => {
        if (group.tty === 'IN' && group.conceptProperties) {
          group.conceptProperties.forEach(prop => {
            ingredients.push(prop.name);
          });
        }
      });
    }
    
    return [...new Set(ingredients)];
  }

  /**
   * Calculate confidence score based on processing decisions
   */
  calculateConfidence(decisions, warnings) {
    let confidence = 1.0;
    
    // Reduce confidence for each decision/warning
    if (decisions.some(d => d.includes('approximate'))) confidence -= 0.1;
    if (decisions.some(d => d.includes('spell-corrected'))) confidence -= 0.2;
    if (warnings.length > 0) confidence -= 0.1 * warnings.length;
    
    return Math.max(0.3, confidence);
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
        source: 'rxnorm_api',
        api_version: '2024.01'
      },
      recommendations: {
        follow_up: ['Verify drug name spelling', 'Try alternative drug name'],
        warnings: ['Drug normalization failed'],
        limitations: ['Unable to process this drug name']
      }
    };
  }
}

export default DrugNormalizerSubagent;