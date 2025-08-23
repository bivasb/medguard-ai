/**
 * RxNorm API Service
 * 
 * Provides drug normalization and lookup functionality using NLM's RxNorm API
 * No authentication required - public API from National Library of Medicine
 */

const fetch = require('node-fetch');

class RxNormService {
    constructor() {
        this.baseUrl = 'https://rxnav.nlm.nih.gov/REST';
        
        // Rate limiting to be respectful to NLM's free API
        this.requestQueue = [];
        this.isProcessing = false;
        this.minRequestInterval = 100; // 100ms between requests
    }

    /**
     * Rate-limited request wrapper
     */
    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const { url, resolve, reject } = this.requestQueue.shift();

            try {
                console.log(`🔍 RxNorm API Request: ${url}`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`RxNorm API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                resolve(data);

                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, this.minRequestInterval));

            } catch (error) {
                console.error(`❌ RxNorm API error for ${url}:`, error);
                reject(error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Find RxCUI (concept identifier) by drug name
     * Uses exact and approximate matching
     */
    async findDrugByConcept(drugName) {
        try {
            const sanitizedName = drugName.trim().toLowerCase();
            
            // Try exact match first
            const exactUrl = `${this.baseUrl}/rxcui.json?name=${encodeURIComponent(sanitizedName)}`;
            const exactResult = await this.makeRequest(exactUrl);

            if (exactResult?.idGroup?.rxnormId && exactResult.idGroup.rxnormId.length > 0) {
                return {
                    success: true,
                    source: 'exact_match',
                    rxcui: exactResult.idGroup.rxnormId[0],
                    originalName: drugName,
                    normalizedName: sanitizedName
                };
            }

            // Try approximate match if exact fails
            const approxUrl = `${this.baseUrl}/approximateTerm.json?term=${encodeURIComponent(sanitizedName)}`;
            const approxResult = await this.makeRequest(approxUrl);

            if (approxResult?.approximateGroup?.candidate && approxResult.approximateGroup.candidate.length > 0) {
                const bestMatch = approxResult.approximateGroup.candidate[0];
                return {
                    success: true,
                    source: 'approximate_match',
                    rxcui: bestMatch.rxcui,
                    originalName: drugName,
                    normalizedName: bestMatch.name,
                    score: bestMatch.score
                };
            }

            // Try spelling suggestions as last resort
            const suggestionUrl = `${this.baseUrl}/spellingsuggestions.json?name=${encodeURIComponent(sanitizedName)}`;
            const suggestionResult = await this.makeRequest(suggestionUrl);

            if (suggestionResult?.suggestionGroup?.suggestionList?.suggestion && suggestionResult.suggestionGroup.suggestionList.suggestion.length > 0) {
                const suggestion = suggestionResult.suggestionGroup.suggestionList.suggestion[0];
                
                // Try to find RxCUI for the suggested spelling
                const suggestedUrl = `${this.baseUrl}/rxcui.json?name=${encodeURIComponent(suggestion)}`;
                const suggestedResult = await this.makeRequest(suggestedUrl);

                if (suggestedResult?.idGroup?.rxnormId && suggestedResult.idGroup.rxnormId.length > 0) {
                    return {
                        success: true,
                        source: 'spelling_suggestion',
                        rxcui: suggestedResult.idGroup.rxnormId[0],
                        originalName: drugName,
                        normalizedName: suggestion,
                        suggested: true
                    };
                }
            }

            return {
                success: false,
                error: 'Drug not found in RxNorm database',
                originalName: drugName
            };

        } catch (error) {
            console.error(`❌ Error finding drug "${drugName}":`, error);
            return {
                success: false,
                error: error.message,
                originalName: drugName
            };
        }
    }

    /**
     * Get detailed drug information by RxCUI
     */
    async getDrugProperties(rxcui) {
        try {
            const url = `${this.baseUrl}/rxcui/${rxcui}/properties.json`;
            const result = await this.makeRequest(url);

            if (result?.properties) {
                return {
                    success: true,
                    rxcui: rxcui,
                    name: result.properties.name,
                    synonym: result.properties.synonym,
                    tty: result.properties.tty, // Term type (e.g., SCD, IN, PIN)
                    language: result.properties.language,
                    suppress: result.properties.suppress,
                    umlscui: result.properties.umlscui
                };
            }

            return {
                success: false,
                error: 'Properties not found',
                rxcui: rxcui
            };

        } catch (error) {
            console.error(`❌ Error getting properties for RxCUI ${rxcui}:`, error);
            return {
                success: false,
                error: error.message,
                rxcui: rxcui
            };
        }
    }

    /**
     * Get all related drug information (ingredients, brand names, etc.)
     */
    async getDrugRelations(rxcui) {
        try {
            const url = `${this.baseUrl}/rxcui/${rxcui}/related.json`;
            const result = await this.makeRequest(url);

            if (result?.relatedGroup) {
                const relations = {};
                
                // Parse different relationship types
                if (result.relatedGroup.conceptGroup) {
                    result.relatedGroup.conceptGroup.forEach(group => {
                        if (group.tty && group.conceptProperties) {
                            relations[group.tty] = group.conceptProperties.map(concept => ({
                                rxcui: concept.rxcui,
                                name: concept.name,
                                synonym: concept.synonym,
                                tty: concept.tty,
                                language: concept.language,
                                suppress: concept.suppress,
                                umlscui: concept.umlscui
                            }));
                        }
                    });
                }

                return {
                    success: true,
                    rxcui: rxcui,
                    relations: relations
                };
            }

            return {
                success: false,
                error: 'Relations not found',
                rxcui: rxcui
            };

        } catch (error) {
            console.error(`❌ Error getting relations for RxCUI ${rxcui}:`, error);
            return {
                success: false,
                error: error.message,
                rxcui: rxcui
            };
        }
    }

    /**
     * Normalize a drug name using RxNorm's standard terminology
     */
    async normalizeDrugName(drugName) {
        try {
            console.log(`📋 Normalizing drug name: "${drugName}"`);

            // Step 1: Find RxCUI
            const conceptResult = await this.findDrugByConcept(drugName);
            if (!conceptResult.success) {
                return {
                    success: false,
                    originalName: drugName,
                    error: conceptResult.error
                };
            }

            // Step 2: Get detailed properties
            const propertiesResult = await this.getDrugProperties(conceptResult.rxcui);
            
            // Step 3: Get related concepts (ingredients, brand names)
            const relationsResult = await this.getDrugRelations(conceptResult.rxcui);

            const normalized = {
                success: true,
                originalName: drugName,
                rxcui: conceptResult.rxcui,
                normalizedName: conceptResult.normalizedName,
                source: conceptResult.source,
                properties: propertiesResult.success ? propertiesResult : null,
                relations: relationsResult.success ? relationsResult.relations : {}
            };

            // Extract common drug information
            if (normalized.relations.IN) {
                // Active ingredients
                normalized.activeIngredients = normalized.relations.IN.map(ingredient => ({
                    rxcui: ingredient.rxcui,
                    name: ingredient.name
                }));
            }

            if (normalized.relations.BN) {
                // Brand names
                normalized.brandNames = normalized.relations.BN.map(brand => ({
                    rxcui: brand.rxcui,
                    name: brand.name
                }));
            }

            if (normalized.relations.SCD) {
                // Specific clinical drugs (branded)
                normalized.clinicalDrugs = normalized.relations.SCD.map(drug => ({
                    rxcui: drug.rxcui,
                    name: drug.name
                }));
            }

            console.log(`✅ Normalized "${drugName}" → "${normalized.normalizedName}" (RxCUI: ${normalized.rxcui})`);

            return normalized;

        } catch (error) {
            console.error(`❌ Error normalizing drug "${drugName}":`, error);
            return {
                success: false,
                originalName: drugName,
                error: error.message
            };
        }
    }

    /**
     * Batch normalize multiple drug names
     */
    async normalizeDrugList(drugNames) {
        console.log(`📋 Batch normalizing ${drugNames.length} drugs...`);

        const results = [];
        const errors = [];

        for (const drugName of drugNames) {
            try {
                const result = await this.normalizeDrugName(drugName);
                
                if (result.success) {
                    results.push(result);
                } else {
                    errors.push({
                        drug: drugName,
                        error: result.error
                    });
                }
            } catch (error) {
                errors.push({
                    drug: drugName,
                    error: error.message
                });
            }
        }

        console.log(`✅ Batch normalization complete: ${results.length} success, ${errors.length} errors`);

        return {
            success: errors.length < drugNames.length,
            totalRequested: drugNames.length,
            normalized: results,
            errors: errors
        };
    }

    /**
     * Get interaction status between two RxCUIs
     * Note: RxNorm doesn't provide direct interaction data
     * This method provides the normalized data for external interaction checking
     */
    async prepareInteractionData(drugNames) {
        const normalized = await this.normalizeDrugList(drugNames);
        
        // Return data in format suitable for interaction checking services
        return {
            success: normalized.success,
            drugs: normalized.normalized.map(drug => ({
                originalName: drug.originalName,
                normalizedName: drug.normalizedName,
                rxcui: drug.rxcui,
                activeIngredients: drug.activeIngredients || [],
                brandNames: drug.brandNames || [],
                source: drug.source
            })),
            errors: normalized.errors
        };
    }
}

module.exports = RxNormService;