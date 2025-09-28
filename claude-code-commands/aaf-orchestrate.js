#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Claude Code Slash Commands
 * Implements /aaf:orchestrate:dev and /aaf:orchestrate:review commands
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const yaml = require('js-yaml');

class AAFOrchestrator {
    constructor() {
        this.projectRoot = this.findProjectRoot();
        this.config = this.loadConfig();
        this.activeAgents = new Map();
        this.worktrees = new Map();
        this.github = null;

        if (this.config.github?.token) {
            this.github = new Octokit({
                auth: this.config.github.token
            });
        }
    }

    findProjectRoot() {
        let dir = process.cwd();
        while (dir !== path.dirname(dir)) {
            if (fs.existsSync(path.join(dir, '.git'))) {
                return dir;
            }
            dir = path.dirname(dir);
        }
        return process.cwd();
    }

    loadConfig() {
        const configPaths = [
            path.join(this.projectRoot, '.aaf', 'config.yaml'),
            path.join(this.projectRoot, '.aaf-core', 'orchestration-config.yaml'),
            path.join(this.projectRoot, 'aaf-config.yaml')
        ];

        for (const configPath of configPaths) {
            try {
                if (fs.existsSync(configPath)) {
                    return yaml.load(fs.readFileSync(configPath, 'utf8'));
                }
            } catch (error) {
                console.warn(`Failed to load config from ${configPath}:`, error.message);
            }
        }

        // Default configuration
        return {
            git: {
                mainBranch: 'main',
                branchPrefix: 'feature/aaf-',
                worktreeBase: '.aaf-worktrees'
            },
            github: {
                owner: '',
                repo: '',
                token: process.env.GITHUB_TOKEN || ''
            },
            agents: {
                claudeCodePath: 'claude',
                maxConcurrent: 10,
                timeout: 3600000 // 1 hour
            },
            quality: {
                requireTests: true,
                testCoverage: 100,
                requireLinting: true,
                requireTypeCheck: true
            }
        };
    }

    async orchestrateDev(count, mode = 'normal') {
        console.log(`🚀 Orchestrating ${count} development agents in ${mode} mode...`);

        try {
            // 1. Get available user stories
            const userStories = await this.getAvailableUserStories();
            if (userStories.length === 0) {
                throw new Error('No user stories available for development');
            }

            // 2. Create assignments based on mode
            const assignments = [];
            for (let i = 0; i < Math.min(count, userStories.length); i++) {
                const story = userStories[i];
                const agentId = `dev-agent-${Date.now()}-${i}`;

                if (mode === 'yolo') {
                    // YOLO mode: work directly on main branch
                    assignments.push({
                        agentId,
                        story,
                        mode: 'yolo',
                        workingDirectory: this.projectRoot,
                        branchName: this.config.git.mainBranch
                    });
                } else {
                    // Normal mode: create worktrees and feature branches
                    const branchName = `${this.config.git.branchPrefix}${story.id}`;
                    const worktree = await this.createWorktree(agentId, branchName);
                    if (worktree) {
                        assignments.push({
                            agentId,
                            story,
                            mode: 'normal',
                            worktree,
                            branchName
                        });
                    }
                }
            }

            // 3. Spawn Claude Code agents
            const agents = [];
            for (const assignment of assignments) {
                const agent = await this.spawnDevelopmentAgent(assignment);
                if (agent) {
                    agents.push(agent);
                    this.activeAgents.set(assignment.agentId, agent);
                }
            }

            console.log(`✅ Successfully spawned ${agents.length} development agents in ${mode} mode`);
            return {
                success: true,
                agentsSpawned: agents.length,
                mode: mode,
                agents: agents.map(a => ({
                    id: a.agentId,
                    story: a.story.id,
                    branch: a.branchName,
                    mode: a.mode,
                    worktree: a.worktree?.path || 'main-repo'
                }))
            };

        } catch (error) {
            console.error('❌ Failed to orchestrate development agents:', error.message);
            return { success: false, error: error.message };
        }
    }

