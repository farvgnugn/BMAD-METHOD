#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Claude Code Slash Commands - Complete Implementation
 * Handles /aaf:orchestrate commands with complete AAF integration
 */

const AAFCompleteOrchestrator = require('./aaf-orchestrate-v2');
const path = require('path');
const fs = require('fs');

class AAFCompleteSlashCommands {
    constructor() {
        this.orchestrator = new AAFCompleteOrchestrator();
        this.supportedCommands = {
            'aaf:orchestrate:dev': this.handleDevOrchestrate.bind(this),
            'aaf:orchestrate:dev:yolo': this.handleYoloDevOrchestrate.bind(this),
            'aaf:orchestrate:review': this.handleReviewOrchestrate.bind(this),
            'aaf:status': this.handleStatus.bind(this),
            'aaf:stop': this.handleStop.bind(this),
            'aaf:help': this.handleHelp.bind(this)
        };
    }

    async executeCommand(commandLine) {
        // Parse command: /aaf:orchestrate:dev:3 or /aaf:orchestrate:review:2
        const match = commandLine.match(/^\/([^:]+(?::[^:]+)*):?(\d+)?/);

        if (!match) {
            return this.formatError('Invalid command format. Use /aaf:help for usage information.');
        }

        const [fullMatch, command, count] = match;
        const normalizedCommand = command.toLowerCase();

        if (!this.supportedCommands[normalizedCommand]) {
            return this.formatError(`Unknown command: ${command}. Use /aaf:help for available commands.`);
        }

        try {
            const result = await this.supportedCommands[normalizedCommand](parseInt(count) || 1);
            return this.formatResponse(result);
        } catch (error) {
            return this.formatError(`Command execution failed: ${error.message}`);
        }
    }

    async handleDevOrchestrate(count) {
        console.log(`🚀 Executing /aaf:orchestrate:dev:${count} with complete implementation`);

        try {
            const result = await this.orchestrator.orchestrateDev(count, 'normal');

            if (result.success) {
                return {
                    type: 'success',
                    title: `🚀 Development Orchestration Complete`,
                    message: `Successfully initiated ${result.storiesSuccessful}/${result.storiesProcessed} development workflows`,
                    details: {
                        mode: 'Standard Development (Feature Branches)',
                        storiesProcessed: result.storiesProcessed,
                        storiesSuccessful: result.storiesSuccessful,
                        workflow: 'Feature branches → Code → Tests → Coverage → PR → Review → Merge',
                        features: [
                            '✅ 100% test coverage enforcement',
                            '✅ Automatic PR creation',
                            '✅ GitHub workflow automation',
                            '✅ Agent lifecycle management',
                            '✅ Error handling & retry logic'
                        ],
                        results: result.results
                    }
                };
            } else {
                return {
                    type: 'error',
                    title: `❌ Development Orchestration Failed`,
                    message: result.error || 'Unknown error occurred',
                    details: {
                        mode: 'Standard Development',
                        error: result.error
                    }
                };
            }

        } catch (error) {
            return {
                type: 'error',
                title: `❌ Command Execution Failed`,
                message: error.message,
                details: {
                    error: error.message,
                    stack: error.stack
                }
            };
        }
    }

    async handleYoloDevOrchestrate(count) {
        console.log(`⚡ Executing /aaf:orchestrate:dev:yolo:${count} with complete implementation`);

        try {
            const result = await this.orchestrator.orchestrateDev(count, 'yolo');

            if (result.success) {
                return {
                    type: 'success',
                    title: `⚡ YOLO Development Orchestration Complete`,
                    message: `Successfully initiated ${result.storiesSuccessful}/${result.storiesProcessed} YOLO development workflows`,
                    details: {
                        mode: 'YOLO Mode - Rapid Prototyping',
                        storiesProcessed: result.storiesProcessed,
                        storiesSuccessful: result.storiesSuccessful,
                        workflow: 'Direct commits to main branch → Immediate integration',
                        warning: '⚠️ YOLO mode commits directly to main - use for rapid prototyping only!',
                        features: [
                            '⚡ Direct to main branch',
                            '✅ 100% test coverage enforcement',
                            '✅ Agent lifecycle management',
                            '✅ Error handling & retry logic',
                            '⚠️ No PR workflow (immediate integration)'
                        ],
                        results: result.results
                    }
                };
            } else {
                return {
                    type: 'error',
                    title: `❌ YOLO Development Orchestration Failed`,
                    message: result.error || 'Unknown error occurred',
                    details: {
                        mode: 'YOLO Mode',
                        error: result.error
                    }
                };
            }

        } catch (error) {
            return {
                type: 'error',
                title: `❌ YOLO Command Execution Failed`,
                message: error.message,
                details: {
                    error: error.message,
                    stack: error.stack
                }
            };
        }
    }

    async handleReviewOrchestrate(count) {
        console.log(`🔍 Executing /aaf:orchestrate:review:${count} with complete implementation`);

        try {
            const result = await this.orchestrator.orchestrateReview(count);

            if (result.success) {
                return {
                    type: 'success',
                    title: `🔍 Review Orchestration Complete`,
                    message: result.message || `Successfully initiated ${result.reviewsSuccessful}/${result.reviewsProcessed} review workflows`,
                    details: {
                        reviewsProcessed: result.reviewsProcessed,
                        reviewsSuccessful: result.reviewsSuccessful,
                        workflow: 'Code analysis → Test validation → Coverage check → Quality review',
                        features: [
                            '🔍 Comprehensive code review',
                            '✅ Test coverage validation',
                            '📊 Quality metrics analysis',
                            '🤖 Automated feedback',
                            '📋 PR status updates'
                        ],
                        results: result.results
                    }
                };
            } else {
                return {
                    type: result.reviewsProcessed === 0 ? 'info' : 'error',
                    title: result.reviewsProcessed === 0 ? `📋 No Reviews Available` : `❌ Review Orchestration Failed`,
                    message: result.message || result.error,
                    details: {
                        error: result.error
                    }
                };
            }

        } catch (error) {
            return {
                type: 'error',
                title: `❌ Review Command Execution Failed`,
                message: error.message,
                details: {
                    error: error.message,
                    stack: error.stack
                }
            };
        }
    }

