#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF End-to-End Integration Test Suite
 * Comprehensive testing of the complete AAF orchestration system
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const assert = require('assert');

// Import AAF components
const ContinuousExecutionEngine = require('../../aaf-core/utils/continuous-execution-engine.js');
const AgentLifecycleManager = require('../../aaf-core/utils/agent-lifecycle-manager.js');
const ClaudeCodeAgentManager = require('../../aaf-core/utils/claude-code-agent-manager.js');
const TestCoverageValidator = require('../../aaf-core/utils/test-coverage-validator.js');
const GitHubWorkflowEngine = require('../../aaf-core/utils/github-workflow-engine.js');

class AAFEndToEndTest {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: [],
            startTime: new Date(),
            endTime: null
        };

        this.testWorkspace = path.join(__dirname, '..', '..', '.aaf-test-workspace');
        this.mockClaudeCodePath = path.join(__dirname, 'mock-claude-code.js');

        this.setupTestEnvironment();
    }

    setupTestEnvironment() {
        // Create test workspace
        fs.mkdirSync(this.testWorkspace, { recursive: true });

        // Create mock Claude Code executable for testing
        this.createMockClaudeCode();

        // Create test project structure
        this.createTestProject();

        // Set environment variables for testing
        process.env.AAF_TEST_MODE = 'true';
        process.env.CLAUDE_CODE_PATH = this.mockClaudeCodePath;
    }

    createMockClaudeCode() {
        const mockClaudeScript = `#!/usr/bin/env node
// Mock Claude Code for AAF testing

const net = require('net');
const fs = require('fs');

// Simulate Claude Code agent behavior
class MockClaudeAgent {
    constructor() {
        this.agentId = process.env.AAF_AGENT_ID || 'test-agent';
        this.port = parseInt(process.env.AAF_COMMUNICATION_PORT) || null;
        this.commScript = process.env.AAF_COMMUNICATION_SCRIPT;

        if (this.commScript && fs.existsSync(this.commScript)) {
            this.aafComm = require(this.commScript);
        }
    }

    async run() {
        console.log(\`Mock Claude Code agent \${this.agentId} starting...\`);

        // Simulate agent work
        if (this.aafComm) {
            this.aafComm.updateStatus('Starting', 0, 'Mock agent initialized');

            await this.delay(1000);
            this.aafComm.updateStatus('In Progress', 25, 'Implementing mock feature');

            await this.delay(2000);
            this.aafComm.updateStatus('Testing', 75, 'Running mock tests');

            await this.delay(1000);
            this.aafComm.taskComplete({
                success: true,
                testsPass: true,
                coveragePercent: 100,
                branchName: \`feature/mock-\${this.agentId}\`
            });
        }

        console.log(\`Mock Claude Code agent \${this.agentId} completed successfully\`);
        process.exit(0);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const agent = new MockClaudeAgent();
agent.run().catch(console.error);
`;

        fs.writeFileSync(this.mockClaudeCodePath, mockClaudeScript);
        fs.chmodSync(this.mockClaudeCodePath, '755');
    }

    createTestProject() {
        const projectStructure = {
            'package.json': JSON.stringify({
                name: 'aaf-test-project',
                version: '1.0.0',
                scripts: {
                    test: 'jest',
                    'test:coverage': 'jest --coverage'
                },
                devDependencies: {
                    jest: '^29.0.0'
                }
            }, null, 2),
            'src/index.js': `// Test project main file
module.exports = {
    hello: () => 'Hello, AAF!',
    add: (a, b) => a + b
};`,
            'tests/index.test.js': `// Test project test file
const { hello, add } = require('../src/index');

describe('Test Project', () => {
    test('hello function', () => {
        expect(hello()).toBe('Hello, AAF!');
    });

    test('add function', () => {
        expect(add(2, 3)).toBe(5);
    });
});`,
            'jest.config.js': `module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        'src/**/*.js'
    ],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};`,
            '.aaf-core/user-stories.yaml': `stories:
  - id: "TEST-001"
    title: "Test Story Implementation"
    description: "Implement a test feature for AAF validation"
    priority: "high"
    estimatedEffort: "small"
    acceptanceCriteria:
      - "Feature is implemented"
      - "Tests pass with 100% coverage"
      - "Code is documented"
    status: "Available"
  - id: "TEST-002"
    title: "Additional Test Feature"
    description: "Implement another test feature"
    priority: "medium"
    estimatedEffort: "medium"
    status: "Available"`
        };

        // Create project structure
        for (const [filePath, content] of Object.entries(projectStructure)) {
            const fullPath = path.join(this.testWorkspace, filePath);
            const dir = path.dirname(fullPath);

            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, content);
        }
    }

    async runTests() {
        console.log('🧪 Starting AAF End-to-End Test Suite...');
        console.log(`📁 Test workspace: ${this.testWorkspace}`);

        try {
            // Change to test workspace
            const originalCwd = process.cwd();
            process.chdir(this.testWorkspace);

            // Run all test categories
            await this.testComponentInitialization();
            await this.testAgentSpawning();
            await this.testCoverageValidation();
            await this.testGitHubIntegration();
            await this.testLifecycleManagement();
            await this.testErrorHandling();
            await this.testEndToEndWorkflow();

            // Restore original directory
            process.chdir(originalCwd);

            this.generateTestReport();
            return this.testResults;

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.recordError('test-suite-failure', error);
            return this.testResults;
        }
    }

    async testComponentInitialization() {
        console.log('\n📋 Testing Component Initialization...');

        await this.runTest('ClaudeCodeAgentManager initialization', async () => {
            const agentManager = new ClaudeCodeAgentManager({
                workspaceRoot: this.testWorkspace
            });

            assert(agentManager.workspaceRoot === this.testWorkspace);
            assert(agentManager.agents instanceof Map);
            assert(agentManager.agentCommunication instanceof Map);
        });

        await this.runTest('TestCoverageValidator initialization', async () => {
            const validator = new TestCoverageValidator({
                workspaceRoot: this.testWorkspace
            });

            assert(validator.workspaceRoot === this.testWorkspace);
            assert(validator.coverageThreshold === 100);
        });

        await this.runTest('GitHubWorkflowEngine initialization', async () => {
            const engine = new GitHubWorkflowEngine({
                workspaceRoot: this.testWorkspace
            });

            assert(engine.workspaceRoot === this.testWorkspace);
        });

        await this.runTest('AgentLifecycleManager initialization', async () => {
            const agentManager = new ClaudeCodeAgentManager({
                workspaceRoot: this.testWorkspace
            });
            const validator = new TestCoverageValidator({
                workspaceRoot: this.testWorkspace
            });
            const engine = new GitHubWorkflowEngine({
                workspaceRoot: this.testWorkspace
            });

            const lifecycleManager = new AgentLifecycleManager({
                agentManager,
                coverageValidator: validator,
                githubEngine: engine
            });

            assert(lifecycleManager.agentManager === agentManager);
            assert(lifecycleManager.coverageValidator === validator);
            assert(lifecycleManager.githubEngine === engine);
        });
    }

    async testAgentSpawning() {
        console.log('\n🤖 Testing Agent Spawning...');

        await this.runTest('Agent spawning and communication', async () => {
            const agentManager = new ClaudeCodeAgentManager({
                workspaceRoot: this.testWorkspace,
                claudeCodePath: this.mockClaudeCodePath
            });

            // Wait for communication server to start
            await new Promise(resolve => setTimeout(resolve, 1000));

            const testStory = {
                id: 'TEST-001',
                title: 'Test Story',
                description: 'Test story for agent spawning'
            };

            const agent = await agentManager.spawnAgent({
                agentId: 'test-agent-001',
                workspace: path.join(this.testWorkspace, '.aaf-agents', 'test-agent-001'),
                prompt: 'Implement the test story',
                story: testStory
            });

            assert(agent !== null);
            assert(agent.agentId === 'test-agent-001');
            assert(agent.status === 'running');

            // Wait for agent to complete
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Cleanup
            await agentManager.shutdown();
        });
    }

    async testCoverageValidation() {
        console.log('\n🧪 Testing Coverage Validation...');

        await this.runTest('Test coverage validation', async () => {
            const validator = new TestCoverageValidator({
                workspaceRoot: this.testWorkspace
            });

            // Run tests to generate coverage
            const result = await validator.validateTestCoverage();

            assert(typeof result.coverage === 'object');
            assert(typeof result.meetsThreshold === 'boolean');
            assert(result.threshold === 100);
        });

        await this.runTest('Framework detection', async () => {
            const validator = new TestCoverageValidator({
                workspaceRoot: this.testWorkspace
            });

            const framework = await validator.detectTestFramework();
            assert(framework === 'jest');
        });
    }

    async testGitHubIntegration() {
        console.log('\n📝 Testing GitHub Integration...');

        await this.runTest('Branch creation and validation', async () => {
            const engine = new GitHubWorkflowEngine({
                workspaceRoot: this.testWorkspace
            });

            const branchName = 'test-branch-' + Date.now();
            const created = await engine.createBranch(branchName);

            assert(created === true);

            const exists = await engine.branchExists(branchName);
            assert(exists === true);
        });
    }

    async testLifecycleManagement() {
        console.log('\n🔄 Testing Lifecycle Management...');

        await this.runTest('Story queuing and processing', async () => {
            const agentManager = new ClaudeCodeAgentManager({
                workspaceRoot: this.testWorkspace,
                claudeCodePath: this.mockClaudeCodePath
            });
            const validator = new TestCoverageValidator({
                workspaceRoot: this.testWorkspace
            });
            const engine = new GitHubWorkflowEngine({
                workspaceRoot: this.testWorkspace
            });

            const lifecycleManager = new AgentLifecycleManager({
                agentManager,
                coverageValidator: validator,
                githubEngine: engine
            });

            await lifecycleManager.initialize();

            const testStory = {
                id: 'TEST-LIFECYCLE-001',
                title: 'Lifecycle Test Story',
                description: 'Test story for lifecycle management',
                priority: 'high',
                estimatedEffort: 'small'
            };

            await lifecycleManager.queueStory(testStory);

            const status = lifecycleManager.getStatus();
            assert(status.queuedStories >= 1);

            // Cleanup
            await lifecycleManager.shutdown();
        });
    }

    async testErrorHandling() {
        console.log('\n⚠️ Testing Error Handling...');

        await this.runTest('Circuit breaker functionality', async () => {
            const engine = new ContinuousExecutionEngine({
                projectName: 'test-project',
                maxRetries: 2,
                circuitBreakerThreshold: 3
            });

            // Test circuit breaker opening
            for (let i = 0; i < 3; i++) {
                engine.recordCircuitBreakerFailure();
            }

            assert(engine.circuitBreaker.isOpen === true);
            assert(engine.shouldRetry(new Error('test')) === false);
        });

        await this.runTest('Retry mechanism', async () => {
            const engine = new ContinuousExecutionEngine({
                projectName: 'test-project',
                maxRetries: 2,
                retryDelay: 100
            });

            let attempts = 0;
            const testOperation = async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Simulated failure');
                }
                return 'success';
            };

            const result = await engine.retry(testOperation);
            assert(result === 'success');
            assert(attempts === 3);
        });
    }

    async testEndToEndWorkflow() {
        console.log('\n🔄 Testing End-to-End Workflow...');

        await this.runTest('Complete workflow execution', async () => {
            const engine = new ContinuousExecutionEngine({
                projectName: 'aaf-test-project'
            });

            // Initialize engine (but don't start full execution in test)
            const initialized = await engine.initialize();
            assert(initialized === true);

            // Test status generation
            const status = engine.getStatus();
            assert(typeof status === 'object');
            assert(typeof status.isRunning === 'boolean');
            assert(typeof status.stats === 'object');

            // Cleanup
            await engine.gracefulShutdown();
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

    generateTestReport() {
        this.testResults.endTime = new Date();
        const duration = this.testResults.endTime - this.testResults.startTime;

        console.log('\n📊 AAF End-to-End Test Results');
        console.log('================================');
        console.log(`Total tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Success rate: ${Math.round((this.testResults.passed / this.testResults.total) * 100)}%`);
        console.log(`Duration: ${Math.round(duration / 1000)}s`);

        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }

        // Save detailed report
        const reportDir = path.join(__dirname, '..', '..', '.aaf-temp', 'test-reports');
        fs.mkdirSync(reportDir, { recursive: true });

        const reportFile = path.join(reportDir, `e2e-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(this.testResults, null, 2));

        console.log(`\n📄 Detailed report saved: ${reportFile}`);

        // Exit with appropriate code
        process.exit(this.testResults.failed > 0 ? 1 : 0);
    }

    cleanup() {
        try {
            // Remove test workspace
            fs.rmSync(this.testWorkspace, { recursive: true, force: true });
            fs.rmSync(this.mockClaudeCodePath, { force: true });
            console.log('🧹 Test cleanup completed');
        } catch (error) {
            console.warn('⚠️ Test cleanup failed:', error.message);
        }
    }
}

// CLI Interface
async function main() {
    const test = new AAFEndToEndTest();

    try {
        await test.runTests();
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    } finally {
        test.cleanup();
    }
}

if (require.main === module) {
    main();
}

module.exports = AAFEndToEndTest;