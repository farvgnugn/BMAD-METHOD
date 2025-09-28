#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Claude Code Orchestrator - Complete Implementation
 * Integrates all AAF components for Claude Code slash commands
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import complete AAF implementations
const AgentLifecycleManager = require('../aaf-core/utils/agent-lifecycle-manager.js');
const ClaudeCodeAgentManager = require('../aaf-core/utils/claude-code-agent-manager.js');
const TestCoverageValidator = require('../aaf-core/utils/test-coverage-validator.js');
const GitHubWorkflowEngine = require('../aaf-core/utils/github-workflow-engine.js');

class AAFCompleteOrchestrator {
    constructor() {
        this.projectRoot = this.findProjectRoot();
        this.config = this.loadConfig();

        // Complete AAF components
        this.agentManager = null;
        this.lifecycleManager = null;
        this.coverageValidator = null;
        this.githubEngine = null;
        this.initialized = false;

        // Tracking
        this.activeAgents = new Map();
        this.executionResults = [];
    }

    findProjectRoot() {
        let dir = process.cwd();
        while (dir !== path.dirname(dir)) {
            if (fs.existsSync(path.join(dir, '.git'))) {
                return dir;
            }
            dir = path.dirname(dir);
        }
        return process.cwd();
    }

    loadConfig() {
        const configPaths = [
            path.join(this.projectRoot, '.aaf-core', 'orchestration-config.yaml'),
            path.join(this.projectRoot, '.aaf', 'config.yaml'),
            path.join(this.projectRoot, 'aaf-config.yaml')
        ];

        for (const configPath of configPaths) {
            try {
                if (fs.existsSync(configPath)) {
                    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
                    console.log(`📄 Loaded AAF config from: ${configPath}`);
                    return config;
                }
            } catch (error) {
                console.warn(`Failed to load config from ${configPath}:`, error.message);
            }
        }

        // Default configuration optimized for Claude Code integration
        return {
            git: {
                mainBranch: 'main',
                branchPrefix: 'aaf/story-'
            },
            github: {
                owner: '',
                repo: '',
                token: process.env.GITHUB_TOKEN || ''
            },
            agents: {
                claudeCodePath: process.env.CLAUDE_CODE_PATH || 'claude',
                maxConcurrent: 5,
                timeout: 3600000 // 1 hour
            },
            quality: {
                testCoverageThreshold: 100,
                enforceTestCoverage: true,
                requireLinting: true,
                requireTypeCheck: true
            },
            aaf: {
                errorHandling: {
                    maxRetries: 3,
                    retryDelay: 5000,
                    circuitBreakerThreshold: 5
                },
                reporting: {
                    statusInterval: 60000, // 1 minute
                    saveMetrics: true
                }
            }
        };
    }

    async initialize() {
        if (this.initialized) return;

        console.log('🚀 Initializing AAF Complete Orchestrator...');

        try {
            // Initialize Claude Code Agent Manager
            this.agentManager = new ClaudeCodeAgentManager({
                workspaceRoot: this.projectRoot,
                claudeCodePath: this.config.agents.claudeCodePath
            });

            // Initialize Test Coverage Validator
            this.coverageValidator = new TestCoverageValidator({
                workspaceRoot: this.projectRoot,
                coverageThreshold: this.config.quality.testCoverageThreshold
            });

            // Initialize GitHub Workflow Engine
            this.githubEngine = new GitHubWorkflowEngine({
                workspaceRoot: this.projectRoot,
                githubToken: this.config.github.token,
                defaultBranch: this.config.git.mainBranch
            });

            // Initialize Agent Lifecycle Manager
            this.lifecycleManager = new AgentLifecycleManager({
                agentManager: this.agentManager,
                coverageValidator: this.coverageValidator,
                githubEngine: this.githubEngine,
                maxConcurrentAgents: this.config.agents.maxConcurrent,
                storyTimeout: this.config.agents.timeout,
                errorHandling: this.config.aaf.errorHandling
            });

            await this.lifecycleManager.initialize();

            // Setup event handlers
            this.setupEventHandlers();

            this.initialized = true;
            console.log('✅ AAF Complete Orchestrator initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize AAF Orchestrator:', error.message);
            throw error;
        }
    }

