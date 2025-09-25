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
const { spawn } = require('child_process');
const http = require('http');

class BMadCoordination {
    constructor() {
        this.socket = null;
        this.config = null;
        this.developerId = null;
        this.agentName = null;
        this.role = null;
        this.projectName = null;
        this.loadConfig();
    }

    loadConfig() {
        try {
            // Try multiple possible config locations
            const possiblePaths = [
                path.join(process.cwd(), '.bmad-core', 'core-config.yaml'),
                path.join(process.cwd(), 'bmad-core', 'core-config.yaml'),
                path.join(__dirname, '..', 'core-config.yaml')
            ];

            let configPath = null;
            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    configPath = testPath;
                    break;
                }
            }

            if (!configPath) {
                throw new Error('core-config.yaml not found in any expected location');
            }

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

    async generateUniqueAgentName(preferredName, role, projectName, retryCount = 0) {
        const maxRetries = 10;
        const suffixes = ['', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Prime', 'Neo', 'Max', 'Ace', 'Pro'];

        if (retryCount >= maxRetries) {
            // Final fallback - use timestamp
            const timestamp = Date.now().toString().slice(-4);
            return `${preferredName}${timestamp}`;
        }

        const testName = retryCount === 0 ? preferredName : `${preferredName}${suffixes[retryCount] || retryCount}`;

        try {
            const isAvailable = await this.checkAgentNameAvailability(testName, projectName);
            if (isAvailable) {
                return testName;
            } else {
                return await this.generateUniqueAgentName(preferredName, role, projectName, retryCount + 1);
            }
        } catch (error) {
            // If we can't check availability, fallback to timestamped name
            const timestamp = Date.now().toString().slice(-4);
            return `${preferredName}${timestamp}`;
        }
    }

    async checkAgentNameAvailability(agentName, projectName = null) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                // If not connected, assume available (will be checked again on connect)
                resolve(true);
                return;
            }

            const checkData = { agentName };
            if (projectName) {
                checkData.projectName = projectName;
            }

