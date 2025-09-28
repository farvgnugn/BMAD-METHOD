#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Continuous Execution Engine
 * Main orchestrator for autonomous agent workflow execution
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const AAFCoordination = require('./socket-coordination.js');
const AgentLifecycleManager = require('./agent-lifecycle-manager.js');
const ClaudeCodeAgentManager = require('./claude-code-agent-manager.js');
const TestCoverageValidator = require('./test-coverage-validator.js');
const GitHubWorkflowEngine = require('./github-workflow-engine.js');

class ContinuousExecutionEngine extends EventEmitter {
    constructor(options = {}) {
        super();

        this.projectName = options.projectName || path.basename(process.cwd());
        this.config = this.loadConfig();

        // Core components
        this.coordination = null;
        this.lifecycleManager = null;
        this.agentManager = null;
        this.coverageValidator = null;
        this.githubEngine = null;

        // Execution state
        this.isRunning = false;
        this.startTime = null;
        this.executionStats = {
            storiesCompleted: 0,
            storiesProcessed: 0,
            agentsSpawned: 0,
            testRuns: 0,
            totalRuntime: 0,
            errors: 0,
            retries: 0,
            failures: 0
        };

        // Error handling and retry configuration
        this.errorHandling = {
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 5000,
            circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
            recoveryTimeout: options.recoveryTimeout || 60000
        };

        // Circuit breaker state
        this.circuitBreaker = {
            isOpen: false,
            failureCount: 0,
            lastFailureTime: null,
            nextRetryTime: null
        };

        // Performance tracking
        this.metrics = {
            storyCompletionTimes: [],
            averageStoryTime: 0,
            successRate: 0,
            testCoverageProgress: [],
            agentEfficiency: new Map()
        };

        this.setupEventHandlers();
    }

    loadConfig() {
        const configPaths = [
            path.join(process.cwd(), '.aaf-core', 'execution-config.yaml'),
            path.join(process.cwd(), 'aaf-execution.yaml'),
            path.join(__dirname, '..', 'config', 'execution-defaults.yaml')
        ];

        for (const configPath of configPaths) {
            try {
                if (fs.existsSync(configPath)) {
                    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
                    console.log(`📄 Loaded config from: ${configPath}`);
                    return config;
                }
            } catch (error) {
                console.warn(`Failed to load config from ${configPath}:`, error.message);
            }
        }

        // Default configuration
        return {
            execution: {
                maxConcurrentAgents: 5,
                pollingInterval: 30000,
                storyTimeout: 3600000,
                autoRestart: true,
                stopOnAllComplete: false
            },
            quality: {
                testCoverageTarget: 100,
                codeQualityTarget: 95,
                requireAllTestsPass: true,
                enforceStandards: true
            },
            coordination: {
                serverUrl: 'http://localhost:54321',
                autoStartServer: true,
                heartbeatInterval: 60000
            },
            reporting: {
                statusInterval: 300000, // 5 minutes
                saveMetrics: true,
                generateReports: true
            }
        };
    }

    setupEventHandlers() {
        // Handle process termination gracefully
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());