    setupEventHandlers() {
        // Agent lifecycle events
        this.lifecycleManager.on('agent-spawned', (agent) => {
            console.log(`🤖 Agent spawned: ${agent.agentId} for story ${agent.story?.id}`);
            this.activeAgents.set(agent.agentId, agent);
        });

        this.lifecycleManager.on('agent-completed', (agent) => {
            console.log(`✅ Agent completed: ${agent.agentId}`);
            this.recordAgentResult(agent);
            this.activeAgents.delete(agent.agentId);
        });

        this.lifecycleManager.on('story-failed', (storyId, error) => {
            console.log(`❌ Story failed: ${storyId} - ${error.message}`);
        });

        // Coverage events
        this.coverageValidator.on('coverage-validated', (result) => {
            if (result.meetsThreshold) {
                console.log(`✅ Coverage validation passed: ${result.coverage.overall}%`);
            } else {
                console.log(`❌ Coverage validation failed: ${result.coverage.overall}% (required: ${result.threshold}%)`);
            }
        });

        // GitHub events
        this.githubEngine.on('pr-created', (prData) => {
            console.log(`📋 Pull request created: #${prData.number} - ${prData.title}`);
        });

        this.githubEngine.on('pr-merged', (prData) => {
            console.log(`✅ Pull request merged: #${prData.number}`);
        });
    }

