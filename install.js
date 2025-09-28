#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Method Package Installer
 * Sets up AAF orchestration in any project
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const readline = require('readline');
const yaml = require('js-yaml');

class AAFInstaller {
    constructor() {
        this.projectRoot = process.cwd();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async install() {
        console.log('🚀 AAF Method Installation');
        console.log('==========================');
        console.log('Setting up autonomous agent orchestration for your project...\n');

        try {
            // 1. Check project compatibility
            await this.checkProjectCompatibility();

            // 2. Gather configuration
            const config = await this.gatherConfiguration();

            // 3. Install dependencies
            await this.installDependencies();

            // 4. Setup project structure
            await this.setupProjectStructure(config);

            // 5. Configure scripts
            await this.configurePackageScripts();

            // 6. Setup Claude Code integration
            await this.setupClaudeCodeIntegration();

            // 7. Create sample stories
            await this.createSampleStories();

            console.log('\n🎉 AAF Method installation complete!');
            this.displayUsageInformation();

        } catch (error) {
            console.error('\n❌ Installation failed:', error.message);
            process.exit(1);
        } finally {
            this.rl.close();
        }
    }

    async checkProjectCompatibility() {
        console.log('🔍 Checking project compatibility...');

        // Check if it's a Git repository
        if (!fs.existsSync(path.join(this.projectRoot, '.git'))) {
            throw new Error('Project must be a Git repository. Run "git init" first.');
        }

        // Check if package.json exists
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            console.log('📦 No package.json found, will create one...');
        }

        console.log('✅ Project compatibility check passed');
    }

    async gatherConfiguration() {
        console.log('\n⚙️ Configuration Setup');
        console.log('Answer a few questions to configure AAF for your project:\n');

        const config = {};

        // Project information
        config.projectName = await this.prompt('Project name:', path.basename(this.projectRoot));
        config.mainBranch = await this.prompt('Main branch name:', 'main');
        config.branchPrefix = await this.prompt('Feature branch prefix:', 'feature/aaf-');

        // GitHub configuration
        const useGitHub = await this.promptBoolean('Setup GitHub integration?', true);
        if (useGitHub) {
            config.githubOwner = await this.prompt('GitHub owner/organization:', '');
            config.githubRepo = await this.prompt('GitHub repository name:', config.projectName);
            config.githubToken = await this.prompt('GitHub token (can be set later via GITHUB_TOKEN env var):', '');
        }

        // Development settings
        config.maxAgents = await this.promptNumber('Maximum concurrent agents:', 5);
        config.defaultMode = await this.promptChoice('Default development mode:', ['normal', 'yolo'], 'normal');

        // Test framework
        config.testFramework = await this.promptChoice('Test framework:', ['jest', 'mocha', 'vitest', 'cypress'], 'jest');

        return config;
    }

    async installDependencies() {
        console.log('\n📦 Installing dependencies...');

        const dependencies = [
            '@octokit/rest',
            'js-yaml',
            'socket.io-client'
        ];

        const devDependencies = [
            'jest',
            '@types/jest'
        ];

        try {
            // Check if npm is available
            await this.execCommand('npm --version');

            // Install dependencies
            console.log('Installing production dependencies...');
            await this.execCommand(`npm install ${dependencies.join(' ')}`);

            console.log('Installing development dependencies...');
            await this.execCommand(`npm install --save-dev ${devDependencies.join(' ')}`);

            console.log('✅ Dependencies installed successfully');

        } catch (error) {
            console.warn('⚠️ Failed to install dependencies automatically:', error.message);
            console.log('\nPlease install these dependencies manually:');
            console.log(`npm install ${dependencies.join(' ')}`);
            console.log(`npm install --save-dev ${devDependencies.join(' ')}`);
        }
    }

    async setupProjectStructure(config) {
        console.log('\n📁 Setting up project structure...');

        // Create .aaf directory
        const aafDir = path.join(this.projectRoot, '.aaf');
        fs.mkdirSync(aafDir, { recursive: true });

        // Create configuration file
        const aafConfig = {
            project: {
                name: config.projectName,
                version: '1.0.0'
            },
            git: {
                mainBranch: config.mainBranch,
                branchPrefix: config.branchPrefix,
                worktreeBase: '.aaf-worktrees'
            },
            github: {
                owner: config.githubOwner || '',
                repo: config.githubRepo || '',
                token: '${GITHUB_TOKEN}'
            },
            agents: {
                claudeCodePath: 'claude',
                maxConcurrent: config.maxAgents,
                timeout: 3600000
            },
            quality: {
                requireTests: true,
                testCoverage: 100,
                requireLinting: true,
                requireTypeCheck: true
            },
            defaults: {
                mode: config.defaultMode,
                testFramework: config.testFramework
            }
        };

        const configPath = path.join(aafDir, 'config.yaml');
        fs.writeFileSync(configPath, yaml.dump(aafConfig), 'utf8');

        // Create docs/stories directory
        const storiesDir = path.join(this.projectRoot, 'docs', 'stories');
        fs.mkdirSync(storiesDir, { recursive: true });

        // Create .aaf-temp directory for runtime files
        const tempDir = path.join(this.projectRoot, '.aaf-temp');
        fs.mkdirSync(tempDir, { recursive: true });

        // Add to .gitignore
        const gitignorePath = path.join(this.projectRoot, '.gitignore');
        const gitignoreContent = `
# AAF Method
.aaf-temp/
.aaf-worktrees/
.aaf-review-workspaces/
`;

        if (fs.existsSync(gitignorePath)) {
            const existing = fs.readFileSync(gitignorePath, 'utf8');
            if (!existing.includes('# AAF Method')) {
                fs.appendFileSync(gitignorePath, gitignoreContent);
            }
        } else {
            fs.writeFileSync(gitignorePath, gitignoreContent);
        }

        console.log('✅ Project structure created');
    }

