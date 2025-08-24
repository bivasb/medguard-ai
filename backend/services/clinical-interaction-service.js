/**
 * Clinical Interaction Intelligence Service
 * 
 * Provides comprehensive drug interaction checking beyond basic drug-drug:
 * - Drug-Disease interactions
 * - Drug-Food interactions
 * - Drug-Lab interactions
 * - Age-specific interactions (Beers Criteria)
 * - Pregnancy/Lactation safety
 * - Clinical context awareness
 */

class ClinicalInteractionService {
    constructor() {
        // Initialize clinical databases
        this.initializeClinicalDatabases();
        this.initializeBeersСriteria();
        this.initializePregnancyCategories();
        this.initializeClinicalContexts();
    }

    initializeClinicalDatabases() {
        // Drug-Disease Interactions
        this.drugDiseaseInteractions = {
            'metformin': {
                'kidney_disease': {
                    severity: 'CONTRAINDICATED',
                    mechanism: 'Increased risk of lactic acidosis',
                    egfr_threshold: 30,
                    monitoring: 'Check renal function every 3-6 months',
                    alternatives: ['DPP-4 inhibitors', 'GLP-1 agonists', 'insulin']
                },
                'heart_failure': {
                    severity: 'MAJOR',
                    mechanism: 'Risk of lactic acidosis in decompensated HF',
                    monitoring: 'Monitor for signs of lactic acidosis',
                    alternatives: ['SGLT2 inhibitors (beneficial in HF)']
                }
            },
            'nsaids': {
                'kidney_disease': {
                    severity: 'MAJOR',
                    mechanism: 'Further reduction in renal function',
                    monitoring: 'Monitor creatinine and potassium',
                    alternatives: ['Acetaminophen', 'Topical NSAIDs']
                },
                'heart_failure': {
                    severity: 'MAJOR',
                    mechanism: 'Sodium retention, worsening HF',
                    monitoring: 'Monitor weight, edema',
                    alternatives: ['Acetaminophen', 'Tramadol']
                },
                'gi_bleeding': {
                    severity: 'CONTRAINDICATED',
                    mechanism: 'Direct gastric mucosal damage',
                    alternatives: ['Acetaminophen', 'COX-2 selective if necessary']
                }
            },
            'warfarin': {
                'liver_disease': {
                    severity: 'MAJOR',
                    mechanism: 'Impaired coagulation factor synthesis',
                    monitoring: 'More frequent INR monitoring',
                    dose_adjustment: 'Start with lower doses'
                },
                'thyroid_disease': {
                    severity: 'MODERATE',
                    mechanism: 'Hyperthyroidism increases warfarin effect',
                    monitoring: 'Adjust dose based on thyroid status'
                }
            },
            'statins': {
                'liver_disease': {
                    severity: 'MAJOR',
                    mechanism: 'Hepatotoxicity risk',
                    monitoring: 'Check LFTs before and during therapy',
                    contraindication_threshold: 'ALT/AST > 3x ULN'
                }
            },
            'ace_inhibitors': {
                'kidney_disease': {
                    severity: 'MODERATE',
                    mechanism: 'Can worsen renal function',
                    monitoring: 'Check Cr and K+ within 1-2 weeks',
                    dose_adjustment: 'May need dose reduction'
                },
                'hyperkalemia': {
                    severity: 'MAJOR',
                    mechanism: 'Potassium retention',
                    monitoring: 'Regular potassium monitoring',
                    contraindication_threshold: 'K+ > 5.5 mEq/L'
                }
            }
        };

        // Drug-Food Interactions
        this.drugFoodInteractions = {
            'warfarin': {
                'vitamin_k_foods': {
                    foods: ['spinach', 'kale', 'broccoli', 'brussels sprouts'],
                    effect: 'Decreased warfarin effect',
                    recommendation: 'Maintain consistent intake',
                    severity: 'MODERATE'
                },
                'cranberry': {
                    effect: 'Increased bleeding risk',
                    mechanism: 'CYP2C9 inhibition',
                    recommendation: 'Avoid large quantities',
                    severity: 'MODERATE'
                },
                'grapefruit': {
                    effect: 'Increased warfarin levels',
                    mechanism: 'CYP3A4 inhibition',
                    recommendation: 'Avoid grapefruit',
                    severity: 'MAJOR'
                }
            },
            'statins': {
                'grapefruit': {
                    effect: 'Increased statin levels → myopathy risk',
                    mechanism: 'CYP3A4 inhibition',
                    recommendation: 'Avoid grapefruit with simvastatin, atorvastatin',
                    severity: 'MAJOR',
                    safe_alternatives: ['pravastatin', 'rosuvastatin']
                }
            },
            'mao_inhibitors': {
                'tyramine_foods': {
                    foods: ['aged cheese', 'cured meats', 'fermented foods', 'wine'],
                    effect: 'Hypertensive crisis',
                    mechanism: 'Tyramine accumulation',
                    recommendation: 'Strict tyramine-free diet',
                    severity: 'CONTRAINDICATED'
                }
            },
            'tetracyclines': {
                'dairy': {
                    effect: 'Decreased absorption',
                    mechanism: 'Chelation with calcium',
                    recommendation: 'Take 2 hours apart from dairy',
                    severity: 'MODERATE'
                }
            },
            'levothyroxine': {
                'soy': {
                    effect: 'Decreased absorption',
                    recommendation: 'Separate by 4 hours',
                    severity: 'MODERATE'
                },
                'coffee': {
                    effect: 'Decreased absorption',
                    recommendation: 'Take on empty stomach, wait 30-60 min',
                    severity: 'MINOR'
                }
            }
        };

        // Drug-Lab Interactions
        this.drugLabInteractions = {
            'statins': {
                'ck_elevation': {
                    threshold: '>10x ULN',
                    action: 'Discontinue statin',
                    severity: 'MAJOR',
                    clinical: 'Risk of rhabdomyolysis'
                },
                'alt_elevation': {
                    threshold: '>3x ULN',
                    action: 'Discontinue or reduce dose',
                    severity: 'MAJOR',
                    monitoring: 'Recheck in 2-4 weeks'
                }
            },
            'metformin': {
                'egfr': {
                    thresholds: {
                        '<30': 'CONTRAINDICATED',
                        '30-45': 'Use with caution, reduce dose',
                        '45-60': 'Monitor closely',
                        '>60': 'No adjustment needed'
                    }
                },
                'lactic_acid': {
                    threshold: '>2 mmol/L',
                    action: 'Discontinue immediately',
                    severity: 'CONTRAINDICATED'
                }
            },
            'warfarin': {
                'inr': {
                    therapeutic_range: '2-3 (standard), 2.5-3.5 (mechanical valve)',
                    supratherapeutic: {
                        '3-4.5': 'Skip dose, recheck in 2-3 days',
                        '4.5-10': 'Hold, consider vitamin K',
                        '>10': 'Hold, give vitamin K, consider FFP if bleeding'
                    }
                }
            },
            'digoxin': {
                'potassium': {
                    low: '<3.5 mEq/L increases toxicity',
                    high: '>5.5 mEq/L decreases effect'
                },
                'level': {
                    therapeutic: '0.8-2.0 ng/mL',
                    toxic: '>2.0 ng/mL',
                    monitoring: 'Check level 6+ hours post-dose'
                }
            },
            'lithium': {
                'level': {
                    therapeutic: '0.6-1.2 mEq/L',
                    toxic: '>1.5 mEq/L',
                    monitoring: 'Check 12 hours post-dose'
                },
                'sodium': {
                    effect: 'Low sodium increases lithium levels',
                    monitoring: 'Monitor during diuretic use'
                }
            }
        };
    }

