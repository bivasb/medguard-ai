/**
 * MedGuard AI - Data Flow Monitoring Server
 * 
 * Comprehensive logging and monitoring for tracking data flows, API calls,
 * and fallback scenarios across all system components
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');

class MonitoringServer {
    constructor() {
        this.app = express();
        this.port = process.env.MONITOR_PORT || 3005;
        this.logFile = path.join(__dirname, '../logs/data-flow.log');
        this.sessionLogs = new Map(); // Store logs per session
        this.apiCallStats = {
            rxnorm: { success: 0, failure: 0, fallback: 0 },
            openfda: { success: 0, failure: 0, fallback: 0 },
            mock: { used: 0 }
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.ensureLogDirectory();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Request logging middleware
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] MONITOR: ${req.method} ${req.url}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'medguard-monitoring',
                port: this.port,
                uptime: process.uptime(),
                totalLogs: this.getTotalLogCount(),
                apiStats: this.apiCallStats
            });
        });

        // Log a data flow event
        this.app.post('/api/log', async (req, res) => {
            try {
                const logEntry = await this.logDataFlow(req.body);
                
                // Broadcast to WebSocket clients for real-time monitoring
                this.broadcastToClients('log', logEntry);
                
                res.json({ success: true, logId: logEntry.id });
            } catch (error) {
                console.error('Error logging data flow:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Log API call result
        this.app.post('/api/log-api-call', async (req, res) => {
            try {
                const apiLogEntry = await this.logApiCall(req.body);
                
                // Update statistics
                this.updateApiStats(apiLogEntry);
                
                // Broadcast to WebSocket clients
                this.broadcastToClients('api-call', apiLogEntry);
                
                res.json({ success: true, logId: apiLogEntry.id });
            } catch (error) {
                console.error('Error logging API call:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Get session logs
        this.app.get('/api/session/:sessionId/logs', (req, res) => {
            const { sessionId } = req.params;
            const logs = this.sessionLogs.get(sessionId) || [];
            res.json({ sessionId, logs, count: logs.length });
        });

        // Get all recent logs
        this.app.get('/api/logs/recent', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const logs = await this.getRecentLogs(limit);
                res.json({ logs, count: logs.length });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get API statistics
        this.app.get('/api/stats', (req, res) => {
            res.json({
                apiCallStats: this.apiCallStats,
                timestamp: new Date().toISOString(),
                totalSessions: this.sessionLogs.size
            });
        });

        // Clear logs (for development)
        this.app.delete('/api/logs/clear', async (req, res) => {
            try {
                await this.clearLogs();
                res.json({ success: true, message: 'Logs cleared' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Serve monitoring dashboard
        this.app.get('/', (req, res) => {
            res.send(this.generateDashboardHTML());
        });

        // API flow visualization
        this.app.get('/flow', (req, res) => {
            res.send(this.generateFlowVisualizationHTML());
        });
    }

    setupWebSocket() {
        // Create HTTP server for WebSocket
        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });
        
        this.wss.on('connection', (ws, req) => {
            console.log(`📡 New WebSocket connection from ${req.socket.remoteAddress}`);
            
            // Send current stats on connection
            ws.send(JSON.stringify({
                type: 'stats',
                data: {
                    apiCallStats: this.apiCallStats,
                    totalSessions: this.sessionLogs.size,
                    timestamp: new Date().toISOString()
                }
            }));

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    console.log('WebSocket message received:', data);
                    
                    // Handle different message types
                    if (data.type === 'subscribe') {
                        ws.subscriptions = data.topics || ['all'];
                    }
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });

            ws.on('close', () => {
                console.log('WebSocket connection closed');
            });
        });
    }

    async ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        try {
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.error('Error creating log directory:', error);
        }
    }

    async logDataFlow(data) {
        const logEntry = {
            id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            type: 'data_flow',
            sessionId: data.sessionId || 'unknown',
            component: data.component, // 'frontend', 'mcp', 'backend', 'subagent'
            action: data.action, // 'click', 'api_call', 'response', 'error'
            path: data.path, // URL path or route
            method: data.method, // GET, POST, etc.
            payload: data.payload, // Request/response data
            metadata: {
                userAgent: data.userAgent,
                duration: data.duration,
                status: data.status,
                source: data.source,
                target: data.target
            }
        };

        // Add to session logs
        if (!this.sessionLogs.has(logEntry.sessionId)) {
            this.sessionLogs.set(logEntry.sessionId, []);
        }
        this.sessionLogs.get(logEntry.sessionId).push(logEntry);

        // Write to file
        await this.writeToLogFile(logEntry);

        console.log(`📊 DATA FLOW: ${logEntry.component} -> ${logEntry.action} (${logEntry.sessionId})`);

        return logEntry;
    }

    async logApiCall(data) {
        const apiLogEntry = {
            id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            type: 'api_call',
            sessionId: data.sessionId || 'unknown',
            service: data.service, // 'rxnorm', 'openfda', 'mock'
            endpoint: data.endpoint,
            method: data.method,
            requestData: data.requestData,
            responseData: data.responseData,
            success: data.success,
            error: data.error,
            fallback: data.fallback || false,
            duration: data.duration,
            metadata: {
                rateLimited: data.rateLimited || false,
                cached: data.cached || false,
                retries: data.retries || 0
            }
        };

        // Add to session logs
        if (!this.sessionLogs.has(apiLogEntry.sessionId)) {
            this.sessionLogs.set(apiLogEntry.sessionId, []);
        }
        this.sessionLogs.get(apiLogEntry.sessionId).push(apiLogEntry);

        // Write to file
        await this.writeToLogFile(apiLogEntry);

        console.log(`🔗 API CALL: ${apiLogEntry.service} ${apiLogEntry.success ? '✅' : '❌'} (${apiLogEntry.sessionId})`);

        return apiLogEntry;
    }

    updateApiStats(apiLogEntry) {
        const service = apiLogEntry.service;
        
        if (this.apiCallStats[service]) {
            if (apiLogEntry.success) {
                this.apiCallStats[service].success++;
            } else {
                this.apiCallStats[service].failure++;
            }
            
            if (apiLogEntry.fallback) {
                this.apiCallStats[service].fallback++;
            }
        }

        if (service === 'mock') {
            this.apiCallStats.mock.used++;
        }
    }

    broadcastToClients(type, data) {
        const message = JSON.stringify({ type, data });
        
        this.wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                try {
                    client.send(message);
                } catch (error) {
                    console.error('WebSocket broadcast error:', error);
                }
            }
        });
    }

    async writeToLogFile(logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.logFile, logLine);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    async getRecentLogs(limit = 100) {
        try {
            const data = await fs.readFile(this.logFile, 'utf8');
            const lines = data.trim().split('\n');
            const recentLines = lines.slice(-limit);
            
            return recentLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    getTotalLogCount() {
        let total = 0;
        this.sessionLogs.forEach(logs => total += logs.length);
        return total;
    }

    async clearLogs() {
        this.sessionLogs.clear();
        this.apiCallStats = {
            rxnorm: { success: 0, failure: 0, fallback: 0 },
            openfda: { success: 0, failure: 0, fallback: 0 },
            mock: { used: 0 }
        };
        
        try {
            await fs.writeFile(this.logFile, '');
        } catch (error) {
            console.error('Error clearing log file:', error);
        }
    }

    generateDashboardHTML() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>MedGuard AI - Data Flow Monitor</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
                .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .stat-number { font-size: 2em; font-weight: bold; color: #2563eb; }
                .logs { background: white; border-radius: 8px; padding: 20px; max-height: 600px; overflow-y: auto; }
                .log-entry { padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px; }
                .log-success { color: #059669; }
                .log-error { color: #dc2626; }
                .log-fallback { color: #d97706; }
                .controls { margin-bottom: 20px; }
                .btn { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
                .btn:hover { background: #1d4ed8; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 MedGuard AI - Data Flow Monitor</h1>
                <p>Real-time monitoring of API calls, data flows, and fallback scenarios</p>
            </div>

            <div class="controls">
                <button class="btn" onclick="refreshStats()">Refresh Stats</button>
                <button class="btn" onclick="clearLogs()">Clear Logs</button>
                <button class="btn" onclick="location.href='/flow'">Flow Visualization</button>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h3>RxNorm API</h3>
                    <div class="stat-number" id="rxnorm-success">0</div>
                    <div>Successful calls</div>
                    <div>Failures: <span id="rxnorm-failure">0</span></div>
                    <div>Fallbacks: <span id="rxnorm-fallback">0</span></div>
                </div>
                <div class="stat-card">
                    <h3>OpenFDA API</h3>
                    <div class="stat-number" id="openfda-success">0</div>
                    <div>Successful calls</div>
                    <div>Failures: <span id="openfda-failure">0</span></div>
                    <div>Fallbacks: <span id="openfda-fallback">0</span></div>
                </div>
                <div class="stat-card">
                    <h3>Mock Data</h3>
                    <div class="stat-number" id="mock-used">0</div>
                    <div>Times used</div>
                </div>
                <div class="stat-card">
                    <h3>Active Sessions</h3>
                    <div class="stat-number" id="total-sessions">0</div>
                    <div>Sessions tracked</div>
                </div>
            </div>

            <div class="logs">
                <h3>Recent Activity</h3>
                <div id="log-entries"></div>
            </div>

            <script>
                const ws = new WebSocket('ws://localhost:${this.port}');
                
                ws.onmessage = function(event) {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'stats') {
                        updateStats(message.data);
                    } else if (message.type === 'log' || message.type === 'api-call') {
                        addLogEntry(message.data);
                    }
                };

                function updateStats(data) {
                    document.getElementById('rxnorm-success').textContent = data.apiCallStats.rxnorm.success;
                    document.getElementById('rxnorm-failure').textContent = data.apiCallStats.rxnorm.failure;
                    document.getElementById('rxnorm-fallback').textContent = data.apiCallStats.rxnorm.fallback;
                    
                    document.getElementById('openfda-success').textContent = data.apiCallStats.openfda.success;
                    document.getElementById('openfda-failure').textContent = data.apiCallStats.openfda.failure;
                    document.getElementById('openfda-fallback').textContent = data.apiCallStats.openfda.fallback;
                    
                    document.getElementById('mock-used').textContent = data.apiCallStats.mock.used;
                    document.getElementById('total-sessions').textContent = data.totalSessions;
                }

                function addLogEntry(data) {
                    const logContainer = document.getElementById('log-entries');
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    
                    let className = '';
                    if (data.success === false) className = 'log-error';
                    else if (data.fallback) className = 'log-fallback';
                    else if (data.success === true) className = 'log-success';
                    
                    logEntry.innerHTML = \`
                        <span class="\${className}">[\${data.timestamp}]</span>
                        <strong>\${data.type.toUpperCase()}</strong>
                        \${data.service || data.component} - \${data.action || data.endpoint}
                        \${data.fallback ? ' (FALLBACK)' : ''}
                        \${data.error ? ' - ERROR: ' + data.error : ''}
                    \`;
                    
                    logContainer.insertBefore(logEntry, logContainer.firstChild);
                    
                    // Keep only last 100 entries
                    while (logContainer.children.length > 100) {
                        logContainer.removeChild(logContainer.lastChild);
                    }
                }

                function refreshStats() {
                    fetch('/api/stats')
                        .then(response => response.json())
                        .then(data => updateStats(data));
                }

                function clearLogs() {
                    if (confirm('Clear all logs?')) {
                        fetch('/api/logs/clear', { method: 'DELETE' })
                            .then(() => {
                                document.getElementById('log-entries').innerHTML = '';
                                refreshStats();
                            });
                    }
                }

                // Initial load
                refreshStats();
            </script>
        </body>
        </html>
        `;
    }

    generateFlowVisualizationHTML() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>MedGuard AI - Flow Visualization</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .flow-diagram { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .flow-step { display: inline-block; padding: 10px 20px; margin: 5px; border-radius: 4px; }
                .frontend { background: #dbeafe; border: 2px solid #2563eb; }
                .mcp { background: #dcfce7; border: 2px solid #059669; }
                .api { background: #fef3c7; border: 2px solid #d97706; }
                .fallback { background: #fee2e2; border: 2px solid #dc2626; }
                .arrow { font-size: 1.5em; color: #6b7280; }
            </style>
        </head>
        <body>
            <h1>🔄 Data Flow Visualization</h1>
            
            <div class="flow-diagram">
                <h3>Normal Flow (Using Real APIs)</h3>
                <div class="flow-step frontend">Frontend Click</div>
                <span class="arrow">→</span>
                <div class="flow-step mcp">MCP Server</div>
                <span class="arrow">→</span>
                <div class="flow-step api">RxNorm/FDA API</div>
                <span class="arrow">→</span>
                <div class="flow-step mcp">Response Processing</div>
                <span class="arrow">→</span>
                <div class="flow-step frontend">UI Update</div>
            </div>

            <div class="flow-diagram">
                <h3>Fallback Flow (API Failure)</h3>
                <div class="flow-step frontend">Frontend Click</div>
                <span class="arrow">→</span>
                <div class="flow-step mcp">MCP Server</div>
                <span class="arrow">→</span>
                <div class="flow-step fallback">API Error</div>
                <span class="arrow">→</span>
                <div class="flow-step fallback">Mock Data</div>
                <span class="arrow">→</span>
                <div class="flow-step frontend">UI Update</div>
            </div>

            <button onclick="location.href='/'" class="btn">Back to Dashboard</button>
        </body>
        </html>
        `;
    }

    async start() {
        this.server.listen(this.port, () => {
            console.log('\n🔍 MedGuard AI Monitoring Server Started');
            console.log('=====================================');
            console.log(`📊 Dashboard: http://localhost:${this.port}`);
            console.log(`📈 Flow Viz:  http://localhost:${this.port}/flow`);
            console.log(`🔗 API:       http://localhost:${this.port}/api`);
            console.log(`📡 WebSocket: ws://localhost:${this.port}`);
            console.log('=====================================');
            console.log('🎯 Ready to monitor MedGuard AI data flows!\n');
        });
    }
}

// Start the monitoring server
const monitoringServer = new MonitoringServer();
monitoringServer.start().catch(console.error);

module.exports = MonitoringServer;