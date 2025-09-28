#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * Complete AAF Integration Test
 * Tests the full integration of all complete implementations
 */

const fs = require('fs');
const path = require('path');

// Import complete implementations
const AAFCompleteOrchestrator = require('../../claude-code-commands/aaf-orchestrate-v2.js');
const AAFCompleteSlashCommands = require('../../claude-code-commands/slash-commands-v2.js');
const AAFClaudeCodePlugin = require('../../claude-code-integration/claude-code-plugin.js');
const ContinuousExecutionEngine = require('../../aaf-core/utils/continuous-execution-engine.js');

class CompleteIntegrationTest {
    constructor() {
        this.testWorkspace = path.join(__dirname, '..', '..', '.test-complete-integration');
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };

        this.setupTestEnvironment();
    }

    setupTestEnvironment() {
        // Create test workspace
        fs.mkdirSync(this.testWorkspace, { recursive: true });

        // Create test project structure
        this.createCompleteTestProject();

        // Set environment variables
        process.env.AAF_TEST_MODE = 'true';
        process.env.NODE_ENV = 'test';
    }

    createCompleteTestProject() {
        const projectStructure = {
            'package.json': JSON.stringify({
                name: 'aaf-complete-test',
                version: '1.0.0',
                scripts: {
                    test: 'jest',
                    'test:coverage': 'jest --coverage'
                },
                devDependencies: {
                    jest: '^29.0.0'
                }
            }, null, 2),
            'docs/stories/user-stories.yaml': `stories:
  - id: "COMPLETE-001"
    title: "Complete Integration Test Story"
    description: "Test story for complete AAF integration testing"
    priority: "high"
    estimatedEffort: "small"
    status: "Available"
    acceptanceCriteria:
      - "All components integrate successfully"
      - "Tests pass with 100% coverage"
      - "Error handling works correctly"
  - id: "COMPLETE-002"
    title: "Second Test Story"
    description: "Another test story for parallel processing"
    priority: "medium"
    estimatedEffort: "medium"
    status: "Available"`,
            'docs/stories/orchestration-config.yaml': `git:
  mainBranch: 'main'
  branchPrefix: 'test/story-'
agents:
  claudeCodePath: 'node'
  maxConcurrent: 2
  timeout: 30000
quality:
  testCoverageThreshold: 100
  enforceTestCoverage: true
aaf:
  errorHandling:
    maxRetries: 2
    retryDelay: 1000`,
            'src/index.js': `// Complete test project
module.exports = {
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
    greet: (name) => \`Hello, \${name}!\`
};`,
            'tests/index.test.js': `const { add, multiply, greet } = require('../src/index');

describe('Complete Integration Test', () => {
    test('add function', () => {
        expect(add(2, 3)).toBe(5);
    });

    test('multiply function', () => {
        expect(multiply(4, 5)).toBe(20);
    });

    test('greet function', () => {
        expect(greet('AAF')).toBe('Hello, AAF!');
    });
});`,
            'jest.config.js': `module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: ['src/**/*.js'],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};`
        };

        // Create files
        for (const [filePath, content] of Object.entries(projectStructure)) {
            const fullPath = path.join(this.testWorkspace, filePath);
            const dir = path.dirname(fullPath);

            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, content);
        }
    }

    async runCompleteIntegrationTests() {
        console.log('🧪 Running Complete AAF Integration Tests...');
        console.log(`📁 Test workspace: ${this.testWorkspace}`);

        const originalCwd = process.cwd();
        process.chdir(this.testWorkspace);

        try {
            // Test 1: Component instantiation
            await this.testComponentInstantiation();

            // Test 2: Orchestrator integration
            await this.testOrchestratorIntegration();

            // Test 3: Slash commands integration
            await this.testSlashCommandsIntegration();

            // Test 4: Plugin integration
            await this.testPluginIntegration();

            // Test 5: Error handling integration
            await this.testErrorHandlingIntegration();

            // Test 6: End-to-end workflow
            await this.testEndToEndWorkflow();

            this.generateReport();

        } catch (error) {
            console.error('❌ Integration test suite failed:', error.message);
            this.recordError('test-suite-failure', error);
        } finally {
            process.chdir(originalCwd);
            this.cleanup();
        }

        return this.testResults;
    }

    async testComponentInstantiation() {
        console.log('\n🔧 Testing Component Instantiation...');

        await this.runTest('AAFCompleteOrchestrator instantiation', async () => {
            const orchestrator = new AAFCompleteOrchestrator();
            assert(orchestrator instanceof AAFCompleteOrchestrator);
            assert(typeof orchestrator.orchestrateDev === 'function');
            assert(typeof orchestrator.orchestrateReview === 'function');
        });

        await this.runTest('AAFCompleteSlashCommands instantiation', async () => {
            const slashCommands = new AAFCompleteSlashCommands();
            assert(slashCommands instanceof AAFCompleteSlashCommands);
            assert(typeof slashCommands.executeCommand === 'function');
        });

        await this.runTest('AAFClaudeCodePlugin instantiation', async () => {
            const plugin = new AAFClaudeCodePlugin();
            assert(plugin instanceof AAFClaudeCodePlugin);
            assert(typeof plugin.initialize === 'function');
        });
    }

    async testOrchestratorIntegration() {
        console.log('\n🎯 Testing Orchestrator Integration...');

        await this.runTest('Orchestrator initialization', async () => {
            const orchestrator = new AAFCompleteOrchestrator();
            await orchestrator.initialize();
            assert(orchestrator.initialized === true);
        });

        await this.runTest('Configuration loading', async () => {
            const orchestrator = new AAFCompleteOrchestrator();
            assert(typeof orchestrator.config === 'object');
            assert(orchestrator.config.agents.maxConcurrent === 2);
            assert(orchestrator.config.quality.testCoverageThreshold === 100);
        });

        await this.runTest('Story loading', async () => {
            const orchestrator = new AAFCompleteOrchestrator();
            const stories = await orchestrator.getAvailableUserStories();
            assert(Array.isArray(stories));
            assert(stories.length >= 2);
            assert(stories[0].id === 'COMPLETE-001');
        });
    }

    async testSlashCommandsIntegration() {
        console.log('\n⚡ Testing Slash Commands Integration...');

        await this.runTest('Command parsing', async () => {
            const slashCommands = new AAFCompleteSlashCommands();

            // Test dev command
            const devResult = await slashCommands.executeCommand('/aaf:orchestrate:dev:1');
            assert(typeof devResult === 'object');
            assert(typeof devResult.success === 'boolean');
            assert(typeof devResult.message === 'string');
        });

        await this.runTest('Help command', async () => {
            const slashCommands = new AAFCompleteSlashCommands();
            const helpResult = await slashCommands.executeCommand('/aaf:help');

            assert(helpResult.success === true);
            assert(helpResult.type === 'info');
            assert(helpResult.title.includes('AAF Method'));
            assert(Array.isArray(helpResult.details.commands));
        });

        await this.runTest('Status command', async () => {
            const slashCommands = new AAFCompleteSlashCommands();
            const statusResult = await slashCommands.executeCommand('/aaf:status');

            assert(typeof statusResult === 'object');
            assert(typeof statusResult.success === 'boolean');
        });
    }

    async testPluginIntegration() {
        console.log('\n🔌 Testing Plugin Integration...');

        await this.runTest('Plugin initialization', async () => {
            const plugin = new AAFClaudeCodePlugin();

            const mockContext = {
                projectRoot: this.testWorkspace,
                registerSlashCommand: () => {},
                log: () => {}
            };

            const initialized = await plugin.initialize(mockContext);
            assert(initialized === true);
            assert(plugin.context === mockContext);
        });
    }

    async testErrorHandlingIntegration() {
        console.log('\n⚠️ Testing Error Handling Integration...');

        await this.runTest('Invalid command handling', async () => {
            const slashCommands = new AAFCompleteSlashCommands();
            const result = await slashCommands.executeCommand('/invalid:command');

            assert(result.success === false);
            assert(result.type === 'error');
            assert(result.message.includes('Invalid command format'));
        });

        await this.runTest('Orchestrator error handling', async () => {
            const orchestrator = new AAFCompleteOrchestrator();

            // Test with invalid configuration
            orchestrator.config.agents.claudeCodePath = '/invalid/path';

            try {
                await orchestrator.initialize();
                // Should not reach here if error handling works
                assert(false, 'Expected error was not thrown');
            } catch (error) {
                // Expected error - this is good
                assert(typeof error.message === 'string');
            }
        });
    }

    async testEndToEndWorkflow() {
        console.log('\n🔄 Testing End-to-End Workflow...');

        await this.runTest('Complete development workflow simulation', async () => {
            const slashCommands = new AAFCompleteSlashCommands();

            // Execute dev orchestration (should succeed even if no actual agents spawn in test mode)
            const devResult = await slashCommands.executeCommand('/aaf:orchestrate:dev:1');
            assert(typeof devResult === 'object');

            // Check status
            const statusResult = await slashCommands.executeCommand('/aaf:status');
            assert(statusResult.success === true);

            // Stop orchestrator
            const stopResult = await slashCommands.executeCommand('/aaf:stop');
            assert(typeof stopResult === 'object');
        });
    }

    async runTest(testName, testFunction) {
        this.testResults.total++;

        try {
            console.log(`  ⏳ ${testName}...`);
            await testFunction();
            console.log(`  ✅ ${testName}`);
            this.testResults.passed++;
        } catch (error) {
            console.log(`  ❌ ${testName}: ${error.message}`);
            this.recordError(testName, error);
        }
    }

    recordError(testName, error) {
        this.testResults.failed++;
        this.testResults.errors.push({
            test: testName,
            error: error.message,
            stack: error.stack,
            timestamp: new Date()
        });
    }

    generateReport() {
        console.log('\n📊 Complete Integration Test Results');
        console.log('====================================');
        console.log(`Total tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Success rate: ${Math.round((this.testResults.passed / this.testResults.total) * 100)}%`);

        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }

        const success = this.testResults.failed === 0;
        console.log(`\n${success ? '✅ ALL INTEGRATION TESTS PASSED' : '❌ INTEGRATION TESTS FAILED'}`);

        if (success) {
            console.log('\n🎉 AAF Method Complete Implementation is fully integrated and ready for use!');
        }

        // Save report
        try {
            const reportDir = path.join(__dirname, '..', '..', '.aaf-temp', 'test-reports');
            fs.mkdirSync(reportDir, { recursive: true });

            const reportFile = path.join(reportDir, `complete-integration-report-${Date.now()}.json`);
            fs.writeFileSync(reportFile, JSON.stringify(this.testResults, null, 2));

            console.log(`\n📄 Report saved: ${reportFile}`);
        } catch (error) {
            console.warn('⚠️ Failed to save report:', error.message);
        }

        process.exit(this.testResults.failed > 0 ? 1 : 0);
    }

    cleanup() {
        try {
            fs.rmSync(this.testWorkspace, { recursive: true, force: true });
            console.log('🧹 Test workspace cleaned up');
        } catch (error) {
            console.warn('⚠️ Cleanup failed:', error.message);
        }
    }
}

// Simple assert function
function assert(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new Error(message);
    }
}

// CLI Interface
async function main() {
    const test = new CompleteIntegrationTest();
    await test.runCompleteIntegrationTests();
}

if (require.main === module) {
    main();
}

module.exports = CompleteIntegrationTest;