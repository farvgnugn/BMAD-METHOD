#!/usr/bin/env node
/* <!-- Powered by BMAD™ Core --> */

/**
 * BMAD Test Coordination Server
 * Simple Socket.IO server for testing multi-developer coordination
 */

const { Server } = require('socket.io');
const http = require('http');

class BMadCoordinationServer {
    constructor(port = 54321) {
        this.port = port;
        this.server = http.createServer();
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
                connectedAt: new Date()
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

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Developer ${developerId} disconnected`);
                this.developers.delete(socket.id);

                // Optional: Release all stories claimed by this developer
                // (in production, you might want a grace period)
            });
        });
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
if (require.main === module) {
    const port = process.argv[2] || 54321;
    const server = new BMadCoordinationServer(port);

    server.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down server...');
        server.stop();
        process.exit(0);
    });
}

module.exports = BMadCoordinationServer;