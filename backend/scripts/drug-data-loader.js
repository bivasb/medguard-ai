/**
 * Drug Database Loader for QDrant
 * 
 * Downloads and processes pharmaceutical databases for QDrant vector storage
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize clients
const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const COLLECTION_NAME = 'drug_database';

/**
 * Comprehensive drug database with common medications
 * In production, this would be loaded from FDA Orange Book or other sources
 */
const COMPREHENSIVE_DRUG_DATA = [
    // Cardiovascular
    { name: 'warfarin', brand_names: ['Coumadin', 'Jantoven'], class: 'anticoagulant', indication: 'anticoagulation' },
    { name: 'aspirin', brand_names: ['Bayer', 'Bufferin', 'Ecotrin'], class: 'antiplatelet', indication: 'cardioprotection' },
    { name: 'lisinopril', brand_names: ['Prinivil', 'Zestril'], class: 'ace_inhibitor', indication: 'hypertension' },
    { name: 'amlodipine', brand_names: ['Norvasc'], class: 'calcium_channel_blocker', indication: 'hypertension' },
    { name: 'metoprolol', brand_names: ['Lopressor', 'Toprol-XL'], class: 'beta_blocker', indication: 'hypertension' },
    { name: 'atorvastatin', brand_names: ['Lipitor'], class: 'statin', indication: 'hyperlipidemia' },
    { name: 'simvastatin', brand_names: ['Zocor'], class: 'statin', indication: 'hyperlipidemia' },
    { name: 'clopidogrel', brand_names: ['Plavix'], class: 'antiplatelet', indication: 'antiplatelet' },
    { name: 'furosemide', brand_names: ['Lasix'], class: 'diuretic', indication: 'fluid_retention' },
    { name: 'digoxin', brand_names: ['Lanoxin'], class: 'cardiac_glycoside', indication: 'heart_failure' },
    
    // Diabetes
    { name: 'metformin', brand_names: ['Glucophage', 'Fortamet', 'Riomet'], class: 'antidiabetic', indication: 'diabetes' },
    { name: 'insulin', brand_names: ['Humalog', 'Novolog', 'Lantus'], class: 'antidiabetic', indication: 'diabetes' },
    { name: 'glipizide', brand_names: ['Glucotrol'], class: 'sulfonylurea', indication: 'diabetes' },
    { name: 'pioglitazone', brand_names: ['Actos'], class: 'thiazolidinedione', indication: 'diabetes' },
    
    // Antibiotics
    { name: 'amoxicillin', brand_names: ['Amoxil'], class: 'penicillin', indication: 'infection' },
    { name: 'azithromycin', brand_names: ['Zithromax', 'Z-Pak'], class: 'macrolide', indication: 'infection' },
    { name: 'ciprofloxacin', brand_names: ['Cipro'], class: 'fluoroquinolone', indication: 'infection' },
    { name: 'clarithromycin', brand_names: ['Biaxin'], class: 'macrolide', indication: 'infection' },
    { name: 'doxycycline', brand_names: ['Vibramycin'], class: 'tetracycline', indication: 'infection' },
    { name: 'cephalexin', brand_names: ['Keflex'], class: 'cephalosporin', indication: 'infection' },
    
    // Pain/NSAIDs
    { name: 'ibuprofen', brand_names: ['Advil', 'Motrin'], class: 'nsaid', indication: 'pain' },
    { name: 'naproxen', brand_names: ['Aleve', 'Naprosyn'], class: 'nsaid', indication: 'pain' },
    { name: 'acetaminophen', brand_names: ['Tylenol'], class: 'analgesic', indication: 'pain' },
    { name: 'tramadol', brand_names: ['Ultram', 'ConZip'], class: 'opioid_analgesic', indication: 'pain' },
    { name: 'morphine', brand_names: ['MS Contin'], class: 'opioid', indication: 'severe_pain' },
    { name: 'oxycodone', brand_names: ['OxyContin', 'Percocet'], class: 'opioid', indication: 'pain' },
    
    // Mental Health
    { name: 'sertraline', brand_names: ['Zoloft'], class: 'ssri', indication: 'depression' },
    { name: 'fluoxetine', brand_names: ['Prozac'], class: 'ssri', indication: 'depression' },
    { name: 'escitalopram', brand_names: ['Lexapro'], class: 'ssri', indication: 'depression' },
    { name: 'venlafaxine', brand_names: ['Effexor'], class: 'snri', indication: 'depression' },
    { name: 'alprazolam', brand_names: ['Xanax'], class: 'benzodiazepine', indication: 'anxiety' },
    { name: 'lorazepam', brand_names: ['Ativan'], class: 'benzodiazepine', indication: 'anxiety' },
    { name: 'zolpidem', brand_names: ['Ambien'], class: 'hypnotic', indication: 'sleep' },
    
    // GI/PPI
    { name: 'omeprazole', brand_names: ['Prilosec'], class: 'ppi', indication: 'gerd' },
    { name: 'lansoprazole', brand_names: ['Prevacid'], class: 'ppi', indication: 'gerd' },
    { name: 'pantoprazole', brand_names: ['Protonix'], class: 'ppi', indication: 'gerd' },
    { name: 'ranitidine', brand_names: ['Zantac'], class: 'h2_blocker', indication: 'gerd' },
    
    // Respiratory
    { name: 'albuterol', brand_names: ['ProAir', 'Ventolin'], class: 'bronchodilator', indication: 'asthma' },
    { name: 'prednisone', brand_names: ['Deltasone'], class: 'corticosteroid', indication: 'inflammation' },
    { name: 'montelukast', brand_names: ['Singulair'], class: 'leukotriene_antagonist', indication: 'asthma' },
    
    // Thyroid
    { name: 'levothyroxine', brand_names: ['Synthroid', 'Levoxyl'], class: 'thyroid_hormone', indication: 'hypothyroidism' },
    { name: 'liothyronine', brand_names: ['Cytomel'], class: 'thyroid_hormone', indication: 'hypothyroidism' },
    
    // Seizures
    { name: 'phenytoin', brand_names: ['Dilantin'], class: 'anticonvulsant', indication: 'seizures' },
    { name: 'carbamazepine', brand_names: ['Tegretol'], class: 'anticonvulsant', indication: 'seizures' },
    { name: 'lamotrigine', brand_names: ['Lamictal'], class: 'anticonvulsant', indication: 'seizures' },
    
    // Immunosuppressants
    { name: 'methotrexate', brand_names: ['Trexall'], class: 'immunosuppressant', indication: 'rheumatoid_arthritis' },
    { name: 'cyclosporine', brand_names: ['Sandimmune'], class: 'immunosuppressant', indication: 'transplant' },
    
    // Chemotherapy (common)
    { name: 'tamoxifen', brand_names: ['Nolvadex'], class: 'antineoplastic', indication: 'breast_cancer' },
    
    // Miscellaneous
    { name: 'gabapentin', brand_names: ['Neurontin'], class: 'anticonvulsant', indication: 'neuropathic_pain' },
    { name: 'pregabalin', brand_names: ['Lyrica'], class: 'anticonvulsant', indication: 'neuropathic_pain' },
    { name: 'sildenafil', brand_names: ['Viagra'], class: 'pde5_inhibitor', indication: 'erectile_dysfunction' },
    { name: 'tadalafil', brand_names: ['Cialis'], class: 'pde5_inhibitor', indication: 'erectile_dysfunction' }
];

