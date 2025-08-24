/**
 * NIH DailyMed Service
 * 
 * Provides access to official FDA drug labeling information
 * - No authentication required
 * - No rate limits (reasonable use expected)
 * - Authoritative prescribing information
 * - Structured Product Labeling (SPL) documents
 */

const fetch = require('node-fetch');

class DailyMedService {
    constructor() {
        this.baseUrl = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Search for drug information by name
     */
    async searchDrugByName(drugName, limit = 10) {
        try {
            const cacheKey = `search_${drugName.toLowerCase()}_${limit}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { success: true, data: cached, from_cache: true };
            }

            const encodedName = encodeURIComponent(drugName);
            const url = `${this.baseUrl}/spls.json?drug_name=${encodedName}&limit=${limit}`;
            
            console.log(`🏛️ DailyMed API Request: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`DailyMed API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this.addToCache(cacheKey, data);
            
            return {
                success: true,
                data: data,
                from_cache: false,
                source: 'NIH DailyMed'
            };
            
        } catch (error) {
            console.error('DailyMed search error:', error);
            return {
                success: false,
                error: error.message,
                source: 'NIH DailyMed'
            };
        }
    }

    /**
     * Get detailed drug information by SPL ID
     */
    async getDrugDetails(splId) {
        try {
            const cacheKey = `details_${splId}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { success: true, data: cached, from_cache: true };
            }

            const url = `${this.baseUrl}/spls/${splId}.json`;
            
            console.log(`🏛️ DailyMed Details Request: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`DailyMed details error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this.addToCache(cacheKey, data);
            
            return {
                success: true,
                data: data,
                from_cache: false,
                source: 'NIH DailyMed'
            };
            
        } catch (error) {
            console.error('DailyMed details error:', error);
            return {
                success: false,
                error: error.message,
                source: 'NIH DailyMed'
            };
        }
    }

    /**
     * Search by active ingredient
     */
    async searchByIngredient(ingredientName, limit = 10) {
        try {
            const cacheKey = `ingredient_${ingredientName.toLowerCase()}_${limit}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { success: true, data: cached, from_cache: true };
            }

            const encodedName = encodeURIComponent(ingredientName);
            const url = `${this.baseUrl}/spls.json?ingredient_name=${encodedName}&limit=${limit}`;
            
            console.log(`🏛️ DailyMed Ingredient Request: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`DailyMed ingredient search error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this.addToCache(cacheKey, data);
            
            return {
                success: true,
                data: data,
                from_cache: false,
                source: 'NIH DailyMed'
            };
            
        } catch (error) {
            console.error('DailyMed ingredient search error:', error);
            return {
                success: false,
                error: error.message,
                source: 'NIH DailyMed'
            };
        }
    }

    /**
     * Extract comprehensive drug information from DailyMed data
     */
    extractDrugInfo(splData) {
        if (!splData || !splData.data) {
            return null;
        }

        const drug = splData.data[0]; // First result
        if (!drug) return null;

        return {
            spl_id: drug.spl_id,
            title: drug.title,
            generic_name: drug.generic_name,
            brand_names: drug.brand_name ? [drug.brand_name] : [],
            manufacturer: drug.labeler,
            dosage_forms: drug.dosage_form || [],
            routes: drug.route || [],
            
            // Key sections from labeling
            indications: drug.indications_and_usage || null,
            dosage_administration: drug.dosage_and_administration || null,
            contraindications: drug.contraindications || null,
            warnings_precautions: drug.warnings_and_precautions || null,
            adverse_reactions: drug.adverse_reactions || null,
            drug_interactions: drug.drug_interactions || null,
            
            // Special populations
            pregnancy: drug.use_in_specific_populations?.pregnancy || null,
            lactation: drug.use_in_specific_populations?.lactation || null,
            pediatric: drug.use_in_specific_populations?.pediatric_use || null,
            geriatric: drug.use_in_specific_populations?.geriatric_use || null,
            
            // Overdosage and clinical pharmacology
            overdosage: drug.overdosage || null,
            clinical_pharmacology: drug.clinical_pharmacology || null,
            
            last_updated: drug.effective_time,
            source: 'NIH DailyMed'
        };
    }

    /**
     * Get comprehensive drug profile combining all available info
     * Simplified version using search results only since details endpoint is not accessible
     */
    async getComprehensiveDrugProfile(drugName) {
        try {
            // Search for the drug
            const searchResult = await this.searchDrugByName(drugName, 10);
            
            if (!searchResult.success || !searchResult.data.data || searchResult.data.data.length === 0) {
                return {
                    success: false,
                    error: 'Drug not found in DailyMed',
                    source: 'NIH DailyMed'
                };
            }

            // Get the best match and create simplified profile
            const bestMatch = searchResult.data.data[0];
            console.log(`🔍 DailyMed found: ${bestMatch.title}`);
            
            const drugInfo = this.createSimplifiedDrugProfile(bestMatch, searchResult.data.data);
            
            return {
                success: true,
                drug_profile: drugInfo,
                alternative_matches: searchResult.data.data.slice(1).map(drug => ({
                    spl_id: drug.setid || drug.spl_id,
                    title: drug.title,
                    manufacturer: drug.labeler,
                    published_date: drug.published_date,
                    spl_version: drug.spl_version
                })),
                total_results: searchResult.data.metadata?.total_elements || searchResult.data.data.length,
                source: 'NIH DailyMed',
                from_cache: searchResult.from_cache || false
            };
            
        } catch (error) {
            console.error('Comprehensive drug profile error:', error);
            return {
                success: false,
                error: error.message,
                source: 'NIH DailyMed'
            };
        }
    }

    /**
     * Create simplified drug profile from search results
     */
    createSimplifiedDrugProfile(primaryMatch, allMatches) {
        // Extract generic name from title (usually in brackets or after dash)
        const titleLower = primaryMatch.title.toLowerCase();
        let genericName = null;
        
        // Try to extract generic from patterns like "WARFARIN SODIUM TABLET [BRAND]"
        const genericMatch = primaryMatch.title.match(/^([A-Z][A-Z\s]+?)(?:\s+(?:TABLET|CAPSULE|CREAM|OINTMENT|INJECTION|SOLUTION))?\s+\[/);
        if (genericMatch) {
            genericName = genericMatch[1].trim();
        }
        
        // Get all manufacturers from the results
        const manufacturers = [...new Set(allMatches.map(m => m.labeler).filter(Boolean))];
        
        // Get all dosage forms mentioned in titles
        const dosageForms = [...new Set(
            allMatches.map(m => {
                const match = m.title.match(/(?:TABLET|CAPSULE|CREAM|OINTMENT|INJECTION|SOLUTION|PATCH|LIQUID)/);
                return match ? match[0] : null;
            }).filter(Boolean)
        )];

        // Clinical decision support based on available data
        const clinicalInsights = this.generateClinicalInsights(genericName, dosageForms, allMatches);

        return {
            spl_id: primaryMatch.setid || primaryMatch.spl_id,
            title: primaryMatch.title,
            generic_name: genericName,
            brand_names: [], // Would need more detailed parsing or additional API calls
            manufacturers: manufacturers,
            dosage_forms: dosageForms,
            
            // Available information from search results
            latest_version: primaryMatch.spl_version,
            published_date: primaryMatch.published_date,
            total_formulations: allMatches.length,
            
            // Enhanced clinical decision support
            clinical_insights: clinicalInsights,
            regulatory_status: this.assessRegulatoryStatus(primaryMatch, allMatches),
            formulation_guidance: this.generateFormulationGuidance(dosageForms),
            
            last_updated: primaryMatch.published_date,
            source: 'NIH DailyMed (Enhanced Clinical Analysis)',
            note: 'Clinical insights generated from FDA-approved formulation data. Full prescribing information available at dailymed.nlm.nih.gov'
        };
    }

    generateClinicalInsights(genericName, dosageForms, allMatches) {
        const insights = [];
        
        if (!genericName) return insights;
        
        const drugLower = genericName.toLowerCase();
        
        // High-risk medication identification
        const highRiskDrugs = [
            'warfarin', 'heparin', 'insulin', 'morphine', 'fentanyl', 'digoxin', 
            'phenytoin', 'carbamazepine', 'lithium', 'theophylline'
        ];
        
        if (highRiskDrugs.some(drug => drugLower.includes(drug))) {
            insights.push({
                type: 'high_risk',
                severity: 'warning',
                message: 'High-risk medication requiring careful monitoring and dosage adjustment'
            });
        }
        
        // Controlled substance patterns
        const controlledSubstances = [
            'morphine', 'oxycodone', 'fentanyl', 'hydrocodone', 'tramadol',
            'lorazepam', 'alprazolam', 'diazepam', 'clonazepam'
        ];
        
        if (controlledSubstances.some(drug => drugLower.includes(drug))) {
            insights.push({
                type: 'controlled_substance',
                severity: 'warning',
                message: 'Controlled substance - verify proper prescribing authority and patient monitoring'
            });
        }
        
        // Multiple formulation analysis
        if (allMatches.length > 20) {
            insights.push({
                type: 'multiple_formulations',
                severity: 'info',
                message: `${allMatches.length} FDA-approved formulations available - verify correct strength and manufacturer`
            });
        }
        
        // Dosage form specific guidance
        if (dosageForms.includes('INJECTION')) {
            insights.push({
                type: 'injection_safety',
                severity: 'caution',
                message: 'Injectable medication - verify proper administration route and dilution requirements'
            });
        }
        
        return insights;
    }

    assessRegulatoryStatus(primaryMatch, allMatches) {
        const recentUpdates = allMatches.filter(match => {
            const publishDate = new Date(match.published_date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return publishDate > sixMonthsAgo;
        });
        
        return {
            recent_updates: recentUpdates.length,
            latest_update: primaryMatch.published_date,
            active_formulations: allMatches.length,
            regulatory_activity: recentUpdates.length > 5 ? 'high' : recentUpdates.length > 2 ? 'moderate' : 'low'
        };
    }

    generateFormulationGuidance(dosageForms) {
        const guidance = [];
        
        if (dosageForms.includes('TABLET') && dosageForms.includes('CAPSULE')) {
            guidance.push('Multiple solid dosage forms available - consider patient swallowing ability');
        }
        
        if (dosageForms.includes('INJECTION')) {
            guidance.push('Injectable form requires proper handling and administration training');
        }
        
        if (dosageForms.includes('PATCH')) {
            guidance.push('Transdermal system - consider patient skin integrity and adherence');
        }
        
        return guidance;
    }

    // Cache management methods
    addToCache(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

module.exports = DailyMedService;