    initializeBeersСriteria() {
        // Beers Criteria for Potentially Inappropriate Medications in Elderly
        this.beersCriteria = {
            // Always avoid in elderly (≥65 years)
            'always_avoid': {
                'first_generation_antihistamines': {
                    drugs: ['diphenhydramine', 'hydroxyzine', 'promethazine'],
                    reason: 'Highly anticholinergic; increased confusion, falls',
                    alternatives: ['loratadine', 'cetirizine', 'fexofenadine']
                },
                'antispasmodics': {
                    drugs: ['dicyclomine', 'hyoscyamine'],
                    reason: 'Highly anticholinergic',
                    alternatives: ['Lifestyle modifications', 'probiotics']
                },
                'barbiturates': {
                    drugs: ['phenobarbital', 'butalbital'],
                    reason: 'High rate of physical dependence, overdose risk',
                    alternatives: ['Other anticonvulsants', 'migraine-specific therapy']
                },
                'benzodiazepines_long_acting': {
                    drugs: ['diazepam', 'chlordiazepoxide', 'flurazepam'],
                    reason: 'Increased fall risk, cognitive impairment',
                    alternatives: ['Short-acting if necessary', 'non-benzo alternatives']
                },
                'meperidine': {
                    reason: 'Neurotoxic metabolite accumulation',
                    alternatives: ['Morphine', 'oxycodone', 'hydromorphone']
                }
            },
            // Use with caution
            'use_with_caution': {
                'aspirin_primary_prevention': {
                    age_threshold: 70,
                    reason: 'Increased bleeding risk outweighs benefit',
                    recommendation: 'Use only for secondary prevention'
                },
                'antipsychotics': {
                    reason: 'Increased stroke, mortality in dementia',
                    monitoring: 'Use lowest dose for shortest duration'
                },
                'diuretics': {
                    reason: 'Exacerbate incontinence',
                    monitoring: 'Monitor electrolytes, renal function'
                },
                'ssris': {
                    reason: 'Hyponatremia, falls',
                    monitoring: 'Check sodium, especially first month'
                }
            },
            // Disease-specific considerations
            'disease_specific': {
                'heart_failure': {
                    avoid: ['NSAIDs', 'COX-2 inhibitors', 'diltiazem', 'verapamil'],
                    reason: 'Worsen heart failure'
                },
                'dementia': {
                    avoid: ['anticholinergics', 'benzodiazepines', 'H2 blockers'],
                    reason: 'Worsen cognition'
                },
                'falls_fractures': {
                    avoid: ['benzodiazepines', 'antipsychotics', 'TCAs'],
                    reason: 'Increase fall risk'
                },
                'chronic_kidney_disease': {
                    avoid: ['NSAIDs', 'triamterene'],
                    reason: 'Worsen renal function'
                }
            }
        };
    }