async function main() {
    try {
        console.log('🏥 Starting MedGuard AI Drug Database Setup...');
        
        // Step 1: Create collection
        await createDrugCollection();
        
        // Step 2: Generate embeddings and upload
        await uploadDrugData();
        
        // Step 3: Test search functionality
        await testSearch();
        
        console.log('✅ Drug database setup complete!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

async function createDrugCollection() {
    try {
        console.log('📊 Creating drug collection in QDrant...');
        
        // Delete existing collection if it exists
        try {
            await qdrant.deleteCollection(COLLECTION_NAME);
            console.log('🗑️  Deleted existing collection');
        } catch (error) {
            // Collection doesn't exist, that's fine
        }
        
        // Create new collection with 1536 dimensions (OpenAI text-embedding-ada-002)
        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: {
                size: 1536,
                distance: 'Cosine'
            }
        });
        
        console.log('✅ Drug collection created successfully');
        
    } catch (error) {
        console.error('❌ Failed to create collection:', error);
        throw error;
    }
}

async function uploadDrugData() {
    try {
        console.log('🚀 Generating embeddings and uploading drug data...');
        
        const batchSize = 10; // Process in batches to avoid rate limits
        
        for (let i = 0; i < COMPREHENSIVE_DRUG_DATA.length; i += batchSize) {
            const batch = COMPREHENSIVE_DRUG_DATA.slice(i, i + batchSize);
            
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(COMPREHENSIVE_DRUG_DATA.length/batchSize)}...`);
            
            const points = [];
            
            for (const drug of batch) {
                // Create searchable text combining all drug names
                const searchText = [
                    drug.name,
                    ...drug.brand_names,
                    drug.class,
                    drug.indication
                ].join(' ');
                
                // Generate embedding
                const embeddingResponse = await openai.embeddings.create({
                    model: 'text-embedding-ada-002',
                    input: searchText
                });
                
                const embedding = embeddingResponse.data[0].embedding;
                
                // Create point for QDrant
                points.push({
                    id: i + batch.indexOf(drug) + 1,
                    vector: embedding,
                    payload: {
                        name: drug.name,
                        brand_names: drug.brand_names,
                        class: drug.class,
                        indication: drug.indication,
                        search_text: searchText
                    }
                });
                
                console.log(`  ✅ ${drug.name} (${drug.brand_names.join(', ')})`);
            }
            
            // Upload batch to QDrant
            await qdrant.upsert(COLLECTION_NAME, {
                wait: true,
                points: points
            });
            
            // Rate limiting - wait between batches
            if (i + batchSize < COMPREHENSIVE_DRUG_DATA.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`✅ Uploaded ${COMPREHENSIVE_DRUG_DATA.length} drugs to QDrant`);
        
    } catch (error) {
        console.error('❌ Failed to upload drug data:', error);
        throw error;
    }
}

async function testSearch() {
    try {
        console.log('🔍 Testing drug search functionality...');
        
        const testQueries = ['lipitor', 'tylenol', 'zoloft', 'coumadin'];
        
        for (const query of testQueries) {
            console.log(`\nTesting: "${query}"`);
            
            // Generate query embedding
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: query
            });
            
            const queryEmbedding = embeddingResponse.data[0].embedding;
            
            // Search QDrant
            const searchResult = await qdrant.search(COLLECTION_NAME, {
                vector: queryEmbedding,
                limit: 3,
                with_payload: true
            });
            
            console.log('  Results:');
            searchResult.forEach((result, index) => {
                console.log(`    ${index + 1}. ${result.payload.name} (${result.payload.brand_names.join(', ')}) - Score: ${result.score.toFixed(3)}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Search test failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    createDrugCollection,
    uploadDrugData,
    testSearch,
    COLLECTION_NAME
};