#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Method Workflow Orchestrator
 * Handles story status transitions and agent notifications
 */

import { io } from 'socket.io-client';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { execSync } from 'node:child_process';

class WorkflowOrchestrator {
    constructor() {
        this.socket = null;
        this.config = null;
        this.projectName = null;
        this.agentName = null;
        this.role = null;
        this.loadConfig();
    }

    loadConfig() {
        try {
            const possiblePaths = [
                path.join(process.cwd(), '.aaf-core', 'core-config.yaml'),
                path.join(process.cwd(), 'aaf-core', 'core-config.yaml'),
                path.join(new URL('..', import.meta.url).pathname, 'core-config.yaml')
            ];

            let configPath = null;
            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    configPath = testPath;
                    break;
                }
            }

            if (!configPath) {
                throw new Error('core-config.yaml not found');
            }

            const configFile = fs.readFileSync(configPath, 'utf8');
            this.config = yaml.load(configFile);

            if (!this.config.coordination?.enabled) {
                throw new Error('Coordination must be enabled for workflow orchestration');
            }
        } catch (error) {
            console.error('Failed to load AAF configuration:', error.message);
            // Skip process.exit to avoid ESLint error
            throw new Error(`Configuration load failed: ${error.message}`);
        }
    }

    async connect(developerId, role, projectName, agentName) {
        this.developerId = developerId;
        this.role = role || 'Developer';
        this.projectName = projectName || path.basename(process.cwd());
        this.agentName = agentName || 'Agent';

        const serverUrl = this.config.coordination.serverUrl;
        const namespace = this.config.coordination.socketNamespace || '/dev-coordination';

        return new Promise((resolve, reject) => {
            this.socket = io(serverUrl + namespace, {
                auth: {
                    developerId: developerId,
                    role: this.role,
                    projectName: this.projectName,
                    agentName: this.agentName,
                    workflowEnabled: true
                }
            });

            this.socket.on('connect', () => {
                console.log(`Workflow orchestrator connected: ${this.agentName} (${this.role})`);
                this.subscribeToWorkflowEvents();
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Workflow connection failed:', error.message);
                reject(error);
            });

            // Listen for workflow events
            this.socket.on('story-status-changed', (data) => {
                this.handleStoryStatusChange(data);
            });

            this.socket.on('workflow-notification', (data) => {
                this.handleWorkflowNotification(data);
            });

            this.socket.on('review-requested', (data) => {
                this.handleReviewRequest(data);
            });

            this.socket.on('review-completed', (data) => {
                this.handleReviewCompleted(data);
            });
        });
    }

    subscribeToWorkflowEvents() {
        // Subscribe to project-specific workflow channel
        this.socket.emit('subscribe-workflow', {
            projectName: this.projectName,
            role: this.role,
            agentName: this.agentName
        });
    }

    async publishStoryStatusChange(storyId, oldStatus, newStatus, branchName = null, notes = '') {
        if (!this.socket || !this.socket.connected) {
            console.error('Not connected to coordination server');
            return;
        }

        const changeData = {
            storyId,
            projectName: this.projectName,
            oldStatus,
            newStatus,
            agentName: this.agentName,
            role: this.role,
            developerId: this.developerId,
            branchName: branchName || this.getCurrentBranch(),
            notes,
            timestamp: new Date().toISOString()
        };

        console.log(`📢 Publishing status change: ${storyId} ${oldStatus} → ${newStatus}`);

        this.socket.emit('publish-story-status-change', changeData, (response) => {
            if (response?.success) {
                console.log(`✅ Workflow notification sent for ${storyId}`);
            } else {
                console.error(`❌ Failed to send workflow notification: ${response?.error}`);
            }
        });
    }

    async claimStoryForReview(storyId, reviewType = 'code-review') {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            const claimData = {
                storyId,
                projectName: this.projectName,
                reviewerId: this.developerId,
                reviewerName: this.agentName,
                reviewType,
                timestamp: new Date().toISOString()
            };

            this.socket.emit('claim-story-review', claimData, (response) => {
                if (response.success) {
                    console.log(`📝 Claimed review for story ${storyId}`);
                    resolve(response);
                } else {
                    console.error(`❌ Failed to claim review: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async publishReviewComplete(storyId, reviewStatus, findings = [], branchName = null) {
        if (!this.socket || !this.socket.connected) {
            console.error('Not connected to coordination server');
            return;
        }

        const reviewData = {
            storyId,
            projectName: this.projectName,
            reviewerId: this.developerId,
            reviewerName: this.agentName,
            reviewStatus, // 'approved', 'rejected', 'needs-changes'
            findings,
            branchName: branchName || this.getCurrentBranch(),
            timestamp: new Date().toISOString()
        };

        console.log(`🔍 Publishing review completion: ${storyId} - ${reviewStatus}`);

        this.socket.emit('publish-review-complete', reviewData, (response) => {
            if (response?.success) {
                console.log(`✅ Review notification sent for ${storyId}`);
            } else {
                console.error(`❌ Failed to send review notification: ${response?.error}`);
            }
        });
    }

    handleStoryStatusChange(data) {
        if (data.projectName !== this.projectName) return;

        console.log(`\n📋 Story Status Update:`);
        console.log(`   Story: ${data.storyId}`);
        console.log(`   Status: ${data.oldStatus} → ${data.newStatus}`);
        console.log(`   Agent: ${data.agentName} (${data.role})`);
        if (data.branchName) {
            console.log(`   Branch: ${data.branchName}`);
        }
        if (data.notes) {
            console.log(`   Notes: ${data.notes}`);
        }

        // Handle role-specific actions
        this.processWorkflowTransition(data);
    }

    handleWorkflowNotification(data) {
        if (data.projectName !== this.projectName) return;

        console.log(`\n🔔 Workflow Notification:`);
        console.log(`   ${data.message}`);
        if (data.action) {
            console.log(`   Suggested Action: ${data.action}`);
        }
    }

    handleReviewRequest(data) {
        if (data.projectName !== this.projectName) return;

        // Only show to reviewers/QA agents
        if (!['Reviewer', 'QA', 'Architect', 'TechLead'].includes(this.role)) return;

        console.log(`\n🔍 Review Request:`);
        console.log(`   Story: ${data.storyId}`);
        console.log(`   Branch: ${data.branchName}`);
        console.log(`   Requested by: ${data.agentName} (${data.role})`);
        console.log(`   Use: aaf workflow claim-review ${data.storyId}`);
    }

    handleReviewCompleted(data) {
        if (data.projectName !== this.projectName) return;

        console.log(`\n📋 Review Completed:`);
        console.log(`   Story: ${data.storyId}`);
        console.log(`   Status: ${data.reviewStatus}`);
        console.log(`   Reviewer: ${data.reviewerName}`);

        if (data.findings && data.findings.length > 0) {
            console.log(`   Findings:`);
            data.findings.forEach((finding, index) => {
                console.log(`     ${index + 1}. ${finding}`);
            });
        }

        if (data.reviewStatus === 'needs-changes' && this.role === 'Developer') {
            console.log(`   Action Required: Address review findings and resubmit`);
        }
    }

    processWorkflowTransition(data) {
        const { storyId, newStatus } = data;
        // const oldStatus = data.oldStatus; // Currently unused

        switch (newStatus) {
            case 'Ready for Review':
                if (['Reviewer', 'QA', 'Architect', 'TechLead'].includes(this.role)) {
                    console.log(`   📝 Story ${storyId} is ready for review`);
                    console.log(`   Command: aaf workflow claim-review ${storyId}`);
                }
                break;

            case 'In Review':
                if (this.role === 'Developer' && data.developerId === this.developerId) {
                    console.log(`   ⏳ Your story ${storyId} is being reviewed`);
                }
                break;

            case 'Needs Changes':
                if (this.role === 'Developer') {
                    console.log(`   🔧 Story ${storyId} needs changes - available for development`);
                    console.log(`   Command: aaf workflow claim-story ${storyId}`);
                }
                break;

            case 'Approved':
                if (data.developerId === this.developerId) {
                    console.log(`   ✅ Your story ${storyId} has been approved!`);
                }
                break;

            case 'Done':
                console.log(`   🎉 Story ${storyId} is complete!`);
                break;
        }
    }

    getCurrentBranch() {
        try {
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
            return branch;
        } catch (error) {
            console.warn('Could not determine current git branch:', error.message);
            return null;
        }
    }

    async createWorktreeForStory(storyId) {
        try {
            const branchName = `feature/story-${storyId.replace('.', '-')}`;
            const worktreePath = path.join(process.cwd(), '..', `${this.agentName}-workspace`);

            // Remove existing worktree if it exists
            try {
                execSync(`git worktree remove ${worktreePath}`, { stdio: 'pipe' });
                console.log(`🧹 Cleaned up existing worktree`);
            } catch (error) {
                // Worktree doesn't exist, that's fine
            }

            // Create new worktree with feature branch
            const createCommand = `git worktree add ${worktreePath} -b ${branchName}`;
            execSync(createCommand, { stdio: 'pipe' });

            // Create agent-specific environment file
            await this.createWorktreeEnvironment(worktreePath);

            console.log(`🌿 Created worktree: ${worktreePath}`);
            console.log(`🌱 Branch: ${branchName}`);

            return {
                path: worktreePath,
                branch: branchName
            };
        } catch (error) {
            console.error('Failed to create worktree:', error.message);

            // Fallback: suggest manual worktree creation
            const branchName = `feature/story-${storyId.replace('.', '-')}`;
            const worktreePath = path.join(process.cwd(), '..', `${this.agentName}-workspace`);

            console.log(`\n💡 Manual worktree setup:`);
            console.log(`   git worktree add ${worktreePath} -b ${branchName}`);
            console.log(`   cd ${worktreePath}`);

            return null;
        }
    }

    async cleanupWorktree() {
        try {
            const worktreePath = path.join(process.cwd(), '..', `${this.agentName}-workspace`);

            if (fs.existsSync(worktreePath)) {
                // Remove worktree
                execSync(`git worktree remove ${worktreePath}`, { stdio: 'pipe' });
                console.log(`🧹 Cleaned up worktree: ${worktreePath}`);
                return true;
            }
        } catch (error) {
            console.warn('Could not cleanup worktree:', error.message);
        }
        return false;
    }

    getWorktreePath() {
        return path.join(process.cwd(), '..', `${this.agentName}-workspace`);
    }

    isInWorktree() {
        const worktreePath = this.getWorktreePath();
        return process.cwd().startsWith(worktreePath);
    }

    async createWorktreeEnvironment(worktreePath) {
        try {
            const agentName = this.agentName || 'Agent';

            // Assign unique ports based on agent name hash
            const portBase = 3000;
            const agentHash = [...agentName].reduce((a, b) => a + b.codePointAt(0), 0);
            const devPort = portBase + (agentHash % 100);

            // Create .env.local for agent-specific configuration
            const envContent = `# Auto-generated for agent: ${agentName}
AGENT_NAME=${agentName}
DEV_PORT=${devPort}
API_PORT=${devPort + 1000}
BUILD_DIR=dist-${agentName}
TEST_DB_SUFFIX=_${agentName.toLowerCase()}
WORKSPACE_ID=${agentName}-${Date.now()}
`;

            const envPath = path.join(worktreePath, '.env.local');
            fs.writeFileSync(envPath, envContent);

            console.log(`⚙️ Environment configured: Port ${devPort}, Build dir: dist-${agentName}`);

            return {
                devPort,
                apiPort: devPort + 1000,
                buildDir: `dist-${agentName}`,
                agentName
            };
        } catch (error) {
            console.warn('Could not create worktree environment:', error.message);
            return null;
        }
    }

    async getAvailableReviews() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            this.socket.emit('get-available-reviews', {
                projectName: this.projectName,
                reviewerRole: this.role
            }, (response) => {
                if (response.success) {
                    resolve(response.stories);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async getMyTasks() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            this.socket.emit('get-my-workflow-tasks', {
                projectName: this.projectName,
                agentName: this.agentName,
                role: this.role
            }, (response) => {
                if (response.success) {
                    resolve(response.tasks);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async getAvailableStories() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            this.socket.emit('get-available-stories', {
                projectName: this.projectName
            }, (response) => {
                if (response.success) {
                    resolve(response.stories || []);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    extractStoryId(branchName) {
        // Extract story ID from branch names like 'feature/story-21-1' or 'feature/21.1-user-auth'
        const patterns = [
            /story[_-](\d+[-._]\d+)/i,
            /(\d+[-._]\d+)/,
            /story[_-](\d+)/i
        ];

        for (const pattern of patterns) {
            const match = branchName.match(pattern);
            if (match) {
                return match[1].replace(/[-_]/g, '.');
            }
        }
        return null;
    }

    async getContextualWork() {
        const currentBranch = this.getCurrentBranch();
        const contextualWork = [];

        if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
            const storyId = this.extractStoryId(currentBranch);

            if (storyId) {
                // Check if there's work to continue on this branch
                const myTasks = await this.getMyTasks();
                const currentStoryTask = myTasks.find(task => task.storyId === storyId);

                if (currentStoryTask) {
                    contextualWork.push({
                        ...currentStoryTask,
                        priority: 'high',
                        source: 'current-branch',
                        context: `You're currently on branch '${currentBranch}' for this story`,
                        action: currentStoryTask.status === 'needs-changes' ? 'address review findings' : 'continue development'
                    });
                }
            }
        }

        return contextualWork;
    }

    rankWork(workItems, preferences = {}) {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };

        return workItems.sort((a, b) => {
            // Primary sort: priority
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Secondary sort: source type (current-branch > assigned > review-queue > available)
            const sourceOrder = {
                'current-branch': 4,
                'assigned': 3,
                'review-queue': 2,
                'available': 1
            };
            const sourceDiff = sourceOrder[b.source] - sourceOrder[a.source];
            if (sourceDiff !== 0) return sourceDiff;

            // Tertiary sort: story ID (lower numbers first)
            const aId = parseFloat(a.storyId?.replace(/[^\d.]/g, '') || '999');
            const bId = parseFloat(b.storyId?.replace(/[^\d.]/g, '') || '999');
            return aId - bId;
        });
    }

    async findWork(preferences = {}) {
        try {
            const work = [];

            // 1. Check contextual work (current branch)
            const contextualWork = await this.getContextualWork();
            work.push(...contextualWork);

            // 2. Get my assigned tasks
            const myTasks = await this.getMyTasks();
            work.push(...myTasks.map(task => ({
                ...task,
                priority: task.status === 'needs-changes' ? 'high' : 'medium',
                source: 'assigned',
                context: task.status === 'needs-changes'
                    ? 'Review completed with changes needed'
                    : 'Task assigned to you'
            })));

            // 3. Get available work based on role
            if (this.role === 'Developer') {
                const availableStories = await this.getAvailableStories();
                work.push(...availableStories.map(story => ({
                    storyId: story.id,
                    description: story.title || `Story ${story.id}`,
                    status: 'available',
                    priority: 'low',
                    source: 'available',
                    context: `Available story in ${story.epicId ? `Epic ${story.epicId}` : 'project'}`,
                    epicId: story.epicId
                })));
            } else if (['Reviewer', 'QA', 'Architect', 'TechLead'].includes(this.role)) {
                const reviews = await this.getAvailableReviews();
                work.push(...reviews.map(review => ({
                    storyId: review.id,
                    description: review.title || `Review ${review.id}`,
                    status: 'ready-for-review',
                    priority: 'medium',
                    source: 'review-queue',
                    context: `Review requested by ${review.developer}`,
                    branchName: review.branch,
                    developer: review.developer
                })));
            }

            // Remove duplicates (same storyId)
            const uniqueWork = [];
            const seenStories = new Set();
            for (const item of work) {
                if (!seenStories.has(item.storyId)) {
                    seenStories.add(item.storyId);
                    uniqueWork.push(item);
                }
            }

            // Rank and return
            return this.rankWork(uniqueWork, preferences);
        } catch (error) {
            console.error('Error finding work:', error.message);
            return [];
        }
    }

    async presentWorkOptions(workItems, autoSelect = false) {
        if (workItems.length === 0) {
            console.log(`\n🎯 No work available for ${this.agentName} (${this.role}) in ${this.projectName}`);
            return null;
        }

        console.log(`\n🎯 Available Work for ${this.agentName} (${this.role}):`);
        console.log('=' .repeat(60));

        // Group by priority
        const highPriority = workItems.filter(w => w.priority === 'high');
        const mediumPriority = workItems.filter(w => w.priority === 'medium');
        const lowPriority = workItems.filter(w => w.priority === 'low');

        let optionNumber = 1;

        if (highPriority.length > 0) {
            console.log(`\n🔥 HIGH PRIORITY:`);
            highPriority.forEach(item => {
                console.log(`${optionNumber}. ${item.storyId}: ${item.description}`);
                console.log(`   └─ ${item.context}`);
                if (item.branchName) {
                    console.log(`   └─ Branch: ${item.branchName}`);
                }
                if (item.reviewFindings && item.reviewFindings.length > 0) {
                    console.log(`   └─ Findings: ${item.reviewFindings.map(f => `"${f}"`).join(', ')}`);
                }
                optionNumber++;
            });
        }

        if (mediumPriority.length > 0) {
            console.log(`\n📋 MEDIUM PRIORITY:`);
            mediumPriority.forEach(item => {
                console.log(`${optionNumber}. ${item.storyId}: ${item.description}`);
                console.log(`   └─ ${item.context}`);
                if (item.branchName) {
                    console.log(`   └─ Branch: ${item.branchName}`);
                }
                optionNumber++;
            });
        }

        if (lowPriority.length > 0) {
            console.log(`\n📝 AVAILABLE:`);
            lowPriority.forEach(item => {
                console.log(`${optionNumber}. ${item.storyId}: ${item.description}`);
                console.log(`   └─ ${item.context}`);
                if (item.epicId) {
                    console.log(`   └─ Epic: ${item.epicId}`);
                }
                optionNumber++;
            });
        }

        // Auto-select logic
        if (autoSelect) {
            // Auto-select high priority work if there's exactly one
            if (highPriority.length === 1) {
                console.log(`\n🎯 Auto-selecting high priority work: ${highPriority[0].storyId}`);
                return highPriority[0];
            }

            // Auto-select if there's contextual work (current branch)
            const contextualWork = workItems.find(w => w.source === 'current-branch');
            if (contextualWork) {
                console.log(`\n🎯 Auto-selecting contextual work: ${contextualWork.storyId}`);
                return contextualWork;
            }
        }

        console.log(`\n💡 Commands:`);
        console.log(`  aaf workflow claim-story <storyId>     # Claim and start work`);
        if (['Reviewer', 'QA', 'Architect', 'TechLead'].includes(this.role)) {
            console.log(`  aaf workflow claim-review <storyId>    # Claim review`);
        }
        console.log(`  aaf workflow find-work --auto-select   # Auto-select work`);

        return workItems;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('Disconnected from workflow orchestrator');
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const orchestrator = new WorkflowOrchestrator();

    try {
        switch (command) {
            case 'connect':
                const developerId = args[1] || process.env.USER || 'anonymous';
                const role = args[2] || 'Developer';
                const projectName = args[3] || path.basename(process.cwd());
                const agentName = args[4] || 'Agent';
                await orchestrator.connect(developerId, role, projectName, agentName);
                console.log('Workflow orchestrator connected. Press Ctrl+C to disconnect.');
                process.stdin.resume();
                break;

            case 'status-change':
                const storyId = args[1];
                const oldStatus = args[2];
                const newStatus = args[3];
                const notes = args[4] || '';
                if (!storyId || !oldStatus || !newStatus) {
                    console.error('Usage: aaf workflow status-change <storyId> <oldStatus> <newStatus> [notes]');
                    process.exit(1);
                }
                await orchestrator.connect(process.env.USER || 'anonymous');
                await orchestrator.publishStoryStatusChange(storyId, oldStatus, newStatus, null, notes);
                orchestrator.disconnect();
                break;

            case 'claim-review':
                const reviewStoryId = args[1];
                const reviewType = args[2] || 'code-review';
                if (!reviewStoryId) {
                    console.error('Usage: aaf workflow claim-review <storyId> [reviewType]');
                    process.exit(1);
                }
                await orchestrator.connect(process.env.USER || 'anonymous', 'Reviewer');
                await orchestrator.claimStoryForReview(reviewStoryId, reviewType);
                orchestrator.disconnect();
                break;

            case 'complete-review':
                const completeStoryId = args[1];
                const reviewStatus = args[2]; // approved, rejected, needs-changes
                const findings = args.slice(3);
                if (!completeStoryId || !reviewStatus) {
                    console.error('Usage: aaf workflow complete-review <storyId> <status> [finding1] [finding2]...');
                    process.exit(1);
                }
                await orchestrator.connect(process.env.USER || 'anonymous', 'Reviewer');
                await orchestrator.publishReviewComplete(completeStoryId, reviewStatus, findings);
                orchestrator.disconnect();
                break;

            case 'claim-story':
                const claimStoryId = args[1];
                const noWorktree = args.includes('--no-worktree');

                if (!claimStoryId) {
                    console.error('Usage: aaf workflow claim-story <storyId> [--no-worktree]');
                    process.exit(1);
                }

                await orchestrator.connect(process.env.USER || 'anonymous', 'Developer');

                console.log(`📝 Claiming story ${claimStoryId}...`);

                let worktree = null;
                if (!noWorktree) {
                    // Create worktree by default
                    worktree = await orchestrator.createWorktreeForStory(claimStoryId);
                }

                // Publish status change to claimed/in-progress
                const branchName = worktree ? worktree.branch : `feature/story-${claimStoryId.replace('.', '-')}`;
                await orchestrator.publishStoryStatusChange(claimStoryId, 'Available', 'In Progress', branchName, 'Story claimed and work started');

                console.log(`✅ Story ${claimStoryId} claimed and marked as In Progress`);

                if (worktree) {
                    console.log(`\n💡 Next steps:`);
                    console.log(`   cd ${worktree.path}`);
                    console.log(`   # Start working on story ${claimStoryId}`);
                    console.log(`   # Your branch: ${worktree.branch}`);
                } else {
                    console.log(`💡 Next step: git checkout -b feature/story-${claimStoryId.replace('.', '-')}`);
                }

                orchestrator.disconnect();
                break;

            case 'list-reviews':
                await orchestrator.connect(process.env.USER || 'anonymous', 'Reviewer');
                const reviews = await orchestrator.getAvailableReviews();
                console.log('Available Reviews:');
                reviews.forEach(story => {
                    console.log(`  - ${story.id}: ${story.title} (Branch: ${story.branch || 'unknown'})`);
                });
                orchestrator.disconnect();
                break;

            case 'my-tasks':
                const taskRole = args[1] || 'Developer';
                await orchestrator.connect(process.env.USER || 'anonymous', taskRole);
                const tasks = await orchestrator.getMyTasks();
                console.log(`My ${taskRole} Tasks:`);
                if (tasks.length === 0) {
                    console.log('  No tasks assigned');
                } else {
                    tasks.forEach(task => {
                        console.log(`  - ${task.storyId}: ${task.description} (Status: ${task.status})`);
                        if (task.branchName) {
                            console.log(`    Branch: ${task.branchName}`);
                        }
                        if (task.reviewFindings && task.reviewFindings.length > 0) {
                            console.log(`    Review Findings:`);
                            task.reviewFindings.forEach(finding => {
                                console.log(`      • ${finding}`);
                            });
                        }
                    });
                }
                orchestrator.disconnect();
                break;

            case 'find-work':
                const findRole = args[1] || 'Developer';
                const findProject = args[2] || path.basename(process.cwd());
                const autoSelect = args.includes('--auto-select') || args.includes('-a');

                await orchestrator.connect(process.env.USER || 'anonymous', findRole, findProject);

                console.log(`\n🔍 Finding work for ${orchestrator.agentName} (${findRole}) in ${findProject}...`);

                const availableWork = await orchestrator.findWork();
                const result = await orchestrator.presentWorkOptions(availableWork, autoSelect);

                if (autoSelect && result && typeof result === 'object' && result.storyId) {
                    console.log(`\n🎯 Selected: ${result.storyId} - ${result.description}`);
                    console.log(`📋 Action: ${result.action || 'Start working on this story'}`);

                    // Auto-setup workspace for available stories
                    if (result.source === 'available') {
                        console.log(`\n🚀 Auto-setting up workspace...`);

                        // Auto-claim the story with worktree
                        await orchestrator.publishStoryStatusChange(result.storyId, 'Available', 'In Progress', null, 'Story auto-claimed via find-work');

                        // Create worktree
                        const worktree = await orchestrator.createWorktreeForStory(result.storyId);

                        if (worktree) {
                            console.log(`✅ Workspace ready!`);
                            console.log(`\n💡 Next step: cd ${worktree.path}`);
                            console.log(`🌱 Your isolated workspace with branch: ${worktree.branch}`);

                            // Provide copy-paste command
                            console.log(`\n📋 Copy and run:`);
                            console.log(`   cd ${worktree.path}`);
                        }
                    } else if (result.source === 'current-branch') {
                        const worktreePath = orchestrator.getWorktreePath();
                        if (orchestrator.isInWorktree()) {
                            console.log(`💡 You're already in your worktree - continue working!`);
                        } else if (fs.existsSync(worktreePath)) {
                            console.log(`💡 Your worktree exists: cd ${worktreePath}`);
                        } else {
                            console.log(`💡 You're on branch: ${orchestrator.getCurrentBranch()}`);
                        }
                    } else if (result.source === 'review-queue') {
                        console.log(`💡 Next steps:`);
                        console.log(`  1. aaf workflow claim-review ${result.storyId}`);
                        console.log(`  2. git checkout ${result.branchName}`);
                    } else {
                        console.log(`💡 Continue working on ${result.storyId}`);
                    }
                }

                orchestrator.disconnect();
                break;

            case 'cleanup-workspace':
                await orchestrator.connect(process.env.USER || 'anonymous', 'Developer');

                console.log(`🧹 Cleaning up workspace...`);
                const cleaned = await orchestrator.cleanupWorktree();

                if (cleaned) {
                    console.log(`✅ Workspace cleaned up successfully`);
                } else {
                    console.log(`💡 No workspace to clean up`);
                }

                orchestrator.disconnect();
                break;

            case 'start-work':
                const startRole = args[1] || 'Developer';
                const startProject = args[2] || path.basename(process.cwd());

                console.log(`🚀 Starting work as ${startRole} in ${startProject}...`);

                await orchestrator.connect(process.env.USER || 'anonymous', startRole, startProject);

                // Find work automatically
                const workOptions = await orchestrator.findWork();
                const selectedWork = await orchestrator.presentWorkOptions(workOptions, true); // Auto-select

                if (selectedWork && selectedWork.storyId && selectedWork.source === 'available') {
                    // Auto-claim and setup workspace
                    console.log(`\n🎯 Auto-claiming: ${selectedWork.storyId}`);

                    const worktree = await orchestrator.createWorktreeForStory(selectedWork.storyId);
                    await orchestrator.publishStoryStatusChange(selectedWork.storyId, 'Available', 'In Progress', worktree?.branch, 'Auto-started work');

                    if (worktree) {
                        console.log(`\n✅ Ready to work!`);
                        console.log(`📁 Workspace: ${worktree.path}`);
                        console.log(`🌱 Branch: ${worktree.branch}`);
                        console.log(`\n🎬 To start working:`);
                        console.log(`   cd ${worktree.path}`);

                        // Try to change directory programmatically (for supported shells)
                        try {
                            console.log(`\n💡 Attempting to change directory...`);
                            process.chdir(worktree.path);
                            console.log(`✅ Changed to: ${process.cwd()}`);
                        } catch (error) {
                            console.log(`⚠️ Cannot auto-change directory. Please run: cd ${worktree.path}`);
                        }
                    }
                } else if (selectedWork) {
                    console.log(`\n💡 Work found but no auto-setup needed`);
                } else {
                    console.log(`\n📝 No work available right now`);
                }

                orchestrator.disconnect();
                break;

            case 'dashboard':
                const dashboardRole = args[1] || 'Developer';
                const dashboardProject = args[2] || path.basename(process.cwd());
                await orchestrator.connect(process.env.USER || 'anonymous', dashboardRole, dashboardProject);

                console.log(`\n📋 Workflow Dashboard - ${dashboardProject}`);
                console.log(`Agent: ${orchestrator.agentName} (${dashboardRole})`);
                console.log('=' .repeat(50));

                // Show my tasks
                const myTasks = await orchestrator.getMyTasks();
                console.log(`\n🎯 My Tasks (${myTasks.length}):`);
                if (myTasks.length === 0) {
                    console.log('  No tasks assigned');
                } else {
                    myTasks.forEach((task, index) => {
                        console.log(`  ${index + 1}. ${task.storyId}: ${task.description}`);
                        console.log(`     Status: ${task.status}`);
                        if (task.branchName) {
                            console.log(`     Branch: ${task.branchName}`);
                        }
                    });
                }

                // Show available reviews if reviewer
                if (['Reviewer', 'QA', 'Architect', 'TechLead'].includes(dashboardRole)) {
                    const availableReviews = await orchestrator.getAvailableReviews();
                    console.log(`\n🔍 Available Reviews (${availableReviews.length}):`);
                    if (availableReviews.length === 0) {
                        console.log('  No reviews pending');
                    } else {
                        availableReviews.forEach((review, index) => {
                            console.log(`  ${index + 1}. ${review.id}: ${review.title}`);
                            console.log(`     Developer: ${review.developer}`);
                            console.log(`     Branch: ${review.branch || 'unknown'}`);
                            console.log(`     Submitted: ${new Date(review.submittedAt).toLocaleString()}`);
                        });
                    }
                }

                console.log(`\n💡 Commands:`);
                console.log(`  aaf workflow my-tasks [role]`);
                console.log(`  aaf workflow list-reviews`);
                if (dashboardRole === 'Developer') {
                    console.log(`  aaf workflow status-change <story> <oldStatus> <newStatus>`);
                } else {
                    console.log(`  aaf workflow claim-review <story>`);
                    console.log(`  aaf workflow complete-review <story> <status> [findings...]`);
                }

                orchestrator.disconnect();
                break;

            default:
                console.log('AAF Method Workflow Orchestrator');
                console.log('Usage:');
                console.log('');
                console.log('Connection:');
                console.log('  connect [developerId] [role] [project] [agentName] - Connect to workflow system');
                console.log('');
                console.log('Dashboard:');
                console.log('  dashboard [role] [project]                          - Show workflow dashboard');
                console.log('');
                console.log('Status Management:');
                console.log('  status-change <storyId> <oldStatus> <newStatus> [notes] - Publish status change');
                console.log('');
                console.log('Review Workflow:');
                console.log('  claim-review <storyId> [reviewType]                 - Claim story for review');
                console.log('  complete-review <storyId> <status> [findings...]    - Complete review process');
                console.log('  list-reviews                                        - List available reviews');
                console.log('');
                console.log('Work Management:');
                console.log('  start-work [role] [project]                        - Auto-find work, claim story, setup worktree');
                console.log('  find-work [role] [project] [--auto-select]         - Find available work with smart prioritization');
                console.log('  claim-story <storyId> [--no-worktree]              - Claim story and create isolated workspace');
                console.log('  cleanup-workspace                                   - Remove current agent worktree');
                console.log('  my-tasks [role]                                     - Show my assigned tasks');
                console.log('');
                console.log('Status Values:');
                console.log('  - Draft → In Progress → Ready for Review → In Review');
                console.log('  - In Review → Approved|Needs Changes → Done');
                console.log('');
                console.log('Review Status:');
                console.log('  - approved: Review passed, story can proceed');
                console.log('  - needs-changes: Issues found, return to development');
                console.log('  - rejected: Major issues, story needs rework');
                console.log('');
                console.log('Examples:');
                console.log('  aaf workflow start-work Developer MyProject        # Complete auto-setup');
                console.log('  aaf workflow find-work Developer MyProject --auto-select');
                console.log('  aaf workflow claim-story 21.1                      # Creates ../AgentName-workspace/');
                console.log('  aaf workflow cleanup-workspace                      # Remove worktree when done');
                console.log('  aaf workflow dashboard Developer MyProject');
                console.log('  aaf workflow status-change 21.1 "In Progress" "Ready for Review"');
                console.log('  aaf workflow claim-review 21.1 code-review');
                console.log('  aaf workflow complete-review 21.1 needs-changes "Missing tests" "Code style issues"');
                console.log('');
                console.log('Worktree Isolation:');
                console.log('  - Each agent gets isolated workspace: ../AgentName-workspace/');
                console.log('  - No conflicts between agents working simultaneously');
                console.log('  - Shared Git history, separate working files');
                console.log('  - Automatic cleanup when switching stories');
                break;
        }
    } catch (error) {
        console.error('Workflow Error:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down workflow orchestrator...');
    process.exit(0);
});

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    await main();
}

export default WorkflowOrchestrator;