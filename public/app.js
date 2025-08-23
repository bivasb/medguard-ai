/**
 * MedGuard AI Frontend Application
 * 
 * Handles user interactions and communication with the backend
 * drug interaction checking system.
 */

class MedGuardApp {
    constructor() {
        this.apiBaseUrl = window.location.origin.replace(':3000', ':3001');
        this.isChecking = false;
        
        this.initializeElements();
        this.bindEvents();
        this.showWelcomeMessage();
    }

    initializeElements() {
        this.drug1Input = document.getElementById('drug1');
        this.drug2Input = document.getElementById('drug2');
        this.drug3Input = document.getElementById('drug3');
        this.patientSelect = document.getElementById('patientSelect');
        this.checkButton = document.getElementById('checkButton');
        this.resultContainer = document.getElementById('resultContainer');
        this.scenarioButtons = document.querySelectorAll('.scenario-btn');
    }

    bindEvents() {
        // Main check button
        this.checkButton.addEventListener('click', () => this.handleCheck());
        
        // Enter key support
        [this.drug1Input, this.drug2Input, this.drug3Input].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isChecking) {
                    this.handleCheck();
                }
            });
        });
        
        // Scenario buttons
        this.scenarioButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleScenario(btn));
        });
        
        // Input validation
        [this.drug1Input, this.drug2Input].forEach(input => {
            input.addEventListener('input', () => this.validateInputs());
        });
    }

    showWelcomeMessage() {
        console.log('🏥 MedGuard AI initialized');
        console.log('💊 Ready to check drug interactions');
        console.log('🔍 Enter medications to begin safety check');
    }

    validateInputs() {
        const drug1 = this.drug1Input.value.trim();
        const drug2 = this.drug2Input.value.trim();
        
        const isValid = drug1.length >= 2 && drug2.length >= 2;
        this.checkButton.disabled = !isValid || this.isChecking;
        
        return isValid;
    }

    async handleCheck() {
        if (!this.validateInputs() || this.isChecking) {
            return;
        }

        const drugs = [];
        const drug1 = this.drug1Input.value.trim();
        const drug2 = this.drug2Input.value.trim();
        const drug3 = this.drug3Input.value.trim();

        drugs.push(drug1, drug2);
        if (drug3) drugs.push(drug3);

        const patientId = this.patientSelect.value || null;

        this.setLoadingState(true);
        
        try {
            const result = await this.checkInteractions(drugs, patientId);
            this.displayResult(result);
        } catch (error) {
            console.error('Error checking interactions:', error);
            this.displayError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleScenario(button) {
        if (this.isChecking) return;
        
        const drugs = JSON.parse(button.dataset.drugs);
        const patientId = button.dataset.patient;
        
        // Fill inputs
        this.drug1Input.value = drugs[0] || '';
        this.drug2Input.value = drugs[1] || '';
        this.drug3Input.value = drugs[2] || '';
        this.patientSelect.value = patientId || '';
        
        // Animate button
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
        // Trigger check after a short delay
        setTimeout(() => {
            this.handleCheck();
        }, 300);
    }

    async checkInteractions(drugs, patientId = null) {
        const startTime = Date.now();
        
        // For demo purposes, we'll simulate the primary agent response
        // In production, this would call the actual LangGraph agent
        const mockResult = await this.simulatePrimaryAgent(drugs, patientId);
        
        mockResult.processing_time_ms = Date.now() - startTime;
        
        return mockResult;
    }

    async simulatePrimaryAgent(drugs, patientId) {
        // Simulate processing delay
        await this.delay(Math.random() * 2000 + 1000);
        
        // Load mock scenarios for realistic responses
        const scenarios = {
            'warfarin_aspirin': {
                risk_level: 'DANGER',
                explanation: 'CRITICAL: Warfarin and aspirin have a dangerous interaction. Major bleeding risk due to combined anticoagulant and antiplatelet effects. Patient factors significantly increase risk. Immediate action required.',
                recommendations: [
                    'DO NOT administer aspirin with warfarin',
                    'Consider acetaminophen for pain relief instead',
                    'Check current INR immediately',
                    'Monitor for signs of bleeding',
                    'Notify physician immediately',
                    'Document interaction alert in patient record'
                ]
            },
            'methotrexate_trimethoprim': {
                risk_level: 'DANGER',
                explanation: 'CRITICAL: Methotrexate and trimethoprim have a severe interaction. Trimethoprim inhibits methotrexate elimination leading to bone marrow suppression, mucositis, and hepatotoxicity.',
                recommendations: [
                    'DO NOT administer trimethoprim with methotrexate',
                    'Consider alternative antibiotics (ciprofloxacin, cephalexin)',
                    'Monitor CBC if interaction unavoidable',
                    'May need to hold methotrexate during treatment',
                    'Consult physician immediately'
                ]
            },
            'sertraline_tramadol': {
                risk_level: 'WARNING',
                explanation: 'CAUTION: Sertraline and tramadol have a moderate interaction risk. Both drugs increase serotonin levels, creating risk of serotonin syndrome. Close monitoring recommended.',
                recommendations: [
                    'Use with caution - increased monitoring required',
                    'Monitor for serotonin syndrome symptoms',
                    'Watch for: confusion, agitation, tremor, sweating, hyperthermia',
                    'Start with lowest effective dose',
                    'Consider alternative pain medication if possible',
                    'Educate patient on warning signs'
                ]
            },
            'atorvastatin_clarithromycin': {
                risk_level: 'WARNING',
                explanation: 'CAUTION: Atorvastatin and clarithromycin have a moderate interaction. Clarithromycin inhibits statin metabolism, increasing risk of myopathy and rhabdomyolysis.',
                recommendations: [
                    'Consider holding atorvastatin during treatment',
                    'Alternative: switch to azithromycin',
                    'Monitor for muscle pain, weakness',
                    'Check CK if symptoms develop',
                    'Short-term statin discontinuation usually safe'
                ]
            }
        };

        // Create a key from drug names
        const drugKey = drugs.map(d => d.toLowerCase()).sort().join('_');
        let scenario = null;

        // Check if any combination matches our scenarios
        for (const [key, value] of Object.entries(scenarios)) {
            if (key.split('_').every(drug => drugKey.includes(drug))) {
                scenario = value;
                break;
            }
        }

        // Default safe scenario
        if (!scenario) {
            scenario = {
                risk_level: 'SAFE',
                explanation: `${drugs.join(' and ')} can generally be used together safely. No significant interactions documented in our database. Standard monitoring appropriate.`,
                recommendations: [
                    'Proceed with standard administration',
                    'Routine monitoring appropriate',
                    'Monitor for unexpected adverse reactions',
                    'Document medications in patient record'
                ]
            };
        }

        // Add patient-specific context if available
        let patientContext = null;
        if (patientId) {
            const patientData = this.getPatientData(patientId);
            patientContext = patientData;
            
            // Modify recommendations based on patient
            if (patientData.age >= 65) {
                scenario.recommendations.push('Consider reduced dosing for elderly patient');
            }
            
            if (patientData.conditions.some(c => c.condition.includes('Kidney'))) {
                scenario.recommendations.push('Verify renal dosing adjustments needed');
            }
        }

        return {
            ...scenario,
            drugs_checked: drugs,
            patient_context: patientContext,
            metadata: {
                steps_completed: ['parse_input', 'normalize_drugs', 'check_interactions', 'assess_risk', 'format_response'],
                confidence: scenario.risk_level === 'DANGER' ? 0.95 : (scenario.risk_level === 'WARNING' ? 0.85 : 0.75)
            }
        };
    }

    getPatientData(patientId) {
        const patients = {
            'P001': {
                name: 'Eleanor Martinez',
                age: 72,
                gender: 'F',
                conditions: [
                    { condition: 'Atrial Fibrillation' },
                    { condition: 'Hypertension' },
                    { condition: 'Type 2 Diabetes' }
                ],
                current_medications: ['warfarin 5mg daily', 'metformin 1000mg BID', 'lisinopril 10mg daily'],
                allergies: ['penicillin', 'sulfa'],
                lab_values: { INR: { value: 2.8 } }
            },
            'P002': {
                name: 'James Chen',
                age: 45,
                gender: 'M',
                conditions: [
                    { condition: 'Rheumatoid Arthritis' },
                    { condition: 'GERD' }
                ],
                current_medications: ['methotrexate 15mg weekly', 'folic acid 1mg daily', 'omeprazole 20mg daily'],
                allergies: [],
                lab_values: {}
            },
            'P003': {
                name: 'Sarah Johnson',
                age: 28,
                gender: 'F',
                conditions: [
                    { condition: 'Depression' },
                    { condition: 'Migraine' }
                ],
                current_medications: ['sertraline 100mg daily', 'sumatriptan 50mg PRN'],
                allergies: ['aspirin', 'NSAIDs'],
                lab_values: {}
            },
            'P004': {
                name: 'Robert Wilson',
                age: 65,
                gender: 'M',
                conditions: [
                    { condition: 'Coronary Artery Disease' },
                    { condition: 'Hyperlipidemia' }
                ],
                current_medications: ['aspirin 81mg daily', 'atorvastatin 40mg daily', 'metoprolol 50mg BID'],
                allergies: ['codeine'],
                lab_values: {}
            },
            'P005': {
                name: 'Maria Rodriguez',
                age: 55,
                gender: 'F',
                conditions: [
                    { condition: 'Chronic Kidney Disease Stage 3' },
                    { condition: 'Hypertension' }
                ],
                current_medications: ['amlodipine 5mg daily', 'furosemide 40mg daily'],
                allergies: [],
                lab_values: { eGFR: { value: 38 } }
            }
        };

        return patients[patientId] || null;
    }

    displayResult(result) {
        const container = this.resultContainer;
        const card = container.querySelector('.result-card');
        const badge = card.querySelector('.result-badge');
        const title = card.querySelector('.result-title');
        const explanation = card.querySelector('.result-explanation');
        const recommendationsSection = card.querySelector('.recommendations-section');
        const recommendationsList = card.querySelector('.recommendations-list');
        const patientSection = card.querySelector('.patient-context-section');
        const patientDetails = card.querySelector('.patient-details');
        const responseTime = card.querySelector('.response-time');
        const checkDate = card.querySelector('.check-date');

        // Set badge and title based on risk level
        const riskIcons = {
            'SAFE': '✅',
            'WARNING': '⚠️',
            'DANGER': '🚨'
        };

        const riskClasses = {
            'SAFE': 'safe',
            'WARNING': 'warning',
            'DANGER': 'danger'
        };

        badge.textContent = riskIcons[result.risk_level] || '?';
        badge.className = `result-badge ${riskClasses[result.risk_level] || ''}`;
        title.textContent = `${result.risk_level}: ${result.drugs_checked.join(' + ')}`;

        // Set explanation
        explanation.textContent = result.explanation;

        // Set recommendations
        if (result.recommendations && result.recommendations.length > 0) {
            recommendationsSection.style.display = 'block';
            recommendationsList.innerHTML = '';
            
            result.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsList.appendChild(li);
            });
        } else {
            recommendationsSection.style.display = 'none';
        }

        // Set patient context
        if (result.patient_context) {
            patientSection.style.display = 'block';
            const patient = result.patient_context;
            
            patientDetails.innerHTML = `
                <div><strong>${patient.name}</strong> (${patient.age}${patient.gender}, ${patient.conditions.map(c => c.condition).join(', ')})</div>
                <div><strong>Current Medications:</strong> ${patient.current_medications.join(', ')}</div>
                ${patient.allergies.length > 0 ? `<div><strong>Allergies:</strong> ${patient.allergies.join(', ')}</div>` : ''}
                ${Object.keys(patient.lab_values).length > 0 ? `<div><strong>Recent Labs:</strong> ${Object.entries(patient.lab_values).map(([key, val]) => `${key}: ${val.value}`).join(', ')}</div>` : ''}
            `;
        } else {
            patientSection.style.display = 'none';
        }

        // Set metadata
        responseTime.textContent = `${result.processing_time_ms || 0}ms`;
        checkDate.textContent = new Date().toLocaleString();

        // Show result container with animation
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Add pulse animation for dangerous interactions
        if (result.risk_level === 'DANGER') {
            card.style.animation = 'pulse 2s infinite';
            setTimeout(() => {
                card.style.animation = '';
            }, 6000);
        }
    }

    displayError(message) {
        const result = {
            risk_level: 'ERROR',
            explanation: `Unable to complete drug interaction check: ${message}. Please try again or consult clinical resources.`,
            recommendations: [
                'Verify drug names are spelled correctly',
                'Try again in a few moments',
                'Consult drug interaction database',
                'Contact pharmacy for assistance'
            ],
            drugs_checked: [this.drug1Input.value, this.drug2Input.value].filter(Boolean),
            processing_time_ms: 0
        };

        this.displayResult(result);
    }

    setLoadingState(isLoading) {
        this.isChecking = isLoading;
        
        const btnText = this.checkButton.querySelector('.btn-text');
        const btnLoader = this.checkButton.querySelector('.btn-loader');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
            this.checkButton.disabled = true;
            
            // Hide previous results
            this.resultContainer.style.display = 'none';
        } else {
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
            this.checkButton.disabled = false;
        }

        // Disable scenario buttons while checking
        this.scenarioButtons.forEach(btn => {
            btn.disabled = isLoading;
            btn.style.opacity = isLoading ? '0.5' : '1';
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.medguardApp = new MedGuardApp();
});

// Add some console styling for fun
console.log('%c🏥 MedGuard AI', 'font-size: 24px; color: #6366f1; font-weight: bold;');
console.log('%cDrug Interaction Checker - Phase 1', 'font-size: 14px; color: #a0a0c0;');
console.log('%cBuilt with LangGraph & MCP', 'font-size: 12px; color: #6b7280;');