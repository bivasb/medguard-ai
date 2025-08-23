/**
 * MCP HTTP Server - Simplified version focusing on HTTP endpoints
 * Provides FDA and RxNorm API access through a clean HTTP interface
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const RxNormService = require('../../backend/services/rxnorm-service.js');
const OpenFDAService = require('../../backend/services/openfda-service.js');
const MedGuardLogger = require('../../logger/logging-client.js');

class MCPHttpServer {
    constructor() {
        this.app = express();
        this.port = process.env.MCP_PORT || 3001;
        
        // Initialize services
        this.rxNormService = new RxNormService();
        this.openFDAService = new OpenFDAService();
        this.logger = new MedGuardLogger('mcp', null);
        
        // Cache configuration
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        // Rate limiting
        this.rateLimits = {
            rxnorm: { requests: 100, window: 60000 }, // 100 req/min
            fda: { requests: 240, window: 60000 },    // 240 req/min
        };
        this.requestHistory = {
            rxnorm: [],
            fda: []
        };
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        
        // Request logging middleware
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] MCP: ${req.method} ${req.url}`);
            
            // Log to monitoring server
            this.logger.logDataFlow({
                action: 'http_request',
                path: req.url,
                method: req.method,
                payload: req.method === 'POST' ? { bodyKeys: Object.keys(req.body) } : null
            });
            
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'mcp-http-server',
                port: this.port,
                cache_size: this.cache.size,
                uptime: process.uptime()
            });
        });

        // Main drug interaction checking endpoint
        this.app.post('/api/check-interaction', async (req, res) => {
            try {
                const { drugs, patient_id } = req.body;
                
                if (!drugs || drugs.length < 2) {
                    return res.status(400).json({ 
                        error: 'At least two drugs are required' 
                    });
                }

                console.log(`Checking interaction between: ${drugs.join(', ')}`);
                
                // Log the API call attempt
                this.logger.logDataFlow({
                    action: 'interaction_check_start',
                    path: '/api/check-interaction',
                    method: 'POST',
                    payload: { drugs, patient_id }
                });

                // Check cache first
                const cacheKey = `interaction:${drugs.sort().join('_')}`;
                const cached = this.getFromCache(cacheKey);
                
                if (cached) {
                    console.log('Returning cached result');
                    this.logger.logApiCall({
                        service: 'cache',
                        endpoint: 'interaction',
                        success: true,
                        cached: true
                    });
                    
                    return res.json({
                        ...cached,
                        from_cache: true,
                        processing_time_ms: 10
                    });
                }

                // Use FDA OpenFDA service to check interactions
                const result = await this.checkFDAInteraction(drugs[0], drugs[1]);
                
                // Add to cache
                this.addToCache(cacheKey, result);
                
                // Log successful FDA API usage
                this.logger.logApiCall({
                    service: 'openfda',
                    endpoint: '/drug/event.json',
                    success: true,
                    fallback: false
                });
                
                res.json({
                    ...result,
                    processing_time_ms: Date.now() - Date.now()
                });
                
            } catch (error) {
                console.error('Interaction check error:', error);
                
                // Log API failure
                this.logger.logApiCall({
                    service: 'openfda',
                    endpoint: '/drug/event.json',
                    success: false,
                    error: error.message,
                    fallback: true
                });
                
                res.status(500).json({ 
                    error: 'Failed to check drug interaction',
                    message: error.message 
                });
            }
        });

        // Normalize drug endpoint
        this.app.post('/api/normalize', async (req, res) => {
            try {
                const { drug_name } = req.body;
                
                if (!drug_name) {
                    return res.status(400).json({ error: 'Drug name is required' });
                }

                console.log(`Normalizing drug: ${drug_name}`);
                
                // Check cache
                const cacheKey = `drug:${drug_name.toLowerCase()}`;
                const cached = this.getFromCache(cacheKey);
                
                if (cached) {
                    return res.json({
                        ...cached,
                        from_cache: true
                    });
                }

                // Use RxNorm service
                const result = await this.rxNormService.normalizeDrugName(drug_name);
                
                if (!result.success) {
                    throw new Error(result.error || 'Drug not found');
                }

                const normalizedResult = {
                    success: true,
                    original_input: drug_name,
                    rxcui: result.rxcui,
                    matched_name: result.normalizedName,
                    match_type: result.source,
                    generic_name: result.normalizedName,
                    brand_names: result.brandNames?.map(b => b.name) || [],
                    confidence: result.confidence || 1.0
                };

                // Cache the result
                this.addToCache(cacheKey, normalizedResult);

                res.json(normalizedResult);
                
            } catch (error) {
                console.error('Normalization error:', error);
                res.status(500).json({ 
                    error: 'Failed to normalize drug name',
                    message: error.message 
                });
            }
        });

        // Get drug safety profile
        this.app.post('/api/safety-profile', async (req, res) => {
            try {
                const { drug_name } = req.body;
                
                if (!drug_name) {
                    return res.status(400).json({ error: 'Drug name is required' });
                }

                const profile = await this.openFDAService.getDrugSafetyProfile(drug_name);
                res.json(profile);
                
            } catch (error) {
                console.error('Safety profile error:', error);
                res.status(500).json({ 
                    error: 'Failed to get safety profile',
                    message: error.message 
                });
            }
        });

        // Dosage validation endpoint
        this.app.post('/api/validate-dosage', async (req, res) => {
            try {
                const { drug_name, dosage, frequency, patient_id } = req.body;
                
                if (!drug_name || !dosage) {
                    return res.status(400).json({ 
                        error: 'Drug name and dosage are required' 
                    });
                }

                console.log(`Validating dosage for: ${drug_name} - ${dosage} ${frequency || ''}`);
                
                // Log the dosage validation request
                this.logger.logDataFlow({
                    action: 'dosage_validation_start',
                    path: '/api/validate-dosage',
                    method: 'POST',
                    payload: { drug_name, dosage, frequency, patient_id }
                });

                // First normalize the drug name using RxNorm
                const normalization = await this.rxNormService.normalizeDrugName(drug_name);
                
                // Get FDA drug labeling for dosage information
                const labeling = await this.openFDAService.searchDrugLabeling(drug_name);
                
                // Get safety profile to assess risk
                const safetyProfile = await this.openFDAService.getDrugSafetyProfile(drug_name);
                
                // Extract dosage information from FDA labeling
                const dosageInfo = this.extractDosageInfo(labeling);
                
                // Validate the dosage
                const validation = this.validateDosageAgainstFDA(dosage, frequency, dosageInfo, safetyProfile);
                
                // Log successful FDA data usage
                this.logger.logApiCall({
                    service: 'fda-dosage',
                    endpoint: '/drug/label.json',
                    success: true,
                    fallback: false
                });
                
                const result = {
                    success: true,
                    drug_info: {
                        original_name: drug_name,
                        normalized_name: normalization.success ? normalization.normalizedName : drug_name,
                        rxcui: normalization.rxcui || null
                    },
                    dosage_validation: validation,
                    fda_dosage_info: dosageInfo,
                    safety_considerations: {
                        risk_score: this.calculateDrugRisk(safetyProfile),
                        has_black_box_warning: safetyProfile.profile?.has_black_box_warning || false,
                        special_populations: dosageInfo.special_populations || []
                    },
                    data_sources: {
                        rxnorm: normalization.success,
                        fda_labeling: labeling.success,
                        safety_profile: safetyProfile.success
                    },
                    timestamp: new Date().toISOString()
                };
                
                res.json(result);
                
            } catch (error) {
                console.error('Dosage validation error:', error);
                
                // Log API failure
                this.logger.logApiCall({
                    service: 'fda-dosage',
                    endpoint: '/drug/label.json',
                    success: false,
                    error: error.message,
                    fallback: true
                });
                
                res.status(500).json({ 
                    error: 'Failed to validate dosage',
                    message: error.message 
                });
            }
        });

        // Cache stats endpoint
        this.app.get('/api/cache-stats', (req, res) => {
            res.json({
                total_entries: this.cache.size,
                drugs: this.getCacheStats('drug'),
                interactions: this.getCacheStats('interaction')
            });
        });
    }

    extractDosageInfo(labeling) {
        const dosageInfo = {
            recommended_dosages: [],
            max_daily_dose: null,
            min_daily_dose: null,
            special_populations: [],
            warnings: [],
            administration_routes: []
        };

        if (labeling.success && labeling.data?.results) {
            labeling.data.results.forEach(result => {
                // Extract dosage and administration information
                if (result.dosage_and_administration) {
                    const dosageText = Array.isArray(result.dosage_and_administration) 
                        ? result.dosage_and_administration.join(' ') 
                        : result.dosage_and_administration;
                    
                    // Parse for common dosage patterns
                    const doseMatches = dosageText.match(/\d+\.?\d*\s*(mg|g|mcg|ml|units?)/gi);
                    if (doseMatches) {
                        dosageInfo.recommended_dosages.push(...doseMatches);
                    }
                    
                    // Look for max dose
                    const maxMatch = dosageText.match(/maximum.*?(\d+\.?\d*\s*(mg|g|mcg|ml|units?))/i);
                    if (maxMatch) {
                        dosageInfo.max_daily_dose = maxMatch[1];
                    }
                }
                
                // Extract special population considerations
                if (result.geriatric_use) {
                    dosageInfo.special_populations.push({
                        population: 'Geriatric',
                        consideration: 'See FDA labeling for geriatric dosing'
                    });
                }
                
                if (result.pediatric_use) {
                    dosageInfo.special_populations.push({
                        population: 'Pediatric',
                        consideration: 'See FDA labeling for pediatric dosing'
                    });
                }
                
                if (result.pregnancy) {
                    dosageInfo.special_populations.push({
                        population: 'Pregnancy',
                        consideration: 'See FDA labeling for pregnancy considerations'
                    });
                }
                
                // Extract warnings related to dosage
                if (result.warnings && Array.isArray(result.warnings)) {
                    dosageInfo.warnings.push(...result.warnings.filter(w => 
                        w.toLowerCase().includes('dose') || 
                        w.toLowerCase().includes('dosage') ||
                        w.toLowerCase().includes('overdose')
                    ).slice(0, 3));
                }
            });
        }
        
        // Remove duplicates
        dosageInfo.recommended_dosages = [...new Set(dosageInfo.recommended_dosages)];
        dosageInfo.warnings = [...new Set(dosageInfo.warnings)];
        
        return dosageInfo;
    }

    validateDosageAgainstFDA(dosage, frequency, fdaDosageInfo, safetyProfile) {
        const validation = {
            is_valid: true,
            risk_level: 'SAFE',
            warnings: [],
            recommendations: []
        };

        // Parse the input dosage
        const dosageMatch = dosage.match(/(\d+\.?\d*)\s*(mg|g|mcg|ml|units?)/i);
        if (!dosageMatch) {
            validation.warnings.push('Unable to parse dosage format');
            validation.recommendations.push('Please specify dosage with units (e.g., 10mg, 5ml)');
            validation.is_valid = false;
            return validation;
        }

        const dosageValue = parseFloat(dosageMatch[1]);
        const dosageUnit = dosageMatch[2].toLowerCase();

        // Check against max daily dose if available
        if (fdaDosageInfo.max_daily_dose) {
            const maxMatch = fdaDosageInfo.max_daily_dose.match(/(\d+\.?\d*)\s*(mg|g|mcg|ml|units?)/i);
            if (maxMatch && maxMatch[2].toLowerCase() === dosageUnit) {
                const maxValue = parseFloat(maxMatch[1]);
                
                // Calculate daily dose based on frequency
                let dailyDose = dosageValue;
                if (frequency) {
                    const freqLower = frequency.toLowerCase();
                    if (freqLower.includes('twice') || freqLower.includes('bid')) {
                        dailyDose = dosageValue * 2;
                    } else if (freqLower.includes('three') || freqLower.includes('tid')) {
                        dailyDose = dosageValue * 3;
                    } else if (freqLower.includes('four') || freqLower.includes('qid')) {
                        dailyDose = dosageValue * 4;
                    }
                }
                
                if (dailyDose > maxValue) {
                    validation.is_valid = false;
                    validation.risk_level = 'DANGER';
                    validation.warnings.push(`Exceeds maximum daily dose of ${fdaDosageInfo.max_daily_dose}`);
                    validation.recommendations.push('Reduce dosage or consult prescriber');
                } else if (dailyDose > maxValue * 0.8) {
                    validation.risk_level = 'WARNING';
                    validation.warnings.push(`Approaching maximum daily dose of ${fdaDosageInfo.max_daily_dose}`);
                    validation.recommendations.push('Monitor closely for adverse effects');
                }
            }
        }

        // Add FDA warnings if any
        if (fdaDosageInfo.warnings.length > 0) {
            validation.warnings.push(...fdaDosageInfo.warnings);
        }

        // Consider safety profile
        const riskScore = this.calculateDrugRisk(safetyProfile);
        if (riskScore > 0.7) {
            validation.warnings.push('High-risk medication - extra caution advised');
            validation.recommendations.push('Consider starting with lower dose');
            if (validation.risk_level === 'SAFE') {
                validation.risk_level = 'WARNING';
            }
        }

        // Add recommendations based on FDA data
        if (fdaDosageInfo.recommended_dosages.length > 0) {
            validation.recommendations.push(`FDA recommended dosages include: ${fdaDosageInfo.recommended_dosages.slice(0, 3).join(', ')}`);
        }

        return validation;
    }

    async checkFDAInteraction(drug1Name, drug2Name) {
        try {
            // Get safety profiles for both drugs
            const [profile1, profile2] = await Promise.all([
                this.openFDAService.getDrugSafetyProfile(drug1Name),
                this.openFDAService.getDrugSafetyProfile(drug2Name)
            ]);

            // Check for specific drug-drug interactions
            // Search for adverse events where both drugs are involved
            const encodedDrug1 = encodeURIComponent(drug1Name);
            const encodedDrug2 = encodeURIComponent(drug2Name);
            const interactionUrl = `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${encodedDrug1}"+AND+patient.drug.medicinalproduct:"${encodedDrug2}"&limit=100`;
            
            let adverseEventsResult = { success: false };
            try {
                const response = await fetch(interactionUrl);
                if (response.ok) {
                    const data = await response.json();
                    adverseEventsResult = {
                        success: true,
                        data: data
                    };
                }
            } catch (error) {
                console.error('Error fetching interaction data:', error);
            }

            // Get drug labeling for warnings
            const [labeling1, labeling2] = await Promise.all([
                this.openFDAService.searchDrugLabeling(drug1Name),
                this.openFDAService.searchDrugLabeling(drug2Name)
            ]);

            // Analyze the results
            let adverseEvents = { total: 0, serious: 0, reactions: [], warnings: [], contraindications: [] };
            
            if (adverseEventsResult.success && adverseEventsResult.data?.results) {
                const results = adverseEventsResult.data.results;
                const seriousEvents = results.filter(event =>
                    event.serious === '1' ||
                    event.seriousnessdeath === '1' ||
                    event.seriousnesshospitalization === '1'
                );
                
                // Extract common reactions
                const reactionCounts = {};
                results.forEach(event => {
                    event.patient?.reaction?.forEach(reaction => {
                        const term = reaction.reactionmeddrapt;
                        if (term) {
                            reactionCounts[term] = (reactionCounts[term] || 0) + 1;
                        }
                    });
                });
                
                const topReactions = Object.entries(reactionCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([reaction, count]) => ({ 
                        reaction, 
                        count, 
                        percentage: (count / results.length * 100).toFixed(1) 
                    }));
                
                adverseEvents = {
                    total: adverseEventsResult.data.meta?.results?.total || results.length,
                    serious: seriousEvents.length,
                    reactions: topReactions,
                    serious_percentage: results.length > 0 ? ((seriousEvents.length / results.length) * 100).toFixed(1) : 0
                };
            }

            // Calculate risk scores
            const drug1Risk = this.calculateDrugRisk(profile1);
            const drug2Risk = this.calculateDrugRisk(profile2);
            const combinedRisk = Math.max(drug1Risk, drug2Risk);

            // Determine severity
            let severity = 'UNKNOWN';
            let confidence = 0.5;
            let clinicalRecommendation = '';
            
            if (adverseEvents.serious > 10 || combinedRisk > 0.8) {
                severity = 'MAJOR';
                confidence = 0.9;
                clinicalRecommendation = 'Avoid combination. Consider alternative medications.';
            } else if (adverseEvents.serious > 5 || combinedRisk > 0.6) {
                severity = 'MODERATE';
                confidence = 0.8;
                clinicalRecommendation = 'Use with extreme caution. Monitor closely for adverse effects.';
            } else if (adverseEvents.total > 10 || combinedRisk > 0.4) {
                severity = 'MINOR';
                confidence = 0.7;
                clinicalRecommendation = 'Monitor for potential adverse effects. Consider dose adjustments.';
            } else {
                clinicalRecommendation = 'Limited interaction data available. Exercise clinical judgment.';
            }

            // Generate monitoring parameters
            const monitoringParams = this.generateMonitoringParameters(severity, adverseEvents.reactions);

            return {
                success: true,
                drug1: {
                    name: drug1Name,
                    safety_profile: profile1.success ? profile1.profile : null,
                    risk_score: drug1Risk
                },
                drug2: {
                    name: drug2Name,
                    safety_profile: profile2.success ? profile2.profile : null,
                    risk_score: drug2Risk
                },
                interaction_analysis: {
                    found: adverseEvents.total > 0,
                    severity,
                    confidence,
                    combined_risk_score: combinedRisk,
                    adverse_events: adverseEvents,
                    clinical_recommendation: clinicalRecommendation,
                    monitoring_parameters: monitoringParams
                },
                data_sources: {
                    fda_adverse_events: adverseEventsResult.success,
                    fda_drug_labeling: labeling1.success || labeling2.success,
                    safety_profiles: profile1.success || profile2.success
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('FDA interaction check error:', error);
            throw error;
        }
    }

    calculateDrugRisk(safetyProfile) {
        if (!safetyProfile.success || !safetyProfile.profile) {
            return 0.3; // Default moderate risk
        }
        
        const profile = safetyProfile.profile;
        let riskScore = 0.1; // Base risk
        
        // Factor in adverse event frequency
        if (profile.total_adverse_events > 1000) riskScore += 0.3;
        else if (profile.total_adverse_events > 500) riskScore += 0.2;
        else if (profile.total_adverse_events > 100) riskScore += 0.1;
        
        // Factor in serious events ratio
        if (profile.serious_events_ratio > 0.3) riskScore += 0.4;
        else if (profile.serious_events_ratio > 0.2) riskScore += 0.3;
        else if (profile.serious_events_ratio > 0.1) riskScore += 0.2;
        
        // Factor in black box warnings
        if (profile.has_black_box_warning) riskScore += 0.3;
        
        // Factor in recalls
        if (profile.recent_recalls > 2) riskScore += 0.2;
        else if (profile.recent_recalls > 0) riskScore += 0.1;
        
        return Math.min(riskScore, 1.0);
    }

    generateMonitoringParameters(severity, reactions) {
        const baseParameters = ['Vital signs', 'Patient symptoms'];
        
        // Add specific monitoring based on common reactions
        const specificMonitoring = [];
        reactions.forEach(reaction => {
            const reactionLower = reaction.reaction.toLowerCase();
            if (reactionLower.includes('cardiac') || reactionLower.includes('heart')) {
                specificMonitoring.push('ECG monitoring');
            }
            if (reactionLower.includes('liver') || reactionLower.includes('hepatic')) {
                specificMonitoring.push('Liver function tests');
            }
            if (reactionLower.includes('kidney') || reactionLower.includes('renal')) {
                specificMonitoring.push('Renal function tests');
            }
            if (reactionLower.includes('bleeding')) {
                specificMonitoring.push('Coagulation studies');
            }
        });
        
        const frequency = severity === 'MAJOR' ? 'Daily' : severity === 'MODERATE' ? 'Weekly' : 'As needed';
        
        return {
            parameters: [...new Set([...baseParameters, ...specificMonitoring])],
            frequency,
            duration: severity === 'MAJOR' ? '2-4 weeks' : '1-2 weeks'
        };
    }

    // Cache management
    addToCache(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Clean old entries periodically
        if (this.cache.size > 1000) {
            this.cleanCache();
        }
    }

    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    cleanCache() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    getCacheStats(type) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(type + ':')) {
                count++;
            }
        }
        return count;
    }

    async start() {
        this.app.listen(this.port, () => {
            console.log(`\n🚀 MCP HTTP Server Started`);
            console.log(`=====================================`);
            console.log(`📍 Port: ${this.port}`);
            console.log(`🏥 Health: http://localhost:${this.port}/health`);
            console.log(`💊 Interaction: http://localhost:${this.port}/api/check-interaction`);
            console.log(`📝 Normalize: http://localhost:${this.port}/api/normalize`);
            console.log(`🔒 Safety: http://localhost:${this.port}/api/safety-profile`);
            console.log(`=====================================`);
            console.log(`✅ Ready to serve FDA and RxNorm data!\n`);
        });
    }
}

// Create and start server
const server = new MCPHttpServer();
server.start().catch(console.error);

export default MCPHttpServer;