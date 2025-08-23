/**
 * MedGuard AI Frontend Application - Phase 2
 * 
 * Enhanced with patient context, dosage validation, and sidebar navigation
 */

class MedGuardApp {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.isChecking = false;
        this.currentPage = 'interaction';
        
        this.initializeElements();
        this.bindEvents();
        this.initializePages();
        this.loadPatients();
        this.showWelcomeMessage();
    }

    initializeElements() {
        // Drug interaction elements
        this.drug1Input = document.getElementById('drug1');
        this.drug2Input = document.getElementById('drug2');
        this.drug3Input = document.getElementById('drug3');
        this.patientSelect = document.getElementById('patientSelect');
        this.checkButton = document.getElementById('checkButton');
        this.resultContainer = document.getElementById('resultContainer');
        this.scenarioButtons = document.querySelectorAll('.scenario-btn');

        // Sidebar elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.navItems = document.querySelectorAll('.nav-item');

        // Dosage validation elements
        this.drugNameInput = document.getElementById('drugName');
        this.doseAmount = document.getElementById('doseAmount');
        this.doseUnit = document.getElementById('doseUnit');
        this.doseFrequency = document.getElementById('doseFrequency');
        this.patientSelectDosage = document.getElementById('patientSelectDosage');
        this.validateDosageButton = document.getElementById('validateDosageButton');
        this.dosageResultContainer = document.getElementById('dosageResultContainer');

        // Page elements
        this.pageContents = document.querySelectorAll('.page-content');
        this.interactionPage = document.querySelector('.card.main-card');
        this.interactionScenarios = document.getElementById('interactionScenarios');

        // Patient management
        this.patientsGrid = document.getElementById('patientsGrid');
        this.addPatientBtn = document.getElementById('addPatientBtn');

        // Batch review elements
        this.patientSelectBatch = document.getElementById('patientSelectBatch');
        this.medicationListUpload = document.getElementById('medicationListUpload');
        this.fileUploadArea = document.getElementById('fileUploadArea');
        this.filePreview = document.getElementById('filePreview');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.removeFileBtn = document.getElementById('removeFileBtn');
        this.medicationTextInput = document.getElementById('medicationTextInput');
        this.analyzeBatchButton = document.getElementById('analyzeBatchButton');
        this.batchResultContainer = document.getElementById('batchResultContainer');
        
        // Picture upload elements
        this.pictureUpload = document.getElementById('pictureUpload');
        this.pictureUploadArea = document.getElementById('pictureUploadArea');
        this.picturePreview = document.getElementById('picturePreview');
        this.pictureThumb = document.getElementById('pictureThumb');
        this.pictureName = document.getElementById('pictureName');
        this.removePictureBtn = document.getElementById('removePictureBtn');
        
        // Camera capture elements
        this.cameraArea = document.getElementById('cameraArea');
        this.cameraPreview = document.getElementById('cameraPreview');
        this.cameraVideo = document.getElementById('cameraVideo');
        this.cameraCanvas = document.getElementById('cameraCanvas');
        this.capturedImage = document.getElementById('capturedImage');
        this.captureBtn = document.getElementById('captureBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.stopCameraBtn = document.getElementById('stopCameraBtn');
        
        // Camera state
        this.cameraStream = null;
        this.capturedImageData = null;
        
        // Current medications display
        this.currentMedicationsGroup = document.getElementById('currentMedicationsGroup');
        this.currentMedicationsDisplay = document.getElementById('currentMedicationsDisplay');
        
        // Quick upload elements for drug interactions
        this.quickPictureUpload = document.getElementById('quickPictureUpload');
        this.quickPictureUploadArea = document.getElementById('quickPictureUploadArea');
        this.quickCameraArea = document.getElementById('quickCameraArea');
        this.quickCameraPreview = document.getElementById('quickCameraPreview');
        this.quickCameraVideo = document.getElementById('quickCameraVideo');
        this.quickCameraCanvas = document.getElementById('quickCameraCanvas');
        this.quickCapturedImage = document.getElementById('quickCapturedImage');
        this.quickCaptureBtn = document.getElementById('quickCaptureBtn');
        this.quickRetakeBtn = document.getElementById('quickRetakeBtn');
        this.quickStopCameraBtn = document.getElementById('quickStopCameraBtn');
        
        // Quick upload state
        this.quickCameraStream = null;
        this.quickCapturedImageData = null;
        
        // Phase 3 action buttons
        this.clearResultsBtn = document.getElementById('clearResultsBtn');
        this.flagForDoctorBtn = document.getElementById('flagForDoctorBtn');
        this.clearDosageResultsBtn = document.getElementById('clearDosageResultsBtn');
        this.flagDosageForDoctorBtn = document.getElementById('flagDosageForDoctorBtn');
        this.clearBatchResultsBtn = document.getElementById('clearBatchResultsBtn');
        this.flagBatchForDoctorBtn = document.getElementById('flagBatchForDoctorBtn');
        this.printSummaryBtn = document.getElementById('printSummaryBtn');

        // Drug name mic buttons
        this.drug1Mic = document.getElementById('drug1Mic');
        this.drug2Mic = document.getElementById('drug2Mic');
        this.drug3Mic = document.getElementById('drug3Mic');
        this.drugNameMic = document.getElementById('drugNameMic');

        // Settings
        this.lastUpdatedSpan = document.getElementById('lastUpdated');
        if (this.lastUpdatedSpan) {
            this.lastUpdatedSpan.textContent = new Date().toLocaleDateString();
        }
        
        // Initialize voice recognition
        this.initializeVoiceInput();
    }

    bindEvents() {
        // Sidebar events
        this.sidebarToggle?.addEventListener('click', () => this.openSidebar());
        this.sidebarClose?.addEventListener('click', () => this.closeSidebar());
        this.sidebarOverlay?.addEventListener('click', () => this.closeSidebar());

        // Navigation events
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });

        // Drug interaction events
        this.checkButton?.addEventListener('click', () => this.handleCheck());
        
        [this.drug1Input, this.drug2Input, this.drug3Input].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !this.isChecking) {
                        this.handleCheck();
                    }
                });
            }
        });

        this.scenarioButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleScenario(btn));
        });

        // Patient selection events
        this.patientSelect?.addEventListener('change', () => {
            this.handlePatientSelection();
            this.validateInputs(); // Re-validate when patient changes
        });

        [this.drug1Input, this.drug2Input, this.drug3Input].forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.validateInputs());
            }
        });

        // Dosage validation events
        this.validateDosageButton?.addEventListener('click', () => this.handleDosageValidation());
        
        // Drug name input events
        this.drugNameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isChecking) {
                this.handleDosageValidation();
            }
        });
        this.drugNameInput?.addEventListener('input', () => this.validateDosageInputs());

        // Dosage dropdown events
        [this.doseAmount, this.doseUnit, this.doseFrequency].forEach(select => {
            if (select) {
                select.addEventListener('change', () => this.validateDosageInputs());
            }
        });

        // Patient management events
        this.addPatientBtn?.addEventListener('click', () => this.showAddPatientModal());
        
        // Header add patient button
        document.getElementById('addPatientHeaderBtn')?.addEventListener('click', () => this.showAddPatientModal());

        // Settings button (in sidebar footer)
        const settingsBtn = document.querySelector('.sidebar-settings');
        settingsBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchPage('settings');
        });

        // Batch review events
        this.bindBatchReviewEvents();

        // Drug name voice input events
        this.bindDrugVoiceInputs();

        // Phase 3: Action button events
        this.bindActionButtons();
        
        // Phase 3: Voice input initialization
        this.initializeVoiceInput();

        // Phase 5.1: Pattern tracking initialization
        this.initializePatternTracking();
        
        // Refresh patterns button
        document.getElementById('refreshPatternsBtn')?.addEventListener('click', () => {
            this.updatePatternAnalytics();
            this.showNotification('Pattern analytics refreshed', 'success');
        });

        // Quick upload events for drug interactions
        this.quickPictureUploadArea?.addEventListener('click', () => {
            this.quickPictureUpload?.click();
        });

        this.quickPictureUpload?.addEventListener('change', (e) => {
            this.handleQuickPictureUpload(e.target.files[0]);
        });

        this.quickCameraArea?.addEventListener('click', () => {
            this.startQuickCamera();
        });

        this.quickCaptureBtn?.addEventListener('click', () => {
            this.captureQuickPhoto();
        });

        this.quickRetakeBtn?.addEventListener('click', () => {
            this.retakeQuickPhoto();
        });

        this.quickStopCameraBtn?.addEventListener('click', () => {
            this.stopQuickCamera();
        });
    }

    // Sidebar management
    openSidebar() {
        this.sidebar.classList.add('open');
        this.sidebarOverlay.classList.add('active');
        document.body.classList.add('sidebar-open');
    }

    closeSidebar() {
        this.sidebar.classList.remove('open');
        this.sidebarOverlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }

    // Page management
    initializePages() {
        this.switchPage('interaction');
    }

    switchPage(page) {
        // Update nav items
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Hide result containers when switching pages
        if (this.resultContainer) {
            this.resultContainer.style.display = 'none';
        }
        if (this.dosageResultContainer) {
            this.dosageResultContainer.style.display = 'none';
        }

        // Show/hide page content
        if (page === 'interaction') {
            this.interactionPage.style.display = 'block';
            this.interactionScenarios.style.display = 'block';
            this.pageContents.forEach(content => {
                content.style.display = 'none';
            });
            // Refresh patient medications display if patient is selected
            this.handlePatientSelection();
        } else {
            this.interactionPage.style.display = 'none';
            this.interactionScenarios.style.display = 'none';
            this.pageContents.forEach(content => {
                content.style.display = content.id === `${page}Page` ? 'block' : 'none';
            });
        }

        this.currentPage = page;
        
        // Load page-specific data
        if (page === 'patients') {
            this.loadPatients();
        } else if (page === 'batch') {
            this.validateBatchInputs();
        } else if (page === 'patterns') {
            this.updatePatternAnalytics();
        }
        
        this.closeSidebar();
    }

    // Dosage validation
    validateDosageInputs() {
        const drugName = this.drugNameInput?.value.trim();
        const doseAmount = this.doseAmount?.value;
        const doseUnit = this.doseUnit?.value;
        const doseFrequency = this.doseFrequency?.value;
        const patientId = this.patientSelectDosage?.value;
        
        const isValid = drugName.length >= 2 && doseAmount && doseUnit && doseFrequency && patientId;
        if (this.validateDosageButton) {
            this.validateDosageButton.disabled = !isValid || this.isChecking;
        }
        
        return isValid;
    }

    async handleDosageValidation() {
        if (!this.validateDosageInputs() || this.isChecking) {
            return;
        }

        // Construct dosage string from dropdown selections
        const dosageString = `${this.doseAmount.value}${this.doseUnit.value} ${this.doseFrequency.value}`;
        
        const drugInfo = {
            drug_name: this.drugNameInput.value.trim(),
            dosage: dosageString
        };
        const patientId = this.patientSelectDosage.value;

        this.setDosageLoadingState(true);
        
        try {
            const result = await this.validateDosage(drugInfo, patientId);
            this.displayDosageResult(result);
        } catch (error) {
            console.error('Error validating dosage:', error);
            this.displayDosageError(error.message);
        } finally {
            this.setDosageLoadingState(false);
        }
    }

    async validateDosage(drugInfo, patientId) {
        const startTime = Date.now();
        
        const response = await fetch(`${this.apiBaseUrl}/api/validate-dosage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                drug: drugInfo,
                patient_id: patientId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        result.processing_time_ms = Date.now() - startTime;
        
        return result;
    }

    displayDosageResult(result) {
        const container = this.dosageResultContainer;
        const card = container.querySelector('.result-card');
        const badge = card.querySelector('.result-badge');
        const title = card.querySelector('.result-title');
        const explanation = card.querySelector('.result-explanation');
        const dosageDetails = card.querySelector('.dosage-details');
        const recommendationsSection = card.querySelector('.recommendations-section');
        const recommendationsList = card.querySelector('.recommendations-list');
        const responseTime = card.querySelector('.response-time');
        const checkDate = card.querySelector('.check-date');

        // Set badge and title based on validation status
        const statusIcons = {
            'APPROPRIATE': '✅',
            'SUBOPTIMAL': '⚠️',
            'INAPPROPRIATE': '🚨',
            'EXCESSIVE': '🔴',
            'CONTRAINDICATED': '⛔',
            'UNPARSEABLE': '❓'
        };

        const statusClasses = {
            'APPROPRIATE': 'safe',
            'SUBOPTIMAL': 'warning',
            'INAPPROPRIATE': 'danger',
            'EXCESSIVE': 'danger',
            'CONTRAINDICATED': 'danger',
            'UNPARSEABLE': 'warning'
        };

        badge.textContent = statusIcons[result.validation_status] || '?';
        badge.className = `result-badge ${statusClasses[result.validation_status] || 'warning'}`;
        title.textContent = `${result.validation_status}: ${result.proposed_dose?.original_string || 'Dosage'}`;

        explanation.textContent = result.explanation;

        // Set dosage details
        if (result.recommended_dose_range || result.patient_adjustments) {
            dosageDetails.innerHTML = '';
            
            if (result.proposed_dose) {
                const proposedItem = document.createElement('div');
                proposedItem.className = 'dosage-detail-item';
                proposedItem.innerHTML = `
                    <span class="dosage-detail-label">Proposed Dose</span>
                    <span class="dosage-detail-value">${result.proposed_dose.original_string}</span>
                `;
                dosageDetails.appendChild(proposedItem);
            }

            if (result.recommended_dose_range) {
                const recommendedItem = document.createElement('div');
                recommendedItem.className = 'dosage-detail-item';
                recommendedItem.innerHTML = `
                    <span class="dosage-detail-label">Recommended Range</span>
                    <span class="dosage-detail-value">${result.recommended_dose_range.min_dose}-${result.recommended_dose_range.max_dose}${result.recommended_dose_range.unit} ${result.recommended_dose_range.frequency}</span>
                `;
                dosageDetails.appendChild(recommendedItem);
            }

            if (result.patient_adjustments && result.patient_adjustments.reasons.length > 0) {
                const adjustmentsItem = document.createElement('div');
                adjustmentsItem.className = 'dosage-detail-item';
                adjustmentsItem.innerHTML = `
                    <span class="dosage-detail-label">Patient Adjustments</span>
                    <span class="dosage-detail-value">Factor: ${result.patient_adjustments.overall_factor.toFixed(2)}</span>
                `;
                dosageDetails.appendChild(adjustmentsItem);

                result.patient_adjustments.reasons.forEach(reason => {
                    const reasonItem = document.createElement('div');
                    reasonItem.className = 'dosage-detail-item';
                    reasonItem.innerHTML = `
                        <span class="dosage-detail-label">Adjustment Reason</span>
                        <span class="dosage-detail-value">${reason}</span>
                    `;
                    dosageDetails.appendChild(reasonItem);
                });
            }
        }

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

        // Set metadata
        responseTime.textContent = `${result.processing_time_ms || 0}ms`;
        checkDate.textContent = new Date().toLocaleString();

        // Show result container
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    displayDosageError(message) {
        const result = {
            validation_status: 'ERROR',
            explanation: `Unable to complete dosage validation: ${message}. Please try again or consult clinical resources.`,
            recommendations: [
                'Verify drug name and dosage format',
                'Ensure patient is selected',
                'Try again in a few moments',
                'Consult drug reference for dosing guidance'
            ],
            proposed_dose: {
                original_string: `${this.doseAmount?.value || ''}${this.doseUnit?.value || ''} ${this.doseFrequency?.value || ''}`.trim()
            },
            processing_time_ms: 0
        };

        this.displayDosageResult(result);
    }

    setDosageLoadingState(isLoading) {
        this.isChecking = isLoading;
        
        const btnText = this.validateDosageButton?.querySelector('.btn-text');
        const btnLoader = this.validateDosageButton?.querySelector('.btn-loader');
        
        if (btnText && btnLoader) {
            if (isLoading) {
                btnText.style.display = 'none';
                btnLoader.style.display = 'flex';
                this.validateDosageButton.disabled = true;
                
                this.dosageResultContainer.style.display = 'none';
            } else {
                btnText.style.display = 'block';
                btnLoader.style.display = 'none';
                this.validateDosageButton.disabled = false;
            }
        }
    }

    // Patient management
    async loadPatients() {
        try {
            // In a real app, this would fetch from the server
            this.patients = [
                { 
                    id: 'P001', 
                    name: 'Eleanor Martinez', 
                    age: 72, 
                    gender: 'F', 
                    conditions: ['AFib', 'HTN', 'DM'], 
                    weight_kg: 68, 
                    eGFR: 45,
                    currentMedications: [
                        { name: 'warfarin', dose: '5mg', frequency: 'daily' },
                        { name: 'metoprolol', dose: '50mg', frequency: 'twice daily' },
                        { name: 'metformin', dose: '1000mg', frequency: 'twice daily' },
                        { name: 'lisinopril', dose: '10mg', frequency: 'daily' }
                    ]
                },
                { 
                    id: 'P002', 
                    name: 'James Chen', 
                    age: 45, 
                    gender: 'M', 
                    conditions: ['RA', 'GERD'], 
                    weight_kg: 75, 
                    eGFR: 85,
                    currentMedications: [
                        { name: 'methotrexate', dose: '15mg', frequency: 'weekly' },
                        { name: 'folic acid', dose: '5mg', frequency: 'weekly' },
                        { name: 'omeprazole', dose: '20mg', frequency: 'daily' }
                    ]
                },
                { 
                    id: 'P003', 
                    name: 'Sarah Johnson', 
                    age: 28, 
                    gender: 'F', 
                    conditions: ['Depression', 'Migraine'], 
                    weight_kg: 62, 
                    eGFR: 95,
                    currentMedications: [
                        { name: 'sertraline', dose: '100mg', frequency: 'daily' },
                        { name: 'sumatriptan', dose: '50mg', frequency: 'PRN' }
                    ]
                },
                { 
                    id: 'P004', 
                    name: 'Robert Wilson', 
                    age: 65, 
                    gender: 'M', 
                    conditions: ['CAD', 'Hyperlipidemia'], 
                    weight_kg: 82, 
                    eGFR: 72,
                    currentMedications: [
                        { name: 'atorvastatin', dose: '40mg', frequency: 'daily' },
                        { name: 'aspirin', dose: '81mg', frequency: 'daily' },
                        { name: 'metoprolol', dose: '25mg', frequency: 'twice daily' }
                    ]
                },
                { 
                    id: 'P005', 
                    name: 'Maria Rodriguez', 
                    age: 55, 
                    gender: 'F', 
                    conditions: ['CKD Stage 3', 'HTN'], 
                    weight_kg: 58, 
                    eGFR: 32,
                    currentMedications: [
                        { name: 'lisinopril', dose: '5mg', frequency: 'daily' },
                        { name: 'furosemide', dose: '20mg', frequency: 'daily' },
                        { name: 'calcium carbonate', dose: '500mg', frequency: 'twice daily' }
                    ]
                }
            ];

            this.renderPatients(this.patients);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    getPatientContext(patientId) {
        if (!patientId || !this.patients) {
            return null;
        }

        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) {
            return null;
        }

        // Convert to the format expected by the subagents
        return {
            demographics: {
                age: patient.age,
                gender: patient.gender,
                weight_kg: patient.weight_kg
            },
            conditions: patient.conditions.map(condition => ({
                condition: condition,
                status: 'active'
            })),
            lab_values: {
                eGFR: {
                    value: patient.eGFR,
                    unit: 'mL/min/1.73m²',
                    date: new Date().toISOString().split('T')[0]
                },
                // Add some additional lab values for demo
                ALT: {
                    value: patient.id === 'P005' ? 95 : 35, // Maria has elevated ALT
                    unit: 'U/L',
                    date: new Date().toISOString().split('T')[0]
                }
            },
            allergies: [],
            pregnancy_status: patient.gender === 'F' && patient.age < 50 ? 'unknown' : 'not_applicable'
        };
    }

    handlePatientSelection() {
        const selectedPatientId = this.patientSelect?.value;
        
        if (selectedPatientId && this.patients) {
            const patient = this.patients.find(p => p.id === selectedPatientId);
            if (patient) {
                this.displayCurrentMedications(patient);
            }
        } else {
            // Hide medications display when no patient is selected
            this.currentMedicationsGroup.style.display = 'none';
        }
    }

    displayCurrentMedications(patient) {
        if (!patient.currentMedications || patient.currentMedications.length === 0) {
            this.currentMedicationsDisplay.innerHTML = '<div class="no-medications">No current medications on file</div>';
            this.currentMedicationsGroup.style.display = 'block';
            return;
        }

        const medicationsHtml = `
            <div class="medications-grid">
                ${patient.currentMedications.map(med => `
                    <div class="medication-item">
                        <div class="medication-name">${med.name}</div>
                        <div class="medication-details">${med.frequency}</div>
                        <div class="medication-dose">${med.dose}</div>
                    </div>
                `).join('')}
            </div>
        `;

        this.currentMedicationsDisplay.innerHTML = medicationsHtml;
        this.currentMedicationsGroup.style.display = 'block';
    }

    renderPatients(patients) {
        if (!this.patientsGrid) return;

        this.patientsGrid.innerHTML = '';

        patients.forEach(patient => {
            const patientCard = document.createElement('div');
            patientCard.className = 'patient-card';
            patientCard.innerHTML = `
                <div class="patient-header">
                    <div class="patient-info">
                        <h4>${patient.name}</h4>
                        <div class="patient-demographics">${patient.age}${patient.gender} • ID: ${patient.id}</div>
                    </div>
                    <div class="patient-avatar">${patient.name.split(' ').map(n => n[0]).join('')}</div>
                </div>
                <div class="patient-conditions">
                    ${patient.conditions.map(condition => 
                        `<span class="condition-tag">${condition}</span>`
                    ).join('')}
                </div>
                <div class="patient-actions">
                    <button class="btn btn-small btn-secondary" onclick="window.medguardApp.viewPatient('${patient.id}')">View Details</button>
                    <button class="btn btn-small btn-secondary" onclick="window.medguardApp.editPatient('${patient.id}')">Edit</button>
                </div>
            `;
            this.patientsGrid.appendChild(patientCard);
        });
    }

    viewPatient(patientId) {
        console.log(`Viewing patient: ${patientId}`);
        // In a real app, this would open a patient details modal
    }

    editPatient(patientId) {
        console.log(`Editing patient: ${patientId}`);
        // In a real app, this would open an edit patient modal
    }

    showAddPatientModal() {
        // Create and show the add patient modal
        const modal = this.createAddPatientModal();
        document.body.appendChild(modal);
        
        // Focus on first input
        setTimeout(() => {
            modal.querySelector('#newPatientName').focus();
        }, 100);
    }

    createAddPatientModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Patient</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addPatientForm">
                        <div class="form-group">
                            <label for="newPatientName">Full Name *</label>
                            <input type="text" id="newPatientName" required placeholder="e.g., John Smith">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="newPatientAge">Age *</label>
                                <input type="number" id="newPatientAge" min="0" max="120" required placeholder="e.g., 45">
                            </div>
                            <div class="form-group">
                                <label for="newPatientGender">Gender *</label>
                                <select id="newPatientGender" required>
                                    <option value="">Select Gender</option>
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="O">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="newPatientWeight">Weight (kg)</label>
                                <input type="number" id="newPatientWeight" min="0" max="300" placeholder="e.g., 70">
                            </div>
                            <div class="form-group">
                                <label for="newPatientEgfr">eGFR (mL/min/1.73m²)</label>
                                <input type="number" id="newPatientEgfr" min="0" max="150" placeholder="e.g., 85">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="newPatientConditions">Medical Conditions</label>
                            <input type="text" id="newPatientConditions" placeholder="e.g., Hypertension, Diabetes (comma-separated)">
                            <small>Enter conditions separated by commas</small>
                        </div>
                        <div class="form-group">
                            <label for="newPatientAllergies">Drug Allergies</label>
                            <input type="text" id="newPatientAllergies" placeholder="e.g., Penicillin, Sulfa (comma-separated)">
                            <small>Enter allergies separated by commas</small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelPatientBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="savePatientBtn">
                        <svg style="width: 16px; height: 16px; margin-right: 0.5rem;" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                        Add Patient
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#cancelPatientBtn');
        const saveBtn = modal.querySelector('#savePatientBtn');
        const form = modal.querySelector('#addPatientForm');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Handle form submission
        const handleSubmit = (e) => {
            e.preventDefault();
            this.saveNewPatient(form, closeModal);
        };

        form.addEventListener('submit', handleSubmit);
        saveBtn.addEventListener('click', handleSubmit);

        return modal;
    }

    saveNewPatient(form, closeCallback) {
        const formData = new FormData(form);
        const name = form.querySelector('#newPatientName').value.trim();
        const age = parseInt(form.querySelector('#newPatientAge').value);
        const gender = form.querySelector('#newPatientGender').value;
        const weight = parseFloat(form.querySelector('#newPatientWeight').value) || 70;
        const egfr = parseFloat(form.querySelector('#newPatientEgfr').value) || 90;
        const conditions = form.querySelector('#newPatientConditions').value
            .split(',').map(c => c.trim()).filter(c => c.length > 0);
        const allergies = form.querySelector('#newPatientAllergies').value
            .split(',').map(a => a.trim()).filter(a => a.length > 0);

        if (!name || !age || !gender) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Generate new patient ID
        const newPatientId = `P${String(this.patients.length + 1).padStart(3, '0')}`;

        const newPatient = {
            id: newPatientId,
            name: name,
            age: age,
            gender: gender,
            weight_kg: weight,
            eGFR: egfr,
            conditions: conditions,
            allergies: allergies,
            created_date: new Date().toISOString().split('T')[0]
        };

        // Add to patients array
        this.patients.push(newPatient);

        // Update all patient selects
        this.updatePatientSelects();

        // Re-render patients grid
        this.renderPatients(this.patients);

        // Show success notification
        this.showNotification(`Patient ${name} added successfully`, 'success');

        // Close modal
        closeCallback();

        // Log for pattern tracking
        this.logPatternData('patient_added', {
            patient_id: newPatientId,
            demographics: { age, gender, weight_kg: weight },
            conditions_count: conditions.length,
            allergies_count: allergies.length
        });
    }

    // Phase 5.1: Pattern Analytics Implementation
    logPatternData(eventType, data) {
        // Initialize pattern tracking if not exists
        if (!this.patternTracker) {
            this.initializePatternTracking();
        }

        const event = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: eventType,
            timestamp: new Date().toISOString(),
            data: data,
            session_id: this.sessionId
        };

        // Store in pattern tracker
        this.patternTracker.events.push(event);

        // Limit stored events to prevent memory issues
        if (this.patternTracker.events.length > 1000) {
            this.patternTracker.events = this.patternTracker.events.slice(-500);
        }

        // Save to localStorage for persistence
        this.savePatternData();

        // Update pattern analytics in real-time
        this.updatePatternAnalytics();

        console.log(`Pattern logged: ${eventType}`, event);
    }

    initializePatternTracking() {
        // Generate or retrieve session ID
        this.sessionId = sessionStorage.getItem('medguard_session_id') || 
                        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('medguard_session_id', this.sessionId);

        // Load existing pattern data or initialize
        const savedData = localStorage.getItem('medguard_pattern_data');
        
        this.patternTracker = savedData ? JSON.parse(savedData) : {
            initialized: new Date().toISOString(),
            events: [],
            analytics: {
                totalInteractions: 0,
                commonDrugPairs: new Map(),
                riskTolerance: 'medium',
                patientDemographics: {
                    averageAge: 0,
                    genderDistribution: { M: 0, F: 0, O: 0 },
                    commonConditions: new Map(),
                    riskFactors: new Map()
                },
                thresholdAdjustments: new Map(),
                learningMetrics: {
                    accuracyImprovement: 0,
                    falsePositiveReduction: 0,
                    clinicalRelevanceScore: 50 // Starting baseline
                }
            }
        };

        // Convert Maps back from JSON (Maps don't serialize well)
        if (savedData) {
            const data = JSON.parse(savedData);
            this.patternTracker.analytics.commonDrugPairs = new Map(data.analytics.commonDrugPairs || []);
            this.patternTracker.analytics.patientDemographics.commonConditions = new Map(data.analytics.patientDemographics.commonConditions || []);
            this.patternTracker.analytics.patientDemographics.riskFactors = new Map(data.analytics.patientDemographics.riskFactors || []);
            this.patternTracker.analytics.thresholdAdjustments = new Map(data.analytics.thresholdAdjustments || []);
        }

        console.log('Pattern tracking initialized:', this.patternTracker);
    }

    savePatternData() {
        if (!this.patternTracker) return;

        // Convert Maps to arrays for JSON serialization
        const dataToSave = {
            ...this.patternTracker,
            analytics: {
                ...this.patternTracker.analytics,
                commonDrugPairs: Array.from(this.patternTracker.analytics.commonDrugPairs.entries()),
                patientDemographics: {
                    ...this.patternTracker.analytics.patientDemographics,
                    commonConditions: Array.from(this.patternTracker.analytics.patientDemographics.commonConditions.entries()),
                    riskFactors: Array.from(this.patternTracker.analytics.patientDemographics.riskFactors.entries())
                },
                thresholdAdjustments: Array.from(this.patternTracker.analytics.thresholdAdjustments.entries())
            }
        };

        localStorage.setItem('medguard_pattern_data', JSON.stringify(dataToSave));
    }

    updatePatternAnalytics() {
        if (!this.patternTracker || this.currentPage !== 'patterns') return;

        const analytics = this.analyzePatterns();
        this.renderPatternAnalytics(analytics);
    }

    analyzePatterns() {
        const events = this.patternTracker.events;
        const analytics = this.patternTracker.analytics;

        // Analyze interaction events
        const interactionEvents = events.filter(e => e.type === 'drug_interaction_check');
        analytics.totalInteractions = interactionEvents.length;

        // Find common drug pairs
        interactionEvents.forEach(event => {
            if (event.data && event.data.drugs) {
                const drugs = event.data.drugs.sort();
                const pair = drugs.join(' + ');
                analytics.commonDrugPairs.set(pair, (analytics.commonDrugPairs.get(pair) || 0) + 1);
            }
        });

        // Analyze patient demographics
        const patientEvents = events.filter(e => e.type === 'patient_added' || e.type === 'patient_interaction');
        let totalAge = 0;
        let patientCount = 0;

        patientEvents.forEach(event => {
            if (event.data && event.data.demographics) {
                const demo = event.data.demographics;
                if (demo.age) {
                    totalAge += demo.age;
                    patientCount++;
                    analytics.patientDemographics.genderDistribution[demo.gender] = 
                        (analytics.patientDemographics.genderDistribution[demo.gender] || 0) + 1;
                }
            }
            
            if (event.data && event.data.conditions) {
                event.data.conditions.forEach(condition => {
                    analytics.patientDemographics.commonConditions.set(
                        condition, 
                        (analytics.patientDemographics.commonConditions.get(condition) || 0) + 1
                    );
                });
            }
        });

        analytics.patientDemographics.averageAge = patientCount > 0 ? Math.round(totalAge / patientCount) : 0;

        // Calculate learning metrics (simulated improvement)
        const daysSinceStart = Math.max(1, Math.floor((Date.now() - new Date(this.patternTracker.initialized).getTime()) / (1000 * 60 * 60 * 24)));
        const interactionCount = Math.max(1, analytics.totalInteractions);
        
        // Simulate gradual improvement based on interaction volume and time
        analytics.learningMetrics.accuracyImprovement = Math.min(95, 50 + (interactionCount * 0.8) + (daysSinceStart * 2));
        analytics.learningMetrics.falsePositiveReduction = Math.min(90, 30 + (interactionCount * 1.2) + (daysSinceStart * 3));
        analytics.learningMetrics.clinicalRelevanceScore = Math.min(98, 60 + (interactionCount * 0.6) + (daysSinceStart * 1.5));

        // Auto-generate threshold adjustments based on patterns
        this.generateThresholdAdjustments(analytics);

        return analytics;
    }

    generateThresholdAdjustments(analytics) {
        // Clear existing adjustments
        analytics.thresholdAdjustments.clear();

        // High elderly population = higher sensitivity for certain drugs
        if (analytics.patientDemographics.averageAge > 65) {
            analytics.thresholdAdjustments.set('warfarin_sensitivity', {
                drug_pair: 'Warfarin + Aspirin',
                adjustment: 'Sensitivity: +25%',
                reason: 'High elderly patient volume',
                impact: 'critical'
            });
        }

        // High CKD prevalence = kidney-related adjustments
        const ckdCount = analytics.patientDemographics.commonConditions.get('CKD Stage 3') || 0;
        if (ckdCount > 0) {
            analytics.thresholdAdjustments.set('ace_diuretic_sensitivity', {
                drug_pair: 'ACE Inhibitors + Diuretics',
                adjustment: 'Sensitivity: +15%',
                reason: 'CKD patient prevalence',
                impact: 'moderate'
            });

            analytics.thresholdAdjustments.set('metformin_contrast', {
                drug_pair: 'Metformin + Contrast',
                adjustment: 'Alert Level: HIGH',
                reason: 'eGFR patterns suggest risk',
                impact: 'high'
            });
        }

        // High interaction volume = refined thresholds
        if (analytics.totalInteractions > 50) {
            analytics.thresholdAdjustments.set('nsaid_optimization', {
                drug_pair: 'NSAIDs + ACE Inhibitors',
                adjustment: 'Threshold: Optimized',
                reason: 'Volume-based refinement',
                impact: 'moderate'
            });
        }
    }

    renderPatternAnalytics(analytics) {
        // Update main stats
        document.getElementById('totalInteractions').textContent = analytics.totalInteractions;
        document.getElementById('interactionsTrend').textContent = `+${Math.min(analytics.totalInteractions, 15)} today`;
        
        document.getElementById('commonPairs').textContent = analytics.commonDrugPairs.size;
        document.getElementById('pairsTrend').textContent = `${Math.max(0, analytics.commonDrugPairs.size - 3)} new patterns`;

        // Update demographics
        document.getElementById('avgAge').textContent = `${analytics.patientDemographics.averageAge} years`;
        
        const topConditions = Array.from(analytics.patientDemographics.commonConditions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([condition]) => condition);
        document.getElementById('commonConditions').textContent = topConditions.join(', ') || 'Loading...';

        const elderlyPercent = analytics.patientDemographics.averageAge > 65 ? 30 : 15;
        document.getElementById('riskSensitivity').textContent = `${elderlyPercent}% Higher for Elderly`;

        // Update learning metrics
        const accuracyEl = document.querySelector('.progress-fill');
        if (accuracyEl) {
            accuracyEl.style.width = `${analytics.learningMetrics.accuracyImprovement}%`;
            accuracyEl.parentElement.nextElementSibling.textContent = 
                `${Math.round(analytics.learningMetrics.accuracyImprovement)}% (+${Math.round(analytics.learningMetrics.accuracyImprovement - 50)}% from baseline)`;
        }

        // Update frequent interactions list
        this.renderFrequentInteractions(analytics.commonDrugPairs);

        // Update threshold adjustments
        this.renderThresholdAdjustments(analytics.thresholdAdjustments);
    }

    renderFrequentInteractions(drugPairs) {
        const container = document.getElementById('frequentInteractionsList');
        if (!container) return;

        const sortedPairs = Array.from(drugPairs.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sortedPairs.length === 0) {
            container.innerHTML = '<div class="pattern-loading">No interaction patterns detected yet. Check some drug interactions to see patterns emerge!</div>';
            return;
        }

        container.innerHTML = sortedPairs.map(([pair, count]) => `
            <div class="pattern-item">
                <div class="pattern-drugs">${pair}</div>
                <div class="pattern-count">${count} occurrences</div>
                <div class="pattern-insight">Frequently checked in your clinic</div>
            </div>
        `).join('');
    }

    renderThresholdAdjustments(adjustments) {
        const container = document.getElementById('thresholdAdjustments');
        if (!container || adjustments.size === 0) return;

        const adjustmentsList = Array.from(adjustments.values());
        
        container.innerHTML = adjustmentsList.map(adj => `
            <div class="adjustment-item">
                <div class="adjustment-drug">${adj.drug_pair}</div>
                <div class="adjustment-change">${adj.adjustment}</div>
                <div class="adjustment-reason">${adj.reason}</div>
            </div>
        `).join('');
    }

    // Override drug interaction logging to include pattern tracking
    async handleCheck() {
        const originalResult = await super.handleCheck?.() || this.performDrugInteractionCheck();
        
        // Log the interaction for pattern tracking
        const drugs = [this.drug1Input.value, this.drug2Input.value, this.drug3Input.value].filter(Boolean);
        if (drugs.length >= 2) {
            this.logPatternData('drug_interaction_check', {
                drugs: drugs,
                patient_id: this.patientSelect.value || null,
                result_risk_level: originalResult?.risk_level || 'unknown',
                timestamp: new Date().toISOString()
            });
        }

        return originalResult;
    }

    updatePatientSelects() {
        // Update all patient select dropdowns
        [this.patientSelect, this.patientSelectDosage, this.patientSelectBatch].forEach(select => {
            if (select) {
                // Keep current selection
                const currentValue = select.value;
                
                // Clear and repopulate
                const defaultOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (defaultOption) select.appendChild(defaultOption);
                
                // Add patients
                this.patients.forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.id;
                    option.textContent = `${patient.name} (${patient.age}${patient.gender}) - ${patient.conditions.join(', ') || 'No conditions'}`;
                    select.appendChild(option);
                });
                
                // Restore selection if still valid
                if (currentValue && this.patients.find(p => p.id === currentValue)) {
                    select.value = currentValue;
                }
            }
        });
    }

    // Inherited methods from Phase 1 (simplified)
    showWelcomeMessage() {
        console.log('🏥 MedGuard AI Phase 2 initialized');
        console.log('💊 Drug interaction checking + dosage validation ready');
        console.log('👥 Patient management system active');
    }

    validateInputs() {
        const drug1 = this.drug1Input?.value.trim();
        const drug2 = this.drug2Input?.value.trim();
        const drug3 = this.drug3Input?.value.trim();
        const selectedPatient = this.patientSelect?.value;
        
        // Count manually entered drugs (minimum 2 characters each)
        const manualDrugs = [drug1, drug2, drug3].filter(drug => drug && drug.length >= 2);
        const manualDrugCount = manualDrugs.length;
        
        // Get patient's current medications count
        let patientMedCount = 0;
        if (selectedPatient && this.patients) {
            const patient = this.patients.find(p => p.id === selectedPatient);
            if (patient && patient.currentMedications) {
                patientMedCount = patient.currentMedications.length;
            }
        }
        
        // Enable check interactions if:
        // 1. At least 2 manual drugs are entered, OR
        // 2. At least 1 manual drug + patient with medications is selected
        let isValid = false;
        
        if (manualDrugCount >= 2) {
            // Traditional case: 2+ drugs entered manually
            isValid = true;
        } else if (manualDrugCount >= 1 && selectedPatient && patientMedCount > 0) {
            // New case: 1 drug + patient with current medications
            isValid = true;
        }
        
        if (this.checkButton) {
            this.checkButton.disabled = !isValid || this.isChecking;
        }
        
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
        const patientId = this.patientSelect.value || null;

        // Add manually entered drugs (minimum 2 characters each)
        [drug1, drug2, drug3].forEach(drug => {
            if (drug && drug.length >= 2) {
                drugs.push(drug);
            }
        });

        // If patient is selected, add their current medications to the interaction check
        if (patientId && this.patients) {
            const patient = this.patients.find(p => p.id === patientId);
            if (patient && patient.currentMedications) {
                patient.currentMedications.forEach(med => {
                    // Add patient medications to the drugs list for comprehensive interaction checking
                    drugs.push(med.name);
                });
            }
        }

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

    async checkInteractions(drugs, patientId = null) {
        // Simulate the primary agent response for Phase 2
        const mockResult = await this.simulatePrimaryAgent(drugs, patientId);
        return mockResult;
    }

    async simulatePrimaryAgent(drugs, patientId) {
        // Simulate processing delay
        await this.delay(Math.random() * 2000 + 1000);
        
        // Use the same mock scenarios from Phase 1
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

        const drugKey = drugs.map(d => d.toLowerCase()).sort().join('_');
        let scenario = null;

        for (const [key, value] of Object.entries(scenarios)) {
            if (key.split('_').every(drug => drugKey.includes(drug))) {
                scenario = value;
                break;
            }
        }

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

        let patientContext = null;
        if (patientId) {
            const patientData = this.getPatientData(patientId);
            patientContext = patientData;
            
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
                confidence: scenario.risk_level === 'DANGER' ? 0.95 : (scenario.risk_level === 'WARNING' ? 0.85 : 0.75),
                version: 'phase_2'
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

    // UI helper methods
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

    async handleScenario(button) {
        if (this.isChecking) return;
        
        const drugs = JSON.parse(button.dataset.drugs);
        const patientId = button.dataset.patient;
        
        // Fill inputs
        if (this.drug1Input) this.drug1Input.value = drugs[0] || '';
        if (this.drug2Input) this.drug2Input.value = drugs[1] || '';
        if (this.drug3Input) this.drug3Input.value = drugs[2] || '';
        if (this.patientSelect) this.patientSelect.value = patientId || '';
        
        // Animate button
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
        setTimeout(() => {
            this.handleCheck();
        }, 300);
    }

    // Phase 3: Action Button Methods
    bindActionButtons() {
        // Clear Results buttons
        const clearBtn = document.getElementById('clearResultsBtn');
        const clearDosageBtn = document.getElementById('clearDosageResultsBtn');
        
        clearBtn?.addEventListener('click', () => this.clearResults('interaction'));
        clearDosageBtn?.addEventListener('click', () => this.clearResults('dosage'));
        
        // Flag for Doctor buttons
        const flagBtn = document.getElementById('flagForDoctorBtn');
        const flagDosageBtn = document.getElementById('flagDosageForDoctorBtn');
        
        flagBtn?.addEventListener('click', () => this.flagForDoctor('interaction'));
        flagDosageBtn?.addEventListener('click', () => this.flagForDoctor('dosage'));
        
        // Voice Input button
        const voiceBtn = document.getElementById('voiceInputBtn');
        voiceBtn?.addEventListener('click', () => this.toggleVoiceInput());
    }

    clearResults(type) {
        if (type === 'interaction') {
            this.resultContainer.style.display = 'none';
            this.drug1Input.value = '';
            this.drug2Input.value = '';
            this.drug3Input.value = '';
            this.patientSelect.value = '';
            this.validateInputs();
        } else if (type === 'dosage') {
            this.dosageResultContainer.style.display = 'none';
            this.drugNameInput.value = '';
            this.doseAmount.value = '';
            this.doseUnit.value = '';
            this.doseFrequency.value = '';
            this.patientSelectDosage.value = '';
            this.validateDosageInputs();
        }
        
        // Show success feedback
        this.showNotification('Results cleared successfully', 'success');
    }

    flagForDoctor(type) {
        const timestamp = new Date().toISOString();
        let flagData = {
            type,
            timestamp,
            flagged_by: 'nurse_user',
            status: 'pending_review'
        };

        if (type === 'interaction') {
            flagData.drugs = [
                this.drug1Input.value,
                this.drug2Input.value,
                this.drug3Input.value
            ].filter(Boolean);
            flagData.patient_id = this.patientSelect.value;
        } else if (type === 'dosage') {
            flagData.drug_name = this.drugNameInput.value;
            flagData.proposed_dose = `${this.doseAmount.value}${this.doseUnit.value} ${this.doseFrequency.value}`.trim();
            flagData.patient_id = this.patientSelectDosage.value;
        }

        // Store flag in localStorage for demo purposes
        const flags = JSON.parse(localStorage.getItem('doctor_flags') || '[]');
        flags.push(flagData);
        localStorage.setItem('doctor_flags', JSON.stringify(flags));
        
        // Show success feedback
        this.showNotification('Flagged for doctor review successfully', 'warning');
        
        // In a real system, this would send to a backend API
        console.log('Flagged for doctor review:', flagData);
    }

    // Phase 3: Voice Input Methods
    initializeVoiceInput() {
        this.isRecording = false;
        this.recognition = null;
        
        // Check for Web Speech API support
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.processVoiceInput(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showNotification('Voice input error. Please try again.', 'error');
                this.stopVoiceInput();
            };
            
            this.recognition.onend = () => {
                this.stopVoiceInput();
            };
        } else {
            console.warn('Web Speech API not supported');
        }
    }

    toggleVoiceInput() {
        if (!this.recognition) {
            this.showNotification('Voice input not supported in this browser', 'error');
            return;
        }
        
        if (this.isRecording) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }

    startVoiceInput() {
        this.isRecording = true;
        const voiceBtn = document.getElementById('voiceInputBtn');
        
        if (voiceBtn) {
            voiceBtn.classList.add('recording');
            const btnText = voiceBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Recording...';
        }
        
        this.recognition.start();
        this.showNotification('Listening... Speak your medication query', 'info');
    }

    stopVoiceInput() {
        this.isRecording = false;
        const voiceBtn = document.getElementById('voiceInputBtn');
        
        if (voiceBtn) {
            voiceBtn.classList.remove('recording');
            const btnText = voiceBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Voice Input';
        }
        
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    processVoiceInput(transcript) {
        console.log('Voice input received:', transcript);
        
        // Parse voice input for medication names
        const medications = this.parseVoiceMedications(transcript);
        
        if (medications.length > 0) {
            // Fill in the current page's inputs
            if (this.currentPage === 'interaction') {
                if (medications[0]) this.drug1Input.value = medications[0];
                if (medications[1]) this.drug2Input.value = medications[1];
                if (medications[2]) this.drug3Input.value = medications[2];
                this.validateInputs();
            } else if (this.currentPage === 'dosage') {
                if (medications[0]) this.drugNameInput.value = medications[0];
                this.validateDosageInputs();
            }
            
            this.showNotification(`Captured: ${medications.join(', ')}`, 'success');
        } else {
            this.showNotification('Could not identify medications. Please try again.', 'warning');
        }
    }

    parseVoiceMedications(transcript) {
        const text = transcript.toLowerCase();
        
        // Common medication names for parsing
        const commonMeds = [
            'warfarin', 'aspirin', 'metformin', 'lisinopril', 'amlodipine',
            'metoprolol', 'atorvastatin', 'simvastatin', 'furosemide',
            'digoxin', 'sertraline', 'tramadol', 'clarithromycin', 'trimethoprim',
            'methotrexate', 'acetaminophen', 'ibuprofen', 'omeprazole',
            'spironolactone', 'hydrochlorothiazide'
        ];
        
        const found = [];
        
        // Look for exact medication name matches
        commonMeds.forEach(med => {
            if (text.includes(med)) {
                found.push(med);
            }
        });
        
        // If no exact matches, try partial matching
        if (found.length === 0) {
            const words = text.split(/\s+/);
            words.forEach(word => {
                const match = commonMeds.find(med => 
                    med.includes(word) || word.includes(med.substring(0, 4))
                );
                if (match && !found.includes(match)) {
                    found.push(match);
                }
            });
        }
        
        return found.slice(0, 3); // Limit to 3 medications
    }

    // Phase 3: Batch Review Methods
    bindBatchReviewEvents() {
        // File upload events
        this.fileUploadArea?.addEventListener('click', () => {
            this.medicationListUpload?.click();
        });

        this.medicationListUpload?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Drag and drop events
        this.fileUploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileUploadArea.classList.add('drag-over');
        });

        this.fileUploadArea?.addEventListener('dragleave', () => {
            this.fileUploadArea.classList.remove('drag-over');
        });

        this.fileUploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileUploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileUpload(file);
        });

        this.removeFileBtn?.addEventListener('click', () => {
            this.clearUploadedFile();
        });

        // Text input events
        this.medicationTextInput?.addEventListener('input', () => {
            this.validateBatchInputs();
        });

        this.patientSelectBatch?.addEventListener('change', () => {
            this.validateBatchInputs();
        });

        // Batch analysis event
        this.analyzeBatchButton?.addEventListener('click', () => {
            this.handleBatchAnalysis();
        });
        
        // Picture upload events
        this.pictureUploadArea?.addEventListener('click', () => {
            this.pictureUpload?.click();
        });

        this.pictureUpload?.addEventListener('change', (e) => {
            this.handlePictureUpload(e.target.files[0]);
        });

        this.removePictureBtn?.addEventListener('click', () => {
            this.clearPictureUpload();
        });
        
        // Camera capture events
        this.cameraArea?.addEventListener('click', () => {
            this.startCamera();
        });

        this.captureBtn?.addEventListener('click', () => {
            this.capturePhoto();
        });

        this.retakeBtn?.addEventListener('click', () => {
            this.retakePhoto();
        });

        this.stopCameraBtn?.addEventListener('click', () => {
            this.stopCamera();
        });
    }

    handleFileUpload(file) {
        if (!file) return;

        if (!file.type.includes('csv') && !file.type.includes('text')) {
            this.showNotification('Please upload a CSV or text file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.processUploadedFile(file, content);
        };
        reader.readAsText(file);
    }

    processUploadedFile(file, content) {
        this.uploadedFileContent = content;
        
        // Show file preview
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileUploadArea.querySelector('.file-upload-content').style.display = 'none';
        this.filePreview.style.display = 'flex';
        
        // Clear text input if file is uploaded
        if (this.medicationTextInput) {
            this.medicationTextInput.value = '';
        }
        
        this.validateBatchInputs();
        this.showNotification('File uploaded successfully', 'success');
    }

    clearUploadedFile() {
        this.uploadedFileContent = null;
        this.medicationListUpload.value = '';
        this.fileUploadArea.querySelector('.file-upload-content').style.display = 'flex';
        this.filePreview.style.display = 'none';
        this.validateBatchInputs();
    }

    validateBatchInputs() {
        const hasPatient = this.patientSelectBatch?.value;
        const hasFile = this.uploadedFileContent;
        const hasText = this.medicationTextInput?.value.trim();
        const hasImage = this.uploadedImageData || this.capturedImageData;
        
        const isValid = hasPatient && (hasFile || hasText || hasImage);
        
        if (this.analyzeBatchButton) {
            this.analyzeBatchButton.disabled = !isValid;
        }
    }

    async handleBatchAnalysis() {
        if (!this.patientSelectBatch?.value) {
            this.showNotification('Please select a patient', 'error');
            return;
        }

        let medications = [];
        
        if (this.uploadedFileContent) {
            medications = this.parseMedicationFile(this.uploadedFileContent);
        } else if (this.medicationTextInput?.value.trim()) {
            medications = this.parseTextMedications(this.medicationTextInput.value);
        }

        if (medications.length === 0) {
            this.showNotification('No medications found to analyze', 'error');
            return;
        }

        // Show loading state
        const originalText = this.analyzeBatchButton.querySelector('.btn-text').textContent;
        this.analyzeBatchButton.querySelector('.btn-text').style.display = 'none';
        this.analyzeBatchButton.querySelector('.btn-loader').style.display = 'flex';
        this.analyzeBatchButton.disabled = true;

        try {
            const patientContext = this.getPatientContext(this.patientSelectBatch.value);
            const result = await this.performBatchAnalysis(medications, patientContext);
            this.displayBatchResults(result);
        } catch (error) {
            console.error('Batch analysis error:', error);
            this.showNotification('Analysis failed. Please try again.', 'error');
        } finally {
            // Reset button state
            this.analyzeBatchButton.querySelector('.btn-text').style.display = 'inline';
            this.analyzeBatchButton.querySelector('.btn-loader').style.display = 'none';
            this.analyzeBatchButton.disabled = false;
        }
    }

    parseMedicationFile(content) {
        const medications = [];
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length > 0 && lines[0].toLowerCase().includes('drug_name')) {
            // CSV format with headers
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                if (values.length >= headers.length) {
                    const med = {};
                    headers.forEach((header, index) => {
                        med[header] = values[index]?.trim();
                    });
                    if (med.drug_name || med.name || med.medication) {
                        medications.push(med);
                    }
                }
            }
        } else {
            // Simple text format
            medications.push(...this.parseTextMedications(content));
        }

        return medications;
    }

    parseTextMedications(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => ({ drug_name: line }));
    }

    async performBatchAnalysis(medications, patientContext) {
        // Inline batch analysis logic for frontend demo
        const startTime = Date.now();
        
        try {
            // Step 1: Normalize medications
            const normalizedMeds = this.normalizeMedicationList(medications);

            // Step 2: Generate interaction matrix
            const interactionMatrix = this.generateInteractionMatrix(normalizedMeds);

            // Step 3: Detect duplicates
            const duplicateAnalysis = this.detectDuplicateTherapies(normalizedMeds);

            // Step 4: Screen contraindications
            const contraindications = this.screenContraindications(normalizedMeds, patientContext);

            // Step 5: Prioritize risks
            const riskAnalysis = this.prioritizeRisks(interactionMatrix, duplicateAnalysis, contraindications);

            // Step 6: Generate recommendations
            const recommendations = this.generateClinicalRecommendations(riskAnalysis, patientContext);

            // Step 7: Generate summary
            const summary = this.generateSummaryStatistics(normalizedMeds, riskAnalysis);

            const processingTime = Date.now() - startTime;

            return {
                status: 'complete',
                task_id: `batch_${Date.now()}`,
                result: {
                    summary,
                    medications_reviewed: normalizedMeds,
                    interaction_matrix: interactionMatrix,
                    duplicate_analysis: duplicateAnalysis,
                    contraindications,
                    risk_analysis: riskAnalysis,
                    clinical_recommendations: recommendations,
                    processing_time_ms: processingTime,
                    confidence: this.calculateAnalysisConfidence(riskAnalysis),
                    workflow: 'batch_prescription_review'
                }
            };

        } catch (error) {
            return {
                status: 'error',
                task_id: `batch_${Date.now()}`,
                error: error.message,
                processing_time_ms: Date.now() - startTime
            };
        }
    }

    displayBatchResults(result) {
        if (result.status !== 'complete') {
            this.showNotification('Analysis failed: ' + result.error, 'error');
            return;
        }

        const { summary, risk_analysis, interaction_matrix, clinical_recommendations } = result.result;

        // Show results container
        this.batchResultContainer.style.display = 'block';

        // Set overall status badge
        this.setBatchResultBadge(summary.review_status);

        // Display summary statistics
        this.displaySummaryStats(summary);

        // Display prioritized risks
        this.displayRiskAnalysis(risk_analysis);

        // Display interaction matrix
        this.displayInteractionMatrix(interaction_matrix);

        // Display clinical recommendations
        this.displayClinicalRecommendations(clinical_recommendations);

        // Scroll to results
        this.batchResultContainer.scrollIntoView({ behavior: 'smooth' });

        this.showNotification('Batch analysis complete', 'success');
    }

    // Picture upload methods
    handlePictureUpload(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.pictureThumb.src = e.target.result;
            this.pictureName.textContent = file.name;
            
            // Hide upload area, show preview
            this.pictureUploadArea.querySelector('.file-upload-content').style.display = 'none';
            this.picturePreview.style.display = 'flex';
            
            // Store the image data for OCR processing
            this.uploadedImageData = e.target.result;
            
            // Process with OpenAI Vision OCR
            this.processImageWithOCR(e.target.result);
        };
        
        reader.readAsDataURL(file);
    }

    clearPictureUpload() {
        this.uploadedImageData = null;
        this.pictureUpload.value = '';
        this.pictureUploadArea.querySelector('.file-upload-content').style.display = 'flex';
        this.picturePreview.style.display = 'none';
        this.validateBatchInputs();
    }

    // Camera capture methods
    async startCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.cameraVideo.srcObject = this.cameraStream;
            
            // Hide upload content, show camera
            this.cameraArea.querySelector('.file-upload-content').style.display = 'none';
            this.cameraPreview.style.display = 'block';
            this.cameraVideo.style.display = 'block';
            this.captureBtn.style.display = 'inline-block';
            this.stopCameraBtn.style.display = 'inline-block';
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            let message = 'Unable to access camera. ';
            
            if (error.name === 'NotAllowedError') {
                message += 'Please allow camera access and try again.';
            } else if (error.name === 'NotFoundError') {
                message += 'No camera found on this device.';
            } else if (error.name === 'NotSupportedError') {
                message += 'Camera not supported on this browser.';
            } else {
                message += 'Please check permissions and try again.';
            }
            
            this.showNotification(message, 'error');
            
            // Reset UI on error
            this.cameraArea.querySelector('.file-upload-content').style.display = 'flex';
            this.cameraPreview.style.display = 'none';
        }
    }

    capturePhoto() {
        if (!this.cameraStream) return;
        
        // Set canvas size to video dimensions
        this.cameraCanvas.width = this.cameraVideo.videoWidth;
        this.cameraCanvas.height = this.cameraVideo.videoHeight;
        
        // Draw current video frame to canvas
        const ctx = this.cameraCanvas.getContext('2d');
        ctx.drawImage(this.cameraVideo, 0, 0);
        
        // Get image data
        const imageDataUrl = this.cameraCanvas.toDataURL('image/jpeg', 0.8);
        
        // Show captured image
        this.capturedImage.src = imageDataUrl;
        this.cameraVideo.style.display = 'none';
        this.capturedImage.style.display = 'block';
        
        // Update buttons
        this.captureBtn.style.display = 'none';
        this.retakeBtn.style.display = 'inline-block';
        
        // Store captured data
        this.capturedImageData = imageDataUrl;
        
        // Process with OpenAI Vision OCR
        this.processImageWithOCR(imageDataUrl);
    }

    retakePhoto() {
        this.capturedImage.style.display = 'none';
        this.cameraVideo.style.display = 'block';
        this.captureBtn.style.display = 'inline-block';
        this.retakeBtn.style.display = 'none';
        this.capturedImageData = null;
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        
        // Reset UI
        this.cameraArea.querySelector('.file-upload-content').style.display = 'flex';
        this.cameraPreview.style.display = 'none';
        this.cameraVideo.style.display = 'none';
        this.capturedImage.style.display = 'none';
        this.captureBtn.style.display = 'none';
        this.retakeBtn.style.display = 'none';
        this.stopCameraBtn.style.display = 'none';
        this.capturedImageData = null;
    }

    // OpenAI Vision OCR processing
    async processImageWithOCR(imageData) {
        try {
            this.showNotification('Processing image with AI...', 'info');
            
            const response = await fetch('/api/process-image-ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageData,
                    prompt: "Extract all medications, dosages, and frequencies from this image. Format as a list with one medication per line in the format: 'medication_name dosage frequency'. For example: 'metformin 1000mg twice daily'"
                })
            });
            
            if (!response.ok) {
                throw new Error(`OCR processing failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.medications && result.medications.length > 0) {
                // Check which page we're on and populate accordingly
                if (this.currentPage === 'batch') {
                    // For batch review, populate the text area
                    this.medicationTextInput.value = result.medications.join('\n');
                    this.validateBatchInputs();
                } else {
                    // For drug interactions page, populate the individual input fields
                    this.populateDrugInputs(result.medications);
                }
                this.showNotification(`Extracted ${result.medications.length} medications from image`, 'success');
            } else {
                this.showNotification('No medications found in image. Please try a clearer photo.', 'warning');
            }
            
        } catch (error) {
            console.error('OCR processing error:', error);
            this.showNotification('Failed to process image. Please try again or enter medications manually.', 'error');
        }
    }

    // Populate drug input fields with extracted medications
    populateDrugInputs(medications) {
        const drugInputs = [this.drug1Input, this.drug2Input, this.drug3Input];
        
        // Clear existing inputs first
        drugInputs.forEach(input => {
            if (input) input.value = '';
        });
        
        // Populate up to 3 drugs in the interaction checker
        medications.slice(0, 3).forEach((medication, index) => {
            if (drugInputs[index]) {
                // Extract just the drug name (remove dosage info for interaction checking)
                const drugName = this.extractDrugName(medication);
                drugInputs[index].value = drugName;
            }
        });
        
        // Validate inputs after populating
        this.validateInputs();
        
        // If more than 3 medications were found, inform the user
        if (medications.length > 3) {
            this.showNotification(`Found ${medications.length} medications. Only the first 3 have been loaded for interaction checking.`, 'info');
        }
    }
    
    // Extract drug name from medication string (remove dosage information)
    extractDrugName(medicationString) {
        // Remove common dosage patterns to get clean drug name
        const cleaned = medicationString
            .toLowerCase()
            .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|units?|iu|cc)\b/gi, '') // Remove dosage amounts
            .replace(/\b(daily|twice\s+daily|three\s+times\s+daily|bid|tid|qid|qd|prn|as\s+needed)\b/gi, '') // Remove frequencies
            .replace(/\b(once|twice|three\s+times|four\s+times)\s+(daily|a\s+day)\b/gi, '') // Remove frequency variations
            .replace(/\b(morning|evening|night|bedtime|breakfast|lunch|dinner)\b/gi, '') // Remove timing
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        // Return the first word (should be the drug name)
        const words = cleaned.split(' ');
        return words[0] || medicationString.split(' ')[0];
    }

    // Quick upload methods for drug interactions
    handleQuickPictureUpload(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Process with OCR directly
            this.processImageWithOCR(e.target.result);
        };
        
        reader.readAsDataURL(file);
    }

    async startQuickCamera() {
        try {
            this.quickCameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.quickCameraVideo.srcObject = this.quickCameraStream;
            
            // Hide upload content, show camera
            this.quickCameraArea.querySelector('.file-upload-content').style.display = 'none';
            this.quickCameraPreview.style.display = 'block';
            this.quickCameraVideo.style.display = 'block';
            this.quickCaptureBtn.style.display = 'inline-block';
            this.quickStopCameraBtn.style.display = 'inline-block';
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            let message = 'Unable to access camera. ';
            
            if (error.name === 'NotAllowedError') {
                message += 'Please allow camera access and try again.';
            } else if (error.name === 'NotFoundError') {
                message += 'No camera found on this device.';
            } else if (error.name === 'NotSupportedError') {
                message += 'Camera not supported on this browser.';
            } else {
                message += 'Please check permissions and try again.';
            }
            
            this.showNotification(message, 'error');
            
            // Reset UI on error
            this.quickCameraArea.querySelector('.file-upload-content').style.display = 'flex';
            this.quickCameraPreview.style.display = 'none';
        }
    }

    captureQuickPhoto() {
        if (!this.quickCameraStream) return;
        
        // Set canvas size to video dimensions
        this.quickCameraCanvas.width = this.quickCameraVideo.videoWidth;
        this.quickCameraCanvas.height = this.quickCameraVideo.videoHeight;
        
        // Draw current video frame to canvas
        const ctx = this.quickCameraCanvas.getContext('2d');
        ctx.drawImage(this.quickCameraVideo, 0, 0);
        
        // Get image data
        const imageDataUrl = this.quickCameraCanvas.toDataURL('image/jpeg', 0.8);
        
        // Show captured image
        this.quickCapturedImage.src = imageDataUrl;
        this.quickCameraVideo.style.display = 'none';
        this.quickCapturedImage.style.display = 'block';
        
        // Update buttons
        this.quickCaptureBtn.style.display = 'none';
        this.quickRetakeBtn.style.display = 'inline-block';
        
        // Store captured data
        this.quickCapturedImageData = imageDataUrl;
        
        // Process with OCR
        this.processImageWithOCR(imageDataUrl);
    }

    retakeQuickPhoto() {
        this.quickCapturedImage.style.display = 'none';
        this.quickCameraVideo.style.display = 'block';
        this.quickCaptureBtn.style.display = 'inline-block';
        this.quickRetakeBtn.style.display = 'none';
        this.quickCapturedImageData = null;
    }

    stopQuickCamera() {
        if (this.quickCameraStream) {
            this.quickCameraStream.getTracks().forEach(track => track.stop());
            this.quickCameraStream = null;
        }
        
        // Reset UI
        this.quickCameraArea.querySelector('.file-upload-content').style.display = 'flex';
        this.quickCameraPreview.style.display = 'none';
        this.quickCameraVideo.style.display = 'none';
        this.quickCapturedImage.style.display = 'none';
        this.quickCaptureBtn.style.display = 'none';
        this.quickRetakeBtn.style.display = 'none';
        this.quickStopCameraBtn.style.display = 'none';
        this.quickCapturedImageData = null;
    }

    setBatchResultBadge(status) {
        const badge = this.batchResultContainer.querySelector('.result-badge');
        badge.className = 'result-badge';
        
        switch (status) {
            case 'urgent':
                badge.className += ' badge-critical';
                badge.textContent = 'URGENT REVIEW REQUIRED';
                break;
            case 'high_priority':
                badge.className += ' badge-warning';
                badge.textContent = 'HIGH PRIORITY';
                break;
            case 'routine_review':
                badge.className += ' badge-info';
                badge.textContent = 'ROUTINE REVIEW';
                break;
            default:
                badge.className += ' badge-success';
                badge.textContent = 'LOW RISK';
        }
    }

    displaySummaryStats(summary) {
        const statsContainer = document.getElementById('summaryStats');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <span class="stat-number">${summary.total_medications}</span>
                <div class="stat-label">Total Medications</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${summary.total_risks_identified}</span>
                <div class="stat-label">Risks Identified</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${summary.risk_breakdown.critical}</span>
                <div class="stat-label">Critical Risks</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${summary.overall_risk_score}</span>
                <div class="stat-label">Overall Risk Score</div>
            </div>
        `;
    }

    displayRiskAnalysis(risks) {
        const riskContainer = document.getElementById('riskList');
        if (risks.length === 0) {
            riskContainer.innerHTML = '<p>No significant risks identified.</p>';
            return;
        }

        riskContainer.innerHTML = risks.map(risk => `
            <div class="risk-item ${risk.severity}">
                <div class="risk-content">
                    <div class="risk-title">${risk.description}</div>
                    <div class="risk-description">${risk.clinical_impact}</div>
                </div>
                <div class="risk-badge ${risk.severity}">${risk.severity.toUpperCase()}</div>
            </div>
        `).join('');
    }

    displayInteractionMatrix(matrix) {
        const matrixContainer = document.getElementById('interactionMatrix');
        if (matrix.length === 0) {
            matrixContainer.innerHTML = '<p>No significant interactions found.</p>';
            return;
        }

        const tableHTML = `
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th>Medication 1</th>
                        <th>Medication 2</th>
                        <th>Severity</th>
                        <th>Mechanism</th>
                        <th>Management</th>
                    </tr>
                </thead>
                <tbody>
                    ${matrix.map(interaction => `
                        <tr>
                            <td>${interaction.medication_1.drug_name}</td>
                            <td>${interaction.medication_2.drug_name}</td>
                            <td><span class="risk-badge ${interaction.severity}">${interaction.severity}</span></td>
                            <td>${interaction.mechanism}</td>
                            <td>${interaction.management}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        matrixContainer.innerHTML = tableHTML;
    }

    displayClinicalRecommendations(recommendations) {
        const recsContainer = document.getElementById('clinicalRecommendations');
        const categories = [
            { key: 'immediate_actions', title: 'Immediate Actions', icon: '🚨' },
            { key: 'monitoring_requirements', title: 'Monitoring Requirements', icon: '📊' },
            { key: 'optimization_opportunities', title: 'Optimization Opportunities', icon: '⚡' }
        ];

        recsContainer.innerHTML = categories.map(category => {
            const items = recommendations[category.key] || [];
            if (items.length === 0) return '';

            return `
                <div class="recommendation-category">
                    <h4>${category.icon} ${category.title}</h4>
                    <ul class="recommendation-list">
                        ${items.map(item => `
                            <li>${typeof item === 'string' ? item : item.action || item.parameter || item}</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }).filter(html => html).join('');
    }

    // Phase 3: Action Button Methods
    bindActionButtons() {
        // Clear results buttons
        this.clearResultsBtn?.addEventListener('click', () => {
            this.resultContainer.style.display = 'none';
            this.showNotification('Results cleared', 'info');
        });

        this.clearDosageResultsBtn?.addEventListener('click', () => {
            this.dosageResultContainer.style.display = 'none';
            this.showNotification('Dosage results cleared', 'info');
        });

        this.clearBatchResultsBtn?.addEventListener('click', () => {
            this.batchResultContainer.style.display = 'none';
            this.showNotification('Batch results cleared', 'info');
        });

        // Flag for doctor buttons
        this.flagForDoctorBtn?.addEventListener('click', () => {
            this.flagForDoctor('interaction');
        });

        this.flagDosageForDoctorBtn?.addEventListener('click', () => {
            this.flagForDoctor('dosage');
        });

        this.flagBatchForDoctorBtn?.addEventListener('click', () => {
            this.flagForDoctor('batch');
        });

        // Voice input button
        this.voiceInputBtn?.addEventListener('click', () => {
            this.toggleVoiceInput();
        });

        // Print summary button
        this.printSummaryBtn?.addEventListener('click', () => {
            this.printBatchSummary();
        });
    }

    flagForDoctor(type) {
        const flagData = {
            type,
            timestamp: new Date().toISOString(),
            flagged_by: 'nurse_user',
            status: 'pending_review'
        };

        // Store in localStorage for demo purposes
        const flags = JSON.parse(localStorage.getItem('doctor_flags') || '[]');
        flags.push(flagData);
        localStorage.setItem('doctor_flags', JSON.stringify(flags));

        this.showNotification('Flagged for doctor review successfully', 'warning');
    }

    // Phase 3: Voice Input Methods
    initializeVoiceInput() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.voiceInputBtn?.classList.add('recording');
                this.showNotification('Listening for medication names...', 'info');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processVoiceInput(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.voiceInputBtn?.classList.remove('recording');
                this.showNotification('Voice recognition failed. Please try again.', 'error');
            };

            this.recognition.onend = () => {
                this.voiceInputBtn?.classList.remove('recording');
            };
        } else {
            console.warn('Speech recognition not supported');
            if (this.voiceInputBtn) {
                this.voiceInputBtn.style.display = 'none';
            }
        }
    }

    toggleVoiceInput() {
        if (!this.recognition) return;

        if (this.voiceInputBtn?.classList.contains('recording')) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    processVoiceInput(transcript) {
        // Parse medication names from voice input
        const medications = this.parseMedicationNames(transcript);
        
        if (medications.length > 0) {
            // Fill in the form based on current page
            if (this.currentPage === 'interaction') {
                if (medications[0] && this.drug1Input) this.drug1Input.value = medications[0];
                if (medications[1] && this.drug2Input) this.drug2Input.value = medications[1];
                if (medications[2] && this.drug3Input) this.drug3Input.value = medications[2];
                this.validateInputs();
            } else if (this.currentPage === 'dosage') {
                if (medications[0] && this.drugNameInput) this.drugNameInput.value = medications[0];
                this.validateDosageInputs();
            } else if (this.currentPage === 'batch') {
                const medText = medications.join('\n');
                if (this.medicationTextInput) this.medicationTextInput.value = medText;
                this.validateBatchInputs();
            }
            
            this.showNotification(`Recognized: ${medications.join(', ')}`, 'success');
        } else {
            this.showNotification('No medication names recognized. Please try again.', 'warning');
        }
    }

    parseMedicationNames(transcript) {
        // Common medication database for voice recognition
        const commonMeds = [
            'warfarin', 'aspirin', 'metformin', 'lisinopril', 'amlodipine',
            'metoprolol', 'atorvastatin', 'furosemide', 'digoxin', 'sertraline',
            'tramadol', 'acetaminophen', 'ibuprofen', 'omeprazole', 'levothyroxine',
            'prednisone', 'albuterol', 'insulin', 'hydrochlorothiazide', 'losartan'
        ];

        const found = [];
        const words = transcript.split(/\s+/);
        
        // Look for medication names in the transcript
        for (const med of commonMeds) {
            if (transcript.includes(med) || words.some(word => 
                word.length > 3 && med.toLowerCase().includes(word.toLowerCase())
            )) {
                if (!found.includes(med)) {
                    found.push(med);
                }
            }
        }
        
        return found.slice(0, 3); // Limit to 3 medications
    }

    printBatchSummary() {
        const printWindow = window.open('', '_blank');
        const batchResults = this.batchResultContainer.innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MedGuard AI - Batch Prescription Review</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .result-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
                    .stat-card { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ccc; border-radius: 6px; text-align: center; }
                    .risk-item { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
                    .risk-item.critical { border-left-color: #ef4444; }
                    .risk-item.major { border-left-color: #f59e0b; }
                    .matrix-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    .matrix-table th, .matrix-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .matrix-table th { background-color: #f5f5f5; }
                    .action-buttons-section { display: none; }
                </style>
            </head>
            <body>
                <h1>MedGuard AI - Batch Prescription Review</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                ${batchResults}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Batch Analysis Support Methods
    normalizeMedicationList(medications) {
        return medications.map((med, index) => {
            let normalized = {
                id: `med_${index + 1}`,
                original_input: med,
                parsed: false
            };

            if (typeof med === 'string') {
                const parsed = this.parseStringMedication(med);
                normalized = { ...normalized, ...parsed };
            } else if (typeof med === 'object') {
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

            normalized.drug_class = this.classifyDrug(normalized.drug_name);
            return normalized;
        });
    }

    parseStringMedication(medString) {
        const cleanString = medString.trim().toLowerCase();
        
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

        return {
            drug_name: cleanString,
            dose: null,
            frequency: 'as directed',
            route: 'oral',
            parsed: false
        };
    }

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

    analyzeInteraction(med1, med2) {
        const drug1 = med1.drug_name.toLowerCase();
        const drug2 = med2.drug_name.toLowerCase();

        // Critical interactions database
        const interactions = {
            'warfarin_aspirin': {
                type: 'pharmacodynamic',
                severity: 'critical',
                mechanism: 'Additive anticoagulant effects',
                clinical_significance: 'Major bleeding risk - potentially life-threatening',
                management: 'Avoid combination. Use acetaminophen for pain relief.',
                confidence: 0.95
            },
            'methotrexate_trimethoprim': {
                type: 'pharmacokinetic',
                severity: 'critical',
                mechanism: 'Trimethoprim inhibits methotrexate elimination',
                clinical_significance: 'Bone marrow suppression, mucositis, hepatotoxicity',
                management: 'Avoid combination. Use alternative antibiotic.',
                confidence: 0.92
            },
            'sertraline_tramadol': {
                type: 'pharmacodynamic',
                severity: 'major',
                mechanism: 'Increased serotonin levels',
                clinical_significance: 'Serotonin syndrome risk',
                management: 'Use with caution. Monitor for serotonin syndrome symptoms.',
                confidence: 0.80
            },
            'atorvastatin_clarithromycin': {
                type: 'pharmacokinetic',
                severity: 'moderate',
                mechanism: 'CYP3A4 inhibition increases statin levels',
                clinical_significance: 'Increased risk of myopathy',
                management: 'Consider statin interruption during antibiotic course.',
                confidence: 0.75
            }
        };

        // Check for specific interactions
        const key1 = `${drug1}_${drug2}`;
        const key2 = `${drug2}_${drug1}`;
        
        if (interactions[key1]) return interactions[key1];
        if (interactions[key2]) return interactions[key2];

        // Check for NSAIDs + anticoagulants
        const nsaids = ['aspirin', 'ibuprofen', 'naproxen'];
        const anticoagulants = ['warfarin', 'heparin'];
        
        if ((nsaids.includes(drug1) && anticoagulants.includes(drug2)) ||
            (nsaids.includes(drug2) && anticoagulants.includes(drug1))) {
            return {
                type: 'pharmacodynamic',
                severity: 'major',
                mechanism: 'Increased bleeding risk',
                clinical_significance: 'Additive anticoagulant effects',
                management: 'Monitor INR closely, watch for bleeding',
                confidence: 0.85
            };
        }

        return {
            type: 'none',
            severity: 'none',
            mechanism: 'No significant interaction identified',
            clinical_significance: 'No clinical concern',
            management: 'No special precautions required',
            confidence: 0.60
        };
    }

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
                    severity: 'moderate',
                    recommendation: `Review necessity of multiple ${className}. Consider consolidation.`
                });
            }
        });

        return duplicates;
    }

    screenContraindications(medications, patientContext) {
        if (!patientContext) return [];

        const contraindications = [];
        
        medications.forEach(med => {
            const drugName = med.drug_name.toLowerCase();
            
            // Check for specific contraindications
            if (drugName.includes('metformin') && patientContext.lab_values?.eGFR?.value < 30) {
                contraindications.push({
                    medication: med,
                    contraindication_type: 'renal_impairment',
                    reason: 'Risk of lactic acidosis with severe renal impairment',
                    severity: 'major',
                    patient_factor: `eGFR ${patientContext.lab_values.eGFR.value}`,
                    recommendation: 'Discontinue or use alternative antidiabetic'
                });
            }

            if (drugName.includes('nsaid') || drugName.includes('ibuprofen') || drugName.includes('naproxen')) {
                if (patientContext.lab_values?.eGFR?.value < 60) {
                    contraindications.push({
                        medication: med,
                        contraindication_type: 'renal_impairment',
                        reason: 'NSAIDs can worsen renal function',
                        severity: 'moderate',
                        patient_factor: `eGFR ${patientContext.lab_values.eGFR.value}`,
                        recommendation: 'Use with caution, monitor renal function'
                    });
                }
            }
        });

        return contraindications;
    }

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
                priority: this.calculateRiskPriority('duplicate', 'moderate'),
                severity: 'moderate',
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

    generateClinicalRecommendations(risks, patientContext) {
        const recommendations = {
            immediate_actions: [],
            monitoring_requirements: [],
            optimization_opportunities: []
        };

        // Process high-priority risks
        risks.filter(risk => risk.priority >= 80).forEach(risk => {
            if (risk.severity === 'critical' || risk.severity === 'major') {
                recommendations.immediate_actions.push(risk.action_required);
            }
        });

        // Add patient-specific monitoring
        if (patientContext) {
            if (patientContext.demographics.age >= 65) {
                recommendations.monitoring_requirements.push('Monitor renal function every 6 months (elderly patient)');
            }
            if (patientContext.lab_values?.eGFR?.value < 60) {
                recommendations.monitoring_requirements.push('Regular renal function monitoring (CKD present)');
            }
        }

        // Add general optimization opportunities
        if (risks.length > 3) {
            recommendations.optimization_opportunities.push('Consider medication reconciliation with clinical pharmacist');
        }

        return recommendations;
    }

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

    getTherapeuticClass(drugName) {
        const classes = {
            'lisinopril': 'ace_inhibitors',
            'losartan': 'ace_inhibitors',
            'metoprolol': 'beta_blockers',
            'propranolol': 'beta_blockers',
            'amlodipine': 'calcium_channel_blockers',
            'atorvastatin': 'statins',
            'simvastatin': 'statins',
            'ibuprofen': 'nsaids',
            'naproxen': 'nsaids'
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

    calculateAnalysisConfidence(risks) {
        if (risks.length === 0) return 0.7;
        
        const avgConfidence = risks.reduce((sum, risk) => sum + risk.confidence, 0) / risks.length;
        return Math.round(avgConfidence * 100) / 100;
    }

    // Drug Name Voice Input System
    bindDrugVoiceInputs() {
        // Bind mic buttons to their corresponding input fields
        const micButtons = [
            { button: this.drug1Mic, input: this.drug1Input, fieldName: 'drug1' },
            { button: this.drug2Mic, input: this.drug2Input, fieldName: 'drug2' },
            { button: this.drug3Mic, input: this.drug3Input, fieldName: 'drug3' },
            { button: this.drugNameMic, input: this.drugNameInput, fieldName: 'drugName' }
        ];

        micButtons.forEach(({ button, input, fieldName }) => {
            if (button && input) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.startDrugVoiceInput(button, input, fieldName);
                });
            }
        });

        // Initialize MediaRecorder support check
        this.checkMediaRecorderSupport();
    }

    checkMediaRecorderSupport() {
        this.mediaRecorderSupported = 'MediaRecorder' in window && 
                                     navigator.mediaDevices && 
                                     navigator.mediaDevices.getUserMedia;
        
        if (!this.mediaRecorderSupported) {
            console.warn('MediaRecorder not supported, voice input disabled');
            // Hide mic buttons if not supported
            document.querySelectorAll('.mic-btn').forEach(btn => {
                btn.style.display = 'none';
            });
        }
    }

    async startDrugVoiceInput(micButton, inputField, fieldName) {
        if (!this.mediaRecorderSupported) {
            this.showNotification('Voice input not supported in this browser', 'error');
            return;
        }

        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });

            // Set recording state
            micButton.classList.add('recording');
            this.showNotification('Recording... speak the drug name clearly', 'info');

            // Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            const audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                
                // Set processing state
                micButton.classList.remove('recording');
                micButton.classList.add('processing');
                this.showNotification('Processing audio...', 'info');

                // Create audio blob
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // Send to backend for transcription
                await this.processVoiceInput(audioBlob, inputField, micButton, fieldName);
            };

            // Start recording
            mediaRecorder.start();

            // Auto-stop after 2 seconds for faster processing
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 2000);

            // Allow manual stop by clicking again
            const stopHandler = () => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
                micButton.removeEventListener('click', stopHandler);
            };
            micButton.addEventListener('click', stopHandler);

        } catch (error) {
            console.error('Voice input error:', error);
            micButton.classList.remove('recording');
            this.showNotification('Microphone access denied or unavailable', 'error');
        }
    }

    async processVoiceInput(audioBlob, inputField, micButton, fieldName) {
        try {
            // Prepare form data for backend
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice-input.webm');

            // Send to backend transcription service
            const response = await fetch('http://localhost:3002/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Transcription failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.validated_drugs && result.validated_drugs.length > 0) {
                // Use the best matched drug name
                const bestMatch = result.validated_drugs[0];
                inputField.value = bestMatch.matched;
                
                // Show success state
                micButton.classList.remove('processing');
                micButton.classList.add('success');
                
                // Show suggestions if multiple matches
                if (result.validated_drugs.length > 1) {
                    this.showDrugSuggestions(inputField, result.validated_drugs);
                }
                
                this.showNotification(`Recognized: ${bestMatch.matched}`, 'success');
                
                // Trigger validation
                this.validateInputs();
                this.validateDosageInputs();
            } else {
                // Fallback to basic transcription
                if (result.transcription) {
                    const drugMatch = await this.searchDrugNames(result.transcription);
                    if (drugMatch) {
                        inputField.value = drugMatch;
                        micButton.classList.remove('processing');
                        micButton.classList.add('success');
                        this.showNotification(`Found: ${drugMatch}`, 'success');
                    } else {
                        inputField.value = result.transcription;
                        micButton.classList.remove('processing');
                        this.showNotification(`Transcribed: ${result.transcription} (please verify)`, 'warning');
                    }
                } else {
                    throw new Error('No transcription result');
                }
            }

        } catch (error) {
            console.error('Voice processing error:', error);
            micButton.classList.remove('processing');
            
            // Check if backend is available
            if (error.message.includes('Failed to fetch')) {
                this.showNotification('Voice service unavailable. Backend server not running.', 'error');
            } else {
                this.showNotification('Voice recognition failed. Please try again.', 'error');
            }
        }

        // Reset mic button state after 2 seconds
        setTimeout(() => {
            micButton.classList.remove('success', 'processing');
        }, 2000);
    }

    async searchDrugNames(query) {
        try {
            const response = await fetch('http://localhost:3002/api/drugs/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query, limit: 1 })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.results && result.results.length > 0) {
                    return result.results[0].name;
                }
            }
        } catch (error) {
            console.error('Drug search error:', error);
        }
        return null;
    }

    showDrugSuggestions(inputField, suggestions) {
        // Remove existing suggestions
        const existingSuggestions = inputField.parentElement.querySelector('.drug-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        // Create suggestions dropdown
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'drug-suggestions';

        suggestions.slice(0, 3).forEach(drug => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'drug-suggestion';
            suggestionDiv.innerHTML = `
                <div class="drug-suggestion-name">${drug.matched}</div>
                <div class="drug-suggestion-generic">Generic: ${drug.generic}</div>
            `;
            
            suggestionDiv.addEventListener('click', () => {
                inputField.value = drug.matched;
                suggestionsDiv.remove();
                this.validateInputs();
                this.validateDosageInputs();
            });

            suggestionsDiv.appendChild(suggestionDiv);
        });

        // Position and show suggestions
        inputField.parentElement.appendChild(suggestionsDiv);

        // Hide suggestions when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', function hideHandler(e) {
                if (!suggestionsDiv.contains(e.target)) {
                    suggestionsDiv.remove();
                    document.removeEventListener('click', hideHandler);
                }
            });
        }, 100);
    }

    // Notification system
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        // Set notification content and style
        notification.textContent = message;
        notification.className = `notification notification-${type} show`;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.medguardApp = new MedGuardApp();
});

// Add some console styling
console.log('%c🏥 MedGuard AI Phase 3', 'font-size: 24px; color: #0066ff; font-weight: bold;');
console.log('%cBatch Prescription Review & Voice Input', 'font-size: 14px; color: #8b5cf6;');
console.log('%cBuilt with LangGraph & MCP', 'font-size: 12px; color: #6b7280;');