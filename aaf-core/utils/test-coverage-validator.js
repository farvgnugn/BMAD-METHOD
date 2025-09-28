#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * Test Coverage Validator
 * Comprehensive test coverage validation with 100% enforcement
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const EventEmitter = require('events');

class TestCoverageValidator extends EventEmitter {
    constructor(options = {}) {
        super();

        this.workspaceRoot = options.workspaceRoot || process.cwd();
        this.coverageThreshold = options.coverageThreshold || 100;
        this.testFramework = options.testFramework || this.detectTestFramework();
        this.coverageTool = options.coverageTool || this.detectCoverageTool();

        // Coverage configuration
        this.config = {
            thresholds: {
                statements: this.coverageThreshold,
                branches: this.coverageThreshold,
                functions: this.coverageThreshold,
                lines: this.coverageThreshold
            },
            excludePatterns: [
                '**/node_modules/**',
                '**/test/**',
                '**/tests/**',
                '**/*.test.js',
                '**/*.spec.js',
                '**/*.config.js',
                '**/dist/**',
                '**/build/**',
                '**/coverage/**'
            ],
            includePatterns: [
                'src/**/*.js',
                'lib/**/*.js',
                'app/**/*.js',
                '**/*.ts',
                '**/*.tsx'
            ]
        };

        console.log(`🧪 Test Coverage Validator initialized`);
        console.log(`  Framework: ${this.testFramework}`);
        console.log(`  Coverage Tool: ${this.coverageTool}`);
        console.log(`  Threshold: ${this.coverageThreshold}%`);
    }

    detectTestFramework() {
        const packageJsonPath = path.join(this.workspaceRoot, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            return 'jest'; // Default fallback
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Priority order based on popularity and feature richness
            if (deps.jest) return 'jest';
            if (deps.vitest) return 'vitest';
            if (deps.mocha) return 'mocha';
            if (deps.cypress) return 'cypress';
            if (deps.playwright) return 'playwright';
            if (deps.ava) return 'ava';

            return 'jest'; // Default fallback
        } catch (error) {
            console.warn('Failed to parse package.json, defaulting to Jest');
            return 'jest';
        }
    }

    detectCoverageTool() {
        const packageJsonPath = path.join(this.workspaceRoot, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            return 'jest';
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            if (deps.jest) return 'jest';
            if (deps.vitest) return 'vitest';
            if (deps.c8) return 'c8';
            if (deps.nyc) return 'nyc';
            if (deps.istanbul) return 'istanbul';

            return 'jest'; // Default
        } catch (error) {
            return 'jest';
        }
    }

    async validateTestCoverage(workspace = this.workspaceRoot, options = {}) {
        console.log(`🔍 Validating test coverage in: ${workspace}`);

        try {
            // 1. Run tests and generate coverage
            const coverageResult = await this.runTestsWithCoverage(workspace, options);

            // 2. Parse coverage reports
            const coverageData = await this.parseCoverageReport(workspace, coverageResult);

            // 3. Validate against thresholds
            const validation = this.validateCoverageThresholds(coverageData);

            // 4. Generate detailed report
            const report = this.generateCoverageReport(coverageData, validation, workspace);

            this.emit('coverage-validated', {
                workspace,
                passed: validation.passed,
                coverage: coverageData,
                validation,
                report
            });

            return {
                success: validation.passed,
                coverage: coverageData,
                validation,
                report
            };

        } catch (error) {
            console.error(`❌ Coverage validation failed:`, error.message);
            this.emit('coverage-error', { workspace, error });
            return {
                success: false,
                error: error.message
            };
        }
    }

