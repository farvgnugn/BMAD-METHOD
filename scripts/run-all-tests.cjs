#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Method Comprehensive Test Runner
 * Runs all tests and validations for the AAF system
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class AAFTestRunner {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testResults = {
            validation: null,
            unitTests: null,
            integrationTests: null,
            e2eTests: null,
            overallSuccess: false,
            startTime: new Date(),
            endTime: null
        };
    }

    async runAllTests() {
        console.log('🧪 AAF Method Comprehensive Test Suite');
        console.log('======================================\n');

        try {
            // 1. System Validation
            console.log('🔍 Step 1: System Validation');
            this.testResults.validation = await this.runSystemValidation();

            // 2. Unit Tests (if available)
            console.log('\n🧪 Step 2: Unit Tests');
            this.testResults.unitTests = await this.runUnitTests();

            // 3. Integration Tests
            console.log('\n🔗 Step 3: Integration Tests');
            this.testResults.integrationTests = await this.runIntegrationTests();

            // 4. End-to-End Tests
            console.log('\n🎯 Step 4: End-to-End Tests');
            this.testResults.e2eTests = await this.runE2ETests();

            // Generate comprehensive report
            this.generateComprehensiveReport();

        } catch (error) {
            console.error('❌ Test suite execution failed:', error.message);
            this.testResults.overallSuccess = false;
            this.generateComprehensiveReport();
            process.exit(1);
        }
    }

    async runSystemValidation() {
        console.log('  Running system validation...');

        try {
            const validationScript = path.join(this.projectRoot, 'scripts', 'validate-aaf-system.js');

            if (!fs.existsSync(validationScript)) {
                console.log('  ⚠️ System validation script not found');
                return { success: false, reason: 'Script not found' };
            }

            const result = await this.executeScript(validationScript, []);

            if (result.code === 0) {
                console.log('  ✅ System validation passed');
                return { success: true, output: result.stdout };
            } else {
                console.log('  ❌ System validation failed');
                return { success: false, output: result.stderr, code: result.code };
            }

        } catch (error) {
            console.log(`  ❌ System validation error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async runUnitTests() {
        console.log('  Checking for unit tests...');

        // Check for various test frameworks and configurations
        const testConfigs = [
            { name: 'Jest', command: 'npm', args: ['test'], configFile: 'jest.config.js' },
            { name: 'Jest (package.json)', command: 'npm', args: ['run', 'test'] },
            { name: 'Mocha', command: 'npx', args: ['mocha'] },
            { name: 'Vitest', command: 'npx', args: ['vitest', 'run'] }
        ];

        for (const config of testConfigs) {
            try {
                // Check if configuration exists
                if (config.configFile) {
                    const configPath = path.join(this.projectRoot, config.configFile);
                    if (!fs.existsSync(configPath)) {
                        continue;
                    }
                }

                console.log(`  Trying ${config.name}...`);
                const result = await this.executeScript(config.command, config.args, { timeout: 30000 });

                if (result.code === 0) {
                    console.log(`  ✅ Unit tests passed (${config.name})`);
                    return {
                        success: true,
                        framework: config.name,
                        output: result.stdout
                    };
                } else {
                    console.log(`  ❌ Unit tests failed (${config.name})`);
                    return {
                        success: false,
                        framework: config.name,
                        output: result.stderr,
                        code: result.code
                    };
                }

            } catch (error) {
                // Continue to next test framework
                continue;
            }
        }

        console.log('  ⚠️ No unit test framework found or configured');
        return { success: true, reason: 'No unit tests configured' };
    }

    async runIntegrationTests() {
        console.log('  Running integration tests...');

        try {
            // Look for integration test files
            const integrationTestDirs = [
                path.join(this.projectRoot, 'tests', 'integration'),
                path.join(this.projectRoot, 'test', 'integration'),
                path.join(this.projectRoot, '__tests__', 'integration')
            ];

            let testDir = null;
            for (const dir of integrationTestDirs) {
                if (fs.existsSync(dir)) {
                    testDir = dir;
                    break;
                }
            }

            if (!testDir) {
                console.log('  ⚠️ No integration test directory found');
                return { success: true, reason: 'No integration tests found' };
            }

            // Run all .js files in the integration test directory
            const testFiles = fs.readdirSync(testDir)
                .filter(file => file.endsWith('.js'))
                .map(file => path.join(testDir, file));

            if (testFiles.length === 0) {
                console.log('  ⚠️ No integration test files found');
                return { success: true, reason: 'No integration test files' };
            }

            const results = [];
            for (const testFile of testFiles) {
                console.log(`  Running ${path.basename(testFile)}...`);

                try {
                    const result = await this.executeScript('node', [testFile], { timeout: 60000 });
                    results.push({
                        file: path.basename(testFile),
                        success: result.code === 0,
                        output: result.stdout,
                        error: result.stderr
                    });
                } catch (error) {
                    results.push({
                        file: path.basename(testFile),
                        success: false,
                        error: error.message
                    });
                }
            }

            const allPassed = results.every(r => r.success);
            if (allPassed) {
                console.log('  ✅ All integration tests passed');
            } else {
                console.log('  ❌ Some integration tests failed');
            }

            return {
                success: allPassed,
                results: results,
                total: results.length,
                passed: results.filter(r => r.success).length
            };

        } catch (error) {
            console.log(`  ❌ Integration test error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async runE2ETests() {
        console.log('  Running end-to-end tests...');

        try {
            const e2eTestScript = path.join(this.projectRoot, 'tests', 'integration', 'aaf-e2e-test.js');

            if (!fs.existsSync(e2eTestScript)) {
                console.log('  ⚠️ E2E test script not found');
                return { success: false, reason: 'E2E test script not found' };
            }

            const result = await this.executeScript('node', [e2eTestScript], { timeout: 120000 });

            if (result.code === 0) {
                console.log('  ✅ End-to-end tests passed');
                return { success: true, output: result.stdout };
            } else {
                console.log('  ❌ End-to-end tests failed');
                return { success: false, output: result.stderr, code: result.code };
            }

        } catch (error) {
            console.log(`  ❌ E2E test error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async executeScript(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || 30000;

            const child = spawn(command, args, {
                cwd: this.projectRoot,
                stdio: 'pipe',
                shell: true
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
            const timeoutHandle = setTimeout(() => {
                if (!child.killed) {
                    child.kill();
                    reject(new Error(`Command timeout after ${timeout}ms`));
                }
            }, timeout);

            child.on('close', () => {
                clearTimeout(timeoutHandle);
            });
        });
    }

    generateComprehensiveReport() {
        this.testResults.endTime = new Date();
        const duration = this.testResults.endTime - this.testResults.startTime;

        console.log('\n📊 Comprehensive Test Results');
        console.log('============================');

        // Calculate overall success
        const validationSuccess = this.testResults.validation?.success !== false;
        const unitTestSuccess = this.testResults.unitTests?.success !== false;
        const integrationSuccess = this.testResults.integrationTests?.success !== false;
        const e2eSuccess = this.testResults.e2eTests?.success !== false;

        this.testResults.overallSuccess = validationSuccess && unitTestSuccess && integrationSuccess && e2eSuccess;

        // Display results
        console.log(`System Validation: ${validationSuccess ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Unit Tests: ${unitTestSuccess ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Integration Tests: ${integrationSuccess ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`End-to-End Tests: ${e2eSuccess ? '✅ PASS' : '❌ FAIL'}`);

        console.log(`\nOverall Result: ${this.testResults.overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
        console.log(`Total Duration: ${Math.round(duration / 1000)}s`);

        // Show detailed failure information
        if (!this.testResults.overallSuccess) {
            console.log('\n❌ Failure Details:');

            if (!validationSuccess) {
                console.log('  - System validation failed');
            }
            if (!unitTestSuccess && this.testResults.unitTests?.error) {
                console.log(`  - Unit tests: ${this.testResults.unitTests.error}`);
            }
            if (!integrationSuccess && this.testResults.integrationTests?.error) {
                console.log(`  - Integration tests: ${this.testResults.integrationTests.error}`);
            }
            if (!e2eSuccess && this.testResults.e2eTests?.error) {
                console.log(`  - E2E tests: ${this.testResults.e2eTests.error}`);
            }
        }

        // Save detailed report
        this.saveDetailedReport();

        // Exit with appropriate code
        process.exit(this.testResults.overallSuccess ? 0 : 1);
    }

    saveDetailedReport() {
        try {
            const reportDir = path.join(this.projectRoot, '.aaf-temp', 'test-reports');
            fs.mkdirSync(reportDir, { recursive: true });

            const reportFile = path.join(reportDir, `comprehensive-test-report-${Date.now()}.json`);
            fs.writeFileSync(reportFile, JSON.stringify(this.testResults, null, 2));

            console.log(`\n📄 Detailed report saved: ${reportFile}`);
        } catch (error) {
            console.warn('⚠️ Failed to save detailed report:', error.message);
        }
    }
}

// CLI Interface
async function main() {
    const testRunner = new AAFTestRunner();

    try {
        await testRunner.runAllTests();
    } catch (error) {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = AAFTestRunner;