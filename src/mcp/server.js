/**
 * MCP SERVER INFRASTRUCTURE
 * 
 * Model Context Protocol server that provides standardized API access
 * for drug interaction checking services.
 * 
 * RESPONSIBILITIES:
 * - Provide uniform interface for RxNorm and FDA APIs
 * - Handle authentication and rate limiting
 * - Cache frequently requested data
 * - Transform API responses to standard format
 * 
 * MCP PROTOCOL:
 * - Accepts structured requests from agents
 * - Returns standardized responses
 * - Manages resource lifecycle
 * - Provides capability discovery
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

/**
 * MCP Server Class
 * Implements the Model Context Protocol for medical APIs
 */
class MedGuardMCPServer {
  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'medguard-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );
    
    // Initialize Express for HTTP interface
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    
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
    
    // Setup MCP tools
    this.setupTools();
    
    // Setup HTTP routes
    this.setupHttpRoutes();
  }

  /**
   * Setup MCP tools that agents can call
   */
  setupTools() {
    /**
     * NORMALIZE_DRUG Tool
     * Normalizes drug names using RxNorm API
     */
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'normalize_drug',
          description: 'Normalize drug name using RxNorm API',
          inputSchema: {
            type: 'object',
            properties: {
              drug_name: {
                type: 'string',
                description: 'Drug name to normalize'
              },
              include_relations: {
                type: 'boolean',
                description: 'Include related drug names',
                default: true
              }
            },
            required: ['drug_name']
          }
        },
        {
          name: 'check_interaction',
          description: 'Check drug-drug interaction using FDA OpenFDA',
          inputSchema: {
            type: 'object',
            properties: {
              drug1: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  rxcui: { type: 'string' }
                }
              },
              drug2: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  rxcui: { type: 'string' }
                }
              }
            },
            required: ['drug1', 'drug2']
          }
        },
        {
          name: 'batch_normalize',
          description: 'Normalize multiple drug names in parallel',
          inputSchema: {
            type: 'object',
            properties: {
              drug_names: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of drug names to normalize'
              }
            },
            required: ['drug_names']
          }
        },
        {
          name: 'get_drug_info',
          description: 'Get comprehensive drug information',
          inputSchema: {
            type: 'object',
            properties: {
              rxcui: {
                type: 'string',
                description: 'RxNorm Concept Unique Identifier'
              }
            },
            required: ['rxcui']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'normalize_drug':
            return await this.normalizeDrug(args);
            
          case 'check_interaction':
            return await this.checkInteraction(args);
            
          case 'batch_normalize':
            return await this.batchNormalize(args);
            
          case 'get_drug_info':
            return await this.getDrugInfo(args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });

    /**
     * Resource handlers for accessing cached data
     */
    this.server.setRequestHandler('resources/list', async () => ({
      resources: [
        {
          uri: 'medguard://cache/drugs',
          name: 'Cached Drug Data',
          description: 'Access cached drug normalization data',
          mimeType: 'application/json'
        },
        {
          uri: 'medguard://cache/interactions',
          name: 'Cached Interaction Data',
          description: 'Access cached drug interaction data',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;
      
      if (uri === 'medguard://cache/drugs') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.getCacheStats('drugs'), null, 2)
            }
          ]
        };
      }
      
      if (uri === 'medguard://cache/interactions') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.getCacheStats('interactions'), null, 2)
            }
          ]
        };
      }
      
      throw new Error(`Resource not found: ${uri}`);
    });
  }

  /**
   * Setup HTTP routes for direct API access
   */
  setupHttpRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'medguard-mcp',
        version: '1.0.0',
        cache_size: this.cache.size,
        uptime: process.uptime()
      });
    });

    // Normalize drug endpoint
    this.app.post('/api/normalize', async (req, res) => {
      try {
        const result = await this.normalizeDrug(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Check interaction endpoint
    this.app.post('/api/interaction', async (req, res) => {
      try {
        const result = await this.checkInteraction(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Batch normalize endpoint
    this.app.post('/api/batch-normalize', async (req, res) => {
      try {
        const result = await this.batchNormalize(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Cache stats endpoint
    this.app.get('/api/cache-stats', (req, res) => {
      res.json({
        total_entries: this.cache.size,
        drugs: this.getCacheStats('drugs'),
        interactions: this.getCacheStats('interactions')
      });
    });

    // Clear cache endpoint
    this.app.post('/api/cache-clear', (req, res) => {
      const beforeSize = this.cache.size;
      this.cache.clear();
      res.json({
        message: 'Cache cleared',
        entries_removed: beforeSize
      });
    });
  }

  /**
   * Normalize drug name using RxNorm
   */
  async normalizeDrug({ drug_name, include_relations = true }) {
    // Check cache first
    const cacheKey = `drug:${drug_name.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...cached,
              from_cache: true
            })
          }
        ]
      };
    }

    // Check rate limit
    await this.checkRateLimit('rxnorm');

    try {
      // Try approximate match first
      const approxUrl = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(drug_name)}&maxEntries=3`;
      const approxResponse = await fetch(approxUrl);
      const approxData = await approxResponse.json();

      let rxcui = null;
      let matchedName = drug_name;
      let matchType = 'none';

      if (approxData.approximateGroup?.candidate) {
        const candidates = Array.isArray(approxData.approximateGroup.candidate)
          ? approxData.approximateGroup.candidate
          : [approxData.approximateGroup.candidate];
        
        rxcui = candidates[0].rxcui;
        matchedName = candidates[0].name;
        matchType = 'approximate';
      }

      // If no approximate match, try exact
      if (!rxcui) {
        const exactUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drug_name)}`;
        const exactResponse = await fetch(exactUrl);
        const exactData = await exactResponse.json();

        if (exactData.idGroup?.rxnormId) {
          rxcui = Array.isArray(exactData.idGroup.rxnormId)
            ? exactData.idGroup.rxnormId[0]
            : exactData.idGroup.rxnormId;
          matchType = 'exact';
        }
      }

      if (!rxcui) {
        throw new Error(`Drug not found: ${drug_name}`);
      }

      // Get properties
      const propsUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`;
      const propsResponse = await fetch(propsUrl);
      const propsData = await propsResponse.json();

      // Get related names if requested
      let relatedNames = { brand_names: [], generic_names: [] };
      if (include_relations) {
        const relatedUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=BN+IN`;
        const relatedResponse = await fetch(relatedUrl);
        const relatedData = await relatedResponse.json();

        if (relatedData.relatedGroup?.conceptGroup) {
          relatedData.relatedGroup.conceptGroup.forEach(group => {
            if (group.conceptProperties) {
              group.conceptProperties.forEach(prop => {
                if (group.tty === 'BN') {
                  relatedNames.brand_names.push(prop.name);
                } else if (group.tty === 'IN') {
                  relatedNames.generic_names.push(prop.name);
                }
              });
            }
          });
        }
      }

      const result = {
        success: true,
        original_input: drug_name,
        rxcui: rxcui,
        matched_name: matchedName,
        match_type: matchType,
        generic_name: propsData.properties?.name || matchedName,
        tty: propsData.properties?.tty,
        ...relatedNames,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.addToCache(cacheKey, result);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              original_input: drug_name
            })
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Check drug interaction using FDA OpenFDA
   */
  async checkInteraction({ drug1, drug2 }) {
    // Create cache key
    const drugs = [drug1.name, drug2.name].sort();
    const cacheKey = `interaction:${drugs.join('_')}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...cached,
              from_cache: true
            })
          }
        ]
      };
    }

    // Check rate limit
    await this.checkRateLimit('fda');

    try {
      // Query FDA adverse events
      const drug1Name = encodeURIComponent(drug1.name);
      const drug2Name = encodeURIComponent(drug2.name);
      
      const url = `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${drug1Name}"+AND+patient.drug.medicinalproduct:"${drug2Name}"&limit=100`;
      
      const response = await fetch(url);
      
      let adverseEvents = { total: 0, serious: 0, reactions: [] };
      
      if (response.ok) {
        const data = await response.json();
        
        const seriousEvents = data.results?.filter(event =>
          event.serious === '1' ||
          event.seriousnessdeath === '1' ||
          event.seriousnesshospitalization === '1'
        ) || [];
        
        // Extract common reactions
        const reactionCounts = {};
        data.results?.forEach(event => {
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
          .map(([reaction, count]) => ({ reaction, count }));
        
        adverseEvents = {
          total: data.meta?.results?.total || 0,
          serious: seriousEvents.length,
          reactions: topReactions
        };
      }

      // Determine severity
      let severity = 'UNKNOWN';
      let confidence = 0.5;
      
      if (adverseEvents.serious > 10) {
        severity = 'MAJOR';
        confidence = 0.9;
      } else if (adverseEvents.serious > 5) {
        severity = 'MODERATE';
        confidence = 0.8;
      } else if (adverseEvents.total > 10) {
        severity = 'MINOR';
        confidence = 0.7;
      }

      const result = {
        success: true,
        drug1: drug1.name,
        drug2: drug2.name,
        interaction_found: adverseEvents.total > 0,
        severity,
        confidence,
        adverse_events: adverseEvents,
        clinical_significance: this.getClinicalSignificance(severity),
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.addToCache(cacheKey, result);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              drug1: drug1.name,
              drug2: drug2.name
            })
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Batch normalize multiple drugs
   */
  async batchNormalize({ drug_names }) {
    const results = await Promise.all(
      drug_names.map(drug_name =>
        this.normalizeDrug({ drug_name, include_relations: false })
          .then(response => JSON.parse(response.content[0].text))
          .catch(error => ({
            success: false,
            original_input: drug_name,
            error: error.message
          }))
      )
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results,
            total: drug_names.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          })
        }
      ]
    };
  }

  /**
   * Get comprehensive drug information
   */
  async getDrugInfo({ rxcui }) {
    const cacheKey = `druginfo:${rxcui}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...cached,
              from_cache: true
            })
          }
        ]
      };
    }

    await this.checkRateLimit('rxnorm');

    try {
      // Get all info about the drug
      const allinfoUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allinfo.json`;
      const response = await fetch(allinfoUrl);
      const data = await response.json();

      const result = {
        success: true,
        rxcui,
        properties: data.rxcuiStatusHistory?.attributes || {},
        interactions: data.interactionTypeGroup || [],
        related_concepts: data.allRelatedGroup?.conceptGroup || [],
        timestamp: new Date().toISOString()
      };

      this.addToCache(cacheKey, result);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              rxcui
            })
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Get clinical significance text based on severity
   */
  getClinicalSignificance(severity) {
    switch (severity) {
      case 'MAJOR':
        return 'Avoid combination. Risk of serious adverse effects.';
      case 'MODERATE':
        return 'Use with caution. Monitor closely for adverse effects.';
      case 'MINOR':
        return 'Monitor for potential adverse effects.';
      default:
        return 'Limited data available. Exercise clinical judgment.';
    }
  }

  /**
   * Check rate limiting
   */
  async checkRateLimit(api) {
    const now = Date.now();
    const limit = this.rateLimits[api];
    const history = this.requestHistory[api];

    // Remove old requests outside the window
    const cutoff = now - limit.window;
    this.requestHistory[api] = history.filter(time => time > cutoff);

    // Check if we're at the limit
    if (this.requestHistory[api].length >= limit.requests) {
      const oldestRequest = Math.min(...this.requestHistory[api]);
      const waitTime = limit.window - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.requestHistory[api].push(now);
  }

  /**
   * Cache management
   */
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
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(type + ':')) {
        count++;
        oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
        newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
      }
    }

    return {
      count,
      oldest: oldestTimestamp > 0 ? new Date(oldestTimestamp).toISOString() : null,
      newest: newestTimestamp > 0 ? new Date(newestTimestamp).toISOString() : null
    };
  }

  /**
   * Start the MCP server
   */
  async start() {
    // Start MCP server if running as stdio
    if (process.argv.includes('--stdio')) {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('MCP Server running on stdio');
    }

    // Start HTTP server
    const port = process.env.MCP_PORT || 3001;
    this.app.listen(port, () => {
      console.log(`MCP HTTP Server running on http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
    });
  }
}

// Create and start server
const server = new MedGuardMCPServer();
server.start().catch(console.error);

export default MedGuardMCPServer;