    async runTestsWithCoverage(workspace, options = {}) {
        const { testFramework = this.testFramework, coverageTool = this.coverageTool } = options;

        console.log(`🧪 Running tests with ${testFramework} and coverage with ${coverageTool}`);

        const coverageDir = path.join(workspace, '.aaf-coverage');
        fs.mkdirSync(coverageDir, { recursive: true });

        let command, args;

        switch (testFramework) {
            case 'jest':
                command = 'npx';
                args = [
                    'jest',
                    '--coverage',
                    '--coverageDirectory', coverageDir,
                    '--coverageReporters', 'json-summary', 'lcov', 'text', 'html',
                    '--collectCoverageFrom', 'src/**/*.{js,ts,jsx,tsx}',
                    '--collectCoverageFrom', '!src/**/*.{test,spec}.{js,ts,jsx,tsx}',
                    '--collectCoverageFrom', '!src/**/__tests__/**',
                    '--coverageThreshold', JSON.stringify({
                        global: this.config.thresholds
                    }),
                    '--passWithNoTests',
                    '--verbose'
                ];
                break;

            case 'vitest':
                command = 'npx';
                args = [
                    'vitest',
                    'run',
                    '--coverage',
                    '--coverage.reporter', 'json-summary',
                    '--coverage.reporter', 'lcov',
                    '--coverage.reporter', 'text',
                    '--coverage.reportsDirectory', coverageDir,
                    '--coverage.thresholds.statements', this.coverageThreshold,
                    '--coverage.thresholds.branches', this.coverageThreshold,
                    '--coverage.thresholds.functions', this.coverageThreshold,
                    '--coverage.thresholds.lines', this.coverageThreshold
                ];
                break;

            case 'mocha':
                command = 'npx';
                args = [
                    'nyc',
                    '--reporter', 'json-summary',
                    '--reporter', 'lcov',
                    '--reporter', 'text',
                    '--report-dir', coverageDir,
                    '--check-coverage',
                    '--statements', this.coverageThreshold,
                    '--branches', this.coverageThreshold,
                    '--functions', this.coverageThreshold,
                    '--lines', this.coverageThreshold,
                    'mocha',
                    'test/**/*.js'
                ];
                break;

            default:
                throw new Error(`Unsupported test framework: ${testFramework}`);
        }

        return await this.executeCommand(command, args, workspace);
    }