    initializePregnancyCategories() {
        // FDA Pregnancy Categories (legacy) and new PLLR system
        this.pregnancyCategories = {
            'category_a': {
                description: 'No risk in controlled studies',
                drugs: ['levothyroxine', 'folic acid', 'vitamin B6']
            },
            'category_b': {
                description: 'No risk in animal studies',
                drugs: ['acetaminophen', 'metformin', 'amoxicillin', 'azithromycin']
            },
            'category_c': {
                description: 'Risk cannot be ruled out',
                drugs: ['sertraline', 'fluoxetine', 'gabapentin', 'tramadol']
            },
            'category_d': {
                description: 'Positive evidence of risk',
                drugs: ['lisinopril', 'atenolol', 'lithium', 'phenytoin'],
                use_if: 'Benefits outweigh risks'
            },
            'category_x': {
                description: 'CONTRAINDICATED in pregnancy',
                drugs: ['warfarin', 'methotrexate', 'isotretinoin', 'statins', 'misoprostol']
            },
            // Lactation safety
            'lactation': {
                'safe': ['acetaminophen', 'amoxicillin', 'ibuprofen', 'loratadine'],
                'use_caution': ['sertraline', 'metoprolol', 'prednisone'],
                'avoid': ['lithium', 'methotrexate', 'codeine', 'aspirin (high dose)']
            }
        };
    }

