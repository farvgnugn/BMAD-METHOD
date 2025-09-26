#!/usr/bin/env node
/* <!-- Powered by BMAD™ Core --> */

/**
 * BMAD Test Coordination Server
 * Simple Socket.IO server for testing multi-developer coordination
 */

import { Server } from 'socket.io';
import { createServer } from 'node:http';

class BMadCoordinationServer {
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
        this.workflowSubscriptions = new Map(); // Track workflow subscribers per project
        this.reviewClaims = new Map(); // Track review claims: storyId -> reviewer info
        this.storyStatuses = new Map(); // Track story statuses: storyId -> status info

        this.setupHandlers();
        this.setupTestData();
    }

    setupTestData() {
        // Add some test stories
        this.stories.set('15.1', {
            id: '15.1',
            title: 'User Authentication System',
            status: 'Available',
            epicId: '15',
            claimedBy: null,
            claimedAt: null
        });

        this.stories.set('15.2', {
            id: '15.2',
            title: 'Password Reset Flow',
            status: 'Available',
            epicId: '15',
            claimedBy: null,
            claimedAt: null
        });

        this.stories.set('15.3', {
            id: '15.3',
            title: 'Role-Based Access Control',
            status: 'Available',
            epicId: '15',
            claimedBy: null,
            claimedAt: null
        });
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
                    const { storyId, developerId, timeout } = data;
                    // const epicId = data.epicId; // Currently unused
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
                    const { epicId } = data;
                    const availableStories = Array.from(this.stories.values())
                        .filter(story => {
                            const isAvailable = !story.claimedBy || story.status === 'Available';
                            const matchesEpic = !epicId || story.epicId === epicId;
                            return isAvailable && matchesEpic;
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
                        for (const [, projectAgents] of this.agentNames) {
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

            // Workflow orchestration handlers
            socket.on('subscribe-workflow', (data, callback) => {
                try {
                    const { projectName, role, agentName } = data;
                    const developer = this.developers.get(socket.id);

                    if (!developer) {
                        if (callback) callback({ success: false, error: 'Developer not registered' });
                        return;
                    }

                    // Initialize project workflow subscriptions
                    if (!this.workflowSubscriptions.has(projectName)) {
                        this.workflowSubscriptions.set(projectName, new Map());
                    }

                    const projectSubscriptions = this.workflowSubscriptions.get(projectName);
                    projectSubscriptions.set(socket.id, {
                        socketId: socket.id,
                        developerId: developer.id,
                        role: role,
                        agentName: agentName,
                        subscribedAt: new Date()
                    });

                    console.log(`Workflow subscription: ${agentName} (${role}) in ${projectName}`);

                    if (callback) callback({ success: true });
                } catch (error) {
                    if (callback) callback({ success: false, error: error.message });
                }
            });

            socket.on('publish-story-status-change', (data, callback) => {
                try {
                    const { storyId, projectName, oldStatus, newStatus, agentName, role, branchName, notes } = data;
                    // const developerId = data.developerId; // Currently unused

                    // Store story status
                    this.storyStatuses.set(storyId, {
                        storyId,
                        projectName,
                        currentStatus: newStatus,
                        previousStatus: oldStatus,
                        lastUpdatedBy: agentName,
                        lastUpdatedRole: role,
                        branchName: branchName,
                        lastUpdated: new Date(),
                        notes: notes
                    });

                    // Broadcast to project workflow subscribers
                    this.broadcastWorkflowEvent(projectName, 'story-status-changed', data);

                    // Send targeted notifications based on status
                    this.sendTargetedNotifications(projectName, data);

                    console.log(`Workflow: ${storyId} status ${oldStatus} → ${newStatus} by ${agentName}`);

                    if (callback) callback({ success: true });
                } catch (error) {
                    console.error('Workflow status change error:', error);
                    if (callback) callback({ success: false, error: error.message });
                }
            });

            socket.on('claim-story-review', (data, callback) => {
                try {
                    const { storyId, projectName, reviewerId, reviewerName, reviewType } = data;

                    // Check if already claimed for review
                    if (this.reviewClaims.has(storyId)) {
                        callback({
                            success: false,
                            error: `Story ${storyId} already claimed for review by ${this.reviewClaims.get(storyId).reviewerName}`
                        });
                        return;
                    }

                    // Claim for review
                    this.reviewClaims.set(storyId, {
                        storyId,
                        projectName,
                        reviewerId,
                        reviewerName,
                        reviewType,
                        claimedAt: new Date(),
                        socketId: socket.id
                    });

                    // Update story status
                    if (this.storyStatuses.has(storyId)) {
                        const story = this.storyStatuses.get(storyId);
                        story.currentStatus = 'In Review';
                        story.reviewerId = reviewerId;
                        story.reviewerName = reviewerName;
                    }

                    // Broadcast review claim
                    this.broadcastWorkflowEvent(projectName, 'story-status-changed', {
                        storyId,
                        projectName,
                        oldStatus: 'Ready for Review',
                        newStatus: 'In Review',
                        agentName: reviewerName,
                        role: 'Reviewer',
                        developerId: reviewerId,
                        notes: `Review claimed by ${reviewerName}`
                    });

                    console.log(`Review claimed: ${storyId} by ${reviewerName}`);
                    callback({ success: true });

                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            socket.on('publish-review-complete', (data, callback) => {
                try {
                    const { storyId, projectName, reviewerId, reviewerName, reviewStatus, findings, branchName } = data;

                    // Update story status based on review
                    let newStatus;
                    switch (reviewStatus) {
                        case 'approved':
                            newStatus = 'Approved';
                            break;
                        case 'needs-changes':
                            newStatus = 'Needs Changes';
                            break;
                        case 'rejected':
                            newStatus = 'Rejected';
                            break;
                        default:
                            newStatus = 'Review Complete';
                    }

                    // Release review claim
                    this.reviewClaims.delete(storyId);

                    // Update story status
                    if (this.storyStatuses.has(storyId)) {
                        const story = this.storyStatuses.get(storyId);
                        story.currentStatus = newStatus;
                        story.reviewStatus = reviewStatus;
                        story.reviewFindings = findings;
                        story.reviewCompletedBy = reviewerName;
                        story.reviewCompletedAt = new Date();
                    }

                    // Broadcast review completion
                    this.broadcastWorkflowEvent(projectName, 'review-completed', {
                        storyId,
                        projectName,
                        reviewerId,
                        reviewerName,
                        reviewStatus,
                        findings,
                        branchName,
                        timestamp: new Date().toISOString()
                    });

                    // Also broadcast as status change
                    this.broadcastWorkflowEvent(projectName, 'story-status-changed', {
                        storyId,
                        projectName,
                        oldStatus: 'In Review',
                        newStatus: newStatus,
                        agentName: reviewerName,
                        role: 'Reviewer',
                        developerId: reviewerId,
                        branchName: branchName,
                        notes: findings.length > 0 ? `Review findings: ${findings.join(', ')}` : 'Review completed'
                    });

                    console.log(`Review completed: ${storyId} - ${reviewStatus} by ${reviewerName}`);
                    callback({ success: true });

                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            socket.on('get-available-reviews', (data, callback) => {
                try {
                    const { projectName } = data;
                    // const reviewerRole = data.reviewerRole; // Currently unused

                    const availableReviews = [];
                    for (const [storyId, status] of this.storyStatuses) {
                        if (status.projectName === projectName &&
                            status.currentStatus === 'Ready for Review' &&
                            !this.reviewClaims.has(storyId)) {

                            availableReviews.push({
                                id: storyId,
                                title: this.stories.get(storyId)?.title || 'Unknown Story',
                                branch: status.branchName,
                                submittedBy: status.lastUpdatedBy,
                                submittedAt: status.lastUpdated
                            });
                        }
                    }

                    callback({ success: true, stories: availableReviews });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            socket.on('get-my-workflow-tasks', (data, callback) => {
                try {
                    const { projectName, role } = data;
                    // const agentName = data.agentName; // Currently unused
                    const tasks = [];

                    // Get tasks based on role
                    for (const [storyId, status] of this.storyStatuses) {
                        if (status.projectName !== projectName) continue;

                        if (role === 'Developer' && status.currentStatus === 'Needs Changes') {
                            tasks.push({
                                storyId,
                                description: 'Address review feedback and resubmit',
                                status: status.currentStatus,
                                branch: status.branchName,
                                priority: 'high'
                            });
                        } else if (['Reviewer', 'QA'].includes(role) && status.currentStatus === 'Ready for Review') {
                            tasks.push({
                                storyId,
                                description: 'Review code and provide feedback',
                                status: status.currentStatus,
                                branch: status.branchName,
                                priority: 'medium'
                            });
                        }
                    }

                    callback({ success: true, tasks });
                } catch (error) {
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

        for (const [, agentInfo] of projectAgents) {
            const socket = namespace.sockets.get(agentInfo.socketId);
            if (socket) {
                socket.emit(eventName, data);
            }
        }
    }

    broadcastWorkflowEvent(projectName, eventName, data) {
        const namespace = this.io.of('/dev-coordination');
        const projectSubscribers = this.workflowSubscriptions.get(projectName);

        if (!projectSubscribers) return;

        for (const [socketId] of projectSubscribers) {
            const socket = namespace.sockets.get(socketId);
            if (socket && socket.connected) {
                socket.emit(eventName, data);
            }
        }
    }

    sendTargetedNotifications(projectName, statusData) {
        const { storyId, newStatus, branchName } = statusData;
        // const oldStatus = statusData.oldStatus; // Currently unused
        const namespace = this.io.of('/dev-coordination');
        const projectSubscribers = this.workflowSubscriptions.get(projectName);

        if (!projectSubscribers) return;

        // Send targeted notifications based on status and role
        for (const [socketId, subscriber] of projectSubscribers) {
            const socket = namespace.sockets.get(socketId);
            if (!socket || !socket.connected) continue;

            let shouldNotify = false;
            let message = '';
            let action = '';

            switch (newStatus) {
                case 'Ready for Review':
                    if (['Reviewer', 'QA', 'Architect', 'TechLead'].includes(subscriber.role)) {
                        shouldNotify = true;
                        message = `Story ${storyId} is ready for review (Branch: ${branchName || 'unknown'})`;
                        action = `Use: aaf workflow claim-review ${storyId}`;
                    }
                    break;

                case 'Needs Changes':
                    if (subscriber.role === 'Developer') {
                        shouldNotify = true;
                        message = `Story ${storyId} needs changes and is available for development`;
                        action = `Use: aaf workflow claim-story ${storyId}`;
                    }
                    break;

                case 'Approved':
                    // Notify all team members of approval
                    shouldNotify = true;
                    message = `Story ${storyId} has been approved and is ready for deployment`;
                    break;
            }

            if (shouldNotify) {
                socket.emit('workflow-notification', {
                    storyId,
                    projectName,
                    message,
                    action,
                    timestamp: new Date().toISOString()
                });
            }
        }
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
            console.log(`BMAD Coordination Server running on port ${this.port}`);
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
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    const port = process.argv[2] || 54321;
    const server = new BMadCoordinationServer(port);

    server.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down server...');
        server.stop();
        throw new Error('Server shutdown requested');
    });
}

export default BMadCoordinationServer;