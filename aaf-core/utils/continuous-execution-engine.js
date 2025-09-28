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
const AutonomousOrchestrator = require('./autonomous-orchestrator.js');
const TestCoverageMonitor = require('./test-coverage-monitor.js');

class ContinuousExecutionEngine extends EventEmitter {
    constructor(options = {}) {
        super();

        this.projectName = options.projectName || path.basename(process.cwd());
        this.config = this.loadConfig();

        // Core components
        this.coordination = null;
        this.orchestrator = null;
        this.coverageMonitor = null;

        // Execution state
        this.isRunning = false;
        this.startTime = null;
        this.executionStats = {
            storiesCompleted: 0,
            storiesProcessed: 0,
            agentsSpawned: 0,
            testRuns: 0,
            totalRuntime: 0
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
            this.emit('error', error);
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
            this.emit('error', error);
            this.gracefulShutdown();
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

            // 2. Initialize autonomous orchestrator
            console.log('🤖 Initializing autonomous orchestrator...');
            this.orchestrator = new AutonomousOrchestrator({
                config: this.config,
                projectName: this.projectName,
                maxConcurrentAgents: this.config.execution.maxConcurrentAgents,
                pollingInterval: this.config.execution.pollingInterval
            });
            await this.orchestrator.initialize(this.coordination);

            // 3. Initialize test coverage monitor
            console.log('🧪 Initializing test coverage monitor...');
            this.coverageMonitor = new TestCoverageMonitor({
                projectPath: process.cwd(),
                coverageTarget: this.config.quality.testCoverageTarget
            });
            await this.coverageMonitor.initialize();

            // 4. Wire up event handlers
            this.wireEventHandlers();

            // 5. Setup periodic reporting
            this.setupPeriodicReporting();

            console.log('✅ Continuous Execution Engine initialized successfully!');
            this.emit('initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize execution engine:', error.message);
            this.emit('initialization-error', error);
            return false;
        }
    }

    wireEventHandlers() {
        // Orchestrator events
        this.orchestrator.on('agent-spawned', (agent) => {
            this.executionStats.agentsSpawned++;
            console.log(`🤖 Agent spawned: ${agent.id} for story ${agent.story.id}`);
            this.emit('agent-spawned', agent);
        });

        this.orchestrator.on('agent-completed', (agent) => {
            const duration = agent.endTime - agent.startTime;
            this.metrics.storyCompletionTimes.push(duration);
            this.updateAverageStoryTime();

            if (agent.status === 'completed') {
                this.executionStats.storiesCompleted++;
                console.log(`✅ Story ${agent.story.id} completed in ${Math.round(duration/1000)}s`);
            }

            this.executionStats.storiesProcessed++;
            this.updateSuccessRate();
            this.emit('agent-completed', agent);
        });

        this.orchestrator.on('targets-achieved', (progress) => {
            console.log('🎉 ALL EXECUTION TARGETS ACHIEVED!');
            this.emit('targets-achieved', progress);

            if (this.config.execution.stopOnAllComplete) {
                this.stopExecution();
            }
        });

        // Coverage monitor events
        this.coverageMonitor.on('coverage-updated', (coverage) => {
            this.metrics.testCoverageProgress.push({
                timestamp: new Date(),
                coverage: coverage
            });
            this.emit('coverage-updated', coverage);
        });

        this.coverageMonitor.on('story-coverage-validated', (storyId, isValid, coverage) => {
            if (isValid) {
                console.log(`✅ Story ${storyId} meets coverage requirements`);
            } else {
                console.log(`❌ Story ${storyId} needs more test coverage`);
                // Trigger additional test generation
                this.triggerAdditionalTestGeneration(storyId);
            }
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
            // Start the orchestrator
            await this.orchestrator.startContinuousExecution();

            // Start initial coverage analysis
            await this.coverageMonitor.runFullCoverageAnalysis();

            console.log('✅ Continuous execution started successfully!');
            this.emit('execution-started');

            // Generate initial status report
            this.generateStatusReport();

            return true;

        } catch (error) {
            console.error('❌ Failed to start execution:', error.message);
            this.isRunning = false;
            this.emit('execution-error', error);
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
            // Stop the orchestrator
            await this.orchestrator.stopContinuousExecution();

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
                await this.coverageMonitor.trackStoryTestCoverage(storyId);
                const isValid = await this.coverageMonitor.validateStoryCoverage(storyId);

                if (!isValid) {
                    console.log(`❌ Story ${storyId} failed coverage check`);
                    // Mark story as needing more work
                    await this.coordination.updateStoryStatus(storyId, 'Needs Changes', 0, 'Insufficient test coverage');
                }
            } catch (error) {
                console.error(`Coverage check failed for story ${storyId}:`, error.message);
            }
        }

        // Update metrics when story is completed
        if (newStatus === 'Done') {
            this.recordStoryCompletion(storyId, agentName);
        }

        this.emit('story-status-changed', data);
    }

    async triggerAdditionalTestGeneration(storyId) {
        console.log(`🧪 Triggering additional test generation for story ${storyId}...`);

        try {
            // Spawn a specialized testing agent
            const testingAgent = await this.orchestrator.spawnAgent('QA', {
                id: storyId,
                title: `Generate additional tests for ${storyId}`,
                description: `Increase test coverage to meet 100% requirement`
            });

            if (testingAgent) {
                console.log(`🤖 Testing agent ${testingAgent} spawned for story ${storyId}`);
            }

        } catch (error) {
            console.error(`Failed to trigger test generation for ${storyId}:`, error.message);
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
        const orchestratorStatus = this.orchestrator.getStatus();
        const coverageStatus = this.coverageMonitor.getStatus();

        const report = {
            timestamp: new Date().toISOString(),
            project: this.projectName,
            uptime: Math.round(uptime / 1000),
            isRunning: this.isRunning,

            execution: {
                ...this.executionStats,
                activeAgents: orchestratorStatus.activeAgents,
                queuedStories: orchestratorStatus.queuedStories
            },

            metrics: {
                ...this.metrics,
                averageStoryTime: Math.round(this.metrics.averageStoryTime / 1000)
            },

            coverage: {
                global: coverageStatus.globalCoverage,
                targetsMet: coverageStatus.targetsMet,
                storiesTracked: coverageStatus.storiesTracked
            },

            orchestrator: orchestratorStatus,

            config: this.config
        };

        console.log('\n📊 === STATUS REPORT ===');
        console.log(`⏱️ Uptime: ${Math.round(uptime/1000)}s`);
        console.log(`🤖 Active agents: ${orchestratorStatus.activeAgents}`);
        console.log(`📋 Queued stories: ${orchestratorStatus.queuedStories}`);
        console.log(`✅ Stories completed: ${this.executionStats.storiesCompleted}`);
        console.log(`📊 Success rate: ${Math.round(this.metrics.successRate)}%`);

        if (coverageStatus.globalCoverage) {
            console.log(`🧪 Test coverage: ${coverageStatus.globalCoverage.lines.pct}%`);
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
            const orchestratorProgress = await this.orchestrator.getCompletionProgress();
            const coverageTargets = this.coverageMonitor.checkCoverageTargets();

            return orchestratorProgress.stories >= 100 &&
                   orchestratorProgress.tests >= 100 &&
                   coverageTargets.allMet;
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
            orchestrator: this.orchestrator?.getStatus(),
            coverage: this.coverageMonitor?.getStatus()
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