/**
 * BATCH PRESCRIPTION REVIEW SUBAGENT
 * 
 * Comprehensive medication list analysis for complete patient drug regimens.
 * Analyzes entire medication lists for interactions, duplications, and optimization opportunities.
 * 
 * CORE CAPABILITIES:
 * - Multi-drug interaction matrix analysis
 * - Duplicate therapy detection
 * - Contraindication screening
 * - Risk prioritization and ranking
 * - Clinical recommendation generation
 * 
 * INPUT: Medication list (array of drug objects)
 * OUTPUT: Comprehensive analysis with prioritized risks
 */

export class BatchPrescriptionReviewSubagent {
    constructor() {
        this.name = "BatchPrescriptionReviewSubagent";
        this.version = "3.0.0";
        this.capabilities = [
            "comprehensive_interaction_analysis",
            "duplicate_therapy_detection", 
            "contraindication_screening",
            "risk_prioritization",
            "clinical_optimization"
        ];
    }

    /**
     * Execute comprehensive batch prescription review
     */
    async execute(task) {
        const startTime = Date.now();
        
        try {
            const { medications, patient_context } = task.input;
            
            if (!medications || !Array.isArray(medications) || medications.length === 0) {
                throw new Error("Medication list is required and must be non-empty");
            }

            // Step 1: Normalize all medications
            const normalizedMeds = this.normalizeMedicationList(medications);

            // Step 2: Generate comprehensive interaction matrix
            const interactionMatrix = this.generateInteractionMatrix(normalizedMeds);

            // Step 3: Detect duplicate therapies
            const duplicateAnalysis = this.detectDuplicateTherapies(normalizedMeds);

            // Step 4: Screen for contraindications
            const contraindications = this.screenContraindications(normalizedMeds, patient_context);

            // Step 5: Prioritize risks
            const riskAnalysis = this.prioritizeRisks(interactionMatrix, duplicateAnalysis, contraindications);

            // Step 6: Generate clinical recommendations
            const recommendations = this.generateClinicalRecommendations(riskAnalysis, patient_context);

            // Step 7: Create summary statistics
            const summary = this.generateSummaryStatistics(normalizedMeds, riskAnalysis);

            const processingTime = Date.now() - startTime;

            return {
                status: "complete",
                task_id: task.task_id,
                result: {
                    summary,
                    medications_reviewed: normalizedMeds,
                    interaction_matrix: interactionMatrix,
                    duplicate_analysis: duplicateAnalysis,
                    contraindications,
                    risk_analysis: riskAnalysis,
                    clinical_recommendations: recommendations,
                    processing_time_ms: processingTime,
                    confidence: this.calculateConfidence(riskAnalysis),
                    workflow: "batch_prescription_review"
                }
            };

        } catch (error) {
            return {
                status: "error",
                task_id: task.task_id,
                error: error.message,
                processing_time_ms: Date.now() - startTime
            };
        }
    }

    /**
     * Normalize medication list to standard format
     */
    normalizeMedicationList(medications) {
        return medications.map((med, index) => {
            let normalized = {
                id: `med_${index + 1}`,
                original_input: med,
                parsed: false
            };

            if (typeof med === 'string') {
                // Parse string format: "drug name dose frequency"
                const parsed = this.parseStringMedication(med);
                normalized = { ...normalized, ...parsed };
            } else if (typeof med === 'object') {
                // Use object format directly
                normalized = {
                    ...normalized,
                    drug_name: med.drug_name || med.name || med.medication,
                    dose: med.dose || med.dosage,
                    frequency: med.frequency || med.freq,
                    route: med.route || 'oral',
                    indication: med.indication || med.purpose,
                    parsed: true
                };
            }

            // Add classification
            normalized.drug_class = this.classifyDrug(normalized.drug_name);
            normalized.interaction_potential = this.assessInteractionPotential(normalized.drug_name);

            return normalized;
        });
    }