    async executeCommand(command, args, cwd) {
        return new Promise((resolve, reject) => {
            console.log(`📋 Executing: ${command} ${args.join(' ')}`);

            const process = spawn(command, args, {
                cwd: cwd,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log(`[TEST] ${output.trim()}`);
            });

            process.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.error(`[TEST ERROR] ${output.trim()}`);
            });

            process.on('close', (code) => {
                resolve({
                    code,
                    stdout,
                    stderr,
                    success: code === 0
                });
            });

            process.on('error', (error) => {
                reject(new Error(`Command execution failed: ${error.message}`));
            });
        });
    }

    async parseCoverageReport(workspace, testResult) {
        const coverageDir = path.join(workspace, '.aaf-coverage');

        // Try different coverage report formats
        const reportFiles = [
            path.join(coverageDir, 'coverage-summary.json'),
            path.join(coverageDir, 'coverage-final.json'),
            path.join(workspace, 'coverage', 'coverage-summary.json'),
            path.join(workspace, 'coverage', 'coverage-final.json')
        ];

        for (const reportFile of reportFiles) {
            if (fs.existsSync(reportFile)) {
                try {
                    const reportData = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
                    return this.normalizeCoverageData(reportData, testResult);
                } catch (error) {
                    console.warn(`Failed to parse coverage report ${reportFile}:`, error.message);
                }
            }
        }

        // Try parsing LCOV if JSON not available
        const lcovFile = path.join(coverageDir, 'lcov.info');
        if (fs.existsSync(lcovFile)) {
            return this.parseLcovReport(lcovFile, testResult);
        }

        // Extract coverage from test output if no report files
        return this.extractCoverageFromOutput(testResult);
    }

    normalizeCoverageData(reportData, testResult) {
        // Handle different report formats (Jest, Vitest, NYC, etc.)
        let coverage;

        if (reportData.total) {
            // Jest/NYC format
            coverage = reportData.total;
        } else if (reportData.all) {
            // Some NYC configurations
            coverage = reportData.all;
        } else if (reportData.statements) {
            // Direct format
            coverage = reportData;
        } else {
            // Try to find coverage data in nested structure
            const keys = Object.keys(reportData);
            if (keys.length === 1 && typeof reportData[keys[0]] === 'object') {
                coverage = reportData[keys[0]];
            } else {
                throw new Error('Unable to parse coverage report format');
            }
        }

        return {
            statements: {
                total: coverage.statements?.total || 0,
                covered: coverage.statements?.covered || 0,
                skipped: coverage.statements?.skipped || 0,
                pct: coverage.statements?.pct || 0
            },
            branches: {
                total: coverage.branches?.total || 0,
                covered: coverage.branches?.covered || 0,
                skipped: coverage.branches?.skipped || 0,
                pct: coverage.branches?.pct || 0
            },
            functions: {
                total: coverage.functions?.total || 0,
                covered: coverage.functions?.covered || 0,
                skipped: coverage.functions?.skipped || 0,
                pct: coverage.functions?.pct || 0
            },
            lines: {
                total: coverage.lines?.total || 0,
                covered: coverage.lines?.covered || 0,
                skipped: coverage.lines?.skipped || 0,
                pct: coverage.lines?.pct || 0
            },
            testResults: {
                testsRun: this.extractTestCount(testResult),
                testsPassed: this.extractPassedTestCount(testResult),
                testsFailed: this.extractFailedTestCount(testResult),
                testSuccess: testResult.success
            },
            timestamp: new Date().toISOString()
        };
    }

    parseLcovReport(lcovFile, testResult) {
        const lcovContent = fs.readFileSync(lcovFile, 'utf8');
        const lines = lcovContent.split('\n');

        let totalLines = 0, coveredLines = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalBranches = 0, coveredBranches = 0;

        for (const line of lines) {
            if (line.startsWith('LF:')) totalLines += parseInt(line.split(':')[1] || '0');
            if (line.startsWith('LH:')) coveredLines += parseInt(line.split(':')[1] || '0');
            if (line.startsWith('FNF:')) totalFunctions += parseInt(line.split(':')[1] || '0');
            if (line.startsWith('FNH:')) coveredFunctions += parseInt(line.split(':')[1] || '0');
            if (line.startsWith('BRF:')) totalBranches += parseInt(line.split(':')[1] || '0');
            if (line.startsWith('BRH:')) coveredBranches += parseInt(line.split(':')[1] || '0');
        }

        return {
            statements: {
                total: totalLines,
                covered: coveredLines,
                pct: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
            },
            branches: {
                total: totalBranches,
                covered: coveredBranches,
                pct: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0
            },
            functions: {
                total: totalFunctions,
                covered: coveredFunctions,
                pct: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0
            },
            lines: {
                total: totalLines,
                covered: coveredLines,
                pct: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
            },
            testResults: {
                testsRun: this.extractTestCount(testResult),
                testsPassed: this.extractPassedTestCount(testResult),
                testsFailed: this.extractFailedTestCount(testResult),
                testSuccess: testResult.success
            },
            timestamp: new Date().toISOString()
        };
    }

    extractCoverageFromOutput(testResult) {
        // Try to extract coverage percentages from test output
        const output = testResult.stdout + testResult.stderr;

        const coverageRegex = /(\w+)\s*:\s*(\d+(?:\.\d+)?)\s*%/gi;
        const matches = [...output.matchAll(coverageRegex)];

        const coverage = {
            statements: { total: 0, covered: 0, pct: 0 },
            branches: { total: 0, covered: 0, pct: 0 },
            functions: { total: 0, covered: 0, pct: 0 },
            lines: { total: 0, covered: 0, pct: 0 }
        };

        for (const match of matches) {
            const [, type, percentage] = match;
            const pct = parseFloat(percentage);

            if (type.toLowerCase().includes('statement')) {
                coverage.statements.pct = pct;
            } else if (type.toLowerCase().includes('branch')) {
                coverage.branches.pct = pct;
            } else if (type.toLowerCase().includes('function')) {
                coverage.functions.pct = pct;
            } else if (type.toLowerCase().includes('line')) {
                coverage.lines.pct = pct;
            }
        }

        coverage.testResults = {
            testsRun: this.extractTestCount(testResult),
            testsPassed: this.extractPassedTestCount(testResult),
            testsFailed: this.extractFailedTestCount(testResult),
            testSuccess: testResult.success
        };

        return coverage;
    }

    extractTestCount(testResult) {
        const output = testResult.stdout + testResult.stderr;
        const patterns = [
            /(\d+)\s+tests?\s+passed/i,
            /Tests:\s+(\d+)\s+passed/i,
            /(\d+)\s+passing/i
        ];

        for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) return parseInt(match[1]);
        }

        return 0;
    }

    extractPassedTestCount(testResult) {
        const output = testResult.stdout + testResult.stderr;
        const patterns = [
            /(\d+)\s+passed/i,
            /Tests:\s+(\d+)\s+passed/i,
            /(\d+)\s+passing/i
        ];

        for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) return parseInt(match[1]);
        }

        return testResult.success ? this.extractTestCount(testResult) : 0;
    }

    extractFailedTestCount(testResult) {
        const output = testResult.stdout + testResult.stderr;
        const patterns = [
            /(\d+)\s+failed/i,
            /Tests:\s+\d+\s+passed,\s+(\d+)\s+failed/i,
            /(\d+)\s+failing/i
        ];

        for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) return parseInt(match[1]);
        }

        return testResult.success ? 0 : 1;
    }

    validateCoverageThresholds(coverageData) {
        const results = {};
        const failures = [];

        for (const [metric, threshold] of Object.entries(this.config.thresholds)) {
            const actual = coverageData[metric]?.pct || 0;
            const passed = actual >= threshold;

            results[metric] = {
                threshold,
                actual,
                passed
            };

            if (!passed) {
                failures.push({
                    metric,
                    threshold,
                    actual,
                    deficit: threshold - actual
                });
            }
        }

        // Check test success
        const testsPass = coverageData.testResults?.testSuccess || false;
        if (!testsPass) {
            failures.push({
                metric: 'tests',
                threshold: 'All tests must pass',
                actual: 'Tests failed',
                deficit: 'Fix failing tests'
            });
        }

        return {
            passed: failures.length === 0,
            results,
            failures,
            testsPass,
            overallScore: this.calculateOverallScore(coverageData)
        };
    }

    calculateOverallScore(coverageData) {
        const metrics = ['statements', 'branches', 'functions', 'lines'];
        const scores = metrics.map(metric => coverageData[metric]?.pct || 0);
        return Math.round(scores.reduce((sum, score) => sum + score, 0) / metrics.length);
    }

    generateCoverageReport(coverageData, validation, workspace) {
        const report = {
            workspace,
            timestamp: new Date().toISOString(),
            summary: {
                passed: validation.passed,
                overallScore: validation.overallScore,
                testsPass: validation.testsPass
            },
            coverage: coverageData,
            validation: validation,
            recommendations: this.generateRecommendations(validation)
        };

        // Save detailed report
        const reportPath = path.join(workspace, '.aaf-coverage', 'aaf-coverage-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`📄 Coverage report saved: ${reportPath}`);
        return report;
    }

    generateRecommendations(validation) {
        const recommendations = [];

        if (!validation.testsPass) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Tests',
                message: 'Fix all failing tests before proceeding',
                action: 'Review test output and fix broken tests'
            });
        }

        for (const failure of validation.failures) {
            if (failure.metric !== 'tests') {
                recommendations.push({
                    priority: 'HIGH',
                    category: 'Coverage',
                    message: `${failure.metric} coverage is ${failure.actual}%, need ${failure.threshold}%`,
                    action: `Add ${Math.ceil(failure.deficit)}% more ${failure.metric} coverage`
                });
            }
        }

        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'INFO',
                category: 'Success',
                message: 'All coverage thresholds met!',
                action: 'Ready for code review'
            });
        }

        return recommendations;
    }

    async enforceCompliance(workspace, maxRetries = 3) {
        console.log(`🎯 Enforcing 100% compliance in: ${workspace}`);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`📊 Compliance check attempt ${attempt}/${maxRetries}`);

            const result = await this.validateTestCoverage(workspace);

            if (result.success) {
                console.log(`✅ Compliance achieved on attempt ${attempt}`);
                return result;
            }

            console.log(`❌ Compliance failed on attempt ${attempt}`);
            this.printFailureDetails(result.validation);

            if (attempt < maxRetries) {
                console.log(`🔄 Retrying in 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        throw new Error(`Compliance enforcement failed after ${maxRetries} attempts`);
    }

    printFailureDetails(validation) {
        console.log('\n📋 Coverage Failure Details:');

        if (!validation.testsPass) {
            console.log('  ❌ Tests are failing - must fix before coverage validation');
        }

        for (const failure of validation.failures) {
            if (failure.metric !== 'tests') {
                console.log(`  ❌ ${failure.metric}: ${failure.actual}% (need ${failure.threshold}%)`);
            }
        }

        if (validation.recommendations) {
            console.log('\n💡 Recommendations:');
            for (const rec of validation.recommendations) {
                console.log(`  ${rec.priority === 'HIGH' ? '🔥' : 'ℹ️'} ${rec.message}`);
                console.log(`     Action: ${rec.action}`);
            }
        }
        console.log('');
    }
}

module.exports = TestCoverageValidator;