    initializeClinicalContexts() {
        // Clinical context-specific recommendations
        this.clinicalContexts = {
            'surgery': {
                'anticoagulants': {
                    'warfarin': {
                        preop: 'Stop 5 days before surgery',
                        bridge: 'Consider LMWH if high thrombotic risk',
                        postop: 'Resume 12-24 hours if no bleeding'
                    },
                    'doacs': {
                        preop: 'Stop 1-3 days depending on renal function',
                        bridge: 'Usually not needed',
                        postop: 'Resume 24-48 hours if hemostasis'
                    }
                },
                'antiplatelets': {
                    'aspirin': {
                        cardiac: 'Continue for cardiac indications',
                        primary_prevention: 'Stop 7 days before'
                    },
                    'clopidogrel': {
                        preop: 'Stop 5 days before if possible',
                        cardiac_stent: 'Consult cardiology if recent stent'
                    }
                },
                'diabetes_meds': {
                    'metformin': 'Hold day of surgery, resume when eating',
                    'sglt2_inhibitors': 'Stop 3 days before (ketoacidosis risk)',
                    'insulin': 'Reduce dose, frequent glucose monitoring'
                }
            },
            'infection': {
                'warfarin_interactions': {
                    'antibiotics': {
                        effect: 'Many increase INR',
                        mechanism: 'Gut flora disruption, CYP inhibition',
                        monitoring: 'Check INR 3-5 days after starting',
                        high_risk: ['metronidazole', 'sulfamethoxazole', 'fluoroquinolones']
                    }
                },
                'immunosuppressants': {
                    alert: 'Increased infection risk',
                    avoid_live_vaccines: true,
                    prophylaxis: 'Consider PCP prophylaxis if indicated'
                }
            },
            'acute_illness': {
                'dehydration': {
                    'ace_inhibitors': 'Hold if hypotensive',
                    'diuretics': 'Hold or reduce',
                    'metformin': 'Hold if risk of lactic acidosis',
                    'nsaids': 'Avoid (acute kidney injury risk)'
                },
                'aki_risk': {
                    'triple_whammy': 'ACE/ARB + diuretic + NSAID = high AKI risk',
                    action: 'Stop NSAID first, then consider others'
                }
            },
            'contrast_procedures': {
                'metformin': {
                    egfr_over_60: 'Continue',
                    egfr_30_60: 'Hold 48 hours after',
                    egfr_under_30: 'Hold before and 48 hours after'
                },
                'nsaids': 'Hold 24 hours before and after'
            }
        };
    }

    /**
     * Main method: Comprehensive clinical interaction check
     */
    async checkClinicalInteraction(params) {
        const {
            medications,
            patient,
            context = 'routine'
        } = params;

        const results = {
            drug_drug: [],
            drug_disease: [],
            drug_food: [],
            drug_lab: [],
            age_specific: [],
            pregnancy_lactation: [],
            context_specific: [],
            overall_risk: 'LOW',
            monitoring_plan: [],
            alternatives: [],
            clinical_pearls: []
        };

        // 1. Check drug-disease interactions
        if (patient.conditions) {
            results.drug_disease = this.checkDrugDiseaseInteractions(
                medications, 
                patient.conditions
            );
        }

        // 2. Check drug-food interactions
        results.drug_food = this.checkDrugFoodInteractions(medications);

        // 3. Check drug-lab interactions
        if (patient.labs) {
            results.drug_lab = this.checkDrugLabInteractions(
                medications,
                patient.labs
            );
        }

        // 4. Check age-specific (Beers Criteria)
        if (patient.age >= 65) {
            results.age_specific = this.checkBeersCriteria(
                medications,
                patient.age,
                patient.conditions
            );
        }

        // 5. Check pregnancy/lactation safety
        if (patient.pregnancy || patient.lactation) {
            results.pregnancy_lactation = this.checkPregnancyLactation(
                medications,
                patient.pregnancy,
                patient.lactation
            );
        }

        // 6. Apply clinical context
        if (context !== 'routine') {
            results.context_specific = this.applyContextSpecificRules(
                medications,
                context,
                patient
            );
        }

        // 7. Generate monitoring plan
        results.monitoring_plan = this.generateMonitoringPlan(results);

        // 8. Suggest alternatives if issues found
        results.alternatives = this.suggestAlternatives(results);

        // 9. Calculate overall risk
        results.overall_risk = this.calculateOverallRisk(results);

        // 10. Add clinical pearls
        results.clinical_pearls = this.generateClinicalPearls(results, patient);

        return results;
    }

    checkDrugDiseaseInteractions(medications, conditions) {
        const interactions = [];
        
        medications.forEach(med => {
            const medLower = med.toLowerCase();
            
            // Check each condition
            conditions.forEach(condition => {
                const condLower = condition.toLowerCase();
                
                // Direct drug-disease lookup
                if (this.drugDiseaseInteractions[medLower]) {
                    if (this.drugDiseaseInteractions[medLower][condLower]) {
                        interactions.push({
                            drug: med,
                            disease: condition,
                            ...this.drugDiseaseInteractions[medLower][condLower]
                        });
                    }
                }
                
                // Category checks (e.g., all NSAIDs)
                if (this.isNSAID(medLower)) {
                    if (this.drugDiseaseInteractions.nsaids[condLower]) {
                        interactions.push({
                            drug: med,
                            disease: condition,
                            ...this.drugDiseaseInteractions.nsaids[condLower]
                        });
                    }
                }
                
                // ACE inhibitor checks
                if (this.isACEInhibitor(medLower)) {
                    if (this.drugDiseaseInteractions.ace_inhibitors[condLower]) {
                        interactions.push({
                            drug: med,
                            disease: condition,
                            ...this.drugDiseaseInteractions.ace_inhibitors[condLower]
                        });
                    }
                }
            });
        });
        
        return interactions;
    }