    async handleStatus() {
        console.log(`📊 Executing /aaf:status with complete implementation`);

        try {
            const status = await this.orchestrator.getStatus();

            if (!status.initialized) {
                return {
                    type: 'info',
                    title: `🔄 AAF Orchestrator Status`,
                    message: 'Orchestrator not yet initialized',
                    details: {
                        initialized: false,
                        message: 'Run a command to initialize the orchestrator'
                    }
                };
            }

            return {
                type: 'info',
                title: `📊 AAF Orchestrator Status`,
                message: `Managing ${status.activeAgents} active agents, ${status.successfulStories} completed stories`,
                details: {
                    initialized: status.initialized,
                    activeAgents: status.activeAgents,
                    totalAgentsSpawned: status.totalAgentsSpawned,
                    successfulStories: status.successfulStories,
                    failedStories: status.failedStories,
                    systemHealth: {
                        lifecycle: status.lifecycle?.status || 'Unknown',
                        coverage: status.lifecycle?.coverageStatus || 'Unknown',
                        github: status.lifecycle?.githubStatus || 'Unknown'
                    },
                    recentResults: status.lastResults || []
                }
            };

        } catch (error) {
            return {
                type: 'error',
                title: `❌ Status Command Failed`,
                message: error.message,
                details: {
                    error: error.message
                }
            };
        }
    }

    async handleStop() {
        console.log(`🛑 Executing /aaf:stop with complete implementation`);

        try {
            const currentStatus = await this.orchestrator.getStatus();

            if (!currentStatus.initialized) {
                return {
                    type: 'info',
                    title: `📋 AAF Orchestrator Status`,
                    message: 'Orchestrator is not currently running',
                    details: {
                        initialized: false
                    }
                };
            }

            const stopResult = await this.orchestrator.stop();

            if (stopResult.success) {
                return {
                    type: 'success',
                    title: `🛑 AAF Orchestrator Stopped`,
                    message: 'All agents stopped and orchestrator shutdown successfully',
                    details: {
                        agentsStopped: currentStatus.activeAgents,
                        totalStoriesProcessed: currentStatus.totalAgentsSpawned,
                        successfulStories: currentStatus.successfulStories,
                        summary: 'All active workflows have been terminated gracefully'
                    }
                };
            } else {
                return {
                    type: 'error',
                    title: `❌ Stop Command Failed`,
                    message: stopResult.error || 'Unknown error during shutdown',
                    details: {
                        error: stopResult.error
                    }
                };
            }

        } catch (error) {
            return {
                type: 'error',
                title: `❌ Stop Command Execution Failed`,
                message: error.message,
                details: {
                    error: error.message,
                    stack: error.stack
                }
            };
        }
    }

    async handleHelp() {
        return {
            type: 'info',
            title: `🤖 AAF Method - Autonomous Agent Framework`,
            message: 'Complete autonomous agent orchestration for multi-agent development',
            details: {
                version: '1.0.0 - Complete Implementation',
                commands: [
                    {
                        command: '/aaf:orchestrate:dev:{count}',
                        description: 'Spawn development agents with feature branches',
                        example: '/aaf:orchestrate:dev:3',
                        features: ['Feature branches', 'PR workflow', '100% coverage', 'Error handling']
                    },
                    {
                        command: '/aaf:orchestrate:dev:yolo:{count}',
                        description: 'Spawn development agents in YOLO mode (direct to main)',
                        example: '/aaf:orchestrate:dev:yolo:2',
                        features: ['Direct to main', 'Rapid prototyping', '100% coverage', 'No PR workflow']
                    },
                    {
                        command: '/aaf:orchestrate:review:{count}',
                        description: 'Spawn review agents for code quality validation',
                        example: '/aaf:orchestrate:review:2',
                        features: ['Code review', 'Coverage validation', 'Quality metrics', 'PR feedback']
                    },
                    {
                        command: '/aaf:status',
                        description: 'Get current orchestrator status and metrics',
                        example: '/aaf:status'
                    },
                    {
                        command: '/aaf:stop',
                        description: 'Stop all active agents and shutdown orchestrator',
                        example: '/aaf:stop'
                    },
                    {
                        command: '/aaf:help',
                        description: 'Show this help information',
                        example: '/aaf:help'
                    }
                ],
                capabilities: [
                    '🤖 Complete Claude Code agent spawning',
                    '📊 100% test coverage validation',
                    '🔗 GitHub workflow automation',
                    '🔄 Agent lifecycle management',
                    '⚠️ Error handling & retry logic',
                    '📈 Real-time status monitoring',
                    '🎯 Story completion tracking'
                ],
                requirements: [
                    'Claude Code CLI installed',
                    'Git repository initialized',
                    'User stories configured (.aaf-core/user-stories.yaml)',
                    'Optional: GitHub token for PR automation'
                ]
            }
        };
    }

    formatResponse(result) {
        return {
            success: result.type !== 'error',
            type: result.type,
            title: result.title,
            message: result.message,
            details: result.details || {}
        };
    }

    formatError(message) {
        return {
            success: false,
            type: 'error',
            title: '❌ Command Error',
            message: message,
            details: {}
        };
    }
}

module.exports = AAFCompleteSlashCommands;