/**
 * MedGuard AI Backend Server
 * 
 * Provides voice transcription using OpenAI Whisper and drug name validation using QDrant
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const { QdrantClient } = require('@qdrant/js-client-rest');
const RxNormService = require('./services/rxnorm-service');
const OpenFDAService = require('./services/openfda-service');
const DailyMedService = require('./services/dailymed-service');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Configure QDrant
const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY
});

// Initialize FDA, RxNorm, and DailyMed services
const rxNormService = new RxNormService();
const openFDAService = new OpenFDAService();
const dailyMedService = new DailyMedService();

// Configure multer for audio file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit for audio files
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for image data

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        services: {
            whisper: !!process.env.OPENAI_API_KEY,
            qdrant: !!process.env.QDRANT_URL
        }
    });
});

/**
 * Voice Transcription Endpoint
 * Uses OpenAI Whisper to transcribe audio to text
 */
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log(`Transcribing audio file: ${req.file.originalname}, size: ${req.file.size} bytes`);

        // Create a File object for OpenAI API
        const audioFile = new File([req.file.buffer], req.file.originalname, {
            type: req.file.mimetype
        });

        // Transcribe using OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
            prompt: 'This is medical terminology for drug names like warfarin, aspirin, metformin, lisinopril, atorvastatin'
        });

        console.log(`Transcription result: "${transcription.text}"`);

        // Validate and match drug names
        const validatedDrugs = await validateDrugNames(transcription.text);

        res.json({
            success: true,
            transcription: transcription.text,
            validated_drugs: validatedDrugs,
            processing_time: new Date().toISOString()
        });

    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ 
            error: 'Transcription failed',
            message: error.message 
        });
    }
});

/**
 * Clinical Notes Transcription Endpoint
 * Uses OpenAI Whisper for natural language transcription without drug validation
 */
app.post('/api/transcribe-clinical', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log(`Transcribing clinical notes audio: ${req.file.originalname}, size: ${req.file.size} bytes`);

        // Create a File object for OpenAI API
        const audioFile = new File([req.file.buffer], req.file.originalname, {
            type: req.file.mimetype
        });

        // Transcribe using OpenAI Whisper with clinical context prompt
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
            prompt: 'This is clinical context about a patient including surgery, medical conditions, allergies, and treatment notes.'
        });

        console.log(`Clinical notes transcription: "${transcription.text}"`);

        // For clinical notes, return raw transcription without drug validation
        res.json({
            success: true,
            transcription: transcription.text,
            type: 'clinical_notes',
            processing_time: new Date().toISOString()
        });

    } catch (error) {
        console.error('Clinical notes transcription error:', error);
        res.status(500).json({ 
            error: 'Clinical transcription failed',
            message: error.message 
        });
    }
});

/**
 * Drug Name Search Endpoint
 * Search for drug names in QDrant database
 */
