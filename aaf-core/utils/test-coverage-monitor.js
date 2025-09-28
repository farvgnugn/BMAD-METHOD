#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Test Coverage Monitor
 * Ensures 100% test coverage for all user stories
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const EventEmitter = require('events');

class TestCoverageMonitor extends EventEmitter {
    constructor(options = {}) {
        super();

        this.projectPath = options.projectPath || process.cwd();
        this.coverageTarget = options.coverageTarget || 100;
        this.testFrameworks = options.testFrameworks || this.detectTestFrameworks();
        this.coverageTools = options.coverageTools || this.detectCoverageTools();

        // Coverage tracking
        this.storyCoverage = new Map(); // storyId -> coverage data
        this.globalCoverage = null;
        this.lastCoverageRun = null;

        // Configuration
        this.config = {
            thresholds: {
                statements: 100,
                branches: 100,
                functions: 100,
                lines: 100
            },
            excludePatterns: [
                '**/node_modules/**',
                '**/test/**/*.spec.js',
                '**/test/**/*.test.js',
                '**/*.config.js',
                '**/dist/**',
                '**/build/**'
            ],
            includePatterns: [
                'src/**/*.js',
                'lib/**/*.js',
                'app/**/*.js',
                '**/*.ts',
                '**/*.tsx'
            ]
        };
    }

    detectTestFrameworks() {
        const packageJsonPath = path.join(this.projectPath, 'package.json');
        const frameworks = [];

        try {
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                if (deps.jest) frameworks.push('jest');
                if (deps.mocha) frameworks.push('mocha');
                if (deps.vitest) frameworks.push('vitest');
                if (deps.cypress) frameworks.push('cypress');
                if (deps.playwright) frameworks.push('playwright');
                if (deps.puppeteer) frameworks.push('puppeteer');
            }
        } catch (error) {
            console.warn('Could not detect test frameworks:', error.message);
        }

