#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * GitHub Workflow Engine
 * Complete GitHub API automation for PR creation, review, and merge workflows
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const EventEmitter = require('events');

class GitHubWorkflowEngine extends EventEmitter {
    constructor(options = {}) {
        super();

        this.github = null;
        this.config = {
            owner: options.owner || process.env.GITHUB_OWNER,
            repo: options.repo || process.env.GITHUB_REPO,
            token: options.token || process.env.GITHUB_TOKEN,
            defaultBranch: options.defaultBranch || 'main'
        };

        this.workspaceRoot = options.workspaceRoot || process.cwd();
        this.prTemplates = this.loadPRTemplates();

        if (this.config.token) {
            this.github = new Octokit({
                auth: this.config.token,
                request: {
                    timeout: 30000,
                    retries: 3
                }
            });
            console.log(`🔗 GitHub API initialized for ${this.config.owner}/${this.config.repo}`);
        } else {
            console.warn('⚠️ GitHub token not provided, GitHub features will be disabled');
        }
    }

    loadPRTemplates() {
        const templatesDir = path.join(__dirname, '..', 'templates', 'github');

        return {
            feature: this.loadTemplate(path.join(templatesDir, 'feature-pr-template.md')),
            bugfix: this.loadTemplate(path.join(templatesDir, 'bugfix-pr-template.md')),
            review: this.loadTemplate(path.join(templatesDir, 'review-template.md'))
        };
    }

    loadTemplate(templatePath) {
        try {
            if (fs.existsSync(templatePath)) {
                return fs.readFileSync(templatePath, 'utf8');
            }
        } catch (error) {
            console.warn(`Failed to load template ${templatePath}:`, error.message);
        }

        // Return default template if file doesn't exist
        return this.getDefaultTemplate();
    }

    getDefaultTemplate() {
        return `## Summary
{{SUMMARY}}

## Story Details
**Story ID:** {{STORY_ID}}
**Title:** {{STORY_TITLE}}

## Description
{{DESCRIPTION}}

## Implementation Summary
{{IMPLEMENTATION_SUMMARY}}

## Testing
{{TESTING_DETAILS}}

## Quality Checks
{{QUALITY_CHECKS}}

## Additional Notes
{{ADDITIONAL_NOTES}}

---
*This PR was created by AAF Method autonomous agents*`;
    }