    checkDrugFoodInteractions(medications) {
        const interactions = [];
        
        medications.forEach(med => {
            const medLower = med.toLowerCase();
            
            if (this.drugFoodInteractions[medLower]) {
                Object.entries(this.drugFoodInteractions[medLower]).forEach(([food, details]) => {
                    interactions.push({
                        drug: med,
                        food_category: food,
                        ...details
                    });
                });
            }
            
            // Check categories
            if (this.isStatin(medLower) && this.drugFoodInteractions.statins) {
                Object.entries(this.drugFoodInteractions.statins).forEach(([food, details]) => {
                    interactions.push({
                        drug: med,
                        food_category: food,
                        ...details
                    });
                });
            }
        });
        
        return interactions;
    }

    checkDrugLabInteractions(medications, labs) {
        const interactions = [];
        
        medications.forEach(med => {
            const medLower = med.toLowerCase();
            
            if (this.drugLabInteractions[medLower]) {
                Object.entries(this.drugLabInteractions[medLower]).forEach(([lab, criteria]) => {
                    if (labs[lab]) {
                        const labValue = labs[lab].value || labs[lab];
                        const analysis = this.analyzeLabValue(labValue, criteria);
                        
                        if (analysis.issue) {
                            interactions.push({
                                drug: med,
                                lab: lab,
                                value: labValue,
                                ...analysis
                            });
                        }
                    }
                });
            }
            
            // Category checks
            if (this.isStatin(medLower) && labs.ck) {
                const ckValue = labs.ck.value || labs.ck;
                if (ckValue > 1000) { // 10x ULN approximation
                    interactions.push({
                        drug: med,
                        lab: 'CK',
                        value: ckValue,
                        severity: 'MAJOR',
                        action: 'Consider discontinuing statin',
                        clinical: 'Risk of rhabdomyolysis'
                    });
                }
            }
        });
        
        return interactions;
    }

    checkBeersCriteria(medications, age, conditions = []) {
        const issues = [];
        
        medications.forEach(med => {
            const medLower = med.toLowerCase();
            
            // Check always avoid list
            Object.entries(this.beersCriteria.always_avoid).forEach(([category, details]) => {
                if (details.drugs && details.drugs.includes(medLower)) {
                    issues.push({
                        drug: med,
                        category: category,
                        severity: 'AVOID',
                        reason: details.reason,
                        alternatives: details.alternatives
                    });
                }
            });
            
            // Check disease-specific
            conditions.forEach(condition => {
                const condLower = condition.toLowerCase();
                if (this.beersCriteria.disease_specific[condLower]) {
                    const diseaseRec = this.beersCriteria.disease_specific[condLower];
                    if (diseaseRec.avoid.some(drug => medLower.includes(drug.toLowerCase()))) {
                        issues.push({
                            drug: med,
                            condition: condition,
                            severity: 'AVOID',
                            reason: diseaseRec.reason
                        });
                    }
                }
            });
        });
        
        return issues;
    }

    checkPregnancyLactation(medications, isPregnant, isLactating) {
        const issues = [];
        
        medications.forEach(med => {
            const medLower = med.toLowerCase();
            
            if (isPregnant) {
                // Check Category X (absolutely contraindicated)
                if (this.pregnancyCategories.category_x.drugs.includes(medLower)) {
                    issues.push({
                        drug: med,
                        status: 'pregnancy',
                        category: 'X',
                        severity: 'CONTRAINDICATED',
                        description: 'Absolutely contraindicated in pregnancy',
                        action: 'Discontinue immediately or use contraception'
                    });
                }
                
                // Check Category D (risk but may be acceptable)
                if (this.pregnancyCategories.category_d.drugs.includes(medLower)) {
                    issues.push({
                        drug: med,
                        status: 'pregnancy',
                        category: 'D',
                        severity: 'MAJOR',
                        description: 'Positive evidence of fetal risk',
                        action: 'Use only if benefits clearly outweigh risks'
                    });
                }
            }
            
            if (isLactating) {
                if (this.pregnancyCategories.lactation.avoid.includes(medLower)) {
                    issues.push({
                        drug: med,
                        status: 'lactation',
                        severity: 'AVOID',
                        description: 'Avoid during breastfeeding',
                        action: 'Consider alternatives or discontinue breastfeeding'
                    });
                }
            }
        });
        
        return issues;
    }