    async configurePackageScripts() {
        console.log('\n📝 Configuring package.json scripts...');

        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        let packageJson;

        if (fs.existsSync(packageJsonPath)) {
            packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        } else {
            packageJson = {
                name: path.basename(this.projectRoot),
                version: '1.0.0',
                description: 'Project with AAF orchestration'
            };
        }

        // Ensure scripts section exists
        if (!packageJson.scripts) {
            packageJson.scripts = {};
        }

        // Add AAF scripts
        const aafScripts = {
            'aaf:dev': 'node aaf-execution.js start',
            'aaf:status': 'node aaf-execution.js status',
            'aaf:init': 'node aaf-execution.js init'
        };

        // Add test scripts if they don't exist
        if (!packageJson.scripts.test) {
            packageJson.scripts.test = 'jest';
        }
        if (!packageJson.scripts['test:coverage']) {
            packageJson.scripts['test:coverage'] = 'jest --coverage';
        }
        if (!packageJson.scripts.lint) {
            packageJson.scripts.lint = 'echo "No linting configured"';
        }
        if (!packageJson.scripts['type-check']) {
            packageJson.scripts['type-check'] = 'echo "No type checking configured"';
        }

        // Merge AAF scripts
        Object.assign(packageJson.scripts, aafScripts);

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
        console.log('✅ Package.json scripts configured');
    }

