#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Claude Code Plugin
 * Integrates AAF orchestration into Claude Code as slash commands
 */

const AAFCompleteSlashCommands = require('../claude-code-commands/slash-commands-v2');
const path = require('path');
const fs = require('fs');

class AAFClaudeCodePlugin {
    constructor() {
        this.name = 'AAF Method - Complete Implementation';
        this.version = '1.0.0';
        this.description = 'Complete autonomous agent orchestration with 100% functionality';
        this.slashCommands = new AAFCompleteSlashCommands();
        this.isEnabled = true;
    }

    // Claude Code Plugin Interface
    async initialize(claudeCodeContext) {
        this.context = claudeCodeContext;
        this.projectRoot = claudeCodeContext.projectRoot || process.cwd();

        console.log('🚀 Initializing AAF Orchestrator plugin...');

        // Register slash commands
        this.registerSlashCommands();

        // Setup project if needed
        await this.ensureProjectSetup();

        console.log('✅ AAF Orchestrator plugin initialized');
        return true;
    }

    registerSlashCommands() {
        const commands = [
            {
                name: 'aaf:orchestrate:dev',
                description: 'Spawn development agents with feature branches',
                usage: '/aaf:orchestrate:dev:{count}',
                handler: this.handleSlashCommand.bind(this)
            },
            {
                name: 'aaf:orchestrate:dev:yolo',
                description: 'Spawn development agents in YOLO mode (direct to main)',
                usage: '/aaf:orchestrate:dev:yolo:{count}',
                handler: this.handleSlashCommand.bind(this)
            },
            {
                name: 'aaf:orchestrate:review',
                description: 'Spawn review agents for PR reviews',
                usage: '/aaf:orchestrate:review:{count}',
                handler: this.handleSlashCommand.bind(this)
            },
            {
                name: 'aaf:status',
                description: 'Check orchestration status',
                usage: '/aaf:status',
                handler: this.handleSlashCommand.bind(this)
            },
            {
                name: 'aaf:stop',
                description: 'Stop all active agents',
                usage: '/aaf:stop',
                handler: this.handleSlashCommand.bind(this)
            },
            {
                name: 'aaf:help',
                description: 'Show AAF command help',
                usage: '/aaf:help',
                handler: this.handleSlashCommand.bind(this)
            }
        ];

        // Register with Claude Code
        if (this.context && this.context.registerSlashCommands) {
            this.context.registerSlashCommands(commands);
            console.log(`📝 Registered ${commands.length} AAF slash commands`);
        }
    }

