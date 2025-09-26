#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * AAF Test Coordination Server
 * Simple Socket.IO server for testing multi-developer coordination
 */

import { Server } from 'socket.io';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

class AAFCoordinationServer {
    constructor(port = 54321) {
        this.port = port;
        this.server = createServer();
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        // In-memory storage (would be database in production)
        this.stories = new Map();
        this.developers = new Map();
        this.claims = new Map();
        this.agentNames = new Map(); // Track agent names per project: project -> Map<agentName, info>
        this.projects = new Map(); // Track active projects

        // Workflow orchestration storage
        this.workflowSubscriptions = new Map(); // Track workflow subscriptions per project
        this.pendingReviews = new Map(); // Track stories pending review
        this.reviewClaims = new Map(); // Track review claims

        this.setupHandlers();
        this.loadStoriesFromFiles();
        this.setupFileWatcher();
    }

    async loadStoriesFromFiles() {
        const projectPaths = [
            process.cwd(), // Current directory
            path.join(process.cwd(), '..'), // Parent directory
            path.join(__dirname, '..', '..', '..') // Relative to coordination server
        ];

        let storiesLoaded = 0;

        for (const projectPath of projectPaths) {
            const storiesDir = path.join(projectPath, 'docs', 'stories');

            if (fs.existsSync(storiesDir)) {
                console.log(`📁 Loading stories from: ${storiesDir}`);
                storiesLoaded += await this.loadStoriesFromDirectory(storiesDir, path.basename(projectPath));
                break; // Use first found stories directory
            }
        }

        if (storiesLoaded === 0) {
            console.log('📝 No stories found, loading test data...');
            this.setupTestData();
        } else {
            console.log(`✅ Loaded ${storiesLoaded} stories from files`);
        }
    }