    applyContextSpecificRules(medications, context, patient) {
        const recommendations = [];
        
        if (this.clinicalContexts[context]) {
            const contextRules = this.clinicalContexts[context];
            
            medications.forEach(med => {
                const medLower = med.toLowerCase();
                
                // Surgery context
                if (context === 'surgery') {
                    if (medLower === 'warfarin' && contextRules.anticoagulants.warfarin) {
                        recommendations.push({
                            drug: med,
                            context: 'surgery',
                            ...contextRules.anticoagulants.warfarin
                        });
                    }
                    
                    if (medLower === 'metformin' && contextRules.diabetes_meds) {
                        recommendations.push({
                            drug: med,
                            context: 'surgery',
                            recommendation: contextRules.diabetes_meds.metformin
                        });
                    }
                }
                
                // Infection context
                if (context === 'infection') {
                    if (medLower === 'warfarin' && contextRules.warfarin_interactions) {
                        recommendations.push({
                            drug: med,
                            context: 'infection',
                            alert: 'Monitor INR closely with antibiotics',
                            ...contextRules.warfarin_interactions.antibiotics
                        });
                    }
                }
                
                // Contrast procedure context
                if (context === 'contrast_procedure') {
                    if (medLower === 'metformin' && contextRules.metformin) {
                        const egfr = patient.labs?.egfr?.value || patient.labs?.egfr;
                        let recommendation;
                        
                        if (egfr > 60) {
                            recommendation = contextRules.metformin.egfr_over_60;
                        } else if (egfr >= 30) {
                            recommendation = contextRules.metformin.egfr_30_60;
                        } else {
                            recommendation = contextRules.metformin.egfr_under_30;
                        }
                        
                        recommendations.push({
                            drug: med,
                            context: 'contrast_procedure',
                            egfr: egfr,
                            recommendation: recommendation
                        });
                    }
                }
            });
        }
        
        return recommendations;
    }

    generateMonitoringPlan(results) {
        const monitoring = [];
        const monitoringSet = new Set();
        
        // From drug-disease interactions
        results.drug_disease.forEach(interaction => {
            if (interaction.monitoring && !monitoringSet.has(interaction.monitoring)) {
                monitoring.push({
                    parameter: interaction.monitoring,
                    reason: `${interaction.drug}-${interaction.disease} interaction`,
                    frequency: this.determineMonitoringFrequency(interaction.severity)
                });
                monitoringSet.add(interaction.monitoring);
            }
        });
        
        // From drug-lab interactions
        results.drug_lab.forEach(interaction => {
            const param = `Monitor ${interaction.lab}`;
            if (!monitoringSet.has(param)) {
                monitoring.push({
                    parameter: param,
                    reason: `${interaction.drug} therapy`,
                    frequency: 'Based on clinical status',
                    target: interaction.therapeutic_range || 'Within normal limits'
                });
                monitoringSet.add(param);
            }
        });
        
        // From context-specific
        results.context_specific.forEach(rec => {
            if (rec.monitoring) {
                const param = rec.monitoring;
                if (!monitoringSet.has(param)) {
                    monitoring.push({
                        parameter: param,
                        reason: `${rec.context} context`,
                        frequency: 'As indicated'
                    });
                    monitoringSet.add(param);
                }
            }
        });
        
        return monitoring;
    }

    suggestAlternatives(results) {
        const alternatives = [];
        const suggested = new Set();
        
        // Collect alternatives from all interaction types
        const allInteractions = [
            ...results.drug_disease,
            ...results.drug_food,
            ...results.age_specific,
            ...results.pregnancy_lactation
        ];
        
        allInteractions.forEach(interaction => {
            if (interaction.alternatives) {
                interaction.alternatives.forEach(alt => {
                    if (!suggested.has(alt)) {
                        alternatives.push({
                            for_drug: interaction.drug,
                            alternative: alt,
                            reason: interaction.reason || interaction.mechanism
                        });
                        suggested.add(alt);
                    }
                });
            }
        });
        
        return alternatives;
    }