    async setupClaudeCodeIntegration() {
        console.log('\n🔌 Setting up Claude Code integration...');

        // Copy AAF files to project
        const aafFiles = [
            'aaf-execution.js',
            'claude-code-commands/aaf-orchestrate.js',
            'claude-code-commands/slash-commands.js',
            'claude-code-integration/claude-code-plugin.js',
            'aaf-core/utils/autonomous-orchestrator.js',
            'aaf-core/utils/test-coverage-monitor.js',
            'aaf-core/utils/continuous-execution-engine.js'
        ];

        for (const file of aafFiles) {
            const sourcePath = path.join(__dirname, file);
            const targetPath = path.join(this.projectRoot, file);

            // Create target directory if it doesn't exist
            const targetDir = path.dirname(targetPath);
            fs.mkdirSync(targetDir, { recursive: true });

            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, targetPath);
                console.log(`  ✅ Copied ${file}`);
            } else {
                console.log(`  ⚠️ Source file not found: ${file}`);
            }
        }

        // Create Claude Code configuration
        const claudeConfigDir = path.join(this.projectRoot, '.claude-code');
        fs.mkdirSync(claudeConfigDir, { recursive: true });

        const claudeConfig = {
            plugins: [
                {
                    name: 'AAF Orchestrator',
                    path: './claude-code-integration/claude-code-plugin.js',
                    enabled: true
                }
            ],
            slashCommands: {
                'aaf:orchestrate:dev': 'AAF development agent orchestration',
                'aaf:orchestrate:review': 'AAF review agent orchestration',
                'aaf:status': 'AAF orchestration status',
                'aaf:help': 'AAF help and documentation'
            }
        };

        const claudeConfigPath = path.join(claudeConfigDir, 'config.json');
        fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2), 'utf8');

        console.log('✅ Claude Code integration configured');
    }

    async createSampleStories() {
        console.log('\n📖 Creating sample user stories...');

        const storiesDir = path.join(this.projectRoot, 'docs', 'stories');

        const sampleStories = [
            {
                filename: 'example-001.md',
                content: `---
id: "example-001"
title: "Setup Project Documentation"
description: "Create basic project documentation and README"
status: "Available"
priority: "high"
acceptance_criteria:
  - "README.md file created with project overview"
  - "Documentation covers installation and usage"
  - "Code examples provided"
---

# Setup Project Documentation

Create comprehensive documentation for the project including installation, configuration, and usage instructions.

## Description
This story involves creating proper documentation that helps new developers understand and contribute to the project.

## Acceptance Criteria
- [ ] README.md file created with project overview
- [ ] Documentation covers installation and usage
- [ ] Code examples provided
- [ ] Documentation is clear and comprehensive

## Implementation Notes
- Use clear, concise language
- Include code examples where appropriate
- Consider using diagrams for complex concepts
`
            },
            {
                filename: 'example-002.md',
                content: `---
id: "example-002"
title: "Implement User Authentication"
description: "Add user authentication system with login/logout functionality"
status: "Available"
priority: "high"
acceptance_criteria:
  - "User can register with email and password"
  - "User can login and logout"
  - "Password security implemented"
  - "Session management working"
---

# Implement User Authentication

Add a complete user authentication system to the application.

## Description
Implement secure user authentication including registration, login, logout, and session management.

## Acceptance Criteria
- [ ] User registration with email validation
- [ ] Secure password hashing
- [ ] Login/logout functionality
- [ ] Session management
- [ ] Password reset capability
- [ ] Input validation and error handling

## Technical Requirements
- Use secure password hashing (bcrypt or similar)
- Implement JWT tokens for session management
- Add proper input validation
- Include rate limiting for login attempts
`
            }
        ];

        for (const story of sampleStories) {
            const storyPath = path.join(storiesDir, story.filename);
            fs.writeFileSync(storyPath, story.content, 'utf8');
            console.log(`  ✅ Created ${story.filename}`);
        }

        console.log('✅ Sample user stories created');
    }

    displayUsageInformation() {
        console.log('\n📚 Usage Information');
        console.log('====================');
        console.log('\n🚀 Getting Started:');
        console.log('1. Add your user stories to docs/stories/ directory');
        console.log('2. Open your project in Claude Code');
        console.log('3. Use AAF slash commands to orchestrate agents\n');

        console.log('🎯 Available Commands in Claude Code:');
        console.log('  /aaf:orchestrate:dev:3        - Spawn 3 development agents');
        console.log('  /aaf:orchestrate:dev:yolo:2   - Spawn 2 agents in YOLO mode');
        console.log('  /aaf:orchestrate:review:2     - Spawn 2 review agents');
        console.log('  /aaf:status                   - Check orchestration status');
        console.log('  /aaf:stop                     - Stop all active agents');
        console.log('  /aaf:help                     - Show detailed help\n');

        console.log('⚙️ CLI Commands:');
        console.log('  npm run aaf:dev               - Start continuous execution');
        console.log('  npm run aaf:status            - Check status');
        console.log('  node aaf-execution.js start   - Direct execution\n');

        console.log('📁 Project Structure:');
        console.log('  .aaf/config.yaml              - AAF configuration');
        console.log('  docs/stories/                 - User story files');
        console.log('  .aaf-temp/                    - Runtime files');
        console.log('  .aaf-worktrees/               - Git worktrees for agents\n');

        console.log('🔧 Configuration:');
        console.log('  Edit .aaf/config.yaml to customize settings');
        console.log('  Set GITHUB_TOKEN environment variable for GitHub integration');
        console.log('  Configure test scripts in package.json\n');

        console.log('📖 Documentation:');
        console.log('  Visit: https://github.com/dferguson/AAF-METHOD');
        console.log('  Slack commands documentation in the repository\n');
    }

    // Helper methods
    async prompt(question, defaultValue = '') {
        return new Promise((resolve) => {
            const display = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
            this.rl.question(display, (answer) => {
                resolve(answer.trim() || defaultValue);
            });
        });
    }

    async promptBoolean(question, defaultValue = false) {
        const defaultText = defaultValue ? 'Y/n' : 'y/N';
        const answer = await this.prompt(`${question} (${defaultText})`);

        if (!answer) return defaultValue;
        return ['y', 'yes', 'true', '1'].includes(answer.toLowerCase());
    }

    async promptNumber(question, defaultValue = 0) {
        const answer = await this.prompt(question, defaultValue.toString());
        const num = parseInt(answer);
        return isNaN(num) ? defaultValue : num;
    }

    async promptChoice(question, choices, defaultValue) {
        const choicesText = choices.map((choice, index) =>
            `${index + 1}. ${choice}`
        ).join('\n  ');

        console.log(`\n${question}\n  ${choicesText}`);
        const answer = await this.prompt(`Choice (1-${choices.length})`,
            defaultValue ? (choices.indexOf(defaultValue) + 1).toString() : '1');

        const index = parseInt(answer) - 1;
        return choices[index] || defaultValue || choices[0];
    }

    async execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd: this.projectRoot }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
}

// CLI interface
async function main() {
    const installer = new AAFInstaller();
    await installer.install();
}

if (require.main === module) {
    main().catch(error => {
        console.error('Installation error:', error.message);
        process.exit(1);
    });
}

module.exports = AAFInstaller;