    async loadStoriesFromDirectory(storiesDir, projectName) {
        let loadedCount = 0;

        try {
            const files = fs.readdirSync(storiesDir);
            const storyFiles = files.filter(file =>
                file.endsWith('.yaml') || file.endsWith('.yml') ||
                file.endsWith('.json') || file.endsWith('.md')
            );

            for (const file of storyFiles) {
                const filePath = path.join(storiesDir, file);
                try {
                    const story = await this.parseStoryFile(filePath, projectName);
                    if (story) {
                        this.stories.set(story.id, story);
                        loadedCount++;
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to parse story file ${file}:`, error.message);
                }
            }
        } catch (error) {
            console.error('Error reading stories directory:', error.message);
        }

        return loadedCount;
    }

    async parseStoryFile(filePath, projectName) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath, path.extname(filePath));

        try {
            let storyData;

            if (filePath.endsWith('.json')) {
                storyData = JSON.parse(fileContent);
            } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                storyData = yaml.load(fileContent);
            } else if (filePath.endsWith('.md')) {
                storyData = this.parseMarkdownStory(fileContent, fileName);
            }

            if (storyData) {
                return {
                    id: storyData.id || storyData.story_id || fileName,
                    title: storyData.title || storyData.summary || `Story ${fileName}`,
                    description: storyData.description || storyData.details || '',
                    status: storyData.status || 'Available',
                    epicId: storyData.epic_id || storyData.epicId || this.extractEpicFromId(storyData.id || fileName),
                    priority: storyData.priority || 'medium',
                    projectName: projectName,
                    claimedBy: null,
                    claimedAt: null,
                    filePath: filePath,
                    lastModified: fs.statSync(filePath).mtime
                };
            }
        } catch (error) {
            console.warn(`Failed to parse ${filePath}:`, error.message);
        }

        return null;
    }

    parseMarkdownStory(content, fileName) {
        // Parse markdown files for story information
        const lines = content.split('\n');
        const story = { id: fileName };

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

        // Extract ID from filename or content
        const idMatch = fileName.match(/(\d+[\.\-]\d+)/);
        if (idMatch) {
            story.id = idMatch[1].replace('-', '.');
        }

        return story;
    }

    extractEpicFromId(storyId) {
        // Extract epic ID from story ID like "21.1" -> "21"
        const match = storyId.match(/^(\d+)/);
        return match ? match[1] : null;
    }

    setupTestData() {
        // Fallback test data if no story files found
        console.log('📝 Setting up test data...');

        this.stories.set('15.1', {
            id: '15.1',
            title: 'User Authentication System',
            description: 'Implement user login and authentication',
            status: 'Available',
            epicId: '15',
            priority: 'high',
            projectName: 'TestProject',
            claimedBy: null,
            claimedAt: null
        });

        this.stories.set('15.2', {
            id: '15.2',
            title: 'Password Reset Flow',
            description: 'Add password reset functionality',
            status: 'Available',
            epicId: '15',
            priority: 'medium',
            projectName: 'TestProject',
            claimedBy: null,
            claimedAt: null
        });

        this.stories.set('15.3', {
            id: '15.3',
            title: 'Role-Based Access Control',
            description: 'Implement user roles and permissions',
            status: 'Available',
            epicId: '15',
            priority: 'medium',
            projectName: 'TestProject',
            claimedBy: null,
            claimedAt: null
        });
    }

    setupFileWatcher() {
        // Watch for changes in stories directories
        const projectPaths = [
            process.cwd(),
            path.join(process.cwd(), '..'),
            path.join(__dirname, '..', '..', '..')
        ];

        for (const projectPath of projectPaths) {
            const storiesDir = path.join(projectPath, 'docs', 'stories');

            if (fs.existsSync(storiesDir)) {
                console.log(`👀 Watching for story changes in: ${storiesDir}`);

                try {
                    fs.watch(storiesDir, { recursive: true }, (eventType, filename) => {
                        if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml') ||
                            filename.endsWith('.json') || filename.endsWith('.md'))) {
                            console.log(`📝 Story file changed: ${filename}`);

                            // Debounce file changes (wait 1 second before reloading)
                            clearTimeout(this.reloadTimeout);
                            this.reloadTimeout = setTimeout(() => {
                                this.reloadStoriesFromFiles();
                            }, 1000);
                        }
                    });
                } catch (error) {
                    console.warn('Could not set up file watcher:', error.message);
                }
                break; // Only watch the first found directory
            }
        }
    }

    async reloadStoriesFromFiles() {
        console.log('🔄 Reloading stories from files...');

        // Clear existing stories but preserve claimed status
        const claimedStories = new Map();
        for (const [id, story] of this.stories) {
            if (story.claimedBy) {
                claimedStories.set(id, {
                    claimedBy: story.claimedBy,
                    claimedAt: story.claimedAt,
                    status: story.status
                });
            }
        }

        // Reload stories from files
        this.stories.clear();
        await this.loadStoriesFromFiles();

        // Restore claimed status
        for (const [id, claimInfo] of claimedStories) {
            if (this.stories.has(id)) {
                const story = this.stories.get(id);
                story.claimedBy = claimInfo.claimedBy;
                story.claimedAt = claimInfo.claimedAt;
                story.status = claimInfo.status;
            }
        }

        // Broadcast update to connected agents
        const namespace = this.io.of('/dev-coordination');
        namespace.emit('stories-updated', {
            message: 'Story files have been updated',
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Stories reloaded, ${claimedStories.size} claimed stories preserved`);
    }

    setupHandlers() {
        const namespace = this.io.of('/dev-coordination');

        namespace.on('connection', (socket) => {
            const developerId = socket.handshake.auth.developerId || 'anonymous';
            console.log(`Developer ${developerId} connected`);

            // Register developer
            this.developers.set(socket.id, {
                id: developerId,
                socketId: socket.id,
                connectedAt: new Date(),
                agentName: null, // Will be set when agent name is claimed
                role: socket.handshake.auth.role || 'Unknown',
                currentProject: null // Track which project they're working on
            });

            // Claim story handler
            socket.on('claim-story', (data, callback) => {
                try {
                    const { storyId, epicId, developerId, timeout } = data;
                    const story = this.stories.get(storyId);

                    if (!story) {
                        callback({ success: false, error: 'Story not found' });
                        return;
                    }

                    if (story.claimedBy && story.claimedBy !== developerId) {
                        callback({
                            success: false,
                            error: `Story already claimed by ${story.claimedBy}`
                        });
                        return;
                    }

                    // Claim the story
                    story.claimedBy = developerId;
                    story.claimedAt = new Date();
                    story.status = 'Claimed';

                    // Set timeout for auto-release
                    if (timeout) {
                        setTimeout(() => {
                            if (story.claimedBy === developerId && story.status === 'Claimed') {
                                this.releaseStory(storyId, developerId, 'timeout');
                            }
                        }, timeout * 1000);
                    }

                    // Broadcast to all connected developers
                    namespace.emit('story-claimed', {
                        storyId,
                        developerId,
                        timestamp: story.claimedAt
                    });

                    console.log(`Story ${storyId} claimed by ${developerId}`);
                    callback({ success: true, story });

                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Release story handler
            socket.on('release-story', (data, callback) => {
                try {
                    const { storyId, developerId } = data;
                    const result = this.releaseStory(storyId, developerId, 'manual');
                    callback(result);
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Update story status handler
            socket.on('update-story-status', (data, callback) => {
                try {
                    const { storyId, developerId, status, progress, notes } = data;
                    const story = this.stories.get(storyId);

                    if (!story) {
                        callback({ success: false, error: 'Story not found' });
                        return;
                    }

                    if (story.claimedBy !== developerId) {
                        callback({
                            success: false,
                            error: 'Story not claimed by this developer'
                        });
                        return;
                    }

                    story.status = status;
                    story.progress = progress;
                    story.lastUpdate = new Date();

                    // Broadcast status update
                    namespace.emit('story-status-updated', {
                        storyId,
                        developerId,
                        status,
                        progress,
                        notes,
                        timestamp: story.lastUpdate
                    });

                    console.log(`Story ${storyId} status updated to ${status} (${progress}%) by ${developerId}`);
                    callback({ success: true, story });

                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Get available stories handler
            socket.on('get-available-stories', (data, callback) => {
                try {
                    const { epicId, projectName } = data;
                    const availableStories = Array.from(this.stories.values())
                        .filter(story => {
                            const isAvailable = !story.claimedBy || story.status === 'Available';
                            const matchesEpic = !epicId || story.epicId === epicId;
                            const matchesProject = !projectName || story.projectName === projectName;
                            return isAvailable && matchesEpic && matchesProject;
                        });

                    callback({ success: true, stories: availableStories });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Get epic progress handler
            socket.on('get-epic-progress', (data, callback) => {
                try {
                    const { epicId } = data;
                    const epicStories = Array.from(this.stories.values())
                        .filter(story => story.epicId === epicId);

                    const total = epicStories.length;
                    const completed = epicStories.filter(s => s.status === 'Done').length;
                    const inProgress = epicStories.filter(s => s.status === 'InProgress' || s.status === 'Claimed').length;
                    const available = epicStories.filter(s => s.status === 'Available').length;

                    callback({
                        success: true,
                        progress: {
                            epicId,
                            total,
                            completed,
                            inProgress,
                            available,
                            completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                            stories: epicStories
                        }
                    });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Check agent name availability
            socket.on('check-agent-name', (data, callback) => {
                try {
                    const { agentName, projectName } = data;

                    if (!projectName) {
                        callback({ success: false, error: 'Project name is required' });
                        return;
                    }

                    // Get or create project namespace
                    if (!this.agentNames.has(projectName)) {
                        this.agentNames.set(projectName, new Map());
                    }

                    const projectAgents = this.agentNames.get(projectName);
                    const isAvailable = !projectAgents.has(agentName);

                    callback({
                        success: true,
                        available: isAvailable,
                        agentName,
                        projectName
                    });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Claim agent name
            socket.on('claim-agent-name', (data, callback) => {
                try {
                    const { agentName, role, projectName } = data;
                    const developer = this.developers.get(socket.id);

                    if (!developer) {
                        callback({ success: false, error: 'Developer not registered' });
                        return;
                    }

                    if (!projectName) {
                        callback({ success: false, error: 'Project name is required' });
                        return;
                    }

                    // Get or create project namespace
                    if (!this.agentNames.has(projectName)) {
                        this.agentNames.set(projectName, new Map());
                    }
                    if (!this.projects.has(projectName)) {
                        this.projects.set(projectName, {
                            name: projectName,
                            createdAt: new Date(),
                            activeAgents: 0
                        });
                    }

                    const projectAgents = this.agentNames.get(projectName);

                    // Check if name is available in this project
                    if (projectAgents.has(agentName)) {
                        callback({
                            success: false,
                            error: `Agent name "${agentName}" is already taken in project "${projectName}"`
                        });
                        return;
                    }

                    // Release previous name if developer had one in any project
                    if (developer.agentName && developer.currentProject) {
                        const oldProjectAgents = this.agentNames.get(developer.currentProject);
                        if (oldProjectAgents) {
                            oldProjectAgents.delete(developer.agentName);
                            console.log(`Released previous agent name "${developer.agentName}" from project "${developer.currentProject}"`);
                        }
                    }

                    // Claim the new name in the project
                    projectAgents.set(agentName, {
                        socketId: socket.id,
                        developerId: developer.id,
                        role: role || developer.role,
                        projectName: projectName,
                        claimedAt: new Date()
                    });

                    // Update developer record
                    developer.agentName = agentName;
                    developer.role = role || developer.role;
                    developer.currentProject = projectName;

                    // Update project stats
                    const project = this.projects.get(projectName);
                    project.activeAgents = projectAgents.size;

                    // Broadcast agent name claimed (only to agents in the same project)
                    this.broadcastToProject(namespace, projectName, 'agent-name-claimed', {
                        agentName,
                        developerId: developer.id,
                        role: role || developer.role,
                        projectName: projectName
                    });

                    console.log(`Agent name "${agentName}" claimed by ${developer.id} (${role || developer.role}) in project "${projectName}"`);

                    callback({
                        success: true,
                        agentName,
                        projectName,
                        fullAgentName: `Agent ${agentName} (${role || developer.role})`
                    });

                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Get all active agents (optionally filtered by project)
            socket.on('get-active-agents', (data, callback) => {
                try {
                    const { projectName } = data || {};
                    let activeAgents = [];

                    if (projectName) {
                        // Get agents for specific project
                        const projectAgents = this.agentNames.get(projectName);
                        if (projectAgents) {
                            activeAgents = Array.from(projectAgents.entries()).map(([name, info]) => ({
                                agentName: name,
                                fullAgentName: `Agent ${name} (${info.role})`,
                                developerId: info.developerId,
                                role: info.role,
                                projectName: info.projectName,
                                claimedAt: info.claimedAt
                            }));
                        }
                    } else {
                        // Get all agents across all projects
                        for (const [project, projectAgents] of this.agentNames) {
                            for (const [name, info] of projectAgents) {
                                activeAgents.push({
                                    agentName: name,
                                    fullAgentName: `Agent ${name} (${info.role})`,
                                    developerId: info.developerId,
                                    role: info.role,
                                    projectName: info.projectName,
                                    claimedAt: info.claimedAt
                                });
                            }
                        }
                    }

                    callback({
                        success: true,
                        agents: activeAgents,
                        projectName: projectName || 'All Projects'
                    });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Get active projects
            socket.on('get-active-projects', (data, callback) => {
                try {
                    const projects = Array.from(this.projects.entries()).map(([name, info]) => ({
                        name: name,
                        activeAgents: this.agentNames.get(name)?.size || 0,
                        createdAt: info.createdAt
                    }));

                    callback({
                        success: true,
                        projects: projects
                    });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // === WORKFLOW ORCHESTRATION HANDLERS ===

            // Subscribe to workflow events for a project
            socket.on('subscribe-workflow', (data, callback) => {
                try {
                    const { projectName, role, agentName } = data;
                    const developer = this.developers.get(socket.id);

                    if (!developer) {
                        callback && callback({ success: false, error: 'Developer not registered' });
                        return;
                    }

                    if (!projectName) {
                        callback && callback({ success: false, error: 'Project name is required' });
                        return;
                    }

                    // Initialize project workflow subscriptions if needed
                    if (!this.workflowSubscriptions.has(projectName)) {
                        this.workflowSubscriptions.set(projectName, new Map());
                    }

                    const projectSubs = this.workflowSubscriptions.get(projectName);
                    projectSubs.set(socket.id, {
                        socketId: socket.id,
                        developerId: developer.id,
                        agentName: agentName || developer.agentName,
                        role: role || developer.role,
                        subscribedAt: new Date()
                    });

                    console.log(`Agent ${agentName || developer.agentName} (${role || developer.role}) subscribed to workflow events for project ${projectName}`);

                    if (callback) {
                        callback({
                            success: true,
                            message: `Subscribed to workflow events for ${projectName}`
                        });
                    }
                } catch (error) {
                    console.error('Error in subscribe-workflow:', error);
                    callback && callback({ success: false, error: error.message });
                }
            });

            // Publish story status change
            socket.on('publish-story-status-change', (data, callback) => {
                try {
                    const { storyId, projectName, oldStatus, newStatus, agentName, role, developerId, branchName, notes, timestamp } = data;

                    if (!storyId || !projectName || !newStatus) {
                        callback({ success: false, error: 'Missing required fields: storyId, projectName, newStatus' });
                        return;
                    }

                    // Store the status change
                    const changeRecord = {
                        storyId,
                        projectName,
                        oldStatus,
                        newStatus,
                        agentName,
                        role,
                        developerId,
                        branchName,
                        notes,
                        timestamp: timestamp || new Date().toISOString()
                    };

                    console.log(`📢 Workflow: ${storyId} ${oldStatus || 'Unknown'} → ${newStatus} by ${agentName} (${role})`);

                    // Broadcast to project workflow subscribers
                    this.broadcastWorkflowEvent(projectName, 'story-status-changed', changeRecord);

                    // Send targeted notifications based on status
                    this.sendTargetedNotifications(projectName, changeRecord);

                    // Handle specific status transitions
                    if (newStatus === 'Ready for Review') {
                        this.pendingReviews.set(storyId, {
                            storyId,
                            projectName,
                            developerId,
                            agentName,
                            branchName,
                            submittedAt: new Date().toISOString(),
                            status: 'pending'
                        });

                        // Notify reviewers
                        this.notifyReviewers(projectName, {
                            storyId,
                            branchName,
                            agentName,
                            role,
                            developerId
                        });
                    }

                    callback({ success: true, message: 'Status change published' });
                } catch (error) {
                    console.error('Error publishing status change:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Claim story for review
            socket.on('claim-story-review', (data, callback) => {
                try {
                    const { storyId, projectName, reviewerId, reviewerName, reviewType, timestamp } = data;

                    if (!storyId || !projectName || !reviewerId) {
                        callback({ success: false, error: 'Missing required fields: storyId, projectName, reviewerId' });
                        return;
                    }

                    // Check if story is available for review
                    const pendingReview = this.pendingReviews.get(storyId);
                    if (!pendingReview) {
                        callback({ success: false, error: 'Story not found or not ready for review' });
                        return;
                    }

                    if (pendingReview.status !== 'pending') {
                        callback({ success: false, error: `Story already ${pendingReview.status}` });
                        return;
                    }

                    // Claim the review
                    pendingReview.status = 'claimed';
                    pendingReview.reviewerId = reviewerId;
                    pendingReview.reviewerName = reviewerName;
                    pendingReview.reviewType = reviewType || 'code-review';
                    pendingReview.claimedAt = timestamp || new Date().toISOString();

                    this.reviewClaims.set(storyId, pendingReview);

                    console.log(`🔍 Review claimed: ${storyId} by ${reviewerName} (${reviewType || 'code-review'})`);

                    // Broadcast review claimed
                    this.broadcastWorkflowEvent(projectName, 'review-requested', {
                        storyId,
                        projectName,
                        reviewerId,
                        reviewerName,
                        reviewType: reviewType || 'code-review',
                        branchName: pendingReview.branchName,
                        originalDeveloper: pendingReview.agentName,
                        timestamp: pendingReview.claimedAt
                    });

                    // Notify original developer
                    this.notifyDeveloper(projectName, pendingReview.developerId, {
                        type: 'review-claimed',
                        storyId,
                        reviewerName,
                        reviewType: reviewType || 'code-review'
                    });

                    callback({ success: true, review: pendingReview });
                } catch (error) {
                    console.error('Error claiming review:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Complete review
            socket.on('publish-review-complete', (data, callback) => {
                try {
                    const { storyId, projectName, reviewerId, reviewerName, reviewStatus, findings, branchName, timestamp } = data;

                    if (!storyId || !projectName || !reviewerId || !reviewStatus) {
                        callback({ success: false, error: 'Missing required fields: storyId, projectName, reviewerId, reviewStatus' });
                        return;
                    }

                    // Validate review status
                    const validStatuses = ['approved', 'rejected', 'needs-changes'];
                    if (!validStatuses.includes(reviewStatus)) {
                        callback({ success: false, error: `Invalid review status. Must be one of: ${validStatuses.join(', ')}` });
                        return;
                    }

                    // Get the review claim
                    const reviewClaim = this.reviewClaims.get(storyId);
                    if (!reviewClaim || reviewClaim.reviewerId !== reviewerId) {
                        callback({ success: false, error: 'Review not found or not claimed by this reviewer' });
                        return;
                    }

                    // Update review status
                    reviewClaim.status = 'completed';
                    reviewClaim.reviewStatus = reviewStatus;
                    reviewClaim.findings = findings || [];
                    reviewClaim.completedAt = timestamp || new Date().toISOString();

                    console.log(`📋 Review completed: ${storyId} - ${reviewStatus} by ${reviewerName}`);

                    // Broadcast review completion
                    const completionData = {
                        storyId,
                        projectName,
                        reviewerId,
                        reviewerName,
                        reviewStatus,
                        findings: findings || [],
                        branchName: branchName || reviewClaim.branchName,
                        originalDeveloper: reviewClaim.agentName,
                        originalDeveloperId: reviewClaim.developerId,
                        timestamp: reviewClaim.completedAt
                    };

                    this.broadcastWorkflowEvent(projectName, 'review-completed', completionData);

                    // Notify original developer
                    this.notifyDeveloper(projectName, reviewClaim.developerId, {
                        type: 'review-completed',
                        storyId,
                        reviewStatus,
                        reviewerName,
                        findings: findings || []
                    });

                    // Clean up if approved, otherwise return to development
                    if (reviewStatus === 'approved') {
                        this.pendingReviews.delete(storyId);
                        this.reviewClaims.delete(storyId);
                    } else {
                        // Return to development queue
                        this.pendingReviews.delete(storyId);
                        this.reviewClaims.delete(storyId);
                    }

                    callback({ success: true, review: reviewClaim });
                } catch (error) {
                    console.error('Error completing review:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Get available reviews for a reviewer
            socket.on('get-available-reviews', (data, callback) => {
                try {
                    const { projectName, reviewerRole } = data;

                    if (!projectName) {
                        callback({ success: false, error: 'Project name is required' });
                        return;
                    }

                    // Get pending reviews for the project
                    const availableReviews = [];
                    for (const [storyId, review] of this.pendingReviews) {
                        if (review.projectName === projectName && review.status === 'pending') {
                            availableReviews.push({
                                id: storyId,
                                title: `Story ${storyId}`, // In production, you'd have actual story titles
                                branch: review.branchName,
                                developer: review.agentName,
                                submittedAt: review.submittedAt
                            });
                        }
                    }

                    callback({ success: true, stories: availableReviews });
                } catch (error) {
                    console.error('Error getting available reviews:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Get workflow tasks for an agent
            socket.on('get-my-workflow-tasks', (data, callback) => {
                try {
                    const { projectName, agentName, role } = data;
                    const developer = this.developers.get(socket.id);

                    if (!developer) {
                        callback({ success: false, error: 'Developer not registered' });
                        return;
                    }

                    const tasks = [];

                    // For developers: show stories needing changes
                    if (role === 'Developer') {
                        // Check for completed reviews that need changes
                        for (const [storyId, review] of this.reviewClaims) {
                            if (review.projectName === projectName &&
                                review.developerId === developer.id &&
                                review.status === 'completed' &&
                                review.reviewStatus === 'needs-changes') {
                                tasks.push({
                                    storyId,
                                    description: `Address review findings for ${storyId}`,
                                    status: 'needs-changes',
                                    reviewFindings: review.findings
                                });
                            }
                        }
                    }

                    // For reviewers: show available reviews
                    if (['Reviewer', 'QA', 'Architect', 'TechLead'].includes(role)) {
                        for (const [storyId, review] of this.pendingReviews) {
                            if (review.projectName === projectName && review.status === 'pending') {
                                tasks.push({
                                    storyId,
                                    description: `Review ${storyId} from ${review.agentName}`,
                                    status: 'ready-for-review',
                                    branchName: review.branchName
                                });
                            }
                        }
                    }

                    callback({ success: true, tasks });
                } catch (error) {
                    console.error('Error getting workflow tasks:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const developer = this.developers.get(socket.id);
                console.log(`Developer ${developerId} disconnected`);

                // Release agent name if one was claimed
                if (developer && developer.agentName && developer.currentProject) {
                    const projectAgents = this.agentNames.get(developer.currentProject);
                    if (projectAgents) {
                        projectAgents.delete(developer.agentName);
                        console.log(`Released agent name "${developer.agentName}" from project "${developer.currentProject}"`);

                        // Update project stats
                        const project = this.projects.get(developer.currentProject);
                        if (project) {
                            project.activeAgents = projectAgents.size;
                        }

                        // Broadcast agent name released to project members
                        this.broadcastToProject(namespace, developer.currentProject, 'agent-name-released', {
                            agentName: developer.agentName,
                            developerId: developer.id,
                            role: developer.role,
                            projectName: developer.currentProject
                        });
                    }
                }

                this.developers.delete(socket.id);

                // Optional: Release all stories claimed by this developer
                // (in production, you might want a grace period)
            });
        });
    }

    broadcastToProject(namespace, projectName, eventName, data) {
        // Find all developers in the specified project and broadcast to them
        const projectAgents = this.agentNames.get(projectName);
        if (!projectAgents) return;

        for (const [agentName, agentInfo] of projectAgents) {
            const socket = namespace.sockets.get(agentInfo.socketId);
            if (socket) {
                socket.emit(eventName, data);
            }
        }
    }

    broadcastWorkflowEvent(projectName, eventName, data) {
        // Broadcast workflow events to subscribed agents in the project
        const projectSubs = this.workflowSubscriptions.get(projectName);
        if (!projectSubs) return;

        const namespace = this.io.of('/dev-coordination');
        let sentCount = 0;

        for (const [socketId, subscription] of projectSubs) {
            const socket = namespace.sockets.get(socketId);
            if (socket) {
                socket.emit(eventName, data);
                sentCount++;
            }
        }

        if (sentCount > 0) {
            console.log(`📡 Broadcast ${eventName} to ${sentCount} agents in project ${projectName}`);
        }
    }

    sendTargetedNotifications(projectName, changeRecord) {
        // Send role-specific notifications based on status changes
        const { storyId, newStatus, oldStatus, agentName, branchName } = changeRecord;

        switch (newStatus) {
            case 'Ready for Review':
                this.sendWorkflowNotification(projectName, ['Reviewer', 'QA', 'Architect', 'TechLead'], {
                    message: `Story ${storyId} is ready for review`,
                    action: `Use: aaf workflow claim-review ${storyId}`,
                    storyId,
                    branchName,
                    developer: agentName
                });
                break;

            case 'In Review':
                this.sendWorkflowNotification(projectName, ['Developer'], {
                    message: `Your story ${storyId} is being reviewed`,
                    storyId,
                    branchName
                }, changeRecord.developerId);
                break;

            case 'Needs Changes':
                this.sendWorkflowNotification(projectName, ['Developer'], {
                    message: `Story ${storyId} needs changes - available for development`,
                    action: `Use: aaf workflow claim-story ${storyId}`,
                    storyId,
                    branchName
                });
                break;

            case 'Approved':
                this.sendWorkflowNotification(projectName, ['Developer'], {
                    message: `Your story ${storyId} has been approved!`,
                    storyId,
                    branchName
                }, changeRecord.developerId);
                break;

            case 'Done':
                this.sendWorkflowNotification(projectName, 'all', {
                    message: `Story ${storyId} is complete!`,
                    storyId
                });
                break;
        }
    }

    sendWorkflowNotification(projectName, targetRoles, notificationData, specificDeveloperId = null) {
        // Send notification to specific roles or developers
        const projectSubs = this.workflowSubscriptions.get(projectName);
        if (!projectSubs) return;

        const namespace = this.io.of('/dev-coordination');
        let sentCount = 0;

        for (const [socketId, subscription] of projectSubs) {
            let shouldSend = false;

            if (specificDeveloperId) {
                // Send to specific developer
                shouldSend = subscription.developerId === specificDeveloperId;
            } else if (targetRoles === 'all') {
                // Send to all subscribers
                shouldSend = true;
            } else if (Array.isArray(targetRoles)) {
                // Send to specific roles
                shouldSend = targetRoles.includes(subscription.role);
            }

            if (shouldSend) {
                const socket = namespace.sockets.get(socketId);
                if (socket) {
                    socket.emit('workflow-notification', {
                        ...notificationData,
                        projectName
                    });
                    sentCount++;
                }
            }
        }

        if (sentCount > 0) {
            console.log(`🔔 Sent workflow notification to ${sentCount} agents: ${notificationData.message}`);
        }
    }

    notifyReviewers(projectName, storyInfo) {
        // Notify reviewers of new review request
        this.sendWorkflowNotification(projectName, ['Reviewer', 'QA', 'Architect', 'TechLead'], {
            message: `New review request: Story ${storyInfo.storyId} from ${storyInfo.agentName}`,
            action: `Use: aaf workflow claim-review ${storyInfo.storyId}`,
            storyId: storyInfo.storyId,
            branchName: storyInfo.branchName,
            developer: storyInfo.agentName
        });

        // Also broadcast as review-requested event
        this.broadcastWorkflowEvent(projectName, 'review-requested', storyInfo);
    }

    notifyDeveloper(projectName, developerId, notificationData) {
        // Send notification to a specific developer
        this.sendWorkflowNotification(projectName, null, notificationData, developerId);
    }

    releaseStory(storyId, developerId, reason = 'manual') {
        const story = this.stories.get(storyId);

        if (!story) {
            return { success: false, error: 'Story not found' };
        }

        if (story.claimedBy !== developerId) {
            return {
                success: false,
                error: 'Story not claimed by this developer'
            };
        }

        story.claimedBy = null;
        story.claimedAt = null;
        story.status = story.status === 'Review' ? 'Review' : 'Available';
        story.releasedAt = new Date();

        // Broadcast release
        this.io.of('/dev-coordination').emit('story-released', {
            storyId,
            developerId,
            reason,
            timestamp: story.releasedAt
        });

        console.log(`Story ${storyId} released by ${developerId} (${reason})`);
        return { success: true, story };
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`AAF Coordination Server running on port ${this.port}`);
            console.log(`Socket.IO endpoint: http://localhost:${this.port}/dev-coordination`);
            console.log('\nTest stories available:');
            this.stories.forEach(story => {
                console.log(`  - ${story.id}: ${story.title} (${story.status})`);
            });
            console.log('\nReady for developer connections...');
        });
    }

    stop() {
        this.server.close();
        console.log('Coordination server stopped');
    }
}

// CLI usage
if (require.main === module) {
    const port = process.argv[2] || 54321;
    const server = new AAFCoordinationServer(port);

    server.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down server...');
        server.stop();
        process.exit(0);
    });
}

module.exports = AAFCoordinationServer;