        // Handle uncaught errors
        process.on('unhandledRejection', (error) => {
            console.error('Unhandled promise rejection:', error);
            this.handleCriticalError(error, 'unhandled-rejection');
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
            this.handleCriticalError(error, 'uncaught-exception');
        });
    }

    async initialize() {
        console.log('🚀 Initializing AAF Continuous Execution Engine...');
        console.log(`📁 Project: ${this.projectName}`);

        try {
            // 1. Initialize coordination client
            console.log('🔗 Connecting to coordination server...');
            this.coordination = new AAFCoordination();
            await this.coordination.connect(
                'continuous-execution-engine',
                'Orchestrator',
                this.projectName,
                'ExecutionEngine'
            );

            // 2. Initialize Claude Code Agent Manager
            console.log('🤖 Initializing Claude Code Agent Manager...');
            this.agentManager = new ClaudeCodeAgentManager({
                workspaceRoot: process.cwd(),
                communicationPort: 0
            });

            // 3. Initialize test coverage validator
            console.log('🧪 Initializing test coverage validator...');
            this.coverageValidator = new TestCoverageValidator({
                workspaceRoot: process.cwd(),
                coverageThreshold: this.config.quality.testCoverageTarget
            });

            // 4. Initialize GitHub workflow engine
            console.log('📋 Initializing GitHub workflow engine...');
            this.githubEngine = new GitHubWorkflowEngine({
                workspaceRoot: process.cwd(),
                defaultBranch: 'main'
            });

            // 5. Initialize Agent Lifecycle Manager
            console.log('🔄 Initializing Agent Lifecycle Manager...');
            this.lifecycleManager = new AgentLifecycleManager({
                agentManager: this.agentManager,
                coverageValidator: this.coverageValidator,
                githubEngine: this.githubEngine,
                maxConcurrentAgents: this.config.execution.maxConcurrentAgents,
                storyTimeout: this.config.execution.storyTimeout
            });
            await this.lifecycleManager.initialize();

            // 6. Wire up event handlers
            this.wireEventHandlers();

            // 7. Setup periodic reporting
            this.setupPeriodicReporting();

            console.log('✅ Continuous Execution Engine initialized successfully!');
            this.emit('initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize execution engine:', error.message);
            this.emit('initialization-error', error);

            // Attempt retry for initialization failures
            if (this.shouldRetry(error)) {
                console.log('🔄 Retrying initialization...');
                await this.delay(this.errorHandling.retryDelay);
                return this.initialize();
            }

            return false;
        }
    }

    wireEventHandlers() {
        // Agent Lifecycle Manager events
        this.lifecycleManager.on('agent-spawned', (agent) => {
            this.executionStats.agentsSpawned++;
            console.log(`🤖 Agent spawned: ${agent.agentId} for story ${agent.story?.id || 'unknown'}`);
            this.emit('agent-spawned', agent);
        });

        this.lifecycleManager.on('agent-completed', (agent) => {
            const duration = agent.endTime - agent.startTime;
            this.metrics.storyCompletionTimes.push(duration);
            this.updateAverageStoryTime();

            if (agent.status === 'completed') {
                this.executionStats.storiesCompleted++;
                console.log(`✅ Story ${agent.story?.id || agent.agentId} completed in ${Math.round(duration/1000)}s`);
            }

            this.executionStats.storiesProcessed++;
            this.updateSuccessRate();
            this.emit('agent-completed', agent);
        });

        this.lifecycleManager.on('targets-achieved', (progress) => {
            console.log('🎉 ALL EXECUTION TARGETS ACHIEVED!');
            this.emit('targets-achieved', progress);

            if (this.config.execution.stopOnAllComplete) {
                this.stopExecution();
            }
        });

        this.lifecycleManager.on('story-failed', (storyId, error) => {
            console.log(`❌ Story ${storyId} failed: ${error.message}`);
            this.emit('story-failed', { storyId, error });
        });

        // Coverage validator events
        this.coverageValidator.on('coverage-validated', (result) => {
            this.metrics.testCoverageProgress.push({
                timestamp: new Date(),
                coverage: result.coverage
            });
            this.emit('coverage-updated', result.coverage);

            if (result.meetsThreshold) {
                console.log(`✅ Coverage validation passed: ${result.coverage.overall}%`);
            } else {
                console.log(`❌ Coverage validation failed: ${result.coverage.overall}% (required: ${result.threshold}%)`);
            }
        });

        // GitHub workflow events
        this.githubEngine.on('pr-created', (prData) => {
            console.log(`📋 Pull request created: #${prData.number}`);
            this.emit('pr-created', prData);
        });

        this.githubEngine.on('pr-merged', (prData) => {
            console.log(`✅ Pull request merged: #${prData.number}`);
            this.emit('pr-merged', prData);
        });

        // Coordination events
        this.coordination.socket.on('story-status-changed', (data) => {
            this.handleStoryStatusChange(data);
        });

        this.coordination.socket.on('disconnect', () => {
            console.log('⚠️ Lost connection to coordination server');
            this.emit('coordination-disconnected');
            this.handleConnectionLoss();
        });
    }

    setupPeriodicReporting() {
        if (this.config.reporting.statusInterval > 0) {
            setInterval(() => {
                this.generateStatusReport();
            }, this.config.reporting.statusInterval);
        }
    }

    async startExecution() {
        if (this.isRunning) {
            console.log('⚠️ Execution engine is already running');
            return false;
        }

        console.log('🚀 Starting continuous autonomous execution...');
        this.isRunning = true;
        this.startTime = new Date();

        try {
            // Start the lifecycle manager with retry
            await this.retry(async () => {
                await this.lifecycleManager.startExecution();
            }, { operation: 'start-lifecycle-manager' });

            // Start initial coverage analysis with retry
            await this.retry(async () => {
                await this.coverageValidator.validateTestCoverage();
            }, { operation: 'initial-coverage-analysis' });

            console.log('✅ Continuous execution started successfully!');
            this.emit('execution-started');

            // Generate initial status report
            this.generateStatusReport();

            return true;

        } catch (error) {
            console.error('❌ Failed to start execution:', error.message);
            this.isRunning = false;
            this.emit('execution-error', error);
            this.recordCircuitBreakerFailure();
            return false;
        }
    }

    async stopExecution() {
        if (!this.isRunning) {
            console.log('⚠️ Execution engine is not running');
            return false;
        }

        console.log('🛑 Stopping continuous execution...');
        this.isRunning = false;

        try {
            // Stop the lifecycle manager with retry
            await this.retry(async () => {
                await this.lifecycleManager.stopExecution();
            }, { operation: 'stop-lifecycle-manager' });

            // Generate final reports
            await this.generateFinalReport();

            const endTime = new Date();
            this.executionStats.totalRuntime = endTime - this.startTime;

            console.log('✅ Execution stopped successfully');
            console.log(`⏱️ Total runtime: ${Math.round(this.executionStats.totalRuntime/1000)}s`);
            console.log(`📊 Stories completed: ${this.executionStats.storiesCompleted}`);

            this.emit('execution-stopped');
            return true;

        } catch (error) {
            console.error('❌ Error stopping execution:', error.message);
            this.emit('execution-error', error);
            return false;
        }
    }

    async handleStoryStatusChange(data) {
        const { storyId, newStatus, agentName } = data;

        // Trigger coverage check when story is marked for review
        if (newStatus === 'Ready for Review') {
            console.log(`🔍 Running coverage check for story ${storyId}...`);

            try {
                const coverageResult = await this.retry(async () => {
                    return await this.coverageValidator.validateTestCoverage();
                }, { operation: 'coverage-validation', storyId });

                if (!coverageResult.meetsThreshold) {
                    console.log(`❌ Story ${storyId} failed coverage check`);
                    // Mark story as needing more work
                    await this.retry(async () => {
                        await this.coordination.updateStoryStatus(storyId, 'Needs Changes', 0, 'Insufficient test coverage');
                    }, { operation: 'update-story-status', storyId });

                    // Trigger additional test generation
                    await this.triggerAdditionalTestGeneration(storyId);
                }
            } catch (error) {
                console.error(`Coverage check failed for story ${storyId}:`, error.message);
                this.recordCircuitBreakerFailure();
            }
        }

        // Update metrics when story is completed
        if (newStatus === 'Done') {
            this.recordStoryCompletion(storyId, agentName);
        }

        this.emit('story-status-changed', data);
    }

    async handleCriticalError(error, type) {
        console.error(`🚨 Critical error [${type}]:`, error.message);
        this.executionStats.errors++;
        this.recordCircuitBreakerFailure();

        this.emit('critical-error', { error, type, timestamp: new Date() });

        // If circuit breaker is triggered, initiate emergency shutdown
        if (this.circuitBreaker.isOpen) {
            console.log('⚡ Circuit breaker triggered - initiating emergency shutdown');
            await this.emergencyShutdown(error);
        } else if (type === 'uncaught-exception') {
            // Uncaught exceptions require immediate shutdown
            await this.emergencyShutdown(error);
        }
    }

    shouldRetry(error, retryCount = 0) {
        // Don't retry if circuit breaker is open
        if (this.circuitBreaker.isOpen) {
            return false;
        }

        // Don't retry if max retries exceeded
        if (retryCount >= this.errorHandling.maxRetries) {
            return false;
        }

        // Don't retry certain error types
        const nonRetryableErrors = [
            'EAUTH',           // Authentication errors
            'EPERM',           // Permission errors
            'ENOTFOUND',       // DNS resolution errors
            'INVALID_CONFIG'   // Configuration errors
        ];

        if (nonRetryableErrors.some(code => error.code === code || error.message.includes(code))) {
            return false;
        }

        return true;
    }

    recordCircuitBreakerFailure() {
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = new Date();

        if (this.circuitBreaker.failureCount >= this.errorHandling.circuitBreakerThreshold) {
            this.circuitBreaker.isOpen = true;
            this.circuitBreaker.nextRetryTime = new Date(Date.now() + this.errorHandling.recoveryTimeout);

            console.log(`⚡ Circuit breaker opened - recovery in ${this.errorHandling.recoveryTimeout/1000}s`);
            this.emit('circuit-breaker-opened');

            // Schedule circuit breaker recovery
            setTimeout(() => {
                this.circuitBreaker.isOpen = false;
                this.circuitBreaker.failureCount = 0;
                console.log('⚡ Circuit breaker reset - retrying operations');
                this.emit('circuit-breaker-reset');
            }, this.errorHandling.recoveryTimeout);
        }
    }

    resetCircuitBreaker() {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.lastFailureTime = null;
        this.circuitBreaker.nextRetryTime = null;
    }

    async retry(operation, context = {}, retryCount = 0) {
        try {
            const result = await operation();

            // Reset circuit breaker on successful operation
            if (this.circuitBreaker.failureCount > 0) {
                this.resetCircuitBreaker();
            }

            return result;
        } catch (error) {
            this.executionStats.retries++;
            console.error(`🔄 Operation failed (attempt ${retryCount + 1}/${this.errorHandling.maxRetries + 1}):`, error.message);

            if (this.shouldRetry(error, retryCount)) {
                const delay = this.calculateRetryDelay(retryCount);
                console.log(`⏳ Retrying in ${delay/1000}s...`);

                await this.delay(delay);
                return this.retry(operation, context, retryCount + 1);
            } else {
                this.executionStats.failures++;
                this.recordCircuitBreakerFailure();
                console.error(`❌ Operation failed permanently after ${retryCount + 1} attempts`);
                throw error;
            }
        }
    }

    calculateRetryDelay(retryCount) {
        // Exponential backoff with jitter
        const baseDelay = this.errorHandling.retryDelay;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * baseDelay * 0.1; // 10% jitter

        return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async emergencyShutdown(error) {
        console.log('🚨 EMERGENCY SHUTDOWN INITIATED');
        console.log(`Cause: ${error.message}`);

        try {
            // Save emergency state
            await this.saveEmergencyState(error);

            // Force stop all operations
            this.isRunning = false;

            if (this.lifecycleManager) {
                await this.lifecycleManager.emergencyShutdown();
            }

            if (this.agentManager) {
                await this.agentManager.shutdown();
            }

            // Generate emergency report
            await this.generateEmergencyReport(error);

            console.log('🚨 Emergency shutdown completed');
            process.exit(1);

        } catch (shutdownError) {
            console.error('❌ Emergency shutdown failed:', shutdownError.message);
            process.exit(1);
        }
    }

    async saveEmergencyState(error) {
        try {
            const emergencyState = {
                timestamp: new Date().toISOString(),
                error: {
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                },
                executionStats: this.executionStats,
                circuitBreaker: this.circuitBreaker,
                agents: this.agentManager?.getAllAgents() || [],
                lastStatus: this.getStatus()
            };

            const emergencyDir = path.join(process.cwd(), '.aaf-temp', 'emergency');
            fs.mkdirSync(emergencyDir, { recursive: true });

            const emergencyFile = path.join(emergencyDir, `emergency-${Date.now()}.json`);
            fs.writeFileSync(emergencyFile, JSON.stringify(emergencyState, null, 2));

            console.log(`💾 Emergency state saved: ${emergencyFile}`);
        } catch (saveError) {
            console.error('Failed to save emergency state:', saveError.message);
        }
    }

    async generateEmergencyReport(error) {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                type: 'emergency-shutdown',
                cause: error.message,
                uptime: this.isRunning ? new Date() - this.startTime : 0,
                stats: this.executionStats,
                circuitBreaker: this.circuitBreaker,
                recommendations: this.generateEmergencyRecommendations(error)
            };

            const emergencyDir = path.join(process.cwd(), '.aaf-temp', 'emergency');
            const reportFile = path.join(emergencyDir, 'emergency-report.json');

            fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
            console.log(`📄 Emergency report generated: ${reportFile}`);

            return report;
        } catch (reportError) {
            console.error('Failed to generate emergency report:', reportError.message);
        }
    }

    generateEmergencyRecommendations(error) {
        const recommendations = [];

        if (error.code === 'ECONNREFUSED') {
            recommendations.push('Check if coordination server is running');
            recommendations.push('Verify network connectivity');
        }

        if (error.message.includes('spawn')) {
            recommendations.push('Verify Claude Code installation');
            recommendations.push('Check PATH environment variable');
        }

        if (this.circuitBreaker.failureCount > 0) {
            recommendations.push('Review system stability and resource usage');
            recommendations.push('Consider increasing retry thresholds');
        }

        if (this.executionStats.failures > this.executionStats.storiesCompleted) {
            recommendations.push('Review story complexity and agent timeouts');
            recommendations.push('Check for systemic configuration issues');
        }

        return recommendations;
    }

    async triggerAdditionalTestGeneration(storyId) {
        console.log(`🧪 Triggering additional test generation for story ${storyId}...`);

        try {
            // Create a testing story for the lifecycle manager
            const testingStory = {
                id: `${storyId}-test-generation`,
                title: `Generate additional tests for ${storyId}`,
                description: `Increase test coverage to meet 100% requirement for story ${storyId}`,
                priority: 'high',
                estimatedEffort: 'medium'
            };

            // Queue the testing story with retry
            await this.retry(async () => {
                await this.lifecycleManager.queueStory(testingStory);
            }, { operation: 'queue-test-generation', storyId });

            console.log(`🤖 Test generation queued for story ${storyId}`);

        } catch (error) {
            console.error(`Failed to trigger test generation for ${storyId}:`, error.message);
            this.recordCircuitBreakerFailure();
        }
    }

    recordStoryCompletion(storyId, agentName) {
        // Track agent efficiency
        if (agentName) {
            const efficiency = this.metrics.agentEfficiency.get(agentName) || { completed: 0, total: 0 };
            efficiency.completed++;
            this.metrics.agentEfficiency.set(agentName, efficiency);
        }

        this.executionStats.storiesCompleted++;
        this.updateSuccessRate();
    }

    updateAverageStoryTime() {
        const times = this.metrics.storyCompletionTimes;
        if (times.length > 0) {
            this.metrics.averageStoryTime = times.reduce((a, b) => a + b, 0) / times.length;
        }
    }

    updateSuccessRate() {
        if (this.executionStats.storiesProcessed > 0) {
            this.metrics.successRate = (this.executionStats.storiesCompleted / this.executionStats.storiesProcessed) * 100;
        }
    }

    async handleConnectionLoss() {
        console.log('🔄 Attempting to reconnect to coordination server...');

        const maxRetries = 10;
        let retries = 0;

        while (retries < maxRetries && this.isRunning) {
            try {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

                await this.coordination.connect(
                    'continuous-execution-engine',
                    'Orchestrator',
                    this.projectName,
                    'ExecutionEngine'
                );

                console.log('✅ Reconnected to coordination server');
                this.emit('coordination-reconnected');
                return;

            } catch (error) {
                retries++;
                console.log(`❌ Reconnection attempt ${retries}/${maxRetries} failed`);
            }
        }

        console.log('❌ Failed to reconnect after maximum retries');
        await this.stopExecution();
    }

    generateStatusReport() {
        const uptime = this.isRunning ? new Date() - this.startTime : 0;
        const lifecycleStatus = this.lifecycleManager?.getStatus() || {};
        const coverageStatus = this.coverageValidator?.getStatus() || {};

        const report = {
            timestamp: new Date().toISOString(),
            project: this.projectName,
            uptime: Math.round(uptime / 1000),
            isRunning: this.isRunning,

            execution: {
                ...this.executionStats,
                activeAgents: lifecycleStatus.activeAgents || 0,
                queuedStories: lifecycleStatus.queuedStories || 0
            },

            metrics: {
                ...this.metrics,
                averageStoryTime: Math.round(this.metrics.averageStoryTime / 1000)
            },

            coverage: {
                global: coverageStatus.overallCoverage || 0,
                targetsMet: coverageStatus.meetsThreshold || false,
                threshold: coverageStatus.threshold || 100
            },

            lifecycle: lifecycleStatus,

            config: this.config
        };

        console.log('\n📊 === STATUS REPORT ===');
        console.log(`⏱️ Uptime: ${Math.round(uptime/1000)}s`);
        console.log(`🤖 Active agents: ${lifecycleStatus.activeAgents || 0}`);
        console.log(`📋 Queued stories: ${lifecycleStatus.queuedStories || 0}`);
        console.log(`✅ Stories completed: ${this.executionStats.storiesCompleted}`);
        console.log(`📊 Success rate: ${Math.round(this.metrics.successRate)}%`);

        if (coverageStatus.overallCoverage) {
            console.log(`🧪 Test coverage: ${coverageStatus.overallCoverage}%`);
        }

        console.log('======================\n');

        if (this.config.reporting.saveMetrics) {
            this.saveStatusReport(report);
        }

        this.emit('status-report', report);
        return report;
    }

    saveStatusReport(report) {
        try {
            const reportsDir = path.join(process.cwd(), '.aaf-temp', 'reports');
            fs.mkdirSync(reportsDir, { recursive: true });

            const filename = `execution-status-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const reportPath = path.join(reportsDir, filename);

            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`💾 Status report saved: ${reportPath}`);

        } catch (error) {
            console.error('Failed to save status report:', error.message);
        }
    }

    async generateFinalReport() {
        console.log('📄 Generating final execution report...');

        try {
            const finalReport = {
                ...this.generateStatusReport(),
                summary: {
                    executionSuccessful: this.metrics.successRate >= 95,
                    allTargetsMet: await this.checkAllTargetsMet(),
                    recommendations: this.generateRecommendations()
                }
            };

            const reportsDir = path.join(process.cwd(), '.aaf-temp', 'reports');
            const finalReportPath = path.join(reportsDir, 'final-execution-report.json');

            fs.writeFileSync(finalReportPath, JSON.stringify(finalReport, null, 2));
            console.log(`📄 Final report saved: ${finalReportPath}`);

            return finalReport;

        } catch (error) {
            console.error('Failed to generate final report:', error.message);
            return null;
        }
    }

    async checkAllTargetsMet() {
        try {
            const lifecycleStatus = this.lifecycleManager.getStatus();
            const coverageResult = await this.coverageValidator.validateTestCoverage();

            return lifecycleStatus.completionRate >= 100 &&
                   coverageResult.meetsThreshold;
        } catch (error) {
            return false;
        }
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.metrics.successRate < 95) {
            recommendations.push('Consider increasing story timeout or reducing complexity');
        }

        if (this.metrics.averageStoryTime > 3600000) { // > 1 hour
            recommendations.push('Stories may be too large, consider breaking them down');
        }

        if (this.executionStats.agentsSpawned > this.executionStats.storiesCompleted * 2) {
            recommendations.push('High agent churn detected, review agent stability');
        }

        return recommendations;
    }

    async gracefulShutdown() {
        console.log('\n🛑 Graceful shutdown initiated...');

        try {
            if (this.isRunning) {
                await this.stopExecution();
            }

            if (this.lifecycleManager) {
                await this.lifecycleManager.shutdown();
            }

            if (this.agentManager) {
                await this.agentManager.shutdown();
            }

            if (this.coordination) {
                this.coordination.disconnect();
            }

            console.log('✅ Graceful shutdown completed');
            process.exit(0);

        } catch (error) {
            console.error('❌ Error during shutdown:', error.message);
            process.exit(1);
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            uptime: this.isRunning ? new Date() - this.startTime : 0,
            stats: this.executionStats,
            metrics: this.metrics,
            lifecycle: this.lifecycleManager?.getStatus(),
            coverage: this.coverageValidator?.getStatus(),
            agents: this.agentManager?.getAllAgents(),
            github: this.githubEngine?.getStatus()
        };
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const engine = new ContinuousExecutionEngine({
        projectName: args[1] || path.basename(process.cwd())
    });

    try {
        switch (command) {
            case 'start':
                await engine.initialize();
                await engine.startExecution();

                // Keep process alive
                process.stdin.resume();
                console.log('Press Ctrl+C to stop execution');
                break;

            case 'status':
                await engine.initialize();
                const status = engine.generateStatusReport();
                console.log('\nDetailed status saved to reports directory');
                engine.gracefulShutdown();
                break;

            case 'init':
                console.log('🔧 Initializing AAF Continuous Execution...');
                const configDir = path.join(process.cwd(), '.aaf-core');
                fs.mkdirSync(configDir, { recursive: true });

                const defaultConfig = engine.loadConfig();
                const configPath = path.join(configDir, 'execution-config.yaml');

                fs.writeFileSync(configPath, yaml.dump(defaultConfig));
                console.log(`✅ Configuration created: ${configPath}`);
                console.log('Edit the configuration file and run "aaf-execution start" to begin');
                break;

            default:
                console.log('AAF Continuous Execution Engine');
                console.log('');
                console.log('Usage:');
                console.log('  init                     - Initialize configuration');
                console.log('  start [projectName]      - Start continuous execution');
                console.log('  status [projectName]     - Generate status report');
                console.log('');
                console.log('Features:');
                console.log('  🤖 Autonomous agent spawning for user stories');
                console.log('  📊 100% test coverage validation');
                console.log('  🔄 Continuous workflow orchestration');
                console.log('  📈 Real-time progress tracking');
                console.log('  🎯 Automatic quality gates');
                console.log('  📄 Comprehensive reporting');
                break;
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ContinuousExecutionEngine;