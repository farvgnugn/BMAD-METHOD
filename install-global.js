#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
// Note: spawn was unused and removed

class GlobalInstaller {
    constructor() {
        this.packageName = 'aaf-method';
        this.repoPath = process.cwd();
    }

    async install() {
        console.log(chalk.blue.bold('🚀 AAF Method Global Installation'));
        console.log('=' .repeat(50));

        try {
            // Check if pnpm is available
            await this.checkPnpm();

            // Build the package
            await this.buildPackage();

            // Install globally
            await this.installGlobally();

            // Verify installation
            await this.verifyInstallation();

            // Show usage instructions
            this.showUsage();

        } catch (error) {
            console.error(chalk.red('❌ Installation failed:'), error.message);
            throw new Error(`Installation failed: ${error.message}`);
        }
    }

    async checkPnpm() {
        console.log('🔍 Checking for pnpm...');

        try {
            const version = execSync('pnpm --version', { encoding: 'utf8' }).trim();
            console.log(chalk.green(`✅ pnpm v${version} found`));
        } catch (error) {
            console.error(chalk.red('❌ pnpm not found. Please install pnpm first:'));
            console.log('   npm install -g pnpm');
            console.log('   or visit: https://pnpm.io/installation');
            throw new Error('pnpm not available');
        }
    }

    async buildPackage() {
        console.log('\n📦 Preparing package for installation...');

        // Check if package.json exists
        const packagePath = path.join(this.repoPath, 'package.json');
        if (!fs.existsSync(packagePath)) {
            throw new Error('package.json not found in current directory');
        }

        // Read package.json to get version info
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log(`   Package: ${packageJson.name} v${packageJson.version}`);

        // Install dependencies if needed
        if (!fs.existsSync(path.join(this.repoPath, 'node_modules'))) {
            console.log('   Installing dependencies...');
            execSync('pnpm install', { stdio: 'pipe', cwd: this.repoPath });
        }

        // Run any build steps if they exist
        try {
            if (packageJson.scripts && packageJson.scripts.build) {
                console.log('   Running build script...');
                execSync('pnpm run build', { stdio: 'pipe', cwd: this.repoPath });
            }
        } catch (error) {
            console.log('   No build step needed');
        }

        console.log(chalk.green('✅ Package prepared'));
    }

    async installGlobally() {
        console.log('\n🌍 Installing globally with pnpm...');

        try {
            // Check if already installed globally
            try {
                const globalPackages = execSync('pnpm list -g --depth=0', { encoding: 'utf8' });
                if (globalPackages.includes(this.packageName)) {
                    console.log('   Removing existing global installation...');
                    execSync(`pnpm uninstall -g ${this.packageName}`, { stdio: 'pipe' });
                }
            } catch (error) {
                // No global packages or not previously installed
            }

            // Install from current directory
            console.log(`   Installing ${this.packageName} globally...`);
            execSync('pnpm install -g .', { stdio: 'inherit', cwd: this.repoPath });

            console.log(chalk.green('✅ Global installation complete'));

        } catch (error) {
            throw new Error(`Failed to install globally: ${error.message}`);
        }
    }

    async verifyInstallation() {
        console.log('\n🔍 Verifying installation...');

        try {
            // Check if aaf command is available
            const output = execSync('aaf --version', { encoding: 'utf8' });
            console.log(chalk.green(`✅ aaf command available: ${output.trim()}`));

            // Check if workflow command works
            execSync('aaf workflow --help', { stdio: 'pipe' });
            console.log(chalk.green('✅ aaf workflow command available'));

        } catch (error) {
            console.warn(chalk.yellow('⚠️ Command verification failed. You may need to:'));
            console.log('   1. Restart your terminal');
            console.log('   2. Check your PATH includes pnpm global bin directory');
            console.log('   3. Run: pnpm config get global-bin-dir');
        }
    }

    showUsage() {
        console.log('\n🎉 ' + chalk.green.bold('Installation Complete!'));
        console.log('=' .repeat(50));
        console.log('');
        console.log(chalk.blue.bold('Available Commands:'));
        console.log('');
        console.log('📦 ' + chalk.cyan('aaf install') + '                     - Install AAF Method in project');
        console.log('🔍 ' + chalk.cyan('aaf workflow find-work') + '           - Find available work');
        console.log('🚀 ' + chalk.cyan('aaf workflow start-work') + '          - Auto-setup workspace and start work');
        console.log('📝 ' + chalk.cyan('aaf workflow claim-story <id>') + '    - Claim specific story');
        console.log('📊 ' + chalk.cyan('aaf workflow dashboard') + '           - View workflow dashboard');
        console.log('🧹 ' + chalk.cyan('aaf workflow cleanup-workspace') + '  - Clean up agent workspace');
        console.log('');
        console.log(chalk.blue.bold('Quick Start:'));
        console.log('');
        console.log('1. Navigate to your project directory');
        console.log('2. Create stories in ' + chalk.yellow('/docs/stories/'));
        console.log('3. Start coordination server: ' + chalk.cyan('node aaf-core/utils/workflow-orchestrator.js connect'));
        console.log('4. Start working: ' + chalk.cyan('aaf workflow start-work Developer'));
        console.log('');
        console.log(chalk.green('🎯 Ready for multi-agent development!'));
    }
}

// CLI usage
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    const installer = new GlobalInstaller();
    try {
        await installer.install();
    } catch (error) {
        console.error(chalk.red('Installation failed:'), error.message);
        throw error;
    }
}

export default GlobalInstaller;