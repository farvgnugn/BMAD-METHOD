#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * Test script to demonstrate the workflow orchestration system
 * This simulates a dev→review→dev cycle with branch tracking
 */

import path from 'node:path';
import { spawn } from 'node:child_process';
// Note: fork and sleep were unused and removed

// async function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// } // Currently unused

async function runCommand(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}

async function main() {
    console.log('🚀 Starting Workflow Orchestration Test');
    console.log('=' .repeat(50));

    const workflowCmd = path.join(new URL('.', import.meta.url).pathname, 'aaf-core', 'utils', 'workflow-orchestrator.js');

    try {
        console.log('\n📋 Testing Dashboard Command:');
        await runCommand('node', [workflowCmd, 'dashboard', 'Developer', 'TestProject'], { timeout: 5000 });

        console.log('\n📢 Testing Status Change (Developer promotes story to review):');
        await runCommand('node', [workflowCmd, 'status-change', '21.1', 'In Progress', 'Ready for Review', 'Feature complete, ready for code review'], { timeout: 5000 });

        console.log('\n🔍 Testing List Available Reviews:');
        await runCommand('node', [workflowCmd, 'list-reviews'], { timeout: 5000 });

        console.log('\n📝 Testing Review Claim:');
        await runCommand('node', [workflowCmd, 'claim-review', '21.1', 'code-review'], { timeout: 5000 });

        console.log('\n📋 Testing Review Completion with Changes Needed:');
        await runCommand('node', [workflowCmd, 'complete-review', '21.1', 'needs-changes', 'Missing unit tests', 'Code style needs improvement'], { timeout: 5000 });

        console.log('\n🎯 Testing Developer Task List:');
        await runCommand('node', [workflowCmd, 'my-tasks', 'Developer'], { timeout: 5000 });

        console.log('\n✅ Workflow orchestration test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nNote: Make sure the coordination server is running:');
        console.log('  node bmad-core/utils/test-coordination-server.js');
        throw error;
    }
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    await main();
}

export { runCommand };