#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * Agent Lifecycle Manager
 * Comprehensive agent spawning, monitoring, recovery, and cleanup
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const ClaudeCodeAgentManager = require('./claude-code-agent-manager');
const TestCoverageValidator = require('./test-coverage-validator');
const GitHubWorkflowEngine = require('./github-workflow-engine');

class AgentLifecycleManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.workspaceRoot = options.workspaceRoot || process.cwd();
        this.config = {
            maxConcurrentAgents: options.maxConcurrentAgents || 10,
            agentTimeout: options.agentTimeout || 3600000, // 1 hour
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 30000, // 30 seconds
            ...options
        };

        // Component managers
        this.agentManager = new ClaudeCodeAgentManager({
            workspaceRoot: this.workspaceRoot,
            ...options
        });

        this.coverageValidator = new TestCoverageValidator({
            workspaceRoot: this.workspaceRoot,
            ...options
        });

        this.githubEngine = new GitHubWorkflowEngine({
            workspaceRoot: this.workspaceRoot,
            ...options
        });

        // Lifecycle tracking
        this.activeAgents = new Map(); // agentId -> lifecycle data
        this.agentQueue = []; // Queue of pending agent requests
        this.completedAgents = new Map(); // agentId -> completion data
        this.failedAgents = new Map(); // agentId -> failure data

        // Health monitoring
        this.healthCheckTimer = null;
        this.isShuttingDown = false;

        this.setupEventHandlers();
        this.startHealthMonitoring();

        console.log('🔄 Agent Lifecycle Manager initialized');
    }

    setupEventHandlers() {
        // Agent Manager events
        this.agentManager.on('agent-spawned', (agent) => {
            this.handleAgentSpawned(agent);
        });

        this.agentManager.on('agent-status-update', (agentId, status) => {
            this.handleAgentStatusUpdate(agentId, status);
        });

        this.agentManager.on('agent-task-complete', (agentId, result) => {
            this.handleAgentTaskComplete(agentId, result);
        });

        this.agentManager.on('agent-error', (agentId, error) => {
            this.handleAgentError(agentId, error);
        });

        this.agentManager.on('agent-process-exit', (agentId, code) => {
            this.handleAgentProcessExit(agentId, code);
        });

        // Coverage Validator events
        this.coverageValidator.on('coverage-validated', (result) => {
            this.handleCoverageValidated(result);
        });

        // GitHub Engine events
        this.githubEngine.on('pr-created', (data) => {
            this.handlePRCreated(data);
        });

        this.githubEngine.on('pr-merged', (data) => {
            this.handlePRMerged(data);
        });

        // Process cleanup
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
    }

    startHealthMonitoring() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);

        console.log(`💓 Health monitoring started (${this.config.healthCheckInterval/1000}s interval)`);
    }

    async spawnAgent(agentRequest) {
        const {
            agentId = this.generateAgentId(),
            story,
            mode = 'normal',
            workspace,
            priority = 'medium',
            timeout = this.config.agentTimeout
        } = agentRequest;

        console.log(`🚀 Lifecycle: Spawning agent ${agentId} for story ${story.id}`);

        // Check capacity
        if (this.activeAgents.size >= this.config.maxConcurrentAgents) {
            console.log(`⏸️ Queue agent ${agentId} - at capacity (${this.activeAgents.size}/${this.config.maxConcurrentAgents})`);
            this.agentQueue.push({ ...agentRequest, agentId });
            return { queued: true, agentId };
        }

        try {
            // Create lifecycle entry
            const lifecycle = {
                agentId,
                story,
                mode,
                workspace,
                priority,
                timeout,
                phase: 'spawning',
                startTime: new Date(),
                lastActivity: new Date(),
                retryCount: 0,
                errors: [],
                status: 'starting'
            };

            this.activeAgents.set(agentId, lifecycle);

            // Generate enhanced prompt with lifecycle integration
            const prompt = await this.generateLifecyclePrompt(story, mode, agentId);

            // Spawn the agent
            const agent = await this.agentManager.spawnAgent({
                agentId,
                workspace,
                prompt,
                story,
                mode
            });

            if (agent) {
                lifecycle.agent = agent;
                lifecycle.phase = 'running';
                lifecycle.status = 'active';

                // Set timeout for agent
                lifecycle.timeoutId = setTimeout(() => {
                    this.handleAgentTimeout(agentId);
                }, timeout);

                this.emit('agent-lifecycle-started', lifecycle);
                return { success: true, agentId, lifecycle };
            } else {
                throw new Error('Agent spawning failed');
            }

        } catch (error) {
            console.error(`❌ Failed to spawn agent ${agentId}:`, error.message);
            this.activeAgents.delete(agentId);
            this.emit('agent-spawn-failed', { agentId, error });
            return { success: false, error: error.message };
        }
    }

    generateAgentId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `agent-${timestamp}-${random}`;
    }

    async generateLifecyclePrompt(story, mode, agentId) {
        const basePrompt = this.buildBasePrompt(story, mode);
        const lifecycleInstructions = this.buildLifecycleInstructions(agentId);

        return `${basePrompt}\n\n${lifecycleInstructions}`;
    }

    buildBasePrompt(story, mode) {
        const isYoloMode = mode === 'yolo';

        return `# AAF Agent Task: ${story.id}

## Story Details
**Title:** ${story.title}
**Description:** ${story.description}
**Priority:** ${story.priority || 'medium'}
**Mode:** ${isYoloMode ? 'YOLO (Rapid Prototyping)' : 'Standard Development'}

## Acceptance Criteria
${story.acceptanceCriteria?.map(criteria => `- ${criteria}`).join('\n') || 'No specific criteria provided'}

## Your Mission
Complete this user story with 100% implementation and testing:

### 1. IMPLEMENTATION (100% Complete)
- Implement ALL functionality described in the story
- Follow existing code patterns and conventions
- Write clean, maintainable, well-documented code
- Ensure all features work as specified

### 2. TESTING (100% Coverage + 100% Pass Rate)
- Write comprehensive unit tests
- Write integration tests where appropriate
- Achieve 100% test coverage for all new code
- Ensure ALL tests pass
- Test edge cases and error conditions

### 3. QUALITY ASSURANCE
- Run linting and fix all issues
- Run type checking (if TypeScript)
- Ensure code follows project standards
- Verify no breaking changes to existing functionality

### 4. COMPLETION WORKFLOW
${isYoloMode ? this.buildYoloWorkflow(story) : this.buildStandardWorkflow(story)}`;
    }

    buildYoloWorkflow(story) {
        return `**YOLO MODE - Direct to Main:**
1. Implement feature directly on main branch
2. Ensure all tests pass with 100% coverage
3. Commit changes with detailed message
4. Push directly to main branch
5. Report completion via AAF communication

**Success Criteria:**
- ✅ Feature 100% implemented on main branch
- ✅ All tests pass with 100% coverage
- ✅ Changes committed and pushed to main
- ✅ Story marked as complete`;
    }

    buildStandardWorkflow(story) {
        return `**Standard Mode - Feature Branch & PR:**
1. Create feature branch for the story
2. Implement all functionality with tests
3. Ensure 100% test coverage and all tests pass
4. Commit changes with detailed message
5. Push branch to origin
6. Create detailed pull request
7. Report completion for review

**Success Criteria:**
- ✅ Feature 100% implemented
- ✅ All tests pass with 100% coverage
- ✅ Pull request created with detailed description
- ✅ Ready for code review`;
    }

    buildLifecycleInstructions(agentId) {
        return `## AAF Lifecycle Integration

**Agent ID:** ${agentId}

### Communication Protocol
Use the AAF communication module to report progress:

\`\`\`javascript
const aafComm = require(process.env.AAF_COMMUNICATION_SCRIPT);

// Report progress regularly
aafComm.updateStatus('Implementation started', 10);
aafComm.updateStatus('Tests written', 50);
aafComm.updateStatus('All tests passing', 90);

// Report final completion
aafComm.taskComplete({
    success: true,
    testsPass: true,
    coveragePercent: 100,
    implementationComplete: true,
    branchName: 'feature/story-001' // if applicable
});
\`\`\`

### Critical Requirements
1. **Report status every major milestone**
2. **Ensure 100% test coverage before completion**
3. **Use provided communication protocol**
4. **Follow the specified workflow for your mode**

Begin implementation and maintain regular communication!`;
    }

    handleAgentSpawned(agent) {
        const lifecycle = this.activeAgents.get(agent.agentId);
        if (lifecycle) {
            lifecycle.phase = 'running';
            lifecycle.lastActivity = new Date();
            console.log(`✅ Agent ${agent.agentId} spawned successfully`);
        }
    }

    handleAgentStatusUpdate(agentId, statusData) {
        const lifecycle = this.activeAgents.get(agentId);
        if (lifecycle) {
            lifecycle.lastActivity = new Date();
            lifecycle.status = statusData.status || lifecycle.status;
            lifecycle.progress = statusData.progress || lifecycle.progress;

            console.log(`📊 Agent ${agentId}: ${statusData.status} (${statusData.progress || 0}%)`);
            this.emit('agent-progress-update', { agentId, lifecycle, statusData });
        }
    }

    async handleAgentTaskComplete(agentId, result) {
        const lifecycle = this.activeAgents.get(agentId);
        if (!lifecycle) return;

        console.log(`🏁 Agent ${agentId} reported task completion`);

        lifecycle.phase = 'validating';
        lifecycle.lastActivity = new Date();

        try {
            // Validate completion
            const validation = await this.validateAgentCompletion(agentId, result);

            if (validation.success) {
                await this.completeAgentLifecycle(agentId, result, validation);
            } else {
                await this.handleCompletionValidationFailure(agentId, result, validation);
            }

        } catch (error) {
            console.error(`❌ Validation failed for agent ${agentId}:`, error.message);
            await this.handleAgentFailure(agentId, error);
        }
    }

    async validateAgentCompletion(agentId, result) {
        const lifecycle = this.activeAgents.get(agentId);
        const workspace = lifecycle.workspace || lifecycle.agent?.workspace;

        console.log(`🔍 Validating completion for agent ${agentId}`);

        const validation = {
            success: false,
            issues: [],
            coverage: null,
            testsPass: false,
            implementationComplete: false
        };

        try {
            // 1. Validate test coverage
            if (result.testsPass && result.coveragePercent >= 100) {
                const coverageResult = await this.coverageValidator.validateTestCoverage(workspace);
                validation.coverage = coverageResult.coverage;
                validation.testsPass = coverageResult.success;

                if (!coverageResult.success) {
                    validation.issues.push('Test coverage validation failed');
                }
            } else {
                validation.issues.push('Agent reported incomplete testing');
            }

            // 2. Validate implementation
            if (result.implementationComplete) {
                validation.implementationComplete = true;
            } else {
                validation.issues.push('Implementation not marked as complete');
            }

            // 3. Validate git operations (if not YOLO mode)
            if (lifecycle.mode !== 'yolo' && result.branchName) {
                // Verify branch exists and PR created
                const gitValidation = await this.validateGitWorkflow(result.branchName);
                if (!gitValidation.success) {
                    validation.issues.push('Git workflow validation failed');
                }
            }

            validation.success = validation.issues.length === 0;
            return validation;

        } catch (error) {
            validation.issues.push(`Validation error: ${error.message}`);
            return validation;
        }
    }

    async validateGitWorkflow(branchName) {
        try {
            // Check if branch exists remotely
            const { spawn } = require('child_process');

            return new Promise((resolve) => {
                const gitProcess = spawn('git', ['ls-remote', '--heads', 'origin', branchName], {
                    stdio: 'pipe'
                });

                gitProcess.on('close', (code) => {
                    resolve({ success: code === 0 });
                });

                gitProcess.on('error', () => {
                    resolve({ success: false });
                });
            });

        } catch (error) {
            return { success: false };
        }
    }

    async completeAgentLifecycle(agentId, result, validation) {
        const lifecycle = this.activeAgents.get(agentId);

        console.log(`✅ Agent ${agentId} completed successfully`);

        // Clear timeout
        if (lifecycle.timeoutId) {
            clearTimeout(lifecycle.timeoutId);
        }

        // Update lifecycle
        lifecycle.phase = 'completed';
        lifecycle.endTime = new Date();
        lifecycle.duration = lifecycle.endTime - lifecycle.startTime;
        lifecycle.result = result;
        lifecycle.validation = validation;

        // Move to completed agents
        this.completedAgents.set(agentId, lifecycle);
        this.activeAgents.delete(agentId);

        // Update story status
        await this.updateStoryStatus(lifecycle.story, 'Done', result);

        // Cleanup agent resources
        await this.cleanupAgent(agentId);

        // Process queue
        this.processAgentQueue();

        this.emit('agent-lifecycle-completed', lifecycle);
    }

    async handleCompletionValidationFailure(agentId, result, validation) {
        const lifecycle = this.activeAgents.get(agentId);

        console.log(`❌ Agent ${agentId} completion validation failed:`, validation.issues);

        // Check retry count
        lifecycle.retryCount = (lifecycle.retryCount || 0) + 1;

        if (lifecycle.retryCount < this.config.retryAttempts) {
            console.log(`🔄 Retrying agent ${agentId} (attempt ${lifecycle.retryCount}/${this.config.retryAttempts})`);

            // Send retry instruction to agent
            await this.sendRetryInstructions(agentId, validation.issues);

            // Reset timeout
            if (lifecycle.timeoutId) {
                clearTimeout(lifecycle.timeoutId);
            }
            lifecycle.timeoutId = setTimeout(() => {
                this.handleAgentTimeout(agentId);
            }, this.config.agentTimeout);

        } else {
            console.log(`❌ Agent ${agentId} exceeded retry limit`);
            await this.handleAgentFailure(agentId, new Error('Validation failed after retries'));
        }
    }

    async sendRetryInstructions(agentId, issues) {
        const retryMessage = {
            type: 'retry-required',
            issues: issues,
            instructions: 'Please address the following issues and report completion again:'
        };

        await this.agentManager.sendToAgent(agentId, retryMessage);
    }

    handleAgentError(agentId, error) {
        const lifecycle = this.activeAgents.get(agentId);
        if (lifecycle) {
            lifecycle.errors.push({
                timestamp: new Date(),
                error: error.toString()
            });
            lifecycle.lastActivity = new Date();

            console.log(`⚠️ Agent ${agentId} error: ${error}`);
            this.emit('agent-error-occurred', { agentId, lifecycle, error });
        }
    }

    handleAgentProcessExit(agentId, code) {
        const lifecycle = this.activeAgents.get(agentId);
        if (!lifecycle) return;

        console.log(`🔚 Agent ${agentId} process exited with code ${code}`);

        if (code === 0) {
            // Normal exit - agent should have reported completion
            if (lifecycle.phase !== 'completed') {
                console.warn(`⚠️ Agent ${agentId} exited without reporting completion`);
                this.handleAgentFailure(agentId, new Error('Agent exited without completion report'));
            }
        } else {
            // Error exit
            this.handleAgentFailure(agentId, new Error(`Agent process failed with exit code ${code}`));
        }
    }

    async handleAgentTimeout(agentId) {
        const lifecycle = this.activeAgents.get(agentId);
        if (!lifecycle) return;

        console.log(`⏰ Agent ${agentId} timed out after ${this.config.agentTimeout/1000}s`);

        await this.handleAgentFailure(agentId, new Error('Agent execution timeout'));
    }

    async handleAgentFailure(agentId, error) {
        const lifecycle = this.activeAgents.get(agentId);
        if (!lifecycle) return;

        console.log(`❌ Agent ${agentId} failed: ${error.message}`);

        // Clear timeout
        if (lifecycle.timeoutId) {
            clearTimeout(lifecycle.timeoutId);
        }

        // Update lifecycle
        lifecycle.phase = 'failed';
        lifecycle.endTime = new Date();
        lifecycle.duration = lifecycle.endTime - lifecycle.startTime;
        lifecycle.failureReason = error.message;

        // Move to failed agents
        this.failedAgents.set(agentId, lifecycle);
        this.activeAgents.delete(agentId);

        // Update story status
        await this.updateStoryStatus(lifecycle.story, 'Available', null);

        // Kill agent process
        await this.agentManager.killAgent(agentId);

        // Cleanup
        await this.cleanupAgent(agentId);

        // Process queue
        this.processAgentQueue();

        this.emit('agent-lifecycle-failed', { lifecycle, error });
    }

    async cleanupAgent(agentId) {
        try {
            // Agent manager handles its own cleanup
            await this.agentManager.cleanupAgent(agentId);
            console.log(`🧹 Agent ${agentId} cleanup completed`);
        } catch (error) {
            console.warn(`Cleanup warning for ${agentId}:`, error.message);
        }
    }

    async updateStoryStatus(story, status, result) {
        try {
            if (story.filePath && fs.existsSync(story.filePath)) {
                // Update story file if it exists
                const yaml = require('js-yaml');

                if (story.filePath.endsWith('.yaml') || story.filePath.endsWith('.yml')) {
                    const content = fs.readFileSync(story.filePath, 'utf8');
                    const data = yaml.load(content);
                    data.status = status;
                    if (result) {
                        data.completedAt = new Date().toISOString();
                        data.implementation = result;
                    }
                    fs.writeFileSync(story.filePath, yaml.dump(data), 'utf8');
                }
            }

            console.log(`📝 Updated story ${story.id} status to: ${status}`);
        } catch (error) {
            console.warn(`Failed to update story status:`, error.message);
        }
    }

    processAgentQueue() {
        if (this.agentQueue.length === 0) return;
        if (this.activeAgents.size >= this.config.maxConcurrentAgents) return;

        console.log(`📋 Processing agent queue (${this.agentQueue.length} pending)`);

        // Sort queue by priority
        this.agentQueue.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority] || 2;
            const bPriority = priorityOrder[b.priority] || 2;
            return bPriority - aPriority;
        });

        // Spawn next agent
        const nextRequest = this.agentQueue.shift();
        this.spawnAgent(nextRequest);
    }

    performHealthCheck() {
        if (this.isShuttingDown) return;

        const now = new Date();
        const stalenessThreshold = 5 * 60 * 1000; // 5 minutes

        for (const [agentId, lifecycle] of this.activeAgents) {
            const timeSinceActivity = now - lifecycle.lastActivity;

            if (timeSinceActivity > stalenessThreshold) {
                console.log(`🔍 Health check: Agent ${agentId} appears stale (${Math.round(timeSinceActivity/1000)}s since activity)`);

                // Send ping to agent
                this.agentManager.sendToAgent(agentId, {
                    type: 'health-check',
                    timestamp: now.toISOString()
                });
            }
        }

        // Log health status
        console.log(`💓 Health check: ${this.activeAgents.size} active, ${this.agentQueue.length} queued, ${this.completedAgents.size} completed, ${this.failedAgents.size} failed`);
    }

    async gracefulShutdown() {
        if (this.isShuttingDown) return;

        console.log('🛑 Starting graceful shutdown...');
        this.isShuttingDown = true;

        // Stop health monitoring
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        // Kill all active agents
        const shutdownPromises = [];
        for (const agentId of this.activeAgents.keys()) {
            shutdownPromises.push(this.agentManager.killAgent(agentId));
        }

        await Promise.all(shutdownPromises);

        // Shutdown components
        await this.agentManager.shutdown();

        console.log('✅ Graceful shutdown completed');
        this.emit('shutdown-complete');
    }

    // Status and monitoring methods
    getStatus() {
        return {
            active: this.activeAgents.size,
            queued: this.agentQueue.length,
            completed: this.completedAgents.size,
            failed: this.failedAgents.size,
            capacity: this.config.maxConcurrentAgents,
            utilizationPercent: Math.round((this.activeAgents.size / this.config.maxConcurrentAgents) * 100)
        };
    }

    getDetailedStatus() {
        const active = Array.from(this.activeAgents.values()).map(lifecycle => ({
            agentId: lifecycle.agentId,
            story: lifecycle.story.id,
            phase: lifecycle.phase,
            runtime: new Date() - lifecycle.startTime,
            progress: lifecycle.progress || 0
        }));

        const queued = this.agentQueue.map(req => ({
            story: req.story.id,
            priority: req.priority,
            mode: req.mode
        }));

        return {
            summary: this.getStatus(),
            active,
            queued,
            recentlyCompleted: Array.from(this.completedAgents.values())
                .slice(-5)
                .map(lifecycle => ({
                    agentId: lifecycle.agentId,
                    story: lifecycle.story.id,
                    duration: lifecycle.duration,
                    completedAt: lifecycle.endTime
                })),
            recentlyFailed: Array.from(this.failedAgents.values())
                .slice(-5)
                .map(lifecycle => ({
                    agentId: lifecycle.agentId,
                    story: lifecycle.story.id,
                    failureReason: lifecycle.failureReason,
                    failedAt: lifecycle.endTime
                }))
        };
    }

    // Event handlers for external components
    handleCoverageValidated(result) {
        console.log(`📊 Coverage validated for ${result.workspace}: ${result.passed ? 'PASS' : 'FAIL'}`);
        this.emit('coverage-report', result);
    }

    handlePRCreated(data) {
        console.log(`📄 PR created: #${data.pr.number} for story ${data.story.id}`);
        this.emit('pr-created', data);
    }

    handlePRMerged(data) {
        console.log(`🔀 PR merged: #${data.prNumber}`);
        this.emit('pr-merged', data);
    }
}

module.exports = AgentLifecycleManager;