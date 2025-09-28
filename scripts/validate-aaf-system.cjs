#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF System Validation Script
 * Validates the complete AAF system installation and functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class AAFSystemValidator {
    constructor() {
        this.validationResults = {
            totalChecks: 0,
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: [],
            warnings: []
        };

        this.projectRoot = path.resolve(__dirname, '..');
    }

    async validateSystem() {
        console.log('🔍 AAF Method System Validation');
        console.log('================================\n');

        await this.validateProjectStructure();
        await this.validateDependencies();
        await this.validateCoreComponents();
        await this.validateConfiguration();
        await this.validateClaudeCodeIntegration();
        await this.validateTestingCapabilities();

        this.generateValidationReport();
        return this.validationResults;
    }

    async validateProjectStructure() {
        console.log('📁 Validating Project Structure...');

        const requiredPaths = [
            'aaf-core/utils/continuous-execution-engine.js',
            'aaf-core/utils/agent-lifecycle-manager.js',
            'aaf-core/utils/claude-code-agent-manager.js',
            'aaf-core/utils/test-coverage-validator.js',
            'aaf-core/utils/github-workflow-engine.js',
            'aaf-core/utils/socket-coordination.js',
            'bmad-core/utils/test-coordination-server.js',
            'claude-code-commands/aaf-orchestrate.js',
            'claude-code-commands/slash-commands.js',
            'claude-code-integration/claude-code-plugin.js',
            'install.js',
            'package.json'
        ];

        for (const filePath of requiredPaths) {
            await this.checkPath(filePath, 'Required file');
        }

        const optionalPaths = [
            'tests/integration/aaf-e2e-test.js',
            'scripts/validate-aaf-system.js',
            '.aaf-core',
            'docs'
        ];

        for (const filePath of optionalPaths) {
            await this.checkPath(filePath, 'Optional file/directory', false);
        }
    }

    async validateDependencies() {
        console.log('\n📦 Validating Dependencies...');

        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

            const requiredDependencies = [
                'socket.io',
                'socket.io-client',
                'js-yaml',
                'express'
            ];

            for (const dep of requiredDependencies) {
                if (packageJson.dependencies && packageJson.dependencies[dep]) {
                    this.recordPass(`Dependency ${dep} found`);
                } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
                    this.recordPass(`Dev dependency ${dep} found`);
                } else {
                    this.recordFail(`Missing dependency: ${dep}`);
                }
            }

            // Check if node_modules exists
            const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                this.recordPass('node_modules directory exists');
            } else {
                this.recordWarning('node_modules not found - run npm install');
            }

        } catch (error) {
            this.recordFail(`Failed to validate dependencies: ${error.message}`);
        }
    }

    async validateCoreComponents() {
        console.log('\n🔧 Validating Core Components...');

        const components = [
            {
                name: 'ContinuousExecutionEngine',
                path: 'aaf-core/utils/continuous-execution-engine.js',
                expectedClass: 'ContinuousExecutionEngine'
            },
            {
                name: 'AgentLifecycleManager',
                path: 'aaf-core/utils/agent-lifecycle-manager.js',
                expectedClass: 'AgentLifecycleManager'
            },
            {
                name: 'ClaudeCodeAgentManager',
                path: 'aaf-core/utils/claude-code-agent-manager.js',
                expectedClass: 'ClaudeCodeAgentManager'
            },
            {
                name: 'TestCoverageValidator',
                path: 'aaf-core/utils/test-coverage-validator.js',
                expectedClass: 'TestCoverageValidator'
            },
            {
                name: 'GitHubWorkflowEngine',
                path: 'aaf-core/utils/github-workflow-engine.js',
                expectedClass: 'GitHubWorkflowEngine'
            }
        ];

        for (const component of components) {
            await this.validateComponent(component);
        }
    }

    async validateComponent(component) {
        try {
            const componentPath = path.join(this.projectRoot, component.path);

            if (!fs.existsSync(componentPath)) {
                this.recordFail(`Component file not found: ${component.path}`);
                return;
            }

            // Try to require the component
            const ComponentClass = require(componentPath);

            if (typeof ComponentClass === 'function') {
                this.recordPass(`Component ${component.name} loads successfully`);

                // Test basic instantiation
                try {
                    const instance = new ComponentClass({});
                    this.recordPass(`Component ${component.name} instantiates successfully`);
                } catch (error) {
                    this.recordWarning(`Component ${component.name} instantiation warning: ${error.message}`);
                }
            } else {
                this.recordFail(`Component ${component.name} does not export a constructor`);
            }

        } catch (error) {
            this.recordFail(`Component ${component.name} failed to load: ${error.message}`);
        }
    }

    async validateConfiguration() {
        console.log('\n⚙️ Validating Configuration...');

        // Check for configuration files
        const configPaths = [
            '.aaf-core/execution-config.yaml',
            '.aaf-core/orchestrator-config.yaml',
            'aaf-execution.yaml'
        ];

        let configFound = false;
        for (const configPath of configPaths) {
            if (await this.checkPath(configPath, 'Configuration file', false)) {
                configFound = true;
                break;
            }
        }

        if (!configFound) {
            this.recordWarning('No configuration files found - defaults will be used');
        }

        // Validate environment variables
        const envVars = [
            'GITHUB_TOKEN',
            'CLAUDE_CODE_PATH'
        ];

        for (const envVar of envVars) {
            if (process.env[envVar]) {
                this.recordPass(`Environment variable ${envVar} is set`);
            } else {
                this.recordWarning(`Environment variable ${envVar} not set (optional)`);
            }
        }
    }

    async validateClaudeCodeIntegration() {
        console.log('\n🤖 Validating Claude Code Integration...');

        // Check if Claude Code is available
        try {
            const result = await this.runCommand('claude', ['--version'], { timeout: 5000 });
            if (result.code === 0) {
                this.recordPass('Claude Code CLI is available');
            } else {
                this.recordWarning('Claude Code CLI not found in PATH');
            }
        } catch (error) {
            this.recordWarning('Claude Code CLI not accessible: ' + error.message);
        }

        // Validate command files
        const commandFiles = [
            'claude-code-commands/aaf-orchestrate.js',
            'claude-code-commands/slash-commands.js',
            'claude-code-integration/claude-code-plugin.js'
        ];

        for (const file of commandFiles) {
            await this.checkPath(file, 'Claude Code integration file');
        }
    }

    async validateTestingCapabilities() {
        console.log('\n🧪 Validating Testing Capabilities...');

        // Check for test frameworks
        const testFrameworks = ['jest', 'mocha', 'vitest'];
        let frameworkFound = false;

        for (const framework of testFrameworks) {
            try {
                const result = await this.runCommand(framework, ['--version'], { timeout: 3000 });
                if (result.code === 0) {
                    this.recordPass(`Test framework ${framework} is available`);
                    frameworkFound = true;
                }
            } catch (error) {
                // Framework not found, continue checking
            }
        }

        if (!frameworkFound) {
            this.recordWarning('No test frameworks found - some features may not work');
        }

        // Check for test files
        const testPaths = [
            'tests',
            'test',
            '__tests__',
            'spec'
        ];

        let testDirFound = false;
        for (const testPath of testPaths) {
            if (await this.checkPath(testPath, 'Test directory', false)) {
                testDirFound = true;
            }
        }

        if (!testDirFound) {
            this.recordWarning('No test directories found');
        }
    }

    async checkPath(filePath, description, required = true) {
        const fullPath = path.join(this.projectRoot, filePath);
        const exists = fs.existsSync(fullPath);

        if (exists) {
            this.recordPass(`${description}: ${filePath}`);
            return true;
        } else {
            if (required) {
                this.recordFail(`Missing ${description}: ${filePath}`);
            } else {
                this.recordWarning(`Optional ${description} not found: ${filePath}`);
            }
            return false;
        }
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || 10000;
            const child = spawn(command, args, {
                stdio: 'pipe',
                timeout: timeout
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                resolve({ code, stdout, stderr });
            });

            child.on('error', (error) => {
                reject(error);
            });

            // Handle timeout
            setTimeout(() => {
                if (!child.killed) {
                    child.kill();
                    reject(new Error('Command timeout'));
                }
            }, timeout);
        });
    }

    recordPass(message) {
        this.validationResults.totalChecks++;
        this.validationResults.passed++;
        console.log(`  ✅ ${message}`);
    }

    recordFail(message) {
        this.validationResults.totalChecks++;
        this.validationResults.failed++;
        this.validationResults.errors.push(message);
        console.log(`  ❌ ${message}`);
    }

    recordWarning(message) {
        this.validationResults.warnings++;
        this.validationResults.warnings.push(message);
        console.log(`  ⚠️ ${message}`);
    }

    generateValidationReport() {
        console.log('\n📊 Validation Summary');
        console.log('====================');
        console.log(`Total checks: ${this.validationResults.totalChecks}`);
        console.log(`Passed: ${this.validationResults.passed}`);
        console.log(`Failed: ${this.validationResults.failed}`);
        console.log(`Warnings: ${this.validationResults.warnings}`);

        if (this.validationResults.failed === 0) {
            console.log('\n✅ AAF Method system validation PASSED');
            console.log('The system is ready for use!');
        } else {
            console.log('\n❌ AAF Method system validation FAILED');
            console.log('\nCritical issues to resolve:');
            this.validationResults.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }

        if (this.validationResults.warnings.length > 0) {
            console.log('\n⚠️ Warnings (optional improvements):');
            this.validationResults.warnings.forEach(warning => {
                console.log(`  - ${warning}`);
            });
        }

        // Save detailed report
        try {
            const reportDir = path.join(this.projectRoot, '.aaf-temp', 'validation');
            fs.mkdirSync(reportDir, { recursive: true });

            const reportFile = path.join(reportDir, `validation-report-${Date.now()}.json`);
            fs.writeFileSync(reportFile, JSON.stringify(this.validationResults, null, 2));

            console.log(`\n📄 Detailed report saved: ${reportFile}`);
        } catch (error) {
            console.warn('⚠️ Failed to save validation report:', error.message);
        }

        // Exit with appropriate code
        process.exit(this.validationResults.failed > 0 ? 1 : 0);
    }
}

// CLI Interface
async function main() {
    const validator = new AAFSystemValidator();

    try {
        await validator.validateSystem();
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = AAFSystemValidator;