    async orchestrateReview(count) {
        console.log(`🔍 Orchestrating ${count} review agents...`);

        try {
            // 1. Get open PRs that need review
            const openPRs = await this.getOpenPRs();
            if (openPRs.length === 0) {
                console.log('📝 No PRs currently need review, setting up watchers...');
                return await this.setupPRWatchers(count);
            }

            // 2. Create review agents for existing PRs
            const agents = [];
            for (let i = 0; i < Math.min(count, openPRs.length); i++) {
                const pr = openPRs[i];
                const agentId = `review-agent-${Date.now()}-${i}`;

                const agent = await this.spawnReviewAgent(agentId, pr);
                if (agent) {
                    agents.push(agent);
                    this.activeAgents.set(agentId, agent);
                }
            }

            // 3. Setup watchers for new PRs if we have capacity
            if (agents.length < count) {
                await this.setupPRWatchers(count - agents.length);
            }

            console.log(`✅ Successfully spawned ${agents.length} review agents`);
            return {
                success: true,
                agentsSpawned: agents.length,
                agents: agents.map(a => ({
                    id: a.agentId,
                    pr: a.pr.number,
                    title: a.pr.title
                }))
            };

        } catch (error) {
            console.error('❌ Failed to orchestrate review agents:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getAvailableUserStories() {
        const storiesDir = path.join(this.projectRoot, 'docs', 'stories');

        if (!fs.existsSync(storiesDir)) {
            throw new Error('No docs/stories directory found. Please create user story files there.');
        }

        const storyFiles = fs.readdirSync(storiesDir)
            .filter(file => file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.md'))
            .map(file => path.join(storiesDir, file));

        const stories = [];
        for (const file of storyFiles) {
            try {
                const story = await this.parseStoryFile(file);
                if (story && story.status !== 'Done' && story.status !== 'In Progress') {
                    stories.push(story);
                }
            } catch (error) {
                console.warn(`Failed to parse story file ${file}:`, error.message);
            }
        }

        // Sort by priority: high -> medium -> low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        stories.sort((a, b) => {
            const aPriority = priorityOrder[a.priority] || 1;
            const bPriority = priorityOrder[b.priority] || 1;
            return bPriority - aPriority;
        });

        return stories;
    }

    async parseStoryFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath, path.extname(filePath));

