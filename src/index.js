/**
 * MEDGUARD AI - MAIN APPLICATION SERVER
 * 
 * This is the main entry point that integrates all components:
 * - Serves the web interface
 * - Handles API requests
 * - Orchestrates the primary agent
 * - Manages the LangGraph workflow
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import PrimaryAgent from './agents/primary-agent.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MedGuard AI Application Server
 */
class MedGuardAIServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    // Initialize the primary agent
    this.primaryAgent = new PrimaryAgent({
      timeout_ms: parseInt(process.env.AGENT_TIMEOUT_MS) || 5000,
      enable_patient_context: process.env.ENABLE_PATIENT_CONTEXT !== 'false',
      verbose: process.env.VERBOSE === 'true'
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files from public directory
    const publicPath = join(__dirname, '../public');
    this.app.use(express.static(publicPath));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.url}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'medguard-ai',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Dosage validation endpoint
    this.app.post('/api/validate-dosage', async (req, res) => {
      try {
        const startTime = Date.now();
        const { drug, patient_id } = req.body;

        // Validate input
        if (!drug || !drug.drug_name || !drug.dosage) {
          return res.status(400).json({
            error: 'Invalid input: drug name and dosage required',
            code: 'INVALID_DOSAGE_INPUT'
          });
        }

        if (!patient_id) {
          return res.status(400).json({
            error: 'Invalid input: patient_id required for dosage validation',
            code: 'MISSING_PATIENT_ID'
          });
        }

        console.log(`💊 Validating dosage: ${drug.drug_name} ${drug.dosage}`);
        if (patient_id) console.log(`👤 Patient context: ${patient_id}`);

        // Call primary agent to validate dosage
        const result = await this.primaryAgent.validateDosage(drug, patient_id);

        // Add request metadata
        result.request_info = {
          drug: drug,
          patient_id,
          timestamp: new Date().toISOString(),
          request_id: this.generateRequestId()
        };

        console.log(`✅ Dosage validation completed: ${result.validation_status} (${Date.now() - startTime}ms)`);

        res.json(result);

      } catch (error) {
        console.error('❌ Error in dosage validation:', error);
        
        res.status(500).json({
          error: 'Internal server error during dosage validation',
          message: error.message,
          code: 'DOSAGE_VALIDATION_FAILED'
        });
      }
    });

    // Main drug interaction check endpoint
    this.app.post('/api/check-interaction', async (req, res) => {
      try {
        const startTime = Date.now();
        const { drugs, patient_id } = req.body;

        // Validate input
        if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
          return res.status(400).json({
            error: 'Invalid input: at least 2 drugs required',
            code: 'INVALID_INPUT'
          });
        }

        // Sanitize drug names
        const sanitizedDrugs = drugs
          .map(drug => typeof drug === 'string' ? drug.trim() : '')
          .filter(drug => drug.length > 0);

        if (sanitizedDrugs.length < 2) {
          return res.status(400).json({
            error: 'Invalid input: at least 2 valid drug names required',
            code: 'INVALID_DRUGS'
          });
        }

        console.log(`🔍 Checking interactions for: ${sanitizedDrugs.join(', ')}`);
        if (patient_id) console.log(`👤 Patient context: ${patient_id}`);

        // Call primary agent to check interactions
        const result = await this.primaryAgent.checkInteraction(
          sanitizedDrugs,
          patient_id
        );

        // Add request metadata
        result.request_info = {
          drugs: sanitizedDrugs,
          patient_id,
          timestamp: new Date().toISOString(),
          request_id: this.generateRequestId()
        };

        console.log(`✅ Interaction check completed: ${result.risk_level} (${Date.now() - startTime}ms)`);

        res.json(result);

      } catch (error) {
        console.error('❌ Error in interaction check:', error);
        
        res.status(500).json({
          error: 'Internal server error during interaction check',
          message: error.message,
          code: 'INTERACTION_CHECK_FAILED'
        });
      }
    });

    // Batch interaction check endpoint
    this.app.post('/api/batch-check', async (req, res) => {
      try {
        const { requests } = req.body;

        if (!Array.isArray(requests)) {
          return res.status(400).json({
            error: 'Invalid input: requests must be an array',
            code: 'INVALID_BATCH_INPUT'
          });
        }

        const results = await Promise.all(
          requests.map(async (request, index) => {
            try {
              const result = await this.primaryAgent.checkInteraction(
                request.drugs,
                request.patient_id
              );
              return { index, success: true, result };
            } catch (error) {
              return { index, success: false, error: error.message };
            }
          })
        );

        res.json({
          success: true,
          results,
          total: requests.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        });

      } catch (error) {
        console.error('❌ Error in batch check:', error);
        
        res.status(500).json({
          error: 'Internal server error during batch check',
          message: error.message,
          code: 'BATCH_CHECK_FAILED'
        });
      }
    });

    // Get patient information endpoint
    this.app.get('/api/patient/:patientId', (req, res) => {
      try {
        // This would typically query a database
        // For demo purposes, we'll return mock data
        const patientId = req.params.patientId;
        const patientInfo = this.getMockPatientInfo(patientId);

        if (!patientInfo) {
          return res.status(404).json({
            error: 'Patient not found',
            code: 'PATIENT_NOT_FOUND'
          });
        }

        res.json(patientInfo);

      } catch (error) {
        console.error('❌ Error getting patient info:', error);
        
        res.status(500).json({
          error: 'Internal server error retrieving patient info',
          message: error.message,
          code: 'PATIENT_INFO_FAILED'
        });
      }
    });

    // Mock scenarios endpoint for testing
    this.app.get('/api/scenarios', (req, res) => {
      const scenarios = [
        {
          id: 'warfarin_aspirin',
          name: 'Warfarin + Aspirin',
          drugs: ['warfarin', 'aspirin'],
          patient_id: 'P001',
          expected_risk: 'DANGER',
          description: 'Critical bleeding risk scenario'
        },
        {
          id: 'methotrexate_trimethoprim',
          name: 'Methotrexate + Trimethoprim',
          drugs: ['methotrexate', 'trimethoprim'],
          patient_id: 'P002',
          expected_risk: 'DANGER',
          description: 'Methotrexate toxicity risk'
        },
        {
          id: 'sertraline_tramadol',
          name: 'Sertraline + Tramadol',
          drugs: ['sertraline', 'tramadol'],
          patient_id: 'P003',
          expected_risk: 'WARNING',
          description: 'Serotonin syndrome risk'
        },
        {
          id: 'safe_combination',
          name: 'Sertraline + Amoxicillin',
          drugs: ['sertraline', 'amoxicillin'],
          patient_id: 'P003',
          expected_risk: 'SAFE',
          description: 'Safe combination example'
        }
      ];

      res.json({ scenarios });
    });

    // Agent status endpoint
    this.app.get('/api/agent/status', (req, res) => {
      res.json({
        status: 'operational',
        agent_type: 'primary_agent',
        timeout_ms: this.primaryAgent.config.timeout_ms,
        patient_context_enabled: this.primaryAgent.config.enable_patient_context,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage()
      });
    });

    // Image OCR processing endpoint (proxy to backend)
    this.app.post('/api/process-image-ocr', async (req, res) => {
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
        const response = await fetch(`${backendUrl}/api/process-image-ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(req.body)
        });

        const result = await response.json();
        
        if (!response.ok) {
          return res.status(response.status).json(result);
        }

        res.json(result);

      } catch (error) {
        console.error('❌ Error in OCR processing:', error);
        
        res.status(500).json({
          error: 'Internal server error during OCR processing',
          message: error.message,
          code: 'OCR_PROCESSING_FAILED'
        });
      }
    });

    // Serve main app on root
    this.app.get('/', (req, res) => {
      res.sendFile(join(__dirname, '../public/index.html'));
    });

    // Catch-all route for SPA
    this.app.get('*', (req, res) => {
      // If it's an API route, return 404
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({
          error: 'API endpoint not found',
          code: 'ENDPOINT_NOT_FOUND'
        });
      }

      // Otherwise serve the main app
      res.sendFile(join(__dirname, '../public/index.html'));
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.path
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('💥 Unhandled error:', error);

      // Don't expose internal errors in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'Something went wrong',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });
  }

  /**
   * Get mock patient information
   */
  getMockPatientInfo(patientId) {
    const patients = {
      'P001': {
        patient_id: 'P001',
        name: 'Eleanor Martinez',
        age: 72,
        gender: 'F',
        conditions: ['Atrial Fibrillation', 'Hypertension', 'Type 2 Diabetes'],
        current_medications: ['warfarin 5mg daily', 'metformin 1000mg BID', 'lisinopril 10mg daily'],
        allergies: ['penicillin', 'sulfa'],
        risk_factors: ['Advanced age', 'Anticoagulation', 'Multiple comorbidities']
      },
      'P002': {
        patient_id: 'P002',
        name: 'James Chen',
        age: 45,
        gender: 'M',
        conditions: ['Rheumatoid Arthritis', 'GERD'],
        current_medications: ['methotrexate 15mg weekly', 'folic acid 1mg daily', 'omeprazole 20mg daily'],
        allergies: [],
        risk_factors: ['Immunosuppression', 'Methotrexate therapy']
      },
      'P003': {
        patient_id: 'P003',
        name: 'Sarah Johnson',
        age: 28,
        gender: 'F',
        conditions: ['Depression', 'Migraine'],
        current_medications: ['sertraline 100mg daily', 'sumatriptan 50mg PRN'],
        allergies: ['aspirin', 'NSAIDs'],
        risk_factors: ['NSAID allergy', 'Depression history']
      }
    };

    return patients[patientId] || null;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the server
   */
  async start() {
    try {
      this.app.listen(this.port, () => {
        console.log('\n🚀 MedGuard AI Server Started');
        console.log('===============================');
        console.log(`🌐 Web Interface: http://localhost:${this.port}`);
        console.log(`🔌 API Base URL:  http://localhost:${this.port}/api`);
        console.log(`❤️  Health Check: http://localhost:${this.port}/api/health`);
        console.log(`📊 Agent Status:  http://localhost:${this.port}/api/agent/status`);
        console.log('===============================');
        console.log('🏥 Ready to check drug interactions!');
        console.log('💊 Built with LangGraph & MCP servers\n');
      });

      // Setup graceful shutdown
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    // Close server
    process.exit(0);
  }
}

// Create and start the server
const server = new MedGuardAIServer();
server.start().catch(console.error);

export default MedGuardAIServer;