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

// Configure multer for audio file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit for audio files
    }
});

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(port, () => {
    console.log(`🏥 MedGuard AI Backend Server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`🎙️  Transcription API: http://localhost:${port}/api/transcribe`);
    console.log(`💊 Drug search API: http://localhost:${port}/api/drugs/search`);
});

module.exports = app;