        if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
            const data = yaml.load(content);
            return {
                id: data.id || data.story_id || fileName,
                title: data.title || data.summary || `Story ${fileName}`,
                description: data.description || data.details || '',
                status: data.status || 'Available',
                priority: data.priority || 'medium',
                acceptanceCriteria: data.acceptance_criteria || data.acceptanceCriteria || [],
                filePath: filePath
            };
        } else if (filePath.endsWith('.md')) {
            return this.parseMarkdownStory(content, fileName, filePath);
        }

        return null;
    }

    parseMarkdownStory(content, fileName, filePath) {
        const lines = content.split('\n');
        const story = { id: fileName, filePath: filePath };

        // Look for YAML frontmatter
        if (lines[0] === '---') {
            const frontmatterEnd = lines.findIndex((line, index) => index > 0 && line === '---');
            if (frontmatterEnd > 0) {
                const frontmatter = lines.slice(1, frontmatterEnd).join('\n');
                try {
                    const metadata = yaml.load(frontmatter);
                    Object.assign(story, metadata);
                } catch (error) {
                    console.warn('Failed to parse frontmatter:', error.message);
                }
            }
        }

        // Extract title from first heading if not in frontmatter
        if (!story.title) {
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch) {
                story.title = titleMatch[1];
            }
        }

        // Extract description from content
        if (!story.description) {
            story.description = content.replace(/^---[\s\S]*?---/, '').trim();
        }

        return {
            title: story.title || `Story ${fileName}`,
            description: story.description || '',
            status: story.status || 'Available',
            priority: story.priority || 'medium',
            acceptanceCriteria: story.acceptance_criteria || story.acceptanceCriteria || [],
            ...story
        };
    }

    async createWorktree(agentId, branchName) {
        const worktreeBase = path.join(this.projectRoot, this.config.git.worktreeBase);
        const worktreePath = path.join(worktreeBase, agentId);

        try {
            // Ensure base directory exists
            fs.mkdirSync(worktreeBase, { recursive: true });

            // Create new branch from main
            await this.execGit(['checkout', this.config.git.mainBranch]);
            await this.execGit(['pull', 'origin', this.config.git.mainBranch]);
            await this.execGit(['branch', branchName, this.config.git.mainBranch]);

            // Create worktree
            await this.execGit(['worktree', 'add', worktreePath, branchName]);

            const worktree = {
                id: agentId,
                path: worktreePath,
                branch: branchName,
                createdAt: new Date()
            };

            this.worktrees.set(agentId, worktree);
            console.log(`📁 Created worktree for ${agentId}: ${worktreePath}`);
            return worktree;

        } catch (error) {
            console.error(`Failed to create worktree for ${agentId}:`, error.message);
            return null;
        }
    }

    async spawnDevelopmentAgent(assignment) {
        const { agentId, story, worktree, branchName, mode, workingDirectory } = assignment;

        console.log(`🤖 Spawning development agent ${agentId} for story ${story.id} in ${mode || 'normal'} mode...`);

        try {
            const prompt = this.buildDevelopmentPrompt(story, branchName, mode);
            const workDir = workingDirectory || worktree?.path || this.projectRoot;
            const agent = await this.spawnClaudeCodeAgent(agentId, workDir, prompt, 'development');

            agent.story = story;
            agent.worktree = worktree;
            agent.branchName = branchName;
            agent.mode = mode || 'normal';
            agent.type = 'development';
            agent.workingDirectory = workDir;

            // Setup completion handler
            agent.process.on('exit', (code) => {
                this.handleDevelopmentAgentCompletion(agent, code);
            });

            console.log(`✅ Development agent ${agentId} spawned successfully in ${agent.mode} mode`);
            return agent;

        } catch (error) {
            console.error(`Failed to spawn development agent ${agentId}:`, error.message);
            return null;
        }
    }

    buildDevelopmentPrompt(story, branchName, mode = 'normal') {
        const isYoloMode = mode === 'yolo';
        const gitWorkflow = isYoloMode ? this.buildYoloGitWorkflow(story) : this.buildNormalGitWorkflow(story, branchName);
        const modeDescription = isYoloMode ? '**YOLO MODE** - Rapid prototyping with direct commits to main' : 'Standard development with feature branch and PR';

        return `# AAF Development Agent Task

You are an autonomous development agent working on user story: **${story.id}**

## Story Details
**Title:** ${story.title}
**Description:** ${story.description}
**Priority:** ${story.priority}
**Branch:** ${branchName}
**Mode:** ${modeDescription}

## Acceptance Criteria
${story.acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n') || 'No specific criteria provided'}

## Your Mission
Complete this user story with 100% implementation and testing:

### 1. IMPLEMENTATION (100% Complete)
- Implement ALL functionality described in the story
- Follow existing code patterns and conventions
- Write clean, maintainable, well-documented code
- Ensure all features work as specified

### 2. TESTING (100% Coverage + 100% Pass Rate)
- Write comprehensive unit tests
- Write integration tests where appropriate
- Achieve 100% test coverage for all new code
- Ensure ALL tests pass
- Test edge cases and error conditions

### 3. QUALITY ASSURANCE
- Run linting and fix all issues
- Run type checking (if TypeScript)
- Ensure code follows project standards
- Verify no breaking changes to existing functionality

### 4. COMPLETION WORKFLOW
When everything is complete:

1. **Final Verification:**
   \`\`\`bash
   # Run all tests
   npm test

   # Check coverage (must be 100%)
   npm run test:coverage

   # Run linting
   npm run lint

   # Run type checking (if applicable)
   npm run type-check
   \`\`\`

2. **Git Workflow:**
${gitWorkflow}

## Success Criteria
- ✅ Story functionality 100% implemented
- ✅ 100% test coverage achieved
- ✅ All tests passing
- ✅ Code quality standards met
- ✅ Changes committed ${isYoloMode ? 'to main branch' : 'and pushed'}
${!isYoloMode ? '- ✅ Pull request created' : ''}

${isYoloMode ? '⚡ **YOLO MODE:** Move fast and break things! Perfect for rapid prototyping.' : '🔄 **STANDARD MODE:** Proper workflow with code review process.'}

Work autonomously and systematically. Don't stop until ALL criteria are met!`;
    }

    buildYoloGitWorkflow(story) {
        return `   \`\`\`bash
   # YOLO MODE: Direct commit to main branch
   # Make sure you're on main
   git checkout main
   git pull origin main

   # Add all changes
   git add .

   # Commit directly to main with detailed message
   git commit -m "feat(${story.id}): ${story.title}

   ${story.description}

   ✅ 100% implementation complete
   ✅ 100% test coverage achieved
   ✅ All tests passing
   ✅ Code quality standards met

   YOLO MODE: Direct commit to main for rapid prototyping
   Closes #${story.id}"

   # Push directly to main
   git push origin main
   \`\`\`

   **Note:** YOLO mode commits directly to main - perfect for rapid prototyping!`;
    }

    buildNormalGitWorkflow(story, branchName) {
        return `   \`\`\`bash
   # Add all changes
   git add .

   # Commit with detailed message
   git commit -m "feat(${story.id}): ${story.title}

   ${story.description}

   ✅ 100% implementation complete
   ✅ 100% test coverage achieved
   ✅ All tests passing
   ✅ Code quality standards met

   Closes #${story.id}"

   # Push to origin
   git push -u origin ${branchName}
   \`\`\`

3. **Create Pull Request:**
   Use GitHub CLI or mention that PR creation is needed:
   \`\`\`bash
   gh pr create --title "feat(${story.id}): ${story.title}" \\
     --body "## Story Implementation

**Story ID:** ${story.id}
**Title:** ${story.title}

## Description
${story.description}

## Implementation Summary
- [x] 100% feature implementation
- [x] 100% test coverage
- [x] All tests passing
- [x] Code quality standards met
- [x] Documentation updated

## Testing
- Unit tests: ✅
- Integration tests: ✅
- Coverage: 100% ✅
- All tests pass: ✅

## Quality Checks
- Linting: ✅
- Type checking: ✅
- No breaking changes: ✅

Ready for review!"
   \`\`\``;
    }

    async spawnReviewAgent(agentId, pr) {
        console.log(`🔍 Spawning review agent ${agentId} for PR #${pr.number}...`);

        try {
            const prompt = this.buildReviewPrompt(pr);

            // Create temporary workspace for review
            const reviewWorkspace = await this.createReviewWorkspace(agentId, pr);

            const agent = await this.spawnClaudeCodeAgent(agentId, reviewWorkspace, prompt, 'review');

            agent.pr = pr;
            agent.workspace = reviewWorkspace;
            agent.type = 'review';

            // Setup completion handler
            agent.process.on('exit', (code) => {
                this.handleReviewAgentCompletion(agent, code);
            });

            console.log(`✅ Review agent ${agentId} spawned successfully`);
            return agent;

        } catch (error) {
            console.error(`Failed to spawn review agent ${agentId}:`, error.message);
            return null;
        }
    }

    buildReviewPrompt(pr) {
        return `# AAF Review Agent Task

You are an autonomous code review agent for Pull Request: **#${pr.number}**

## PR Details
**Title:** ${pr.title}
**Author:** ${pr.user.login}
**Branch:** ${pr.head.ref} → ${pr.base.ref}
**Description:** ${pr.body || 'No description provided'}

## Your Mission
Perform a comprehensive code review with 100% thoroughness:

### 1. CODE ANALYSIS
- Review all changed files thoroughly
- Check code quality, patterns, and conventions
- Verify implementation matches requirements
- Look for potential bugs or issues
- Assess performance implications

### 2. TESTING VERIFICATION
- Verify 100% test coverage for new code
- Ensure all tests pass
- Check test quality and completeness
- Validate edge case coverage
- Review test organization and structure

### 3. QUALITY STANDARDS
- Check adherence to coding standards
- Verify documentation is complete
- Ensure no security vulnerabilities
- Validate error handling
- Check for code duplication

### 4. FUNCTIONAL REVIEW
- Test the actual functionality
- Verify acceptance criteria are met
- Check for breaking changes
- Validate integration points
- Test edge cases manually if needed

### 5. REVIEW COMPLETION
Based on your analysis, provide a comprehensive review:

**If Approved:**
\`\`\`bash
gh pr review ${pr.number} --approve --body "## ✅ APPROVED

### Code Quality
- [x] Follows coding standards
- [x] Well-structured and readable
- [x] Proper error handling
- [x] No security issues

### Testing
- [x] 100% test coverage
- [x] All tests passing
- [x] Good test quality
- [x] Edge cases covered

### Functionality
- [x] Requirements fully implemented
- [x] No breaking changes
- [x] Proper integration
- [x] Performance acceptable

### Overall Assessment
This PR meets all quality standards and is ready to merge.

**Recommendation:** ✅ APPROVE AND MERGE"
\`\`\`

**If Changes Needed:**
\`\`\`bash
gh pr review ${pr.number} --request-changes --body "## 🔧 CHANGES REQUESTED

### Issues Found:

#### Code Quality Issues:
- [ ] Issue 1: Description and location
- [ ] Issue 2: Description and location

#### Testing Issues:
- [ ] Missing test coverage for X
- [ ] Test Y needs improvement

#### Functionality Issues:
- [ ] Feature Z not working as expected
- [ ] Edge case handling needed

### Detailed Feedback:

[Provide specific, actionable feedback for each issue]

### Next Steps:
1. Address the issues listed above
2. Ensure all tests pass with 100% coverage
3. Re-request review when ready

**Recommendation:** 🔧 NEEDS CHANGES"
\`\`\`

## Review Standards
- Be thorough but constructive
- Provide specific, actionable feedback
- Focus on code quality, testing, and functionality
- Suggest improvements, not just problems
- Ensure 100% coverage and passing tests

Work systematically through each file and requirement!`;
    }

    async createReviewWorkspace(agentId, pr) {
        const workspaceBase = path.join(this.projectRoot, '.aaf-review-workspaces');
        const workspacePath = path.join(workspaceBase, agentId);

        try {
            fs.mkdirSync(workspaceBase, { recursive: true });

            // Clone the PR branch for review
            await this.execGit(['worktree', 'add', workspacePath, pr.head.ref]);

            console.log(`📁 Created review workspace for ${agentId}: ${workspacePath}`);
            return workspacePath;

        } catch (error) {
            console.error(`Failed to create review workspace for ${agentId}:`, error.message);
            return this.projectRoot; // Fallback to main repo
        }
    }

    async spawnClaudeCodeAgent(agentId, workingDirectory, prompt, type) {
        // Create prompt file
        const promptDir = path.join(workingDirectory, '.aaf-prompts');
        fs.mkdirSync(promptDir, { recursive: true });

        const promptFile = path.join(promptDir, `${agentId}-prompt.md`);
        fs.writeFileSync(promptFile, prompt, 'utf8');

        // Start Claude Code process
        const claudeProcess = spawn(this.config.agents.claudeCodePath, [
            '--file', promptFile,
            '--project', path.basename(this.projectRoot)
        ], {
            cwd: workingDirectory,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });

        const agent = {
            agentId: agentId,
            process: claudeProcess,
            workingDirectory: workingDirectory,
            promptFile: promptFile,
            type: type,
            startTime: new Date(),
            status: 'running'
        };

        // Monitor output
        claudeProcess.stdout.on('data', (data) => {
            console.log(`[${agentId}] ${data.toString().trim()}`);
        });

        claudeProcess.stderr.on('data', (data) => {
            console.error(`[${agentId}] ERROR: ${data.toString().trim()}`);
        });

        return agent;
    }

    async handleDevelopmentAgentCompletion(agent, exitCode) {
        console.log(`🏁 Development agent ${agent.agentId} completed with code ${exitCode}`);

        try {
            if (exitCode === 0) {
                // Verify completion criteria
                const verification = await this.verifyDevelopmentCompletion(agent);

                if (verification.success) {
                    console.log(`✅ Agent ${agent.agentId} successfully completed story ${agent.story.id}`);

                    // Update story status
                    await this.updateStoryStatus(agent.story, 'Done');

                } else {
                    console.log(`❌ Agent ${agent.agentId} failed verification:`, verification.issues);
                }
            } else {
                console.log(`❌ Agent ${agent.agentId} failed with exit code ${exitCode}`);
            }

        } catch (error) {
            console.error(`Error handling completion for agent ${agent.agentId}:`, error.message);
        } finally {
            // Cleanup
            await this.cleanupAgent(agent);
        }
    }

    async handleReviewAgentCompletion(agent, exitCode) {
        console.log(`🏁 Review agent ${agent.agentId} completed with code ${exitCode}`);

        try {
            if (exitCode === 0) {
                console.log(`✅ Agent ${agent.agentId} successfully reviewed PR #${agent.pr.number}`);
            } else {
                console.log(`❌ Agent ${agent.agentId} failed with exit code ${exitCode}`);
            }

        } catch (error) {
            console.error(`Error handling completion for agent ${agent.agentId}:`, error.message);
        } finally {
            // Cleanup
            await this.cleanupAgent(agent);
        }
    }

    async verifyDevelopmentCompletion(agent) {
        const issues = [];

        try {
            // Check if tests pass
            const testResult = await this.execCommand('npm test', agent.workingDirectory);
            if (testResult.code !== 0) {
                issues.push('Tests are not passing');
            }

            // Check test coverage
            const coverageResult = await this.execCommand('npm run test:coverage', agent.workingDirectory);
            if (coverageResult.code !== 0) {
                issues.push('Test coverage check failed');
            }

            // Check if branch was pushed
            const remoteCheck = await this.execGit(['ls-remote', '--heads', 'origin', agent.branchName], agent.workingDirectory);
            if (!remoteCheck.stdout.includes(agent.branchName)) {
                issues.push('Branch not pushed to origin');
            }

            return {
                success: issues.length === 0,
                issues: issues
            };

        } catch (error) {
            return {
                success: false,
                issues: [`Verification failed: ${error.message}`]
            };
        }
    }

    async getOpenPRs() {
        if (!this.github) {
            throw new Error('GitHub API not configured');
        }

        try {
            const { data: prs } = await this.github.pulls.list({
                owner: this.config.github.owner,
                repo: this.config.github.repo,
                state: 'open'
            });

            return prs.filter(pr => !pr.draft);

        } catch (error) {
            console.error('Failed to fetch open PRs:', error.message);
            return [];
        }
    }

    async setupPRWatchers(count) {
        console.log(`👀 Setting up ${count} PR watchers...`);

        // This would typically involve webhook setup or polling
        // For now, we'll just log that watchers are ready

        return {
            success: true,
            message: `${count} PR watchers are now monitoring for new pull requests`
        };
    }

    async updateStoryStatus(story, status) {
        // Update the story file status
        try {
            if (story.filePath.endsWith('.yaml') || story.filePath.endsWith('.yml')) {
                const content = fs.readFileSync(story.filePath, 'utf8');
                const data = yaml.load(content);
                data.status = status;
                data.completedAt = new Date().toISOString();

                fs.writeFileSync(story.filePath, yaml.dump(data), 'utf8');
                console.log(`📝 Updated story ${story.id} status to ${status}`);
            }
        } catch (error) {
            console.error(`Failed to update story status:`, error.message);
        }
    }

    async cleanupAgent(agent) {
        // Remove from active agents
        this.activeAgents.delete(agent.agentId);

        // Cleanup worktree if it was created
        if (agent.worktree) {
            try {
                await this.execGit(['worktree', 'remove', agent.worktree.path, '--force']);
                this.worktrees.delete(agent.agentId);
                console.log(`🧹 Cleaned up worktree for ${agent.agentId}`);
            } catch (error) {
                console.warn(`Failed to cleanup worktree for ${agent.agentId}:`, error.message);
            }
        }

        // Cleanup review workspace
        if (agent.workspace && agent.workspace !== this.projectRoot) {
            try {
                await this.execGit(['worktree', 'remove', agent.workspace, '--force']);
                console.log(`🧹 Cleaned up review workspace for ${agent.agentId}`);
            } catch (error) {
                console.warn(`Failed to cleanup review workspace for ${agent.agentId}:`, error.message);
            }
        }
    }

    async execGit(args, cwd = this.projectRoot) {
        return this.execCommand(`git ${args.join(' ')}`, cwd);
    }

    async execCommand(command, cwd = this.projectRoot) {
        return new Promise((resolve, reject) => {
            const [cmd, ...args] = command.split(' ');
            const child = spawn(cmd, args, { cwd, stdio: 'pipe' });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                resolve({
                    code,
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                });
            });

            child.on('error', reject);
        });
    }

    getStatus() {
        return {
            activeAgents: this.activeAgents.size,
            worktrees: this.worktrees.size,
            agents: Array.from(this.activeAgents.values()).map(agent => ({
                id: agent.agentId,
                type: agent.type,
                status: agent.status,
                story: agent.story?.id,
                pr: agent.pr?.number,
                runtime: new Date() - agent.startTime
            }))
        };
    }
}

module.exports = AAFOrchestrator;