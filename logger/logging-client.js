/**
 * MedGuard AI - Logging Client
 * 
 * Client utility for sending data flow logs to the monitoring server
 * Used by all components (frontend, MCP, backend) to track data flows
 */

class MedGuardLogger {
    constructor(component, sessionId = null) {
        this.component = component; // 'frontend', 'mcp', 'backend', 'subagent'
        this.sessionId = sessionId || this.generateSessionId();
        this.monitoringUrl = process.env.MONITORING_URL || 'http://localhost:3005';
        this.enabled = process.env.ENABLE_LOGGING !== 'false';
        this.queue = [];
        this.isOnline = true;
        
        console.log(`🔍 Logger initialized for ${component} (session: ${this.sessionId})`);
        
        // Test connection to monitoring server
        this.testConnection();
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async testConnection() {
        if (!this.enabled) return;
        
        try {
            const response = await fetch(`${this.monitoringUrl}/health`, {
                method: 'GET',
                timeout: 1000
            });
            
            if (response.ok) {
                console.log('✅ Connected to monitoring server');
                this.isOnline = true;
            } else {
                console.log('⚠️ Monitoring server not responding');
                this.isOnline = false;
            }
        } catch (error) {
            console.log('⚠️ Monitoring server unavailable');
            this.isOnline = false;
        }
    }

    /**
     * Log a user interaction (click, form submit, etc.)
     */
    async logUserAction(action, payload = {}) {
        return this.logDataFlow({
            action: `user_${action}`,
            path: payload.path || window?.location?.pathname,
            method: 'USER_ACTION',
            payload: {
                element: payload.element,
                value: payload.value,
                ...payload
            },
            metadata: {
                userAgent: navigator?.userAgent,
                timestamp: new Date().toISOString(),
                source: 'user',
                target: this.component
            }
        });
    }

    /**
     * Log a data flow event
     */
    async logDataFlow(data) {
        if (!this.enabled) return;

        const logEntry = {
            sessionId: this.sessionId,
            component: this.component,
            timestamp: new Date().toISOString(),
            ...data
        };

        // Queue the log entry
        this.queue.push(logEntry);
        
        // Send immediately if online
        if (this.isOnline) {
            await this.flush();
        }

        console.log(`📊 ${this.component.toUpperCase()}: ${data.action}`, data.payload ? `(${Object.keys(data.payload).length} fields)` : '');
    }

    /**
     * Log an API call
     */
    async logApiCall(data) {
        if (!this.enabled) return;

        const startTime = Date.now();
        
        const apiLogEntry = {
            sessionId: this.sessionId,
            service: data.service, // 'rxnorm', 'openfda', 'mock'
            endpoint: data.endpoint,
            method: data.method || 'GET',
            requestData: data.requestData,
            success: data.success,
            error: data.error,
            fallback: data.fallback || false,
            duration: data.duration || (Date.now() - startTime),
            metadata: {
                rateLimited: data.rateLimited || false,
                cached: data.cached || false,
                retries: data.retries || 0
            }
        };

        try {
            if (this.isOnline) {
                const response = await fetch(`${this.monitoringUrl}/api/log-api-call`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiLogEntry)
                });

                if (!response.ok) {
                    console.error('Failed to log API call:', response.statusText);
                }
            }
            
            // Console log for immediate visibility
            const status = data.success ? '✅' : '❌';
            const fallbackText = data.fallback ? ' (FALLBACK)' : '';
            console.log(`🔗 API ${status} ${data.service}${fallbackText}: ${data.endpoint}`);
            
        } catch (error) {
            console.error('Error sending API log:', error);
        }
    }

    /**
     * Log navigation/routing events
     */
    async logNavigation(from, to, trigger = 'unknown') {
        return this.logDataFlow({
            action: 'navigation',
            path: to,
            method: 'NAVIGATE',
            payload: {
                from: from,
                to: to,
                trigger: trigger
            },
            metadata: {
                source: from,
                target: to,
                trigger: trigger
            }
        });
    }

    /**
     * Log form submissions
     */
    async logFormSubmit(formId, formData, endpoint) {
        return this.logDataFlow({
            action: 'form_submit',
            path: endpoint,
            method: 'POST',
            payload: {
                formId: formId,
                fieldCount: Object.keys(formData).length,
                fields: Object.keys(formData),
                // Don't log sensitive data, just metadata
                hasPatientData: formData.hasOwnProperty('patientId'),
                hasDrugData: formData.hasOwnProperty('drug1') || formData.hasOwnProperty('drugName')
            },
            metadata: {
                source: 'form',
                target: endpoint
            }
        });
    }

    /**
     * Log errors and exceptions
     */
    async logError(error, context = {}) {
        return this.logDataFlow({
            action: 'error',
            path: context.path || 'unknown',
            method: context.method || 'ERROR',
            payload: {
                message: error.message,
                stack: error.stack,
                name: error.name,
                ...context
            },
            metadata: {
                severity: context.severity || 'error',
                source: context.source || this.component,
                target: 'error_handler'
            }
        });
    }

    /**
     * Log performance metrics
     */
    async logPerformance(operation, duration, metadata = {}) {
        return this.logDataFlow({
            action: 'performance',
            path: metadata.path || operation,
            method: 'PERF',
            payload: {
                operation: operation,
                duration: duration,
                ...metadata
            },
            metadata: {
                source: this.component,
                target: 'performance_monitor'
            }
        });
    }

    /**
     * Flush queued logs to monitoring server
     */
    async flush() {
        if (!this.enabled || this.queue.length === 0) return;

        const logsToSend = [...this.queue];
        this.queue = [];

        try {
            for (const logEntry of logsToSend) {
                const response = await fetch(`${this.monitoringUrl}/api/log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logEntry)
                });

                if (!response.ok) {
                    // Re-queue failed logs
                    this.queue.push(logEntry);
                }
            }
        } catch (error) {
            // Re-queue all logs if network fails
            this.queue.unshift(...logsToSend);
            console.error('Error flushing logs:', error);
        }
    }

    /**
     * Create a scoped logger for a specific operation
     */
    createOperationLogger(operationName, metadata = {}) {
        const startTime = Date.now();
        
        return {
            log: (action, payload) => this.logDataFlow({
                action: `${operationName}_${action}`,
                payload,
                metadata: {
                    ...metadata,
                    operation: operationName,
                    operationStartTime: startTime
                }
            }),
            complete: (result) => this.logDataFlow({
                action: `${operationName}_complete`,
                payload: result,
                metadata: {
                    ...metadata,
                    operation: operationName,
                    duration: Date.now() - startTime
                }
            }),
            error: (error) => this.logError(error, {
                operation: operationName,
                duration: Date.now() - startTime,
                ...metadata
            })
        };
    }

    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`🔍 Logging ${enabled ? 'enabled' : 'disabled'} for ${this.component}`);
    }

    /**
     * Get current session info
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            component: this.component,
            enabled: this.enabled,
            queueSize: this.queue.length,
            isOnline: this.isOnline
        };
    }
}

// Browser compatibility
if (typeof window !== 'undefined') {
    window.MedGuardLogger = MedGuardLogger;
}

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedGuardLogger;
}

// Create a global logger instance for immediate use
let globalLogger = null;
const createLogger = (component, sessionId) => {
    globalLogger = new MedGuardLogger(component, sessionId);
    return globalLogger;
};

if (typeof window !== 'undefined') {
    window.createMedGuardLogger = createLogger;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports.createLogger = createLogger;
}