    async handleSlashCommand(command, args, context) {
        try {
            console.log(`🎯 Handling slash command: ${command} with args:`, args);

            // Reconstruct full command
            const fullCommand = `/${command}${args ? ':' + args : ''}`;

            // Execute through slash commands handler
            const result = await this.slashCommands.executeCommand(fullCommand);

            // Return formatted response for Claude Code
            return {
                type: 'markdown',
                content: result,
                metadata: {
                    plugin: 'AAF Orchestrator',
                    command: command,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error(`❌ Slash command error:`, error);
            return {
                type: 'markdown',
                content: `❌ **Error executing AAF command**\n\n${error.message}\n\nUse \`/aaf:help\` for usage information.`,
                metadata: {
                    plugin: 'AAF Orchestrator',
                    error: error.message
                }
            };
        }
    }

    async ensureProjectSetup() {
        try {
            // Check if project has AAF configuration
            const configPath = path.join(this.projectRoot, '.aaf');
            if (!fs.existsSync(configPath)) {
                console.log('📁 Creating AAF project structure...');
                await this.createProjectStructure();
            }

            // Check for user stories directory
            const storiesDir = path.join(this.projectRoot, 'docs', 'stories');
            if (!fs.existsSync(storiesDir)) {
                console.log('📝 Creating user stories directory...');
                fs.mkdirSync(storiesDir, { recursive: true });
                await this.createSampleStory(storiesDir);
            }

            // Check for package.json scripts
            await this.ensurePackageScripts();

        } catch (error) {
            console.warn('⚠️ Project setup warning:', error.message);
        }
    }

    async createProjectStructure() {
        const aafDir = path.join(this.projectRoot, '.aaf');
        fs.mkdirSync(aafDir, { recursive: true });

        // Create default configuration
        const defaultConfig = {
            git: {
                mainBranch: 'main',
                branchPrefix: 'feature/aaf-',
                worktreeBase: '.aaf-worktrees'
            },
            github: {
                owner: '',
                repo: '',
                token: '${GITHUB_TOKEN}'
            },
            agents: {
                claudeCodePath: 'claude',
                maxConcurrent: 10,
                timeout: 3600000
            },
            quality: {
                requireTests: true,
                testCoverage: 100,
                requireLinting: true,
                requireTypeCheck: true
            }
        };

        const yaml = require('js-yaml');
        const configPath = path.join(aafDir, 'config.yaml');
        fs.writeFileSync(configPath, yaml.dump(defaultConfig), 'utf8');

        console.log('✅ Created AAF configuration');
    }

    async createSampleStory(storiesDir) {
        const sampleStory = `---
id: "sample-001"
title: "Sample User Story"
description: "This is a sample user story to demonstrate AAF orchestration"
status: "Available"
priority: "medium"
acceptance_criteria:
  - "Feature works as specified"
  - "Has comprehensive tests"
  - "Follows code standards"
---

# Sample User Story

This is a sample user story that demonstrates how AAF orchestration works.

## Description
Implement a simple feature that showcases the automated development workflow.

## Acceptance Criteria
- [ ] Feature is fully implemented
- [ ] 100% test coverage
- [ ] All tests pass
- [ ] Code follows project standards
- [ ] Documentation is updated

## Notes
This story can be used to test the AAF orchestration system. Delete this file and add your real user stories.
`;

        const samplePath = path.join(storiesDir, 'sample-001.md');
        fs.writeFileSync(samplePath, sampleStory, 'utf8');

        console.log('✅ Created sample user story');
    }

    async ensurePackageScripts() {
        const packageJsonPath = path.join(this.projectRoot, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            console.log('📦 Creating basic package.json...');
            const basicPackage = {
                name: path.basename(this.projectRoot),
                version: '1.0.0',
                description: 'Project with AAF orchestration',
                scripts: {
                    test: 'echo "No tests specified" && exit 1',
                    'test:coverage': 'echo "No coverage configured" && exit 1',
                    lint: 'echo "No linting configured" && exit 1',
                    'type-check': 'echo "No type checking configured" && exit 1'
                }
            };

            fs.writeFileSync(packageJsonPath, JSON.stringify(basicPackage, null, 2), 'utf8');
            console.log('✅ Created basic package.json');
        } else {
            // Check if required scripts exist
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

            const requiredScripts = {
                test: 'npm test',
                'test:coverage': 'coverage analysis',
                lint: 'code linting',
                'type-check': 'type checking'
            };

            let scriptsAdded = false;
            for (const [script, description] of Object.entries(requiredScripts)) {
                if (!packageJson.scripts || !packageJson.scripts[script]) {
                    console.log(`⚠️ Missing script: ${script} (needed for ${description})`);
                }
            }
        }
    }

    // Plugin lifecycle methods
    async onProjectOpen(projectPath) {
        console.log(`🚀 AAF: Project opened - ${projectPath}`);
        this.projectRoot = projectPath;
        await this.ensureProjectSetup();
    }

    async onProjectClose() {
        console.log('🛑 AAF: Project closed, stopping agents...');
        try {
            await this.slashCommands.handleStop();
        } catch (error) {
            console.warn('Warning during project close:', error.message);
        }
    }

    getStatus() {
        return {
            name: this.name,
            version: this.version,
            enabled: this.isEnabled,
            projectRoot: this.projectRoot,
            orchestrator: this.slashCommands.orchestrator.getStatus()
        };
    }

    // Plugin settings
    getSettings() {
        return {
            autoSetupProject: {
                type: 'boolean',
                default: true,
                description: 'Automatically setup AAF structure in new projects'
            },
            maxConcurrentAgents: {
                type: 'number',
                default: 10,
                description: 'Maximum number of concurrent agents'
            },
            defaultMode: {
                type: 'select',
                options: ['normal', 'yolo'],
                default: 'normal',
                description: 'Default development mode'
            }
        };
    }

    updateSetting(key, value) {
        // Update plugin settings
        console.log(`⚙️ AAF setting updated: ${key} = ${value}`);
    }
}

// Export for Claude Code
module.exports = AAFClaudeCodePlugin;

// For standalone testing
if (require.main === module) {
    const plugin = new AAFClaudeCodePlugin();

    // Mock Claude Code context
    const mockContext = {
        projectRoot: process.cwd(),
        registerSlashCommands: (commands) => {
            console.log('Mock: Registered commands:', commands.map(c => c.name));
        }
    };

    plugin.initialize(mockContext).then(() => {
        console.log('✅ Plugin initialized in test mode');
        console.log('Status:', plugin.getStatus());
    });
}