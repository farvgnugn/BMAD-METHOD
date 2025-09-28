#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Autonomous Workflow Orchestrator
 * Enables continuous agent execution with 100% completion tracking
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

class AutonomousOrchestrator extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = options.config || this.loadConfig();
        this.projectName = options.projectName || path.basename(process.cwd());
        this.coordination = null; // Will be injected

        // Orchestration state
        this.agents = new Map(); // Track active autonomous agents
        this.storyQueue = []; // Prioritized story queue
        this.workflowState = new Map(); // Track workflow progress
        this.testCoverage = new Map(); // Track test coverage per story
        this.completionTargets = {
            stories: 100, // 100% story completion
            tests: 100,   // 100% test coverage
            quality: 95   // 95% quality gate
        };

        // Execution settings
        this.maxConcurrentAgents = options.maxConcurrentAgents || 5;
        this.pollingInterval = options.pollingInterval || 30000; // 30 seconds
        this.storyTimeout = options.storyTimeout || 3600000; // 1 hour per story

        // Agent personas
        this.agentPersonas = {
            'Developer': {
                skills: ['coding', 'implementation', 'debugging'],
                workflowStages: ['Available', 'In Progress', 'Ready for Review'],
                maxConcurrentStories: 2
            },
            'Reviewer': {
                skills: ['code-review', 'quality-assurance', 'testing'],
                workflowStages: ['Ready for Review', 'In Review'],
                maxConcurrentStories: 3
            },
            'QA': {
                skills: ['testing', 'validation', 'integration-testing'],
                workflowStages: ['Testing', 'QA Review'],
                maxConcurrentStories: 4
            },
            'Architect': {
                skills: ['design', 'architecture', 'technical-review'],
                workflowStages: ['Architecture Review', 'Technical Review'],
                maxConcurrentStories: 2
            }
        };

        this.isRunning = false;
        this.executionLoop = null;
    }

    loadConfig() {
        try {
            const configPath = path.join(process.cwd(), '.aaf-core', 'orchestrator-config.yaml');
            if (fs.existsSync(configPath)) {
                return yaml.load(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (error) {
            console.warn('Using default orchestrator configuration');
        }

        return {
            execution: {
                enabled: true,
                maxConcurrentAgents: 5,
                pollingInterval: 30000,
                storyTimeout: 3600000
            },
            quality: {
                testCoverageTarget: 100,
                codeQualityTarget: 95,
                requireAllTestsPass: true
            },
            agents: {
                autoSpawn: true,
                personas: ['Developer', 'Reviewer', 'QA'],
                claudeCodeIntegration: true
            }
        };
    }

    async initialize(coordination) {
        this.coordination = coordination;
        console.log('🤖 Initializing Autonomous Orchestrator...');

        // Subscribe to workflow events
        await this.subscribeToWorkflowEvents();

        // Load initial story queue
        await this.refreshStoryQueue();

        console.log(`✅ Orchestrator initialized for project: ${this.projectName}`);
        this.emit('initialized');
    }

    async subscribeToWorkflowEvents() {
        if (!this.coordination.socket) {
            throw new Error('Coordination client not connected');
        }

        // Subscribe to workflow notifications
        await new Promise((resolve, reject) => {
            this.coordination.socket.emit('subscribe-workflow', {
                projectName: this.projectName,
                role: 'Orchestrator',
                agentName: 'AutonomousOrchestrator'
            }, (response) => {
                if (response.success) {
                    console.log('📡 Subscribed to workflow events');
                    resolve();
                } else {
                    reject(new Error(response.error));
                }
            });
        });

        // Listen for workflow events
        this.coordination.socket.on('story-status-changed', (data) => {
            this.handleStoryStatusChange(data);
        });

        this.coordination.socket.on('review-completed', (data) => {
            this.handleReviewCompleted(data);
        });

        this.coordination.socket.on('workflow-notification', (data) => {
            this.handleWorkflowNotification(data);
        });
    }

    async refreshStoryQueue() {
        try {
            const stories = await this.coordination.getAvailableStories();

            // Prioritize stories by epic, priority, and dependencies
            this.storyQueue = stories
                .filter(story => story.status === 'Available' || story.status === 'Needs Changes')
                .sort((a, b) => {
                    // Priority: high > medium > low
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    const aPriority = priorityOrder[a.priority] || 1;
                    const bPriority = priorityOrder[b.priority] || 1;

                    if (aPriority !== bPriority) return bPriority - aPriority;

                    // Then by epic (group related stories)
                    if (a.epicId !== b.epicId) return a.epicId.localeCompare(b.epicId);

                    // Then by story ID (logical order within epic)
                    return a.id.localeCompare(b.id);
                });

            console.log(`📋 Story queue refreshed: ${this.storyQueue.length} stories available`);
            this.emit('queue-refreshed', this.storyQueue);

        } catch (error) {
            console.error('Failed to refresh story queue:', error.message);
        }
    }

    async startContinuousExecution() {
        if (this.isRunning) {
            console.log('⚠️ Orchestrator is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting continuous autonomous execution...');

        // Start main execution loop
        this.executionLoop = setInterval(async () => {
            try {
                await this.executeWorkflowCycle();
            } catch (error) {
                console.error('Error in execution cycle:', error.message);
                this.emit('execution-error', error);
            }
        }, this.pollingInterval);

        // Initial execution
        await this.executeWorkflowCycle();

        console.log(`✅ Continuous execution started (polling every ${this.pollingInterval/1000}s)`);
        this.emit('execution-started');
    }

    async stopContinuousExecution() {
        if (!this.isRunning) {
            console.log('⚠️ Orchestrator is not running');
            return;
        }

        this.isRunning = false;

        if (this.executionLoop) {
            clearInterval(this.executionLoop);
            this.executionLoop = null;
        }

        // Gracefully shutdown agents
        await this.shutdownAllAgents();

        console.log('🛑 Continuous execution stopped');
        this.emit('execution-stopped');
    }

    async executeWorkflowCycle() {
        console.log('🔄 Executing workflow cycle...');

        // 1. Refresh story queue and agent status
        await this.refreshStoryQueue();
        await this.refreshAgentStatus();

        // 2. Check for available work
        const availableWork = await this.identifyAvailableWork();

        // 3. Spawn agents for available work
        await this.spawnAgentsForWork(availableWork);

        // 4. Check completion status
        await this.checkCompletionStatus();

        // 5. Handle stuck or failed workflows
        await this.handleStuckWorkflows();

        this.emit('cycle-completed', {
            activeAgents: this.agents.size,
            queuedStories: this.storyQueue.length,
            completionProgress: await this.getCompletionProgress()
        });
    }

    async identifyAvailableWork() {
        const availableWork = {
            development: [],
            review: [],
            testing: [],
            architecture: []
        };

        // Get stories needing development work
        availableWork.development = this.storyQueue.filter(story =>
            story.status === 'Available' || story.status === 'Needs Changes'
        ).slice(0, this.maxConcurrentAgents);

        // Get stories ready for review
        try {
            const reviewData = await new Promise((resolve, reject) => {
                this.coordination.socket.emit('get-available-reviews', {
                    projectName: this.projectName
                }, (response) => {
                    if (response.success) {
                        resolve(response.stories || []);
                    } else {
                        resolve([]);
                    }
                });
            });
            availableWork.review = reviewData;
        } catch (error) {
            console.warn('Could not fetch review queue:', error.message);
        }

        return availableWork;
    }

    async spawnAgentsForWork(availableWork) {
        // Spawn development agents
        for (const story of availableWork.development) {
            if (this.agents.size >= this.maxConcurrentAgents) break;

            const agentId = await this.spawnAgent('Developer', story);
            if (agentId) {
                console.log(`🤖 Spawned Developer agent ${agentId} for story ${story.id}`);
            }
        }

        // Spawn review agents
        for (const story of availableWork.review) {
            if (this.agents.size >= this.maxConcurrentAgents) break;

            const agentId = await this.spawnAgent('Reviewer', story);
            if (agentId) {
                console.log(`🔍 Spawned Reviewer agent ${agentId} for story ${story.id}`);
            }
        }
    }

    async spawnAgent(persona, story) {
        const agentId = `${persona}-${story.id}-${Date.now()}`;

        try {
            // Create agent configuration
            const agentConfig = {
                id: agentId,
                persona: persona,
                story: story,
                projectName: this.projectName,
                startTime: new Date(),
                status: 'starting',
                claudeCodeCommand: this.buildClaudeCodeCommand(persona, story)
            };

            // Start Claude Code agent process
            const agentProcess = await this.startClaudeCodeAgent(agentConfig);

            if (agentProcess) {
                agentConfig.process = agentProcess;
                agentConfig.status = 'running';
                this.agents.set(agentId, agentConfig);

                this.emit('agent-spawned', agentConfig);
                return agentId;
            }

        } catch (error) {
            console.error(`Failed to spawn ${persona} agent for story ${story.id}:`, error.message);
        }

        return null;
    }

    buildClaudeCodeCommand(persona, story) {
        const commands = {
            'Developer': [
                `Implement user story ${story.id}: ${story.title}`,
                `Description: ${story.description}`,
                `Requirements:`,
                `- Write all necessary code to implement the feature`,
                `- Write comprehensive tests with 100% coverage`,
                `- Follow existing code patterns and conventions`,
                `- Run all tests and ensure they pass`,
                `- Create pull request when complete`,
                `- Mark story as "Ready for Review" when done`,
                ``,
                `Target: 100% story completion with full test coverage`
            ].join('\n'),

            'Reviewer': [
                `Review user story ${story.id}: ${story.title}`,
                `Requirements:`,
                `- Review all code changes for quality and standards`,
                `- Verify test coverage is 100%`,
                `- Check that all tests pass`,
                `- Ensure documentation is complete`,
                `- Either approve or request changes with specific feedback`,
                `- Update story status based on review outcome`,
                ``,
                `Target: Complete quality review with actionable feedback`
            ].join('\n'),

            'QA': [
                `Test user story ${story.id}: ${story.title}`,
                `Requirements:`,
                `- Run all automated tests and verify they pass`,
                `- Perform integration testing`,
                `- Verify functionality matches acceptance criteria`,
                `- Test edge cases and error conditions`,
                `- Document any issues found`,
                `- Mark story as "QA Approved" or return for fixes`,
                ``,
                `Target: 100% validation of story functionality`
            ].join('\n')
        };

        return commands[persona] || commands['Developer'];
    }

    async startClaudeCodeAgent(agentConfig) {
        try {
            const tempDir = path.join(process.cwd(), '.aaf-temp', 'agents');
            fs.mkdirSync(tempDir, { recursive: true });

            const promptFile = path.join(tempDir, `${agentConfig.id}-prompt.txt`);
            fs.writeFileSync(promptFile, agentConfig.claudeCodeCommand, 'utf8');

            // Start Claude Code process
            const claudeProcess = spawn('claude-code', [
                '--file', promptFile,
                '--project', this.projectName
            ], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false
            });

            // Monitor process output
            claudeProcess.stdout.on('data', (data) => {
                console.log(`[${agentConfig.id}] ${data.toString().trim()}`);
                this.emit('agent-output', { agentId: agentConfig.id, output: data.toString() });
            });

            claudeProcess.stderr.on('data', (data) => {
                console.error(`[${agentConfig.id}] ERROR: ${data.toString().trim()}`);
                this.emit('agent-error', { agentId: agentConfig.id, error: data.toString() });
            });

            claudeProcess.on('close', (code) => {
                console.log(`[${agentConfig.id}] Process exited with code ${code}`);
                this.handleAgentCompletion(agentConfig.id, code);
            });

            return claudeProcess;

        } catch (error) {
            console.error(`Failed to start Claude Code agent:`, error.message);
            return null;
        }
    }

    async handleAgentCompletion(agentId, exitCode) {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        agent.status = exitCode === 0 ? 'completed' : 'failed';
        agent.endTime = new Date();
        agent.duration = agent.endTime - agent.startTime;

        console.log(`🏁 Agent ${agentId} ${agent.status} (${Math.round(agent.duration/1000)}s)`);

        // Update story status based on completion
        if (exitCode === 0) {
            await this.handleSuccessfulCompletion(agent);
        } else {
            await this.handleFailedCompletion(agent);
        }

        // Clean up agent
        this.agents.delete(agentId);
        this.emit('agent-completed', agent);

        // Check if we need to spawn more agents
        setTimeout(() => this.executeWorkflowCycle(), 5000);
    }

    async handleSuccessfulCompletion(agent) {
        const { story, persona } = agent;

        try {
            // Update story status based on persona
            const statusMap = {
                'Developer': 'Ready for Review',
                'Reviewer': 'Approved',
                'QA': 'QA Approved'
            };

            const newStatus = statusMap[persona] || 'Done';

            // Publish status change
            await new Promise((resolve, reject) => {
                this.coordination.socket.emit('publish-story-status-change', {
                    storyId: story.id,
                    projectName: this.projectName,
                    oldStatus: story.status,
                    newStatus: newStatus,
                    agentName: agent.id,
                    role: persona,
                    developerId: 'autonomous-orchestrator',
                    notes: `Completed by autonomous ${persona} agent`,
                    timestamp: new Date().toISOString()
                }, (response) => {
                    if (response.success) {
                        resolve();
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });

            console.log(`✅ Story ${story.id} marked as ${newStatus}`);

        } catch (error) {
            console.error(`Failed to update story status:`, error.message);
        }
    }

    async handleFailedCompletion(agent) {
        const { story, persona } = agent;

        console.log(`❌ ${persona} agent failed for story ${story.id}`);

        // Optionally retry or escalate
        this.emit('agent-failed', {
            agent: agent,
            story: story,
            persona: persona
        });
    }

    async refreshAgentStatus() {
        // Check for hung or expired agents
        const now = new Date();
        const expiredAgents = [];

        for (const [agentId, agent] of this.agents) {
            const runtime = now - agent.startTime;

            if (runtime > this.storyTimeout) {
                console.log(`⏰ Agent ${agentId} exceeded timeout (${Math.round(runtime/1000)}s)`);
                expiredAgents.push(agentId);
            }
        }

        // Kill expired agents
        for (const agentId of expiredAgents) {
            await this.killAgent(agentId);
        }
    }

    async killAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        try {
            if (agent.process && !agent.process.killed) {
                agent.process.kill('SIGTERM');
                console.log(`🔪 Killed agent ${agentId}`);
            }

            agent.status = 'killed';
            agent.endTime = new Date();

            this.agents.delete(agentId);
            this.emit('agent-killed', agent);

        } catch (error) {
            console.error(`Failed to kill agent ${agentId}:`, error.message);
        }
    }

    async shutdownAllAgents() {
        console.log('🛑 Shutting down all agents...');

        const shutdownPromises = Array.from(this.agents.keys()).map(agentId =>
            this.killAgent(agentId)
        );

        await Promise.all(shutdownPromises);
        console.log('✅ All agents shut down');
    }

    async checkCompletionStatus() {
        const progress = await this.getCompletionProgress();

        if (progress.stories >= this.completionTargets.stories &&
            progress.tests >= this.completionTargets.tests &&
            progress.quality >= this.completionTargets.quality) {

            console.log('🎉 ALL TARGETS ACHIEVED!');
            console.log(`  📋 Stories: ${progress.stories}%`);
            console.log(`  🧪 Tests: ${progress.tests}%`);
            console.log(`  ⭐ Quality: ${progress.quality}%`);

            this.emit('targets-achieved', progress);

            // Optionally stop execution when targets are met
            if (this.config.execution?.stopWhenComplete) {
                await this.stopContinuousExecution();
            }
        }
    }

    async getCompletionProgress() {
        try {
            const allStories = await this.coordination.getAvailableStories();
            const total = allStories.length;
            const completed = allStories.filter(s => s.status === 'Done').length;

            return {
                stories: total > 0 ? Math.round((completed / total) * 100) : 100,
                tests: 85, // TODO: Integrate with actual test coverage tools
                quality: 92, // TODO: Integrate with code quality tools
                totalStories: total,
                completedStories: completed,
                activeAgents: this.agents.size
            };
        } catch (error) {
            console.error('Failed to get completion progress:', error.message);
            return { stories: 0, tests: 0, quality: 0 };
        }
    }

    async handleStuckWorkflows() {
        // Look for stories that have been in the same status too long
        // and take corrective action

        // This could include:
        // - Reassigning stuck stories
        // - Escalating blocked work
        // - Breaking down large stories
        // - Adjusting agent allocation
    }

    // Event handlers for workflow notifications
    handleStoryStatusChange(data) {
        console.log(`📢 Story ${data.storyId}: ${data.oldStatus} → ${data.newStatus}`);
        this.emit('story-status-changed', data);
    }

    handleReviewCompleted(data) {
        console.log(`🔍 Review completed for ${data.storyId}: ${data.reviewStatus}`);
        this.emit('review-completed', data);
    }

    handleWorkflowNotification(data) {
        console.log(`🔔 Workflow notification: ${data.message}`);
        this.emit('workflow-notification', data);
    }

    // Status and monitoring methods
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeAgents: this.agents.size,
            queuedStories: this.storyQueue.length,
            agents: Array.from(this.agents.values()).map(agent => ({
                id: agent.id,
                persona: agent.persona,
                storyId: agent.story.id,
                status: agent.status,
                runtime: agent.startTime ? new Date() - agent.startTime : 0
            }))
        };
    }

    async getDetailedReport() {
        const progress = await this.getCompletionProgress();
        const status = this.getStatus();

        return {
            timestamp: new Date().toISOString(),
            project: this.projectName,
            progress: progress,
            execution: status,
            targets: this.completionTargets,
            config: this.config
        };
    }
}

module.exports = AutonomousOrchestrator;