        return frameworks.length > 0 ? frameworks : ['jest']; // Default to jest
    }

    detectCoverageTools() {
        const packageJsonPath = path.join(this.projectPath, 'package.json');
        const tools = [];

        try {
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                if (deps.nyc || deps.c8) tools.push('nyc');
                if (deps['istanbul']) tools.push('istanbul');
                if (deps.jest) tools.push('jest'); // Jest has built-in coverage
                if (deps.vitest) tools.push('vitest'); // Vitest has built-in coverage
            }
        } catch (error) {
            console.warn('Could not detect coverage tools:', error.message);
        }

        return tools.length > 0 ? tools : ['jest']; // Default to jest
    }

    async initialize() {
        console.log('🧪 Initializing Test Coverage Monitor...');
        console.log(`📁 Project path: ${this.projectPath}`);
        console.log(`🎯 Coverage target: ${this.coverageTarget}%`);
        console.log(`🔧 Test frameworks: ${this.testFrameworks.join(', ')}`);
        console.log(`📊 Coverage tools: ${this.coverageTools.join(', ')}`);

        // Create coverage reports directory
        const reportsDir = path.join(this.projectPath, '.aaf-temp', 'coverage');
        fs.mkdirSync(reportsDir, { recursive: true });

        // Run initial coverage assessment
        await this.runFullCoverageAnalysis();

        console.log('✅ Test Coverage Monitor initialized');
        this.emit('initialized');
    }

    async runFullCoverageAnalysis() {
        console.log('🔍 Running full coverage analysis...');

        try {
            // Run tests with coverage for each detected framework
            const coverageResults = [];

            for (const framework of this.testFrameworks) {
                const result = await this.runCoverageForFramework(framework);
                if (result) {
                    coverageResults.push(result);
                }
            }

            // Merge coverage results if multiple frameworks
            this.globalCoverage = this.mergeCoverageResults(coverageResults);
            this.lastCoverageRun = new Date();

            console.log('📊 Coverage Analysis Complete:');
            this.printCoverageSummary(this.globalCoverage);

            this.emit('coverage-updated', this.globalCoverage);
            return this.globalCoverage;

        } catch (error) {
            console.error('❌ Coverage analysis failed:', error.message);
            this.emit('coverage-error', error);
            return null;
        }
    }

    async runCoverageForFramework(framework) {
        console.log(`🧪 Running ${framework} coverage...`);

        try {
            switch (framework) {
                case 'jest':
                    return await this.runJestCoverage();
                case 'mocha':
                    return await this.runMochaCoverage();
                case 'vitest':
                    return await this.runVitestCoverage();
                case 'cypress':
                    return await this.runCypressCoverage();
                default:
                    console.warn(`Unknown test framework: ${framework}`);
                    return null;
            }
        } catch (error) {
            console.error(`Failed to run ${framework} coverage:`, error.message);
            return null;
        }
    }

    async runJestCoverage() {
        const coverageDir = path.join(this.projectPath, '.aaf-temp', 'coverage', 'jest');

        const jestCommand = [
            'npx', 'jest',
            '--coverage',
            '--coverageDirectory', coverageDir,
            '--coverageReporters', 'json-summary', 'lcov', 'text',
            '--collectCoverageFrom', 'src/**/*.{js,ts,jsx,tsx}',
            '--collectCoverageFrom', '!src/**/*.{test,spec}.{js,ts,jsx,tsx}',
            '--collectCoverageFrom', '!src/**/__tests__/**',
            '--passWithNoTests'
        ];

        return await this.runCoverageCommand(jestCommand, coverageDir);
    }

    async runMochaCoverage() {
        const coverageDir = path.join(this.projectPath, '.aaf-temp', 'coverage', 'mocha');

        const mochaCommand = [
            'npx', 'nyc',
            '--reporter', 'json-summary',
            '--reporter', 'lcov',
            '--report-dir', coverageDir,
            'mocha', 'test/**/*.js'
        ];

        return await this.runCoverageCommand(mochaCommand, coverageDir);
    }

    async runVitestCoverage() {
        const coverageDir = path.join(this.projectPath, '.aaf-temp', 'coverage', 'vitest');

        const vitestCommand = [
            'npx', 'vitest',
            'run',
            '--coverage',
            '--coverage.reporter', 'json-summary',
            '--coverage.reporter', 'lcov',
            '--coverage.reportsDirectory', coverageDir
        ];

        return await this.runCoverageCommand(vitestCommand, coverageDir);
    }

    async runCypressCoverage() {
        const coverageDir = path.join(this.projectPath, '.aaf-temp', 'coverage', 'cypress');

        const cypressCommand = [
            'npx', 'cypress', 'run',
            '--env', `coverage=true,coverageDir=${coverageDir}`
        ];

        return await this.runCoverageCommand(cypressCommand, coverageDir);
    }

    async runCoverageCommand(command, coverageDir) {
        return new Promise((resolve, reject) => {
            console.log(`📋 Running: ${command.join(' ')}`);

            const process = spawn(command[0], command.slice(1), {
                cwd: this.projectPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const coverage = await this.parseCoverageReport(coverageDir);
                        resolve(coverage);
                    } catch (error) {
                        console.warn('Could not parse coverage report:', error.message);
                        resolve(null);
                    }
                } else {
                    console.error(`Coverage command failed with code ${code}`);
                    console.error('STDERR:', stderr);
                    resolve(null);
                }
            });

            process.on('error', (error) => {
                console.error('Coverage command error:', error.message);
                resolve(null);
            });
        });
    }

    async parseCoverageReport(coverageDir) {
        // Try to read JSON coverage summary
        const summaryPath = path.join(coverageDir, 'coverage-summary.json');

        if (fs.existsSync(summaryPath)) {
            try {
                const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
                return this.normalizeCoverageData(summaryData);
            } catch (error) {
                console.warn('Could not parse coverage summary:', error.message);
            }
        }

        // Try to read LCOV coverage
        const lcovPath = path.join(coverageDir, 'lcov.info');
        if (fs.existsSync(lcovPath)) {
            try {
                const lcovData = fs.readFileSync(lcovPath, 'utf8');
                return this.parseLcovData(lcovData);
            } catch (error) {
                console.warn('Could not parse LCOV data:', error.message);
            }
        }

        throw new Error('No coverage report found');
    }

    normalizeCoverageData(summaryData) {
        // Normalize coverage data format across different tools
        const total = summaryData.total || summaryData;

        return {
            statements: {
                total: total.statements?.total || 0,
                covered: total.statements?.covered || 0,
                pct: total.statements?.pct || 0
            },
            branches: {
                total: total.branches?.total || 0,
                covered: total.branches?.covered || 0,
                pct: total.branches?.pct || 0
            },
            functions: {
                total: total.functions?.total || 0,
                covered: total.functions?.covered || 0,
                pct: total.functions?.pct || 0
            },
            lines: {
                total: total.lines?.total || 0,
                covered: total.lines?.covered || 0,
                pct: total.lines?.pct || 0
            },
            timestamp: new Date().toISOString(),
            files: summaryData.files || {}
        };
    }

    parseLcovData(lcovData) {
        // Basic LCOV parser - in production you'd use a proper LCOV library
        const lines = lcovData.split('\n');
        let totalLines = 0, coveredLines = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalBranches = 0, coveredBranches = 0;

        for (const line of lines) {
            if (line.startsWith('LF:')) totalLines += parseInt(line.split(':')[1]);
            if (line.startsWith('LH:')) coveredLines += parseInt(line.split(':')[1]);
            if (line.startsWith('FNF:')) totalFunctions += parseInt(line.split(':')[1]);
            if (line.startsWith('FNH:')) coveredFunctions += parseInt(line.split(':')[1]);
            if (line.startsWith('BRF:')) totalBranches += parseInt(line.split(':')[1]);
            if (line.startsWith('BRH:')) coveredBranches += parseInt(line.split(':')[1]);
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
            timestamp: new Date().toISOString()
        };
    }

    mergeCoverageResults(results) {
        if (results.length === 0) return null;
        if (results.length === 1) return results[0];

        // Merge multiple coverage results
        const merged = {
            statements: { total: 0, covered: 0, pct: 0 },
            branches: { total: 0, covered: 0, pct: 0 },
            functions: { total: 0, covered: 0, pct: 0 },
            lines: { total: 0, covered: 0, pct: 0 },
            timestamp: new Date().toISOString(),
            frameworks: results.map((r, i) => this.testFrameworks[i])
        };

        for (const result of results) {
            merged.statements.total += result.statements.total;
            merged.statements.covered += result.statements.covered;
            merged.branches.total += result.branches.total;
            merged.branches.covered += result.branches.covered;
            merged.functions.total += result.functions.total;
            merged.functions.covered += result.functions.covered;
            merged.lines.total += result.lines.total;
            merged.lines.covered += result.lines.covered;
        }

        // Calculate percentages
        merged.statements.pct = merged.statements.total > 0
            ? Math.round((merged.statements.covered / merged.statements.total) * 100) : 0;
        merged.branches.pct = merged.branches.total > 0
            ? Math.round((merged.branches.covered / merged.branches.total) * 100) : 0;
        merged.functions.pct = merged.functions.total > 0
            ? Math.round((merged.functions.covered / merged.functions.total) * 100) : 0;
        merged.lines.pct = merged.lines.total > 0
            ? Math.round((merged.lines.covered / merged.lines.total) * 100) : 0;

        return merged;
    }

    printCoverageSummary(coverage) {
        if (!coverage) {
            console.log('❌ No coverage data available');
            return;
        }

        console.log('📊 Coverage Summary:');
        console.log(`  📝 Statements: ${coverage.statements.covered}/${coverage.statements.total} (${coverage.statements.pct}%)`);
        console.log(`  🌿 Branches:   ${coverage.branches.covered}/${coverage.branches.total} (${coverage.branches.pct}%)`);
        console.log(`  ⚡ Functions:  ${coverage.functions.covered}/${coverage.functions.total} (${coverage.functions.pct}%)`);
        console.log(`  📏 Lines:      ${coverage.lines.covered}/${coverage.lines.total} (${coverage.lines.pct}%)`);

        // Check if targets are met
        const targetsMet = this.checkCoverageTargets(coverage);
        if (targetsMet.allMet) {
            console.log('✅ All coverage targets met!');
        } else {
            console.log('❌ Coverage targets not met:');
            for (const [metric, met] of Object.entries(targetsMet.details)) {
                if (!met) {
                    console.log(`  ❌ ${metric}: ${coverage[metric].pct}% < ${this.config.thresholds[metric]}%`);
                }
            }
        }
    }

    checkCoverageTargets(coverage = this.globalCoverage) {
        if (!coverage) return { allMet: false, details: {} };

        const details = {};
        for (const [metric, threshold] of Object.entries(this.config.thresholds)) {
            details[metric] = coverage[metric].pct >= threshold;
        }

        return {
            allMet: Object.values(details).every(met => met),
            details: details
        };
    }

    async trackStoryTestCoverage(storyId, testFiles = []) {
        console.log(`🔍 Tracking test coverage for story ${storyId}...`);

        try {
            // Run tests specific to this story if test files provided
            let storyCoverage = null;

            if (testFiles.length > 0) {
                storyCoverage = await this.runTargetedCoverage(testFiles);
            } else {
                // Use global coverage
                storyCoverage = this.globalCoverage;
            }

            if (storyCoverage) {
                this.storyCoverage.set(storyId, {
                    ...storyCoverage,
                    storyId: storyId,
                    testFiles: testFiles,
                    timestamp: new Date().toISOString()
                });

                console.log(`📊 Story ${storyId} coverage recorded`);
                this.emit('story-coverage-updated', storyId, storyCoverage);
                return storyCoverage;
            }

        } catch (error) {
            console.error(`Failed to track coverage for story ${storyId}:`, error.message);
            this.emit('story-coverage-error', storyId, error);
        }

        return null;
    }

    async runTargetedCoverage(testFiles) {
        // Run coverage for specific test files
        const testPattern = testFiles.join(' ');
        const coverageDir = path.join(this.projectPath, '.aaf-temp', 'coverage', 'targeted');

        const command = [
            'npx', 'jest',
            '--coverage',
            '--coverageDirectory', coverageDir,
            '--testPathPattern', testPattern,
            '--passWithNoTests'
        ];

        return await this.runCoverageCommand(command, coverageDir);
    }

    async validateStoryCoverage(storyId, requiredCoverage = this.coverageTarget) {
        const coverage = this.storyCoverage.get(storyId);

        if (!coverage) {
            console.log(`❌ No coverage data for story ${storyId}`);
            return false;
        }

        const overallCoverage = Math.min(
            coverage.statements.pct,
            coverage.branches.pct,
            coverage.functions.pct,
            coverage.lines.pct
        );

        const isValid = overallCoverage >= requiredCoverage;

        console.log(`${isValid ? '✅' : '❌'} Story ${storyId} coverage: ${overallCoverage}% (required: ${requiredCoverage}%)`);

        this.emit('story-coverage-validated', storyId, isValid, coverage);
        return isValid;
    }

    async generateCoverageReport(storyId = null) {
        const reportPath = path.join(this.projectPath, '.aaf-temp', 'coverage', 'report.json');

        const report = {
            timestamp: new Date().toISOString(),
            project: path.basename(this.projectPath),
            globalCoverage: this.globalCoverage,
            storyCount: this.storyCoverage.size,
            target: this.coverageTarget,
            config: this.config
        };

        if (storyId) {
            report.story = {
                id: storyId,
                coverage: this.storyCoverage.get(storyId)
            };
        } else {
            report.stories = Array.from(this.storyCoverage.entries()).map(([id, coverage]) => ({
                id: id,
                coverage: coverage
            }));
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Coverage report saved: ${reportPath}`);

        return report;
    }

    getStatus() {
        return {
            initialized: !!this.globalCoverage,
            lastRun: this.lastCoverageRun,
            globalCoverage: this.globalCoverage,
            storiesTracked: this.storyCoverage.size,
            testFrameworks: this.testFrameworks,
            coverageTools: this.coverageTools,
            targetsMet: this.checkCoverageTargets()
        };
    }

    async getCoverageForStory(storyId) {
        return this.storyCoverage.get(storyId) || null;
    }

    async getAllStoryCoverage() {
        return Array.from(this.storyCoverage.entries()).map(([id, coverage]) => ({
            storyId: id,
            coverage: coverage
        }));
    }
}

module.exports = TestCoverageMonitor;