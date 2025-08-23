/**
 * OpenFDA API Service
 * 
 * Provides access to FDA drug data including adverse events, labeling, and recalls
 * No API key required - rate limited to 240/min, 1000/hour
 */

const fetch = require('node-fetch');

class OpenFDAService {
    constructor() {
        this.baseUrl = 'https://api.fda.gov';
        
        // Rate limiting - FDA allows 240/min, 1000/hour
        this.requestQueue = [];
        this.isProcessing = false;
        this.minRequestInterval = 250; // 250ms = 4 requests/sec = 240/min
        this.requestCount = 0;
        this.hourlyReset = Date.now() + 3600000; // Reset hourly counter
    }

    /**
     * Rate-limited request wrapper with FDA rate limits
     */
    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            // Check hourly rate limit
            if (Date.now() > this.hourlyReset) {
                this.requestCount = 0;
                this.hourlyReset = Date.now() + 3600000;
            }

            if (this.requestCount >= 1000) {
                reject(new Error('FDA API hourly rate limit exceeded (1000/hour)'));
                return;
            }

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
                console.log(`🔍 FDA API Request: ${url}`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                this.requestCount++;
                resolve(data);

                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, this.minRequestInterval));

            } catch (error) {
                console.error(`❌ FDA API error for ${url}:`, error);
                reject(error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Search drug adverse events by drug name
     */
    async searchAdverseEvents(drugName, limit = 10) {
        try {
            const encodedDrug = encodeURIComponent(drugName.toLowerCase());
            const url = `${this.baseUrl}/drug/event.json?search=patient.drug.medicinalproduct:"${encodedDrug}"&limit=${limit}`;
            
            const result = await this.makeRequest(url);

            if (result?.results) {
                const events = result.results.map(event => ({
                    safetyreportid: event.safetyreportid,
                    receivedate: event.receivedate,
                    serious: event.serious,
                    seriousnesscongenitalanomali: event.seriousnesscongenitalanomali,
                    seriousnessdeath: event.seriousnessdeath,
                    seriousnessdisabling: event.seriousnessdisabling,
                    seriousnesshospitalization: event.seriousnesshospitalization,
                    seriousnesslifethreatening: event.seriousnesslifethreatening,
                    seriousnessother: event.seriousnessother,
                    patient: {
                        patientonsetage: event.patient?.patientonsetage,
                        patientonsetageunit: event.patient?.patientonsetageunit,
                        patientsex: event.patient?.patientsex,
                        reactions: event.patient?.reaction?.map(reaction => ({
                            reactionmeddrapt: reaction.reactionmeddrapt,
                            reactionoutcome: reaction.reactionoutcome
                        })) || []
                    },
                    drugs: event.patient?.drug?.map(drug => ({
                        medicinalproduct: drug.medicinalproduct,
                        drugdosagetext: drug.drugdosagetext,
                        drugadministrationroute: drug.drugadministrationroute,
                        drugindication: drug.drugindication
                    })) || []
                }));

                return {
                    success: true,
                    drugName: drugName,
                    totalResults: result.meta?.results?.total || events.length,
                    events: events
                };
            }

            return {
                success: false,
                error: 'No adverse events found',
                drugName: drugName
            };

        } catch (error) {
            console.error(`❌ Error searching adverse events for "${drugName}":`, error);
            return {
                success: false,
                error: error.message,
                drugName: drugName
            };
        }
    }

    /**
     * Search drug labeling information
     */
    async searchDrugLabeling(drugName, limit = 5) {
        try {
            const encodedDrug = encodeURIComponent(drugName.toLowerCase());
            const url = `${this.baseUrl}/drug/label.json?search=openfda.brand_name:"${encodedDrug}"+openfda.generic_name:"${encodedDrug}"&limit=${limit}`;
            
            const result = await this.makeRequest(url);

            if (result?.results) {
                const labels = result.results.map(label => ({
                    id: label.id,
                    effective_time: label.effective_time,
                    version: label.version,
                    purpose: label.purpose?.[0],
                    indications_and_usage: label.indications_and_usage?.[0],
                    contraindications: label.contraindications?.[0],
                    warnings: label.warnings?.[0],
                    precautions: label.precautions?.[0],
                    adverse_reactions: label.adverse_reactions?.[0],
                    drug_interactions: label.drug_interactions?.[0],
                    dosage_and_administration: label.dosage_and_administration?.[0],
                    openfda: {
                        application_number: label.openfda?.application_number || [],
                        brand_name: label.openfda?.brand_name || [],
                        generic_name: label.openfda?.generic_name || [],
                        manufacturer_name: label.openfda?.manufacturer_name || [],
                        substance_name: label.openfda?.substance_name || [],
                        rxcui: label.openfda?.rxcui || [],
                        spl_id: label.openfda?.spl_id || [],
                        unii: label.openfda?.unii || []
                    }
                }));

                return {
                    success: true,
                    drugName: drugName,
                    totalResults: result.meta?.results?.total || labels.length,
                    labels: labels
                };
            }

            return {
                success: false,
                error: 'No drug labeling found',
                drugName: drugName
            };

        } catch (error) {
            console.error(`❌ Error searching drug labeling for "${drugName}":`, error);
            return {
                success: false,
                error: error.message,
                drugName: drugName
            };
        }
    }

    /**
     * Search drug recalls
     */
    async searchDrugRecalls(drugName, limit = 10) {
        try {
            const encodedDrug = encodeURIComponent(drugName.toLowerCase());
            const url = `${this.baseUrl}/drug/enforcement.json?search=product_description:"${encodedDrug}"&limit=${limit}`;
            
            const result = await this.makeRequest(url);

            if (result?.results) {
                const recalls = result.results.map(recall => ({
                    recall_number: recall.recall_number,
                    reason_for_recall: recall.reason_for_recall,
                    status: recall.status,
                    distribution_pattern: recall.distribution_pattern,
                    product_quantity: recall.product_quantity,
                    recall_initiation_date: recall.recall_initiation_date,
                    state: recall.state,
                    event_id: recall.event_id,
                    product_type: recall.product_type,
                    product_description: recall.product_description,
                    country: recall.country,
                    city: recall.city,
                    recalling_firm: recall.recalling_firm,
                    report_date: recall.report_date,
                    classification: recall.classification,
                    openfda: recall.openfda || {}
                }));

                return {
                    success: true,
                    drugName: drugName,
                    totalResults: result.meta?.results?.total || recalls.length,
                    recalls: recalls
                };
            }

            return {
                success: false,
                error: 'No drug recalls found',
                drugName: drugName
            };

        } catch (error) {
            console.error(`❌ Error searching drug recalls for "${drugName}":`, error);
            return {
                success: false,
                error: error.message,
                drugName: drugName
            };
        }
    }

    /**
     * Get comprehensive drug safety profile
     */
    async getDrugSafetyProfile(drugName) {
        try {
            console.log(`🏥 Getting comprehensive safety profile for: "${drugName}"`);

            const [adverseEvents, labeling, recalls] = await Promise.allSettled([
                this.searchAdverseEvents(drugName, 100),
                this.searchDrugLabeling(drugName, 3),
                this.searchDrugRecalls(drugName, 20)
            ]);

            const profile = {
                drugName: drugName,
                timestamp: new Date().toISOString(),
                adverseEvents: adverseEvents.status === 'fulfilled' ? adverseEvents.value : { success: false, error: adverseEvents.reason?.message },
                labeling: labeling.status === 'fulfilled' ? labeling.value : { success: false, error: labeling.reason?.message },
                recalls: recalls.status === 'fulfilled' ? recalls.value : { success: false, error: recalls.reason?.message }
            };

            // Analyze safety signals
            profile.safetyAnalysis = this.analyzeSafetyProfile(profile);

            console.log(`✅ Safety profile complete for "${drugName}"`);
            return {
                success: true,
                profile: profile
            };

        } catch (error) {
            console.error(`❌ Error getting safety profile for "${drugName}":`, error);
            return {
                success: false,
                error: error.message,
                drugName: drugName
            };
        }
    }

    /**
     * Analyze safety profile and extract key signals
     */
    analyzeSafetyProfile(profile) {
        const analysis = {
            riskLevel: 'LOW',
            riskFactors: [],
            keyFindings: [],
            warnings: []
        };

        try {
            // Analyze adverse events
            if (profile.adverseEvents.success && profile.adverseEvents.events.length > 0) {
                const events = profile.adverseEvents.events;
                
                // Count serious events
                const seriousEvents = events.filter(e => e.serious === '1').length;
                const seriousPercentage = (seriousEvents / events.length) * 100;

                if (seriousPercentage > 30) {
                    analysis.riskLevel = 'HIGH';
                    analysis.riskFactors.push(`High rate of serious adverse events (${seriousPercentage.toFixed(1)}%)`);
                } else if (seriousPercentage > 15) {
                    analysis.riskLevel = 'MODERATE';
                    analysis.riskFactors.push(`Moderate rate of serious adverse events (${seriousPercentage.toFixed(1)}%)`);
                }

                // Count death reports
                const deaths = events.filter(e => e.seriousnessdeath === '1').length;
                if (deaths > 0) {
                    analysis.riskLevel = 'HIGH';
                    analysis.riskFactors.push(`${deaths} death reports in recent adverse events`);
                }

                // Extract common reactions
                const reactions = events.flatMap(e => e.patient.reactions.map(r => r.reactionmeddrapt)).filter(r => r);
                const reactionCounts = reactions.reduce((acc, reaction) => {
                    acc[reaction] = (acc[reaction] || 0) + 1;
                    return acc;
                }, {});
                
                const commonReactions = Object.entries(reactionCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([reaction, count]) => `${reaction} (${count} reports)`);
                
                if (commonReactions.length > 0) {
                    analysis.keyFindings.push(`Common adverse reactions: ${commonReactions.join(', ')}`);
                }
            }

            // Analyze recalls
            if (profile.recalls.success && profile.recalls.recalls.length > 0) {
                const recalls = profile.recalls.recalls;
                const recentRecalls = recalls.filter(r => {
                    const recallDate = new Date(r.recall_initiation_date);
                    const twoYearsAgo = new Date();
                    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                    return recallDate > twoYearsAgo;
                });

                if (recentRecalls.length > 0) {
                    analysis.riskLevel = analysis.riskLevel === 'LOW' ? 'MODERATE' : analysis.riskLevel;
                    analysis.riskFactors.push(`${recentRecalls.length} recent recalls (last 2 years)`);
                    
                    const class1Recalls = recentRecalls.filter(r => r.classification === 'Class I');
                    if (class1Recalls.length > 0) {
                        analysis.riskLevel = 'HIGH';
                        analysis.warnings.push(`${class1Recalls.length} Class I recalls (most serious) in recent years`);
                    }
                }
            }

            // Analyze labeling warnings
            if (profile.labeling.success && profile.labeling.labels.length > 0) {
                const labels = profile.labeling.labels;
                
                labels.forEach(label => {
                    if (label.warnings) {
                        const warningText = label.warnings.toLowerCase();
                        if (warningText.includes('black box') || warningText.includes('boxed warning')) {
                            analysis.riskLevel = 'HIGH';
                            analysis.warnings.push('FDA Black Box Warning present');
                        }
                    }

                    if (label.contraindications) {
                        analysis.keyFindings.push('Contraindications documented in FDA labeling');
                    }

                    if (label.drug_interactions) {
                        analysis.keyFindings.push('Drug interactions documented in FDA labeling');
                    }
                });
            }

        } catch (error) {
            console.error('Error analyzing safety profile:', error);
            analysis.keyFindings.push('Safety analysis incomplete due to data processing error');
        }

        return analysis;
    }

    /**
     * Check for drug interactions in FDA labeling data
     */
    async checkInteractionData(drugName) {
        try {
            const labelingResult = await this.searchDrugLabeling(drugName, 3);
            
            if (!labelingResult.success) {
                return {
                    success: false,
                    error: 'No labeling data found',
                    drugName: drugName
                };
            }

            const interactions = [];
            
            labelingResult.labels.forEach(label => {
                if (label.drug_interactions) {
                    interactions.push({
                        source: 'FDA_LABELING',
                        interactionText: label.drug_interactions,
                        effectiveTime: label.effective_time
                    });
                }
            });

            return {
                success: true,
                drugName: drugName,
                interactions: interactions,
                hasInteractionData: interactions.length > 0
            };

        } catch (error) {
            console.error(`❌ Error checking interaction data for "${drugName}":`, error);
            return {
                success: false,
                error: error.message,
                drugName: drugName
            };
        }
    }
}

module.exports = OpenFDAService;