    async orchestrateDev(count = 1, mode = 'normal') {
        await this.initialize();

        console.log(`🚀 Orchestrating ${count} development agents in ${mode} mode...`);

        try {
            // Get available user stories
            const stories = await this.getAvailableUserStories();
            if (stories.length === 0) {
                throw new Error('No user stories available for development');
            }

            const storiesToProcess = stories.slice(0, count);
            const results = [];

            for (const story of storiesToProcess) {
                console.log(`📋 Processing story: ${story.id} - ${story.title}`);

                if (mode === 'yolo') {
                    // YOLO mode: direct to main branch
                    const result = await this.processStoryYolo(story);
                    results.push(result);
                } else {
                    // Normal mode: feature branch + PR workflow
                    const result = await this.processStoryNormal(story);
                    results.push(result);
                }
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`✅ Orchestration complete: ${successCount}/${count} stories processed successfully`);

            return {
                success: successCount > 0,
                mode: mode,
                storiesProcessed: count,
                storiesSuccessful: successCount,
                results: results
            };

        } catch (error) {
            console.error(`❌ Development orchestration failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                mode: mode
            };
        }
    }

    async processStoryNormal(story) {
        try {
            // Create feature branch
            const branchName = `${this.config.git.branchPrefix}${story.id}`;
            await this.githubEngine.createBranch(branchName);

            // Queue the story for processing
            await this.lifecycleManager.queueStory({
                ...story,
                metadata: {
                    branchName: branchName,
                    mode: 'normal',
                    requiresPR: true
                }
            });

            return {
                success: true,
                storyId: story.id,
                branchName: branchName,
                mode: 'normal'
            };

        } catch (error) {
            return {
                success: false,
                storyId: story.id,
                error: error.message,
                mode: 'normal'
            };
        }
    }

    async processStoryYolo(story) {
        try {
            // Queue the story for processing directly on main
            await this.lifecycleManager.queueStory({
                ...story,
                metadata: {
                    branchName: this.config.git.mainBranch,
                    mode: 'yolo',
                    requiresPR: false
                }
            });

            return {
                success: true,
                storyId: story.id,
                branchName: this.config.git.mainBranch,
                mode: 'yolo'
            };

        } catch (error) {
            return {
                success: false,
                storyId: story.id,
                error: error.message,
                mode: 'yolo'
            };
        }
    }

    async orchestrateReview(count = 1) {
        await this.initialize();

        console.log(`🔍 Orchestrating ${count} review agents...`);

        try {
            // Get stories ready for review
            const reviewStories = await this.getStoriesReadyForReview();
            if (reviewStories.length === 0) {
                return {
                    success: true,
                    message: 'No stories currently ready for review',
                    reviewsProcessed: 0
                };
            }

            const storiesToReview = reviewStories.slice(0, count);
            const results = [];

            for (const story of storiesToReview) {
                console.log(`🔍 Reviewing story: ${story.id} - ${story.title}`);

                try {
                    // Create review agent task
                    const reviewTask = {
                        id: `review-${story.id}`,
                        title: `Review and validate ${story.title}`,
                        description: `Comprehensive review of story ${story.id} including code quality, test coverage, and functionality`,
                        priority: 'high',
                        estimatedEffort: 'small',
                        metadata: {
                            originalStoryId: story.id,
                            type: 'review',
                            branchName: story.branchName || `feature/story-${story.id}`
                        }
                    };

                    await this.lifecycleManager.queueStory(reviewTask);

                    results.push({
                        success: true,
                        storyId: story.id,
                        reviewTaskId: reviewTask.id
                    });

                } catch (error) {
                    results.push({
                        success: false,
                        storyId: story.id,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`✅ Review orchestration complete: ${successCount}/${count} reviews initiated`);

            return {
                success: successCount > 0,
                reviewsProcessed: count,
                reviewsSuccessful: successCount,
                results: results
            };

        } catch (error) {
            console.error(`❌ Review orchestration failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getAvailableUserStories() {
        const storyPaths = [
            path.join(this.projectRoot, '.aaf-core', 'user-stories.yaml'),
            path.join(this.projectRoot, '.aaf', 'stories.yaml'),
            path.join(this.projectRoot, 'user-stories.yaml')
        ];

        for (const storyPath of storyPaths) {
            try {
                if (fs.existsSync(storyPath)) {
                    const data = yaml.load(fs.readFileSync(storyPath, 'utf8'));
                    return (data.stories || []).filter(story =>
                        story.status === 'Available' || story.status === 'To Do'
                    );
                }
            } catch (error) {
                console.warn(`Failed to load stories from ${storyPath}:`, error.message);
            }
        }

        // Fallback: generate a sample story
        console.log('⚠️ No user stories found, generating sample story');
        return [{
            id: 'SAMPLE-001',
            title: 'Sample User Story',
            description: 'A sample user story for AAF orchestration testing',
            priority: 'medium',
            estimatedEffort: 'small',
            status: 'Available',
            acceptanceCriteria: [
                'Story is implemented correctly',
                'All tests pass with 100% coverage',
                'Code follows project standards'
            ]
        }];
    }

    async getStoriesReadyForReview() {
        // In a real implementation, this would query the coordination server
        // For now, return empty array as placeholder
        return [];
    }

    recordAgentResult(agent) {
        this.executionResults.push({
            agentId: agent.agentId,
            storyId: agent.story?.id,
            status: agent.status,
            startTime: agent.startTime,
            endTime: agent.endTime,
            duration: agent.endTime - agent.startTime,
            success: agent.status === 'completed'
        });
    }

    async getStatus() {
        if (!this.initialized) {
            return {
                initialized: false,
                message: 'Orchestrator not initialized'
            };
        }

        const lifecycleStatus = this.lifecycleManager.getStatus();
        const agentStatus = this.agentManager.getAllAgents();

        return {
            initialized: true,
            activeAgents: this.activeAgents.size,
            totalAgentsSpawned: this.executionResults.length,
            successfulStories: this.executionResults.filter(r => r.success).length,
            failedStories: this.executionResults.filter(r => !r.success).length,
            lifecycle: lifecycleStatus,
            agents: agentStatus,
            lastResults: this.executionResults.slice(-5) // Last 5 results
        };
    }

    async stop() {
        console.log('🛑 Stopping AAF Orchestrator...');

        try {
            if (this.lifecycleManager) {
                await this.lifecycleManager.stopExecution();
            }

            if (this.agentManager) {
                await this.agentManager.shutdown();
            }

            this.activeAgents.clear();
            this.initialized = false;

            console.log('✅ AAF Orchestrator stopped successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Error stopping orchestrator:', error.message);
            return { success: false, error: error.message };
        }
    }

    async shutdown() {
        await this.stop();
    }
}

module.exports = AAFCompleteOrchestrator;