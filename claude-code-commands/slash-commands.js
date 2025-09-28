#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Claude Code Slash Commands Implementation
 * Handles /aaf:orchestrate commands from within Claude Code
 */

const AAFOrchestrator = require('./aaf-orchestrate');
const path = require('path');
const fs = require('fs');

class AAFSlashCommands {
    constructor() {
        this.orchestrator = new AAFOrchestrator();
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
        console.log(`🚀 Executing /aaf:orchestrate:dev:${count}`);

        const result = await this.orchestrator.orchestrateDev(count, 'normal');

        return {
            type: 'success',
            title: `🚀 Development Orchestration Started`,
            message: `Successfully spawned ${result.agentsSpawned} development agents in standard mode`,
            details: {
                mode: 'Standard Development',
                agentsSpawned: result.agentsSpawned,
                agents: result.agents,
                workflow: 'Feature branches → PR → Review → Merge'
            }
        };
    }

    async handleYoloDevOrchestrate(count) {
        console.log(`⚡ Executing /aaf:orchestrate:dev:yolo:${count}`);

        const result = await this.orchestrator.orchestrateDev(count, 'yolo');

        return {
            type: 'success',
            title: `⚡ YOLO Development Orchestration Started`,
            message: `Successfully spawned ${result.agentsSpawned} development agents in YOLO mode`,
            details: {
                mode: 'YOLO Mode - Rapid Prototyping',
                agentsSpawned: result.agentsSpawned,
                agents: result.agents,
                workflow: 'Direct commits to main branch',
                warning: '⚠️ YOLO mode commits directly to main - use for rapid prototyping only!'
            }
        };
    }

    async handleReviewOrchestrate(count) {
        console.log(`🔍 Executing /aaf:orchestrate:review:${count}`);

        const result = await this.orchestrator.orchestrateReview(count);

        return {
            type: 'success',
            title: `🔍 Review Orchestration Started`,
            message: `Successfully spawned ${result.agentsSpawned} review agents`,
            details: {
                agentsSpawned: result.agentsSpawned,
                agents: result.agents,
                monitoring: 'Watching for new PRs to review'
            }
        };
    }

    async handleStatus() {
        console.log(`📊 Executing /aaf:status`);

        const status = this.orchestrator.getStatus();

        return {
            type: 'info',
            title: `📊 AAF Orchestration Status`,
            message: `Currently managing ${status.activeAgents} active agents`,
            details: {
                activeAgents: status.activeAgents,
                activeWorktrees: status.worktrees,
                agents: status.agents.map(agent => ({
                    id: agent.id,
                    type: agent.type,
                    story: agent.story,
                    pr: agent.pr,
                    runtime: `${Math.round(agent.runtime / 1000)}s`
                }))
            }
        };
    }

    async handleStop() {
        console.log(`🛑 Executing /aaf:stop`);

        const status = this.orchestrator.getStatus();

        // Stop all active agents
        for (const [agentId, agent] of this.orchestrator.activeAgents) {
            try {
                if (agent.process && !agent.process.killed) {
                    agent.process.kill('SIGTERM');
                    console.log(`🛑 Stopped agent ${agentId}`);
                }
                await this.orchestrator.cleanupAgent(agent);
            } catch (error) {
                console.error(`Failed to stop agent ${agentId}:`, error.message);
            }
        }

        return {
            type: 'success',
            title: `🛑 AAF Orchestration Stopped`,
            message: `Stopped ${status.activeAgents} active agents`,
            details: {
                stoppedAgents: status.activeAgents,
                cleanedWorktrees: status.worktrees
            }
        };
    }

    async handleHelp() {
        return {
            type: 'info',
            title: `🚀 AAF Orchestration Commands`,
            message: `Available slash commands for autonomous agent orchestration`,
            details: {
                commands: {
                    '/aaf:orchestrate:dev:{count}': {
                        description: 'Spawn development agents with feature branches and PRs',
                        example: '/aaf:orchestrate:dev:3',
                        mode: 'Standard development workflow'
                    },
                    '/aaf:orchestrate:dev:yolo:{count}': {
                        description: 'Spawn development agents in YOLO mode (direct to main)',
                        example: '/aaf:orchestrate:dev:yolo:2',
                        mode: 'Rapid prototyping - commits directly to main'
                    },
                    '/aaf:orchestrate:review:{count}': {
                        description: 'Spawn review agents to handle PR reviews',
                        example: '/aaf:orchestrate:review:2',
                        mode: 'Automated code review'
                    },
                    '/aaf:status': {
                        description: 'Check status of active agents',
                        example: '/aaf:status',
                        mode: 'Status monitoring'
                    },
                    '/aaf:stop': {
                        description: 'Stop all active agents and cleanup',
                        example: '/aaf:stop',
                        mode: 'Emergency stop'
                    }
                },
                workflow: {
                    'Standard Mode': 'Creates Git worktrees → Feature branches → PRs → Review',
                    'YOLO Mode': 'Works directly on main branch for rapid prototyping',
                    'Review Mode': 'Monitors and reviews PRs automatically'
                },
                requirements: [
                    'User stories in docs/stories/ directory',
                    'GitHub CLI (gh) for PR management',
                    'Git repository with main branch',
                    'npm/test scripts configured'
                ]
            }
        };
    }

    formatResponse(result) {
        if (!result) {
            return this.formatError('Command execution returned no result');
        }

        const output = [`## ${result.title}\n`];

        if (result.message) {
            output.push(`${result.message}\n`);
        }

        if (result.details) {
            output.push(`### Details\n`);
            output.push(this.formatDetails(result.details));
        }

        if (result.type === 'success') {
            output.unshift('✅ ');
        } else if (result.type === 'error') {
            output.unshift('❌ ');
        } else {
            output.unshift('ℹ️ ');
        }

        return output.join('');
    }

    formatDetails(details) {
        const lines = [];

        for (const [key, value] of Object.entries(details)) {
            if (Array.isArray(value)) {
                lines.push(`**${this.formatKey(key)}:**`);
                value.forEach(item => {
                    if (typeof item === 'object') {
                        lines.push(`  - ${this.formatObject(item)}`);
                    } else {
                        lines.push(`  - ${item}`);
                    }
                });
            } else if (typeof value === 'object') {
                lines.push(`**${this.formatKey(key)}:**`);
                for (const [subKey, subValue] of Object.entries(value)) {
                    lines.push(`  - **${this.formatKey(subKey)}:** ${subValue}`);
                }
            } else {
                lines.push(`**${this.formatKey(key)}:** ${value}`);
            }
        }

        return lines.join('\n') + '\n';
    }

    formatKey(key) {
        return key.replace(/([A-Z])/g, ' $1')
                 .replace(/^./, str => str.toUpperCase())
                 .replace(/_/g, ' ');
    }

    formatObject(obj) {
        const parts = [];
        for (const [key, value] of Object.entries(obj)) {
            parts.push(`${key}: ${value}`);
        }
        return parts.join(', ');
    }

    formatError(message) {
        return `❌ **Error**\n\n${message}\n\nUse \`/aaf:help\` for usage information.\n`;
    }
}

// CLI interface for testing
async function main() {
    const args = process.argv.slice(2);
    const commandLine = args.join(' ');

    if (!commandLine) {
        console.log('AAF Claude Code Slash Commands');
        console.log('Usage: node slash-commands.js "/aaf:orchestrate:dev:3"');
        return;
    }

    const slashCommands = new AAFSlashCommands();
    const result = await slashCommands.executeCommand(commandLine);
    console.log(result);
}

// Export for Claude Code integration
module.exports = AAFSlashCommands;

if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}