    calculateOverallRisk(results) {
        let riskScore = 0;
        
        // Weight different interaction types
        const weights = {
            drug_disease: results.drug_disease.filter(i => i.severity === 'CONTRAINDICATED').length * 10 +
                          results.drug_disease.filter(i => i.severity === 'MAJOR').length * 5,
            drug_lab: results.drug_lab.filter(i => i.severity === 'MAJOR').length * 5,
            age_specific: results.age_specific.filter(i => i.severity === 'AVOID').length * 7,
            pregnancy_lactation: results.pregnancy_lactation.filter(i => i.severity === 'CONTRAINDICATED').length * 10
        };
        
        riskScore = Object.values(weights).reduce((sum, score) => sum + score, 0);
        
        if (riskScore >= 10) return 'HIGH';
        if (riskScore >= 5) return 'MODERATE';
        return 'LOW';
    }

    generateClinicalPearls(results, patient) {
        const pearls = [];
        
        // Age-specific pearls
        if (patient.age >= 65) {
            pearls.push('Consider "Start Low, Go Slow" principle for dosing in elderly');
            
            if (results.age_specific.length > 0) {
                pearls.push('Review Beers Criteria violations and consider deprescribing');
            }
        }
        
        // Renal pearls
        if (patient.labs?.egfr?.value < 60 || patient.labs?.egfr < 60) {
            pearls.push('Adjust medication doses for reduced renal function');
            pearls.push('Monitor for drug accumulation');
        }
        
        // Pregnancy pearls
        if (patient.pregnancy) {
            pearls.push('Document risk-benefit discussion for Category C/D drugs');
            pearls.push('Consider folic acid supplementation');
        }
        
        // Polypharmacy pearls
        if (patient.medications?.length > 5) {
            pearls.push('Consider medication reconciliation and deprescribing review');
            pearls.push('Assess for drug-drug interactions with each new medication');
        }
        
        return pearls;
    }

    // Helper methods
    isNSAID(drug) {
        const nsaids = ['ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'celecoxib', 'ketorolac', 'indomethacin'];
        return nsaids.some(nsaid => drug.includes(nsaid));
    }

    isACEInhibitor(drug) {
        return drug.endsWith('pril') || ['lisinopril', 'enalapril', 'ramipril', 'captopril'].includes(drug);
    }

    isStatin(drug) {
        return drug.endsWith('statin') || ['simvastatin', 'atorvastatin', 'rosuvastatin', 'pravastatin'].includes(drug);
    }

    analyzeLabValue(value, criteria) {
        // Complex lab value analysis logic
        if (criteria.threshold) {
            const threshold = parseFloat(criteria.threshold.replace(/[<>]/g, ''));
            const operator = criteria.threshold.match(/[<>]/)?.[0];
            
            let issue = false;
            if (operator === '>') {
                issue = value > threshold;
            } else if (operator === '<') {
                issue = value < threshold;
            }
            
            if (issue) {
                return {
                    issue: true,
                    severity: criteria.severity || 'MODERATE',
                    action: criteria.action,
                    clinical: criteria.clinical
                };
            }
        }
        
        if (criteria.thresholds) {
            for (const [range, action] of Object.entries(criteria.thresholds)) {
                const [min, max] = range.split('-').map(v => parseFloat(v.replace(/[<>]/g, '')));
                if (value >= min && value <= max) {
                    return {
                        issue: action !== 'No adjustment needed',
                        severity: action.includes('CONTRAINDICATED') ? 'CONTRAINDICATED' : 'MODERATE',
                        action: action
                    };
                }
            }
        }
        
        return { issue: false };
    }

    determineMonitoringFrequency(severity) {
        switch(severity) {
            case 'CONTRAINDICATED':
            case 'MAJOR':
                return 'Daily initially, then weekly';
            case 'MODERATE':
                return 'Weekly for 2 weeks, then monthly';
            default:
                return 'Monthly or as clinically indicated';
        }
    }
}

module.exports = ClinicalInteractionService;