    /**
     * Parse string medication format
     */
    parseStringMedication(medString) {
        const cleanString = medString.trim().toLowerCase();
        
        // Common patterns: "warfarin 5mg daily", "metformin 1000mg twice daily"
        const patterns = [
            /^([a-z\s]+?)\s+(\d+\.?\d*\s*(?:mg|g|ml|units?))\s+([\w\s]+)$/i,
            /^([a-z\s]+?)\s+(\d+\.?\d*)\s*(mg|g|ml|units?)\s+([\w\s]+)$/i,
            /^([a-z\s]+)$/i
        ];

        for (const pattern of patterns) {
            const match = cleanString.match(pattern);
            if (match) {
                return {
                    drug_name: match[1].trim(),
                    dose: match[2] ? match[2].trim() + (match[3] || '') : null,
                    frequency: match[4] ? match[4].trim() : 'as directed',
                    route: 'oral',
                    parsed: true
                };
            }
        }

        // Fallback: treat entire string as drug name
        return {
            drug_name: cleanString,
            dose: null,
            frequency: 'as directed',
            route: 'oral',
            parsed: false
        };
    }

    /**
     * Generate comprehensive interaction matrix
     */
    generateInteractionMatrix(medications) {
        const matrix = [];
        
        for (let i = 0; i < medications.length; i++) {
            for (let j = i + 1; j < medications.length; j++) {
                const med1 = medications[i];
                const med2 = medications[j];
                
                const interaction = this.analyzeInteraction(med1, med2);
                if (interaction.severity !== 'none') {
                    matrix.push({
                        medication_1: med1,
                        medication_2: med2,
                        interaction_type: interaction.type,
                        severity: interaction.severity,
                        mechanism: interaction.mechanism,
                        clinical_significance: interaction.clinical_significance,
                        management: interaction.management,
                        confidence: interaction.confidence
                    });
                }
            }
        }

        return matrix.sort((a, b) => {
            const severityOrder = { 'critical': 4, 'major': 3, 'moderate': 2, 'minor': 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }

    /**
     * Analyze interaction between two medications
     */
    analyzeInteraction(med1, med2) {
        const drug1 = med1.drug_name.toLowerCase();
        const drug2 = med2.drug_name.toLowerCase();

        // Comprehensive interaction database
        const interactions = {
            // Critical interactions
            'warfarin_aspirin': {
                type: 'pharmacodynamic',
                severity: 'critical',
                mechanism: 'Additive anticoagulant effects',
                clinical_significance: 'Major bleeding risk - potentially life-threatening',
                management: 'Avoid combination. Use acetaminophen for pain relief.',
                confidence: 0.95
            },
            'warfarin_nsaid': {
                type: 'pharmacodynamic', 
                severity: 'critical',
                mechanism: 'Increased bleeding risk via multiple pathways',
                clinical_significance: 'Severe GI bleeding risk',
                management: 'Contraindicated. Monitor INR closely if unavoidable.',
                confidence: 0.90
            },
            'methotrexate_trimethoprim': {
                type: 'pharmacokinetic',
                severity: 'critical',
                mechanism: 'Trimethoprim inhibits methotrexate elimination',
                clinical_significance: 'Bone marrow suppression, mucositis, hepatotoxicity',
                management: 'Avoid combination. Use alternative antibiotic.',
                confidence: 0.92
            },

            // Major interactions  
            'ace_inhibitor_spironolactone': {
                type: 'pharmacodynamic',
                severity: 'major',
                mechanism: 'Additive hyperkalemia risk',
                clinical_significance: 'Potentially dangerous hyperkalemia',
                management: 'Monitor potassium closely. Consider dose reduction.',
                confidence: 0.85
            },
            'sertraline_tramadol': {
                type: 'pharmacodynamic',
                severity: 'major', 
                mechanism: 'Increased serotonin levels',
                clinical_significance: 'Serotonin syndrome risk',
                management: 'Use with caution. Monitor for serotonin syndrome symptoms.',
                confidence: 0.80
            },

            // Moderate interactions
            'atorvastatin_clarithromycin': {
                type: 'pharmacokinetic',
                severity: 'moderate',
                mechanism: 'CYP3A4 inhibition increases statin levels',
                clinical_significance: 'Increased risk of myopathy',
                management: 'Consider statin interruption during antibiotic course.',
                confidence: 0.75
            },
            'digoxin_furosemide': {
                type: 'pharmacodynamic',
                severity: 'moderate',
                mechanism: 'Furosemide-induced hypokalemia increases digoxin toxicity',
                clinical_significance: 'Increased digoxin toxicity risk',
                management: 'Monitor potassium and digoxin levels.',
                confidence: 0.70
            }
        };

        // Check for specific interactions
        const key1 = `${drug1}_${drug2}`;
        const key2 = `${drug2}_${drug1}`;
        
        if (interactions[key1]) return interactions[key1];
        if (interactions[key2]) return interactions[key2];

        // Check for drug class interactions
        const classInteraction = this.checkClassInteractions(med1, med2);
        if (classInteraction.severity !== 'none') return classInteraction;

        return {
            type: 'none',
            severity: 'none',
            mechanism: 'No significant interaction identified',
            clinical_significance: 'No clinical concern',
            management: 'No special precautions required',
            confidence: 0.60
        };
    }

    /**
     * Check for drug class-based interactions
     */
    checkClassInteractions(med1, med2) {
        const class1 = med1.drug_class;
        const class2 = med2.drug_class;

        const classInteractions = {
            'anticoagulant_antiplatelet': {
                severity: 'major',
                mechanism: 'Additive bleeding risk'
            },
            'ace_inhibitor_arb': {
                severity: 'moderate', 
                mechanism: 'Additive hypotension and hyperkalemia risk'
            },
            'beta_blocker_calcium_channel_blocker': {
                severity: 'moderate',
                mechanism: 'Additive cardiac depression'
            }
        };

        const key = `${class1}_${class2}`;
        const reverseKey = `${class2}_${class1}`;

        if (classInteractions[key] || classInteractions[reverseKey]) {
            const interaction = classInteractions[key] || classInteractions[reverseKey];
            return {
                type: 'pharmacodynamic',
                severity: interaction.severity,
                mechanism: interaction.mechanism,
                clinical_significance: 'Monitor for additive effects',
                management: 'Use with caution and monitor closely',
                confidence: 0.65
            };
        }

        return { severity: 'none' };
    }

    /**
     * Detect duplicate therapies
     */
    detectDuplicateTherapies(medications) {
        const duplicates = [];
        const therapeuticClasses = {};

        medications.forEach(med => {
            const therapeuticClass = this.getTherapeuticClass(med.drug_name);
            
            if (!therapeuticClasses[therapeuticClass]) {
                therapeuticClasses[therapeuticClass] = [];
            }
            therapeuticClasses[therapeuticClass].push(med);
        });

        Object.entries(therapeuticClasses).forEach(([className, meds]) => {
            if (meds.length > 1 && className !== 'other') {
                duplicates.push({
                    therapeutic_class: className,
                    medications: meds,
                    severity: this.assessDuplicationSeverity(className, meds),
                    recommendation: this.getDuplicationRecommendation(className, meds)
                });
            }
        });

        return duplicates;
    }

    /**
     * Screen for contraindications based on patient context
     */
    screenContraindications(medications, patientContext) {
        if (!patientContext) return [];

        const contraindications = [];
        
        medications.forEach(med => {
            const drugContraindications = this.getDrugContraindications(med.drug_name);
            
            drugContraindications.forEach(contra => {
                if (this.checkPatientContraindication(contra, patientContext)) {
                    contraindications.push({
                        medication: med,
                        contraindication_type: contra.type,
                        reason: contra.reason,
                        severity: contra.severity,
                        patient_factor: contra.patient_factor,
                        recommendation: contra.recommendation
                    });
                }
            });
        });

        return contraindications;
    }

    /**
     * Prioritize risks across all findings
     */
    prioritizeRisks(interactions, duplicates, contraindications) {
        const risks = [];

        // Add interaction risks
        interactions.forEach(interaction => {
            risks.push({
                type: 'interaction',
                priority: this.calculateRiskPriority('interaction', interaction.severity),
                severity: interaction.severity,
                description: `${interaction.medication_1.drug_name} + ${interaction.medication_2.drug_name}`,
                clinical_impact: interaction.clinical_significance,
                action_required: interaction.management,
                confidence: interaction.confidence
            });
        });

        // Add duplicate therapy risks
        duplicates.forEach(duplicate => {
            risks.push({
                type: 'duplicate_therapy',
                priority: this.calculateRiskPriority('duplicate', duplicate.severity),
                severity: duplicate.severity,
                description: `Multiple ${duplicate.therapeutic_class} medications`,
                clinical_impact: 'Potential additive effects or redundancy',
                action_required: duplicate.recommendation,
                confidence: 0.80
            });
        });

        // Add contraindication risks
        contraindications.forEach(contra => {
            risks.push({
                type: 'contraindication',
                priority: this.calculateRiskPriority('contraindication', contra.severity),
                severity: contra.severity,
                description: `${contra.medication.drug_name} contraindicated`,
                clinical_impact: contra.reason,
                action_required: contra.recommendation,
                confidence: 0.90
            });
        });

        return risks.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Generate clinical recommendations
     */
    generateClinicalRecommendations(risks, patientContext) {
        const recommendations = {
            immediate_actions: [],
            monitoring_requirements: [],
            optimization_opportunities: [],
            patient_education: []
        };

        // Process high-priority risks
        risks.filter(risk => risk.priority >= 80).forEach(risk => {
            if (risk.severity === 'critical' || risk.severity === 'major') {
                recommendations.immediate_actions.push({
                    action: risk.action_required,
                    urgency: 'immediate',
                    rationale: risk.clinical_impact
                });
            }
        });

        // Add general monitoring based on patient profile
        if (patientContext) {
            this.addPatientSpecificRecommendations(recommendations, patientContext);
        }

        return recommendations;
    }

    /**
     * Generate summary statistics
     */
    generateSummaryStatistics(medications, risks) {
        const criticalRisks = risks.filter(r => r.severity === 'critical').length;
        const majorRisks = risks.filter(r => r.severity === 'major').length;
        const moderateRisks = risks.filter(r => r.severity === 'moderate').length;
        
        return {
            total_medications: medications.length,
            total_risks_identified: risks.length,
            risk_breakdown: {
                critical: criticalRisks,
                major: majorRisks, 
                moderate: moderateRisks,
                minor: risks.length - criticalRisks - majorRisks - moderateRisks
            },
            overall_risk_score: this.calculateOverallRiskScore(risks),
            review_status: this.determineReviewStatus(risks),
            requires_physician_review: criticalRisks > 0 || majorRisks > 2
        };
    }

    // Utility methods
    classifyDrug(drugName) {
        const classifications = {
            'warfarin': 'anticoagulant',
            'aspirin': 'antiplatelet', 
            'metformin': 'antidiabetic',
            'lisinopril': 'ace_inhibitor',
            'amlodipine': 'calcium_channel_blocker',
            'metoprolol': 'beta_blocker',
            'atorvastatin': 'statin',
            'furosemide': 'diuretic',
            'digoxin': 'cardiac_glycoside'
        };
        
        return classifications[drugName.toLowerCase()] || 'other';
    }

    assessInteractionPotential(drugName) {
        const highRiskDrugs = ['warfarin', 'digoxin', 'phenytoin', 'lithium'];
        return highRiskDrugs.includes(drugName.toLowerCase()) ? 'high' : 'moderate';
    }

    getTherapeuticClass(drugName) {
        const classes = {
            'lisinopril': 'ace_inhibitors',
            'losartan': 'ace_inhibitors', 
            'metoprolol': 'beta_blockers',
            'propranolol': 'beta_blockers',
            'amlodipine': 'calcium_channel_blockers',
            'atorvastatin': 'statins',
            'simvastatin': 'statins'
        };
        
        return classes[drugName.toLowerCase()] || 'other';
    }

    calculateRiskPriority(type, severity) {
        const basePriority = {
            'critical': 95,
            'major': 80,
            'moderate': 60,
            'minor': 30
        };
        
        const typeMultiplier = {
            'contraindication': 1.1,
            'interaction': 1.0,
            'duplicate': 0.8
        };
        
        return Math.round(basePriority[severity] * typeMultiplier[type]);
    }

    calculateOverallRiskScore(risks) {
        if (risks.length === 0) return 0;
        
        const weightedSum = risks.reduce((sum, risk) => sum + risk.priority, 0);
        return Math.round(weightedSum / risks.length);
    }

    determineReviewStatus(risks) {
        const criticalCount = risks.filter(r => r.severity === 'critical').length;
        const majorCount = risks.filter(r => r.severity === 'major').length;
        
        if (criticalCount > 0) return 'urgent';
        if (majorCount > 1) return 'high_priority';
        if (risks.length > 0) return 'routine_review';
        return 'low_risk';
    }

    calculateConfidence(risks) {
        if (risks.length === 0) return 0.7;
        
        const avgConfidence = risks.reduce((sum, risk) => sum + risk.confidence, 0) / risks.length;
        return Math.round(avgConfidence * 100) / 100;
    }

    getDrugContraindications(drugName) {
        // Simplified contraindication database
        const contraindications = {
            'metformin': [
                {
                    type: 'renal_impairment',
                    reason: 'Risk of lactic acidosis',
                    severity: 'major',
                    patient_factor: 'eGFR < 30',
                    recommendation: 'Discontinue or use alternative'
                }
            ],
            'warfarin': [
                {
                    type: 'bleeding_risk',
                    reason: 'Active bleeding or high bleeding risk',
                    severity: 'critical',
                    patient_factor: 'recent_surgery',
                    recommendation: 'Evaluate bleeding risk vs thrombotic benefit'
                }
            ]
        };
        
        return contraindications[drugName.toLowerCase()] || [];
    }

    checkPatientContraindication(contraindication, patientContext) {
        // Simplified patient context checking
        if (!patientContext.lab_values) return false;
        
        if (contraindication.type === 'renal_impairment') {
            const egfr = patientContext.lab_values.eGFR?.value;
            return egfr && egfr < 30;
        }
        
        return false;
    }

    assessDuplicationSeverity(className, medications) {
        if (className.includes('anticoagulant') || className.includes('antiplatelet')) {
            return 'major';
        }
        return 'moderate';
    }

    getDuplicationRecommendation(className, medications) {
        return `Review necessity of multiple ${className}. Consider consolidation or discontinuation.`;
    }

    addPatientSpecificRecommendations(recommendations, patientContext) {
        if (patientContext.age >= 65) {
            recommendations.monitoring_requirements.push({
                parameter: 'renal_function',
                frequency: 'every_6_months',
                rationale: 'Elderly patient at increased risk for medication accumulation'
            });
        }
        
        if (patientContext.conditions?.some(c => c.condition.includes('Kidney'))) {
            recommendations.monitoring_requirements.push({
                parameter: 'medication_dosing',
                frequency: 'ongoing',
                rationale: 'Renal impairment requires dose adjustments'
            });
        }
    }
}

export default BatchPrescriptionReviewSubagent;