    async createPullRequest(options) {
        const {
            branchName,
            story,
            implementationDetails = {},
            testingDetails = {},
            qualityChecks = {}
        } = options;

        if (!this.github) {
            throw new Error('GitHub API not initialized - token required');
        }

        console.log(`📝 Creating pull request for branch: ${branchName}`);

        try {
            // 1. Verify branch exists and has commits
            await this.verifyBranch(branchName);

            // 2. Generate PR title and body
            const prTitle = this.generatePRTitle(story, implementationDetails);
            const prBody = this.generatePRBody(story, implementationDetails, testingDetails, qualityChecks);

            // 3. Create the pull request
            const { data: pr } = await this.github.pulls.create({
                owner: this.config.owner,
                repo: this.config.repo,
                title: prTitle,
                body: prBody,
                head: branchName,
                base: this.config.defaultBranch,
                draft: false
            });

            console.log(`✅ Pull request created: #${pr.number}`);

            // 4. Add labels if configured
            await this.addPRLabels(pr.number, story, implementationDetails);

            // 5. Request reviewers if configured
            await this.requestReviewers(pr.number, story);

            // 6. Add to project boards if configured
            await this.addToProjectBoard(pr.number, story);

            this.emit('pr-created', {
                pr,
                story,
                branchName
            });

            return {
                success: true,
                pr,
                url: pr.html_url,
                number: pr.number
            };

        } catch (error) {
            console.error(`❌ Failed to create pull request:`, error.message);
            this.emit('pr-creation-error', { branchName, story, error });

            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyBranch(branchName) {
        try {
            const { data: branch } = await this.github.repos.getBranch({
                owner: this.config.owner,
                repo: this.config.repo,
                branch: branchName
            });

            console.log(`✅ Branch verified: ${branchName} (${branch.commit.sha.substring(0, 7)})`);
            return branch;
        } catch (error) {
            if (error.status === 404) {
                throw new Error(`Branch '${branchName}' not found on remote repository`);
            }
            throw error;
        }
    }

    generatePRTitle(story, implementationDetails) {
        const type = this.determinePRType(story, implementationDetails);
        const scope = story.epic || story.id;

        return `${type}(${scope}): ${story.title}`;
    }

    determinePRType(story, implementationDetails) {
        if (story.type) return story.type;

        const title = (story.title || '').toLowerCase();
        const description = (story.description || '').toLowerCase();

        if (title.includes('fix') || title.includes('bug') || description.includes('fix')) {
            return 'fix';
        }

        if (title.includes('refactor') || description.includes('refactor')) {
            return 'refactor';
        }

        if (title.includes('doc') || description.includes('documentation')) {
            return 'docs';
        }

        if (title.includes('test') || description.includes('test')) {
            return 'test';
        }

        return 'feat';
    }

    generatePRBody(story, implementationDetails, testingDetails, qualityChecks) {
        const template = this.prTemplates.feature;

        // Extract implementation summary
        const implementationSummary = this.generateImplementationSummary(implementationDetails);

        // Extract testing details
        const testingSection = this.generateTestingSection(testingDetails);

        // Extract quality checks
        const qualitySection = this.generateQualitySection(qualityChecks);

        return template
            .replace('{{SUMMARY}}', this.generateSummary(story, implementationDetails))
            .replace('{{STORY_ID}}', story.id || 'N/A')
            .replace('{{STORY_TITLE}}', story.title || 'N/A')
            .replace('{{DESCRIPTION}}', story.description || 'No description provided')
            .replace('{{IMPLEMENTATION_SUMMARY}}', implementationSummary)
            .replace('{{TESTING_DETAILS}}', testingSection)
            .replace('{{QUALITY_CHECKS}}', qualitySection)
            .replace('{{ADDITIONAL_NOTES}}', this.generateAdditionalNotes(story, implementationDetails));
    }

    generateSummary(story, implementationDetails) {
        const changes = implementationDetails.filesChanged || [];
        const linesAdded = implementationDetails.linesAdded || 0;
        const linesDeleted = implementationDetails.linesDeleted || 0;

        return `This PR implements ${story.title}.

**Changes:** ${changes.length} files modified, +${linesAdded}/-${linesDeleted} lines
**Story Priority:** ${story.priority || 'medium'}
**Epic:** ${story.epic || 'N/A'}`;
    }

    generateImplementationSummary(implementationDetails) {
        const items = [
            '- [x] Feature implementation complete',
            '- [x] Code follows project conventions',
            '- [x] All acceptance criteria met'
        ];

        if (implementationDetails.filesChanged?.length > 0) {
            items.push(`- [x] Modified ${implementationDetails.filesChanged.length} files`);
        }

        if (implementationDetails.newFeatures?.length > 0) {
            items.push(...implementationDetails.newFeatures.map(feature => `- [x] Added: ${feature}`));
        }

        if (implementationDetails.improvements?.length > 0) {
            items.push(...implementationDetails.improvements.map(improvement => `- [x] Improved: ${improvement}`));
        }

        return items.join('\n');
    }

    generateTestingSection(testingDetails) {
        const items = [
            `- [x] Unit tests: ${testingDetails.unitTests ? '✅' : '❌'}`,
            `- [x] Integration tests: ${testingDetails.integrationTests ? '✅' : '❌'}`,
            `- [x] Test coverage: ${testingDetails.coverage || 0}%`,
            `- [x] All tests pass: ${testingDetails.allTestsPass ? '✅' : '❌'}`
        ];

        if (testingDetails.testFiles?.length > 0) {
            items.push(`- [x] Test files: ${testingDetails.testFiles.join(', ')}`);
        }

        if (testingDetails.manualTestingNotes) {
            items.push(`- [x] Manual testing: ${testingDetails.manualTestingNotes}`);
        }

        return items.join('\n');
    }

    generateQualitySection(qualityChecks) {
        const items = [
            `- [x] Linting: ${qualityChecks.linting ? '✅' : '❌'}`,
            `- [x] Type checking: ${qualityChecks.typeChecking ? '✅' : '❌'}`,
            `- [x] Security scan: ${qualityChecks.securityScan ? '✅' : '❌'}`,
            `- [x] Performance check: ${qualityChecks.performance ? '✅' : '❌'}`
        ];

        if (qualityChecks.codeQualityScore) {
            items.push(`- [x] Code quality score: ${qualityChecks.codeQualityScore}/100`);
        }

        return items.join('\n');
    }

    generateAdditionalNotes(story, implementationDetails) {
        const notes = [];

        if (story.acceptanceCriteria?.length > 0) {
            notes.push('### Acceptance Criteria Met:');
            story.acceptanceCriteria.forEach(criteria => {
                notes.push(`- [x] ${criteria}`);
            });
        }

        if (implementationDetails.breakingChanges?.length > 0) {
            notes.push('\n### ⚠️ Breaking Changes:');
            implementationDetails.breakingChanges.forEach(change => {
                notes.push(`- ${change}`);
            });
        }

        if (implementationDetails.migrations?.length > 0) {
            notes.push('\n### Database Migrations:');
            implementationDetails.migrations.forEach(migration => {
                notes.push(`- ${migration}`);
            });
        }

        return notes.join('\n');
    }

    async addPRLabels(prNumber, story, implementationDetails) {
        try {
            const labels = [];

            // Add story-based labels
            if (story.priority) {
                labels.push(`priority: ${story.priority}`);
            }

            if (story.epic) {
                labels.push(`epic: ${story.epic}`);
            }

            // Add type-based labels
            const prType = this.determinePRType(story, implementationDetails);
            labels.push(`type: ${prType}`);

            // Add size label based on changes
            const size = this.determinePRSize(implementationDetails);
            labels.push(`size: ${size}`);

            // Add status labels
            labels.push('status: ready-for-review');

            if (labels.length > 0) {
                await this.github.issues.addLabels({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    issue_number: prNumber,
                    labels: labels
                });
                console.log(`🏷️ Added labels: ${labels.join(', ')}`);
            }
        } catch (error) {
            console.warn('Failed to add PR labels:', error.message);
        }
    }

    determinePRSize(implementationDetails) {
        const linesChanged = (implementationDetails.linesAdded || 0) + (implementationDetails.linesDeleted || 0);
        const filesChanged = implementationDetails.filesChanged?.length || 0;

        if (linesChanged < 50 && filesChanged < 3) return 'small';
        if (linesChanged < 200 && filesChanged < 8) return 'medium';
        if (linesChanged < 500 && filesChanged < 15) return 'large';
        return 'extra-large';
    }

    async requestReviewers(prNumber, story) {
        try {
            const reviewers = this.determineReviewers(story);

            if (reviewers.users.length > 0 || reviewers.teams.length > 0) {
                await this.github.pulls.requestReviewers({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    pull_number: prNumber,
                    reviewers: reviewers.users,
                    team_reviewers: reviewers.teams
                });
                console.log(`👥 Requested reviewers: ${[...reviewers.users, ...reviewers.teams].join(', ')}`);
            }
        } catch (error) {
            console.warn('Failed to request reviewers:', error.message);
        }
    }

    determineReviewers(story) {
        // Default reviewer assignment logic
        const reviewers = { users: [], teams: [] };

        // Add reviewers based on story priority
        if (story.priority === 'high') {
            reviewers.teams.push('core-team');
        }

        // Add reviewers based on story type
        if (story.type === 'security' || story.title?.toLowerCase().includes('security')) {
            reviewers.teams.push('security-team');
        }

        // Add architecture review for large features
        if (story.epic && story.priority === 'high') {
            reviewers.users.push('tech-lead');
        }

        return reviewers;
    }

    async addToProjectBoard(prNumber, story) {
        try {
            // This would integrate with GitHub Projects API v2
            // Implementation depends on specific project board setup
            console.log(`📋 Would add PR #${prNumber} to project board for epic: ${story.epic}`);
        } catch (error) {
            console.warn('Failed to add to project board:', error.message);
        }
    }

    async reviewPullRequest(prNumber, reviewOptions) {
        const {
            event, // 'APPROVE', 'REQUEST_CHANGES', 'COMMENT'
            body,
            comments = [],
            dismissStaleReviews = false
        } = reviewOptions;

        if (!this.github) {
            throw new Error('GitHub API not initialized');
        }

        console.log(`🔍 Submitting review for PR #${prNumber}: ${event}`);

        try {
            // 1. Submit individual line comments first
            for (const comment of comments) {
                await this.addReviewComment(prNumber, comment);
            }

            // 2. Submit overall review
            const { data: review } = await this.github.pulls.createReview({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: prNumber,
                body: body,
                event: event
            });

            console.log(`✅ Review submitted: ${event}`);

            // 3. Update PR labels based on review
            await this.updatePRLabelsAfterReview(prNumber, event);

            this.emit('review-submitted', {
                prNumber,
                review,
                event
            });

            return {
                success: true,
                review,
                reviewId: review.id
            };

        } catch (error) {
            console.error(`❌ Failed to submit review:`, error.message);
            this.emit('review-error', { prNumber, error });

            return {
                success: false,
                error: error.message
            };
        }
    }

    async addReviewComment(prNumber, comment) {
        const {
            path,
            line,
            body,
            side = 'RIGHT' // RIGHT for new code, LEFT for old code
        } = comment;

        try {
            await this.github.pulls.createReviewComment({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: prNumber,
                path: path,
                line: line,
                side: side,
                body: body
            });

            console.log(`💬 Added review comment on ${path}:${line}`);
        } catch (error) {
            console.warn(`Failed to add review comment on ${path}:${line}:`, error.message);
        }
    }

    async updatePRLabelsAfterReview(prNumber, reviewEvent) {
        try {
            const labelsToRemove = ['status: ready-for-review'];
            const labelsToAdd = [];

            switch (reviewEvent) {
                case 'APPROVE':
                    labelsToAdd.push('status: approved');
                    break;
                case 'REQUEST_CHANGES':
                    labelsToAdd.push('status: changes-requested');
                    break;
                case 'COMMENT':
                    labelsToAdd.push('status: in-review');
                    break;
            }

            // Remove old status labels
            for (const label of labelsToRemove) {
                try {
                    await this.github.issues.removeLabel({
                        owner: this.config.owner,
                        repo: this.config.repo,
                        issue_number: prNumber,
                        name: label
                    });
                } catch (error) {
                    // Label might not exist, ignore
                }
            }

            // Add new status labels
            if (labelsToAdd.length > 0) {
                await this.github.issues.addLabels({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    issue_number: prNumber,
                    labels: labelsToAdd
                });
            }
        } catch (error) {
            console.warn('Failed to update PR labels after review:', error.message);
        }
    }

    async getOpenPRs(options = {}) {
        if (!this.github) {
            throw new Error('GitHub API not initialized');
        }

        const {
            state = 'open',
            sort = 'created',
            direction = 'desc',
            per_page = 30
        } = options;

        try {
            const { data: prs } = await this.github.pulls.list({
                owner: this.config.owner,
                repo: this.config.repo,
                state,
                sort,
                direction,
                per_page
            });

            console.log(`📋 Found ${prs.length} ${state} pull requests`);

            return prs.map(pr => ({
                number: pr.number,
                title: pr.title,
                user: pr.user.login,
                head: {
                    ref: pr.head.ref,
                    sha: pr.head.sha
                },
                base: {
                    ref: pr.base.ref
                },
                url: pr.html_url,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                draft: pr.draft,
                mergeable: pr.mergeable,
                mergeable_state: pr.mergeable_state,
                labels: pr.labels.map(label => label.name)
            }));

        } catch (error) {
            console.error('Failed to fetch open PRs:', error.message);
            throw error;
        }
    }

    async getPRDetails(prNumber) {
        if (!this.github) {
            throw new Error('GitHub API not initialized');
        }

        try {
            const { data: pr } = await this.github.pulls.get({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: prNumber
            });

            // Get PR files
            const { data: files } = await this.github.pulls.listFiles({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: prNumber
            });

            // Get PR reviews
            const { data: reviews } = await this.github.pulls.listReviews({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: prNumber
            });

            return {
                pr,
                files,
                reviews,
                filesChanged: files.length,
                linesAdded: files.reduce((sum, file) => sum + file.additions, 0),
                linesDeleted: files.reduce((sum, file) => sum + file.deletions, 0)
            };

        } catch (error) {
            console.error(`Failed to get PR #${prNumber} details:`, error.message);
            throw error;
        }
    }

    async mergePullRequest(prNumber, options = {}) {
        const {
            merge_method = 'squash', // 'merge', 'squash', 'rebase'
            commit_title,
            commit_message
        } = options;

        if (!this.github) {
            throw new Error('GitHub API not initialized');
        }

        console.log(`🔀 Merging PR #${prNumber} using ${merge_method}`);

        try {
            const { data: merge } = await this.github.pulls.merge({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: prNumber,
                merge_method,
                commit_title,
                commit_message
            });

            console.log(`✅ PR #${prNumber} merged successfully`);

            // Update labels
            await this.github.issues.addLabels({
                owner: this.config.owner,
                repo: this.config.repo,
                issue_number: prNumber,
                labels: ['status: merged']
            });

            this.emit('pr-merged', {
                prNumber,
                merge,
                sha: merge.sha
            });

            return {
                success: true,
                merge,
                sha: merge.sha
            };

        } catch (error) {
            console.error(`❌ Failed to merge PR #${prNumber}:`, error.message);
            this.emit('merge-error', { prNumber, error });

            return {
                success: false,
                error: error.message
            };
        }
    }

    async setupWebhooks(webhookUrl, events = ['pull_request', 'pull_request_review']) {
        if (!this.github) {
            throw new Error('GitHub API not initialized');
        }

        try {
            const { data: webhook } = await this.github.repos.createWebhook({
                owner: this.config.owner,
                repo: this.config.repo,
                config: {
                    url: webhookUrl,
                    content_type: 'json',
                    secret: process.env.GITHUB_WEBHOOK_SECRET || 'aaf-webhook-secret'
                },
                events: events,
                active: true
            });

            console.log(`🪝 Webhook created: ${webhook.id}`);
            return webhook;

        } catch (error) {
            console.error('Failed to create webhook:', error.message);
            throw error;
        }
    }
}

module.exports = GitHubWorkflowEngine;