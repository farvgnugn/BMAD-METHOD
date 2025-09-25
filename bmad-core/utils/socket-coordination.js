#!/usr/bin/env node
/* <!-- Powered by BMAD™ Core --> */

/**
 * BMAD Socket.IO Coordination Client
 * Handles real-time developer coordination for story management
 */

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class BMadCoordination {
    constructor() {
        this.socket = null;
        this.config = null;
        this.developerId = null;
        this.loadConfig();
    }

    loadConfig() {
        try {
            const configPath = path.join(process.cwd(), '.bmad-core', 'core-config.yaml');
            const configFile = fs.readFileSync(configPath, 'utf8');
            this.config = yaml.load(configFile);

            if (!this.config.coordination?.enabled) {
                throw new Error('Coordination is not enabled in core-config.yaml');
            }
        } catch (error) {
            console.error('Failed to load BMAD configuration:', error.message);
            process.exit(1);
        }
    }

    connect(developerId) {
        return new Promise((resolve, reject) => {
            this.developerId = developerId;
            const serverUrl = this.config.coordination.serverUrl;
            const namespace = this.config.coordination.socketNamespace || '/dev-coordination';

            this.socket = io(serverUrl + namespace, {
                auth: {
                    developerId: developerId,
                    method: this.config.coordination.developerAuth?.method || 'simple'
                }
            });

            this.socket.on('connect', () => {
                console.log(`Connected to coordination server as ${developerId}`);
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection failed:', error.message);
                reject(error);
            });

            this.socket.on('story-claimed', (data) => {
                console.log(`Story ${data.storyId} claimed by ${data.developerId}`);
            });

            this.socket.on('story-released', (data) => {
                console.log(`Story ${data.storyId} released by ${data.developerId}`);
            });

            this.socket.on('story-status-updated', (data) => {
                console.log(`Story ${data.storyId} status: ${data.status} (${data.progress}%)`);
            });
        });
    }

    async claimStory(storyId, epicId = null) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            const claimData = {
                storyId,
                epicId,
                developerId: this.developerId,
                timestamp: new Date().toISOString(),
                timeout: this.config.coordination.storyClaimTimeout
            };

            this.socket.emit('claim-story', claimData, (response) => {
                if (response.success) {
                    console.log(`Successfully claimed story ${storyId}`);
                    resolve(response);
                } else {
                    console.error(`Failed to claim story ${storyId}: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async releaseStory(storyId) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            const releaseData = {
                storyId,
                developerId: this.developerId,
                timestamp: new Date().toISOString()
            };

            this.socket.emit('release-story', releaseData, (response) => {
                if (response.success) {
                    console.log(`Successfully released story ${storyId}`);
                    resolve(response);
                } else {
                    console.error(`Failed to release story ${storyId}: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async updateStoryStatus(storyId, status, progress = 0, notes = '') {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            const statusData = {
                storyId,
                developerId: this.developerId,
                status,
                progress,
                notes,
                timestamp: new Date().toISOString()
            };

            this.socket.emit('update-story-status', statusData, (response) => {
                if (response.success) {
                    console.log(`Updated story ${storyId} status to ${status} (${progress}%)`);
                    resolve(response);
                } else {
                    console.error(`Failed to update story status: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async getAvailableStories(epicId = null) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            this.socket.emit('get-available-stories', { epicId }, (response) => {
                if (response.success) {
                    resolve(response.stories);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async getEpicProgress(epicId) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            this.socket.emit('get-epic-progress', { epicId }, (response) => {
                if (response.success) {
                    resolve(response.progress);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('Disconnected from coordination server');
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const coordination = new BMadCoordination();

    try {
        switch (command) {
            case 'connect':
                const developerId = args[1] || process.env.USER || 'anonymous';
                await coordination.connect(developerId);
                console.log('Connection established. Use Ctrl+C to disconnect.');
                process.stdin.resume();
                break;

            case 'claim':
                const storyId = args[1];
                const epicId = args[2] || null;
                if (!storyId) {
                    console.error('Usage: node socket-coordination.js claim <storyId> [epicId]');
                    process.exit(1);
                }
                await coordination.connect(process.env.USER || 'anonymous');
                await coordination.claimStory(storyId, epicId);
                coordination.disconnect();
                break;

            case 'release':
                const releaseStoryId = args[1];
                if (!releaseStoryId) {
                    console.error('Usage: node socket-coordination.js release <storyId>');
                    process.exit(1);
                }
                await coordination.connect(process.env.USER || 'anonymous');
                await coordination.releaseStory(releaseStoryId);
                coordination.disconnect();
                break;

            case 'status':
                const statusStoryId = args[1];
                const status = args[2];
                const progress = parseInt(args[3]) || 0;
                const notes = args[4] || '';
                if (!statusStoryId || !status) {
                    console.error('Usage: node socket-coordination.js status <storyId> <status> [progress] [notes]');
                    process.exit(1);
                }
                await coordination.connect(process.env.USER || 'anonymous');
                await coordination.updateStoryStatus(statusStoryId, status, progress, notes);
                coordination.disconnect();
                break;

            case 'list':
                const listEpicId = args[1] || null;
                await coordination.connect(process.env.USER || 'anonymous');
                const stories = await coordination.getAvailableStories(listEpicId);
                console.log('Available Stories:');
                stories.forEach(story => {
                    console.log(`  - ${story.id}: ${story.title} (${story.status})`);
                });
                coordination.disconnect();
                break;

            case 'epic-progress':
                const progressEpicId = args[1];
                if (!progressEpicId) {
                    console.error('Usage: node socket-coordination.js epic-progress <epicId>');
                    process.exit(1);
                }
                await coordination.connect(process.env.USER || 'anonymous');
                const progress = await coordination.getEpicProgress(progressEpicId);
                console.log(`Epic ${progressEpicId} Progress:`, progress);
                coordination.disconnect();
                break;

            default:
                console.log('BMAD Socket.IO Coordination Client');
                console.log('Usage:');
                console.log('  connect [developerId]     - Connect and listen for updates');
                console.log('  claim <storyId> [epicId]  - Claim a story for development');
                console.log('  release <storyId>         - Release a claimed story');
                console.log('  status <storyId> <status> [progress] [notes] - Update story status');
                console.log('  list [epicId]             - List available stories');
                console.log('  epic-progress <epicId>    - Show epic progress');
                break;
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = BMadCoordination;