            this.socket.emit('check-agent-name', checkData, (response) => {
                if (response.success) {
                    resolve(response.available);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async claimAgentName(agentName, role, projectName) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            this.socket.emit('claim-agent-name', {
                agentName,
                role,
                projectName
            }, (response) => {
                if (response.success) {
                    this.agentName = response.agentName;
                    console.log(`Successfully claimed agent name: ${response.fullAgentName}`);
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    setTerminalTitle(projectName, role, agentName) {
        try {
            const title = `${projectName} - ${role} - Agent ${agentName}`;

            // Set terminal title based on platform
            if (process.platform === 'win32') {
                // Windows Command Prompt and PowerShell
                process.stdout.write(`\x1b]2;${title}\x1b\\`);
            } else {
                // Unix-like systems (Linux, macOS)
                process.stdout.write(`\x1b]0;${title}\x07`);
            }
        } catch (error) {
            console.warn('Failed to set terminal title:', error.message);
        }
    }

    async connect(developerId, role = null, projectName = null, preferredAgentName = null, autoStartServer = null) {
        this.developerId = developerId;
        this.role = role || 'Developer';
        this.projectName = projectName || path.basename(process.cwd());

        const serverUrl = this.config.coordination.serverUrl;
        const namespace = this.config.coordination.socketNamespace || '/dev-coordination';

        // Use config setting if not explicitly specified
        const shouldAutoStart = autoStartServer !== null
            ? autoStartServer
            : this.config.coordination.autoStartServer !== false;

        // Check if server is running, start if needed
        if (shouldAutoStart) {
            const isServerRunning = await this.checkServerRunning();
            if (!isServerRunning) {
                console.log('Coordination server not detected, starting server...');
                await this.startServer();
                // Wait for server to be ready
                const timeout = (this.config.coordination.serverStartTimeout || 10) * 1000;
                await this.waitForServer(timeout);
            }
        }

        return new Promise(async (resolve, reject) => {
            this.socket = io(serverUrl + namespace, {
                auth: {
                    developerId: developerId,
                    role: this.role,
                    method: this.config.coordination.developerAuth?.method || 'simple'
                }
            });

            this.socket.on('connect', async () => {
                try {
                    console.log(`Connected to coordination server as ${developerId}`);

                    // Generate and claim unique agent name
                    const defaultAgentName = preferredAgentName || 'James';
                    const uniqueAgentName = await this.generateUniqueAgentName(defaultAgentName, this.role, this.projectName);
                    await this.claimAgentName(uniqueAgentName, this.role, this.projectName);

                    // Set terminal title
                    this.setTerminalTitle(this.projectName, this.role, uniqueAgentName);

                    console.log(`Agent identity established: Agent ${uniqueAgentName} (${this.role}) in project ${this.projectName}`);
                    resolve();
                } catch (error) {
                    console.warn('Failed to establish agent identity:', error.message);
                    // Continue without agent name if it fails
                    resolve();
                }
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

            this.socket.on('agent-name-claimed', (data) => {
                if (data.developerId !== this.developerId) {
                    console.log(`Agent ${data.agentName} (${data.role}) joined project ${data.projectName}`);
                }
            });

            this.socket.on('agent-name-released', (data) => {
                if (data.developerId !== this.developerId) {
                    console.log(`Agent ${data.agentName} (${data.role}) left the project`);
                }
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

    async switchProject(newProjectName, preferredAgentName = null) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.socket || !this.socket.connected) {
                    reject(new Error('Not connected to coordination server'));
                    return;
                }

                // Generate unique agent name for the new project
                const defaultAgentName = preferredAgentName || this.agentName || 'James';
                const uniqueAgentName = await this.generateUniqueAgentName(defaultAgentName, this.role, newProjectName);

                // Claim agent name in the new project (this will automatically release old one)
                await this.claimAgentName(uniqueAgentName, this.role, newProjectName);

                // Update internal state
                this.projectName = newProjectName;

                // Set terminal title
                this.setTerminalTitle(this.projectName, this.role, uniqueAgentName);

                console.log(`Switched to project "${newProjectName}" as Agent ${uniqueAgentName} (${this.role})`);
                resolve({
                    success: true,
                    projectName: newProjectName,
                    agentName: uniqueAgentName,
                    fullAgentName: `Agent ${uniqueAgentName} (${this.role})`
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    async getActiveProjects() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            this.socket.emit('get-active-projects', {}, (response) => {
                if (response.success) {
                    resolve(response.projects);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async getActiveAgents(projectName = null) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Not connected to coordination server'));
                return;
            }

            const data = projectName ? { projectName } : {};

            this.socket.emit('get-active-agents', data, (response) => {
                if (response.success) {
                    resolve(response.agents);
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

    async checkServerRunning() {
        const url = new URL(this.config.coordination.serverUrl);
        const port = url.port || (url.protocol === 'https:' ? 443 : 80);
        const hostname = url.hostname;

        return new Promise((resolve) => {
            const req = http.get(`http://${hostname}:${port}`, (res) => {
                resolve(true);
            });

            req.on('error', () => {
                resolve(false);
            });

            req.setTimeout(2000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            const serverScriptPath = path.join(__dirname, 'test-coordination-server.js');

            if (!fs.existsSync(serverScriptPath)) {
                reject(new Error('Coordination server script not found'));
                return;
            }

            const url = new URL(this.config.coordination.serverUrl);
            const port = url.port || 54321;

            console.log(`Starting coordination server on port ${port}...`);

            // Start server in background
            const serverProcess = spawn('node', [serverScriptPath, port], {
                detached: true,
                stdio: 'ignore'
            });

            // Unref so main process can exit
            serverProcess.unref();

            // Give server time to start
            setTimeout(() => {
                console.log('Coordination server started in background');
                resolve();
            }, 2000);
        });
    }

    async waitForServer(maxWait = 10000) {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            const isRunning = await this.checkServerRunning();
            if (isRunning) {
                console.log('Coordination server is ready');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('Coordination server failed to start within timeout');
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
                const role = args[2] || 'Developer';
                const projectName = args[3] || path.basename(process.cwd());
                const preferredName = args[4] || null;
                await coordination.connect(developerId, role, projectName, preferredName);
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
                const epicProgress = await coordination.getEpicProgress(progressEpicId);
                console.log(`Epic ${progressEpicId} Progress:`, epicProgress);
                coordination.disconnect();
                break;

            case 'server-status':
                const isRunning = await coordination.checkServerRunning();
                console.log(`Coordination server status: ${isRunning ? 'RUNNING' : 'STOPPED'}`);
                if (isRunning) {
                    console.log(`Server URL: ${coordination.config.coordination.serverUrl}`);
                } else {
                    console.log('Use "start-server" command to start the server manually');
                }
                break;

            case 'start-server':
                try {
                    const isRunning = await coordination.checkServerRunning();
                    if (isRunning) {
                        console.log('Coordination server is already running');
                    } else {
                        await coordination.startServer();
                        await coordination.waitForServer();
                        console.log('Coordination server started successfully');
                    }
                } catch (error) {
                    console.error('Failed to start server:', error.message);
                }
                break;

            case 'switch-project':
                const newProjectName = args[1];
                const newPreferredName = args[2] || null;
                if (!newProjectName) {
                    console.error('Usage: node socket-coordination.js switch-project <projectName> [preferredAgentName]');
                    process.exit(1);
                }
                await coordination.connect(process.env.USER || 'anonymous');
                await coordination.switchProject(newProjectName, newPreferredName);
                coordination.disconnect();
                break;

            case 'list-projects':
                await coordination.connect(process.env.USER || 'anonymous');
                const projects = await coordination.getActiveProjects();
                console.log('Active Projects:');
                projects.forEach(project => {
                    console.log(`  - ${project.name}: ${project.activeAgents} active agents`);
                });
                coordination.disconnect();
                break;

            case 'list-agents':
                const filterProject = args[1] || null;
                await coordination.connect(process.env.USER || 'anonymous');
                const agents = await coordination.getActiveAgents(filterProject);
                const projectMsg = filterProject ? `in project "${filterProject}"` : 'across all projects';
                console.log(`Active Agents ${projectMsg}:`);
                agents.forEach(agent => {
                    console.log(`  - ${agent.fullAgentName} (${agent.developerId}) in ${agent.projectName}`);
                });
                coordination.disconnect();
                break;

            default:
                console.log('BMAD Socket.IO Coordination Client');
                console.log('Usage:');
                console.log('');
                console.log('Connection & Agent Management:');
                console.log('  connect [developerId] [role] [project] [agentName] - Connect with agent identity');
                console.log('  switch-project <projectName> [agentName]           - Switch to different project');
                console.log('  list-projects                                      - List active projects');
                console.log('  list-agents [projectName]                         - List active agents');
                console.log('');
                console.log('Story Management:');
                console.log('  claim <storyId> [epicId]                          - Claim a story for development');
                console.log('  release <storyId>                                 - Release a claimed story');
                console.log('  status <storyId> <status> [progress] [notes]      - Update story status');
                console.log('  list [epicId]                                     - List available stories');
                console.log('  epic-progress <epicId>                            - Show epic progress');
                console.log('');
                console.log('Server Management:');
                console.log('  server-status                                     - Check if coordination server is running');
                console.log('  start-server                                      - Start coordination server manually');
                console.log('');
                console.log('Agent Identity:');
                console.log('  - Agent names are unique per project (e.g., "James" can exist in multiple projects)');
                console.log('  - Terminal title updates to show: ProjectName - Role - Agent Name');
                console.log('  - Agents automatically get unique names with collision avoidance');
                console.log('  - Server auto-starts by default when coordination is enabled');
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