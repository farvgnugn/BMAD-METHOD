#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Execution CLI
 * Command-line interface for autonomous agent execution
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const COMMANDS = {
    'start': {
        description: 'Start continuous autonomous execution',
        usage: 'aaf-execution start [projectName]',
        script: 'continuous-execution-engine.js'
    },
    'status': {
        description: 'Show execution status and generate report',
        usage: 'aaf-execution status [projectName]',
        script: 'continuous-execution-engine.js'
    },
    'init': {
        description: 'Initialize AAF execution configuration',
        usage: 'aaf-execution init',
        script: 'continuous-execution-engine.js'
    },
    'orchestrator': {
        description: 'Direct orchestrator management',
        usage: 'aaf-execution orchestrator <command>',
        script: 'autonomous-orchestrator.js'
    },
    'coverage': {
        description: 'Test coverage analysis and monitoring',
        usage: 'aaf-execution coverage <command>',
        script: 'test-coverage-monitor.js'
    },
    'coord': {
        description: 'Coordination server management',
        usage: 'aaf-execution coord <command>',
        script: 'socket-coordination.js'
    }
};

function showHelp() {
    console.log('🚀 AAF Autonomous Execution Engine');
    console.log('');
    console.log('The complete solution for continuous agent execution with 100% completion tracking');
    console.log('');
    console.log('Usage: aaf-execution <command> [options]');
    console.log('');
    console.log('Commands:');
    for (const [cmd, info] of Object.entries(COMMANDS)) {
        console.log(`  ${cmd.padEnd(12)} ${info.description}`);
    }
    console.log('');
    console.log('Examples:');
    console.log('  aaf-execution init                 # Initialize configuration');
    console.log('  aaf-execution start MyProject      # Start autonomous execution');
    console.log('  aaf-execution status               # Check execution status');
    console.log('  aaf-execution coverage run         # Run coverage analysis');
    console.log('  aaf-execution coord server-status  # Check coordination server');
    console.log('');
    console.log('Features:');
    console.log('  🤖 Autonomous agent spawning and management');
    console.log('  📋 Intelligent user story queue prioritization');
    console.log('  🧪 Automatic 100% test coverage validation');
    console.log('  🔄 Continuous workflow orchestration');
    console.log('  📊 Real-time progress tracking and reporting');
    console.log('  🎯 Quality gates and compliance checking');
    console.log('  🔗 Multi-agent coordination via Socket.IO');
    console.log('  📈 Performance metrics and optimization');
    console.log('');
    console.log('Learn more: https://github.com/dferguson/AAF-METHOD');
}

function getScriptPath(scriptName) {
    const possiblePaths = [
        path.join(__dirname, 'aaf-core', 'utils', scriptName),
        path.join(__dirname, 'bmad-core', 'utils', scriptName),
        path.join(__dirname, 'utils', scriptName),
        path.join(__dirname, scriptName)
    ];

    for (const scriptPath of possiblePaths) {
        if (fs.existsSync(scriptPath)) {
            return scriptPath;
        }
    }

    throw new Error(`Script not found: ${scriptName}`);
}

async function executeCommand(command, args) {
    const commandInfo = COMMANDS[command];
    if (!commandInfo) {
        console.error(`❌ Unknown command: ${command}`);
        console.error('Run "aaf-execution" without arguments to see available commands');
        process.exit(1);
    }

    try {
        const scriptPath = getScriptPath(commandInfo.script);
        const childArgs = [scriptPath, command, ...args];

        console.log(`🚀 Executing: node ${childArgs.join(' ')}`);

        const child = spawn('node', childArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
        });

        child.on('exit', (code) => {
            process.exit(code || 0);
        });

        child.on('error', (error) => {
            console.error(`❌ Execution failed: ${error.message}`);
            process.exit(1);
        });

    } catch (error) {
        console.error(`❌ Failed to execute command: ${error.message}`);
        process.exit(1);
    }
}

// Quick setup command
async function quickSetup() {
    console.log('🚀 AAF Execution Quick Setup');
    console.log('');

    // Check if already configured
    const configPath = path.join(process.cwd(), '.aaf-core', 'execution-config.yaml');
    if (fs.existsSync(configPath)) {
        console.log('✅ AAF execution is already configured');
        console.log('');
        console.log('To start autonomous execution:');
        console.log('  aaf-execution start');
        console.log('');
        console.log('To check status:');
        console.log('  aaf-execution status');
        return;
    }

    console.log('📋 Setting up AAF autonomous execution...');

    try {
        // Run initialization
        await executeCommand('init', []);

        console.log('');
        console.log('✅ Setup complete!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Add your user stories to docs/stories/ directory');
        console.log('2. Configure your test frameworks in the config file');
        console.log('3. Run: aaf-execution start');
        console.log('');
        console.log('The system will:');
        console.log('  🤖 Automatically spawn Claude Code agents');
        console.log('  📋 Process all user stories to 100% completion');
        console.log('  🧪 Ensure 100% test coverage');
        console.log('  📊 Provide real-time progress reports');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Main CLI logic
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === 'help' || command === '--help' || command === '-h') {
        showHelp();
        return;
    }

    if (command === 'setup') {
        await quickSetup();
        return;
    }

    if (command === 'version' || command === '--version' || command === '-v') {
        console.log('AAF Execution Engine v1.0.0');
        return;
    }

    // Execute the command
    await executeCommand(command, args.slice(1));
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Execution interrupted');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Execution terminated');
    process.exit(0);
});

if (require.main === module) {
    main().catch(error => {
        console.error('❌ CLI Error:', error.message);
        process.exit(1);
    });
}

module.exports = { executeCommand, showHelp };