app.post('/api/drugs/search', async (req, res) => {
    try {
        const { query, limit = 5 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const results = await searchDrugs(query, limit);
        
        res.json({
            success: true,
            query,
            results,
            count: results.length
        });

    } catch (error) {
        console.error('Drug search error:', error);
        res.status(500).json({ 
            error: 'Drug search failed',
            message: error.message 
        });
    }
});

/**
 * Initialize drug database endpoint
 */
app.post('/api/drugs/initialize', async (req, res) => {
    try {
        await initializeDrugDatabase();
        res.json({ success: true, message: 'Drug database initialized' });
    } catch (error) {
        console.error('Database initialization error:', error);
        res.status(500).json({ 
            error: 'Database initialization failed',
            message: error.message 
        });
    }
});

/**
 * FDA Safety Profile Endpoint
 * Get comprehensive safety profile for a drug using OpenFDA
 */
app.post('/api/drugs/safety-profile', async (req, res) => {
    try {
        const { drugName } = req.body;

        if (!drugName) {
            return res.status(400).json({ error: 'Drug name is required' });
        }

        console.log(`Getting FDA safety profile for: ${drugName}`);

        // Get comprehensive safety profile from OpenFDA
        const safetyProfile = await openFDAService.getDrugSafetyProfile(drugName);
        
        res.json({
            success: true,
            drug_name: drugName,
            safety_profile: safetyProfile,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('FDA safety profile error:', error);
        res.status(500).json({ 
            error: 'Failed to get FDA safety profile',
            message: error.message 
        });
    }
});

/**
 * FDA Drug Interaction Analysis Endpoint
 * Analyze potential interactions between two drugs using FDA data
 */
app.post('/api/drugs/interaction-analysis', async (req, res) => {
    try {
        const { drug1, drug2 } = req.body;

        if (!drug1 || !drug2) {
            return res.status(400).json({ error: 'Both drug names are required' });
        }

        console.log(`Analyzing FDA interaction between: ${drug1} and ${drug2}`);

        // Get safety profiles for both drugs
        const [profile1, profile2] = await Promise.all([
            openFDAService.getDrugSafetyProfile(drug1),
            openFDAService.getDrugSafetyProfile(drug2)
        ]);

        // Search for adverse events involving both drugs
        const adverseEventsResult = await openFDAService.searchAdverseEvents({
            drug1,
            drug2,
            limit: 100
        });

        // Get drug labeling for warnings
        const [labeling1, labeling2] = await Promise.all([
            openFDAService.searchDrugLabeling(drug1),
            openFDAService.searchDrugLabeling(drug2)
        ]);

        // Analyze and calculate risk scores
        const analysis = await analyzeDrugInteraction({
            drug1: { name: drug1, profile: profile1, labeling: labeling1 },
            drug2: { name: drug2, profile: profile2, labeling: labeling2 },
            adverseEvents: adverseEventsResult
        });
        
        res.json({
            success: true,
            drugs: { drug1, drug2 },
            interaction_analysis: analysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('FDA interaction analysis error:', error);
        res.status(500).json({ 
            error: 'Failed to analyze drug interaction',
            message: error.message 
        });
    }
});

/**
 * Enhanced Drug Validation with FDA Safety Data
 * Validates drug names and includes safety information
 */
app.post('/api/drugs/validate-with-safety', async (req, res) => {
    try {
        const { drugNames } = req.body;

        if (!drugNames || !Array.isArray(drugNames)) {
            return res.status(400).json({ error: 'Array of drug names is required' });
        }

        console.log(`Validating drugs with FDA safety data: ${drugNames.join(', ')}`);

        const results = await Promise.all(drugNames.map(async (drugName) => {
            try {
                // Normalize drug name using RxNorm
                const normalization = await rxNormService.normalizeDrugName(drugName);
                
                // Get FDA safety profile
                const safetyProfile = await openFDAService.getDrugSafetyProfile(drugName);
                
                return {
                    original_name: drugName,
                    normalized: normalization.success ? {
                        rxcui: normalization.rxcui,
                        name: normalization.normalizedName,
                        confidence: normalization.confidence
                    } : null,
                    safety_profile: safetyProfile.success ? safetyProfile.profile : null,
                    validation_success: normalization.success,
                    safety_data_available: safetyProfile.success
                };
            } catch (error) {
                return {
                    original_name: drugName,
                    error: error.message,
                    validation_success: false,
                    safety_data_available: false
                };
            }
        }));
        
        res.json({
            success: true,
            results,
            validated_count: results.filter(r => r.validation_success).length,
            safety_data_count: results.filter(r => r.safety_data_available).length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Enhanced drug validation error:', error);
        res.status(500).json({ 
            error: 'Failed to validate drugs with safety data',
            message: error.message 
        });
    }
});

/**
 * Analyze drug interaction using FDA data
 */
async function analyzeDrugInteraction(data) {
    const { drug1, drug2, adverseEvents } = data;
    
    try {
        // Calculate individual risk scores
        const risk1 = calculateDrugRisk(drug1.profile);
        const risk2 = calculateDrugRisk(drug2.profile);
        
        // Analyze adverse events
        let adverseEventAnalysis = {
            total: 0,
            serious: 0,
            reactions: [],
            risk_level: 'UNKNOWN'
        };
        
        if (adverseEvents.success && adverseEvents.data?.results) {
            const results = adverseEvents.data.results;
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
                .map(([reaction, count]) => ({ reaction, count, percentage: (count / results.length * 100).toFixed(1) }));
            
            adverseEventAnalysis = {
                total: results.length,
                serious: seriousEvents.length,
                reactions: topReactions,
                serious_percentage: ((seriousEvents.length / results.length) * 100).toFixed(1)
            };
        }
        
        // Determine overall severity and risk
        const combinedRisk = Math.max(risk1, risk2);
        let severity = 'UNKNOWN';
        let clinicalRecommendation = '';
        let confidence = 0.5;
        
        if (adverseEventAnalysis.serious > 10 || combinedRisk > 0.8) {
            severity = 'MAJOR';
            confidence = 0.9;
            clinicalRecommendation = 'Avoid combination. Consider alternative medications. Consult specialist if combination necessary.';
        } else if (adverseEventAnalysis.serious > 5 || combinedRisk > 0.6) {
            severity = 'MODERATE';
            confidence = 0.8;
            clinicalRecommendation = 'Use with extreme caution. Monitor closely for adverse effects. Consider dose adjustments.';
        } else if (adverseEventAnalysis.total > 10 || combinedRisk > 0.4) {
            severity = 'MINOR';
            confidence = 0.7;
            clinicalRecommendation = 'Monitor for potential adverse effects. Patient counseling recommended.';
        } else {
            clinicalRecommendation = 'Limited interaction data available. Exercise clinical judgment and monitor patient closely.';
        }
        
        // Extract warnings and contraindications from labeling
        const warnings = extractLabelingWarnings(drug1.labeling, drug2.labeling);
        const contraindications = extractLabelingContraindications(drug1.labeling, drug2.labeling);
        
        return {
            severity,
            confidence,
            combined_risk_score: combinedRisk,
            individual_risks: {
                [drug1.name]: risk1,
                [drug2.name]: risk2
            },
            adverse_events: adverseEventAnalysis,
            clinical_recommendation: clinicalRecommendation,
            fda_warnings: warnings,
            contraindications: contraindications,
            monitoring_parameters: generateMonitoringParameters(severity, adverseEventAnalysis.reactions)
        };
        
    } catch (error) {
        console.error('Error analyzing drug interaction:', error);
        return {
            severity: 'UNKNOWN',
            confidence: 0.3,
            error: error.message,
            clinical_recommendation: 'Unable to analyze interaction. Consult pharmacist or prescribing physician.'
        };
    }
}

/**
 * Calculate individual drug risk score
 */
function calculateDrugRisk(safetyProfile) {
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

/**
 * Extract warnings from drug labeling
 */
function extractLabelingWarnings(labeling1, labeling2) {
    const warnings = [];
    
    [labeling1, labeling2].forEach(labeling => {
        if (labeling.success && labeling.data?.results) {
            labeling.data.results.forEach(result => {
                if (result.warnings && Array.isArray(result.warnings)) {
                    warnings.push(...result.warnings.slice(0, 3));
                }
            });
        }
    });
    
    return [...new Set(warnings)];
}

/**
 * Extract contraindications from drug labeling
 */
function extractLabelingContraindications(labeling1, labeling2) {
    const contraindications = [];
    
    [labeling1, labeling2].forEach(labeling => {
        if (labeling.success && labeling.data?.results) {
            labeling.data.results.forEach(result => {
                if (result.contraindications && Array.isArray(result.contraindications)) {
                    contraindications.push(...result.contraindications.slice(0, 2));
                }
            });
        }
    });
    
    return [...new Set(contraindications)];
}

/**
 * Generate monitoring parameters based on severity and reactions
 */
function generateMonitoringParameters(severity, reactions) {
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

/**
 * Validate drug names against database
 */
async function validateDrugNames(transcriptionText) {
    const words = transcriptionText.toLowerCase().split(/\s+/);
    const validatedDrugs = [];

    for (const word of words) {
        if (word.length >= 3) { // Only check words with 3+ characters
            try {
                const matches = await searchDrugs(word, 3);
                if (matches.length > 0) {
                    // Find best match based on similarity score
                    const bestMatch = matches[0];
                    if (bestMatch.score > 0.7) { // Confidence threshold
                        validatedDrugs.push({
                            input: word,
                            matched: bestMatch.name,
                            generic: bestMatch.generic_name,
                            score: bestMatch.score,
                            brand_names: bestMatch.brand_names || []
                        });
                    }
                }
            } catch (error) {
                console.error(`Error validating drug "${word}":`, error);
            }
        }
    }

    return validatedDrugs;
}

/**
 * Search for drugs using QDrant vector database with semantic search
 */
async function searchDrugs(query, limit = 5) {
    try {
        console.log(`Searching for: "${query}"`);
        
        // Generate embedding for the query
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: query.toLowerCase()
        });
        
        const queryEmbedding = embeddingResponse.data[0].embedding;
        
        // Search QDrant vector database
        const searchResult = await qdrant.search('drug_database', {
            vector: queryEmbedding,
            limit: limit,
            with_payload: true,
            score_threshold: 0.7 // Only return results with good confidence
        });
        
        // Transform results to match expected format
        const matches = searchResult.map(result => ({
            name: result.payload.name,
            generic_name: result.payload.name,
            brand_names: result.payload.brand_names,
            class: result.payload.class,
            indication: result.payload.indication,
            score: result.score
        }));
        
        console.log(`Found ${matches.length} matches for "${query}"`);
        matches.forEach(match => {
            console.log(`  - ${match.name} (${match.brand_names.join(', ')}) - Score: ${match.score.toFixed(3)}`);
        });
        
        return matches;

    } catch (error) {
        console.error('QDrant search error:', error);
        
        // Fallback to simple string matching if QDrant fails
        return fallbackDrugSearch(query, limit);
    }
}

/**
 * Fallback drug search using simple string matching
 */
function fallbackDrugSearch(query, limit = 5) {
    console.log(`Using fallback search for: "${query}"`);
    
    const basicDrugDatabase = [
        { name: 'warfarin', brand_names: ['Coumadin', 'Jantoven'], class: 'anticoagulant' },
        { name: 'aspirin', brand_names: ['Bayer', 'Bufferin', 'Ecotrin'], class: 'antiplatelet' },
        { name: 'metformin', brand_names: ['Glucophage', 'Fortamet'], class: 'antidiabetic' },
        { name: 'lisinopril', brand_names: ['Prinivil', 'Zestril'], class: 'ace_inhibitor' },
        { name: 'atorvastatin', brand_names: ['Lipitor'], class: 'statin' },
        { name: 'amlodipine', brand_names: ['Norvasc'], class: 'calcium_channel_blocker' },
        { name: 'metoprolol', brand_names: ['Lopressor', 'Toprol-XL'], class: 'beta_blocker' },
        { name: 'furosemide', brand_names: ['Lasix'], class: 'diuretic' },
        { name: 'sertraline', brand_names: ['Zoloft'], class: 'ssri' },
        { name: 'tramadol', brand_names: ['Ultram'], class: 'opioid_analgesic' },
        { name: 'acetaminophen', brand_names: ['Tylenol'], class: 'analgesic' },
        { name: 'ibuprofen', brand_names: ['Advil', 'Motrin'], class: 'nsaid' },
        { name: 'omeprazole', brand_names: ['Prilosec'], class: 'ppi' },
        { name: 'levothyroxine', brand_names: ['Synthroid'], class: 'thyroid_hormone' }
    ];

    const queryLower = query.toLowerCase();
    const matches = [];

    for (const drug of basicDrugDatabase) {
        let score = 0;
        
        // Check generic name match
        if (drug.name.toLowerCase() === queryLower) {
            score = 1.0;
        } else if (drug.name.toLowerCase().includes(queryLower)) {
            score = 0.8;
        } else if (queryLower.includes(drug.name.toLowerCase())) {
            score = 0.7;
        }
        
        // Check brand name matches
        for (const brandName of drug.brand_names) {
            if (brandName.toLowerCase() === queryLower) {
                score = Math.max(score, 0.95);
            } else if (brandName.toLowerCase().includes(queryLower)) {
                score = Math.max(score, 0.75);
            }
        }

        // Fuzzy matching
        if (score === 0) {
            const similarity = calculateSimilarity(queryLower, drug.name.toLowerCase());
            if (similarity > 0.6) {
                score = similarity * 0.7;
            }
        }

        if (score > 0.5) {
            matches.push({
                name: drug.name,
                generic_name: drug.name,
                brand_names: drug.brand_names,
                class: drug.class,
                score
            });
        }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Image OCR Processing Endpoint
 * Uses OpenAI Vision to extract medication information from images
 */
app.post('/api/process-image-ocr', async (req, res) => {
    try {
        const { image, prompt } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Validate and process image data
        let imageUrl = image;
        
        // Ensure the image has proper data URL format
        if (!imageUrl.startsWith('data:image/')) {
            return res.status(400).json({ 
                error: 'Invalid image format. Please provide a valid data URL.' 
            });
        }

        // Process image with OpenAI Vision
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Use GPT-4 with vision capabilities
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt || "Extract all medications, dosages, and frequencies from this image. Return ONLY a simple list with one medication per line in the format: 'medication_name dosage frequency'. Do not include any explanatory text, headers, or formatting."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                                detail: "high" // Use high detail for better OCR
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
            temperature: 0.1
        });

        const extractedText = response.choices[0].message.content;
        
        // Parse medications from the response
        const medications = [];
        
        // Try to extract structured medication data
        const lines = extractedText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('Based on') && !line.startsWith('I can see') && !line.startsWith('The image'));
        
        lines.forEach(line => {
            // Remove bullet points, numbers, etc.
            const cleanLine = line.replace(/^[-•*\d+.)\s]+/, '').trim();
            
            // Skip empty lines or explanatory text
            if (cleanLine.length > 3 && 
                !cleanLine.toLowerCase().startsWith('medication') &&
                !cleanLine.toLowerCase().includes('prescription') &&
                !cleanLine.toLowerCase().includes('cannot') &&
                !cleanLine.toLowerCase().includes('unable')) {
                medications.push(cleanLine);
            }
        });

        // If no structured medications found, try to extract from free text
        if (medications.length === 0) {
            const commonMedications = [
                'metformin', 'lisinopril', 'amlodipine', 'simvastatin', 'omeprazole',
                'losartan', 'hydrochlorothiazide', 'gabapentin', 'sertraline', 'tramadol',
                'aspirin', 'ibuprofen', 'warfarin', 'prednisone', 'furosemide',
                'levothyroxine', 'albuterol', 'insulin', 'metoprolol', 'atorvastatin'
            ];
            
            const text = extractedText.toLowerCase();
            commonMedications.forEach(med => {
                if (text.includes(med)) {
                    // Try to extract dosage information around the medication
                    const regex = new RegExp(`${med}[\\s\\w]*\\d+[\\w\\s]*`, 'i');
                    const match = text.match(regex);
                    if (match) {
                        medications.push(match[0].trim());
                    } else {
                        medications.push(med);
                    }
                }
            });
        }

        console.log(`🔍 OCR processed image, extracted ${medications.length} medications`);
        
        res.json({
            success: true,
            medications: medications.slice(0, 10), // Limit to 10 medications
            rawText: extractedText
        });

    } catch (error) {
        console.error('Image OCR processing error:', error);
        res.status(500).json({ 
            error: 'Failed to process image',
            message: error.message 
        });
    }
});

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
}

/**
 * Initialize drug database (for demo purposes)
 */
async function initializeDrugDatabase() {
    console.log('Drug database initialized with demo data');
    // In production, this would populate QDrant with comprehensive drug data
    return true;
}

/**
 * DailyMed Drug Information Endpoint
 * Get official FDA prescribing information
 */
app.get('/api/dailymed/drug/:drugName', async (req, res) => {
    try {
        const { drugName } = req.params;
        
        if (!drugName) {
            return res.status(400).json({ error: 'Drug name is required' });
        }

        console.log(`📋 Getting DailyMed info for: ${drugName}`);
        
        const profile = await dailyMedService.getComprehensiveDrugProfile(drugName);
        
        res.json({
            success: profile.success,
            drug_name: drugName,
            dailymed_profile: profile.drug_profile || null,
            alternatives: profile.alternative_matches || [],
            source: 'NIH DailyMed',
            timestamp: new Date().toISOString(),
            from_cache: profile.from_cache || false,
            error: profile.error || null
        });

    } catch (error) {
        console.error('DailyMed endpoint error:', error);
        res.status(500).json({ 
            error: 'Failed to get DailyMed information',
            message: error.message 
        });
    }
});

/**
 * DailyMed Search Endpoint
 * Search for drugs by name or ingredient
 */
app.post('/api/dailymed/search', async (req, res) => {
    try {
        const { query, type = 'drug_name', limit = 10 } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        console.log(`🔍 DailyMed search: "${query}" (type: ${type})`);
        
        let result;
        if (type === 'ingredient') {
            result = await dailyMedService.searchByIngredient(query, limit);
        } else {
            result = await dailyMedService.searchDrugByName(query, limit);
        }
        
        res.json({
            success: result.success,
            query,
            search_type: type,
            results: result.data?.data || [],
            total_count: result.data?.metadata?.total_elements || 0,
            source: 'NIH DailyMed',
            timestamp: new Date().toISOString(),
            from_cache: result.from_cache || false,
            error: result.error || null
        });

    } catch (error) {
        console.error('DailyMed search endpoint error:', error);
        res.status(500).json({ 
            error: 'Failed to search DailyMed',
            message: error.message 
        });
    }
});

/**
 * DailyMed Drug Details Endpoint
 * Get detailed information by SPL ID
 */
app.get('/api/dailymed/details/:splId', async (req, res) => {
    try {
        const { splId } = req.params;
        
        if (!splId) {
            return res.status(400).json({ error: 'SPL ID is required' });
        }

        console.log(`📄 Getting DailyMed details for SPL ID: ${splId}`);
        
        const details = await dailyMedService.getDrugDetails(splId);
        
        res.json({
            success: details.success,
            spl_id: splId,
            drug_details: details.data || null,
            source: 'NIH DailyMed',
            timestamp: new Date().toISOString(),
            from_cache: details.from_cache || false,
            error: details.error || null
        });

    } catch (error) {
        console.error('DailyMed details endpoint error:', error);
        res.status(500).json({ 
            error: 'Failed to get DailyMed details',
            message: error.message 
        });
    }
});

/**
 * DailyMed Cache Stats Endpoint
 */
app.get('/api/dailymed/cache-stats', (req, res) => {
    try {
        const stats = dailyMedService.getCacheStats();
        
        res.json({
            success: true,
            cache_stats: stats,
            source: 'NIH DailyMed',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('DailyMed cache stats error:', error);
        res.status(500).json({ 
            error: 'Failed to get cache stats',
            message: error.message 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🏥 MedGuard AI Backend Server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`🎙️  Transcription API: http://localhost:${port}/api/transcribe`);
    console.log(`🩺 Clinical transcription: http://localhost:${port}/api/transcribe-clinical`);
    console.log(`💊 Drug search API: http://localhost:${port}/api/drugs/search`);
    console.log(`🏛️  DailyMed API: http://localhost:${port}/api/dailymed/*`);
});

module.exports = app;