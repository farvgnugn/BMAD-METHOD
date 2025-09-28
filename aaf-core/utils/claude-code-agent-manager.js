#!/usr/bin/env node
/* <!-- Powered by AAF Method --> */

/**
 * Claude Code Agent Manager
 * Handles spawning and managing Claude Code agents with proper communication
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const net = require('net');

class ClaudeCodeAgentManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.workspaceRoot = options.workspaceRoot || process.cwd();
        this.claudeCodePath = options.claudeCodePath || this.findClaudeCodePath();
        this.agents = new Map(); // agentId -> agent info
        this.agentCommunication = new Map(); // agentId -> communication channel

        // Communication setup
        this.communicationPort = options.communicationPort || 0; // Let system assign
        this.communicationServer = null;

        this.setupCommunicationServer();
    }

    findClaudeCodePath() {
        // Try to find Claude Code executable
        const possiblePaths = [
            'claude',
            'claude-code',
            '/usr/local/bin/claude',
            '/usr/local/bin/claude-code',
            process.env.CLAUDE_CODE_PATH
        ].filter(Boolean);

        for (const claudePath of possiblePaths) {
            try {
                // Test if the command exists
                const result = require('child_process').spawnSync(claudePath, ['--version'], {
                    stdio: 'pipe',
                    timeout: 5000
                });

                if (result.status === 0) {
                    console.log(`✅ Found Claude Code at: ${claudePath}`);
                    return claudePath;
                }
            } catch (error) {
                // Command not found, continue searching
            }
        }

        console.warn('⚠️ Claude Code not found in PATH, using fallback method');
        return 'claude'; // Fallback assumption
    }

    async setupCommunicationServer() {
        // Create TCP server for agent communication
        this.communicationServer = net.createServer((socket) => {
            this.handleAgentConnection(socket);
        });

        // Listen on random available port
        this.communicationServer.listen(0, 'localhost', () => {
            this.communicationPort = this.communicationServer.address().port;
            console.log(`🔗 Agent communication server listening on port ${this.communicationPort}`);
        });

        this.communicationServer.on('error', (error) => {
            console.error('Communication server error:', error);
            this.emit('communication-error', error);
        });
    }

    handleAgentConnection(socket) {
        let agentId = null;
        let buffer = '';

        socket.on('data', (data) => {
            buffer += data.toString();

            // Process complete messages (newline delimited)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.trim()) {
                    this.processAgentMessage(socket, line.trim(), agentId);
                }
            }
        });

        socket.on('close', () => {
            if (agentId) {
                console.log(`🔌 Agent ${agentId} disconnected`);
                this.agentCommunication.delete(agentId);
                this.emit('agent-disconnected', agentId);
            }
        });

        socket.on('error', (error) => {
            console.error('Agent socket error:', error);
        });

        // Store socket temporarily until we get agent identification
        socket._tempId = Math.random().toString(36).substring(7);
    }

    processAgentMessage(socket, message, agentId) {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'agent-identify':
                    agentId = data.agentId;
                    socket._agentId = agentId;
                    this.agentCommunication.set(agentId, socket);
                    console.log(`🤖 Agent ${agentId} connected and identified`);

                    // Send acknowledgment
                    this.sendToAgent(agentId, {
                        type: 'identification-confirmed',
                        agentId: agentId,
                        communicationActive: true
                    });
                    break;

                case 'status-update':
                    this.emit('agent-status-update', agentId, data);
                    break;

                case 'task-complete':
                    this.emit('agent-task-complete', agentId, data);
                    break;

                case 'error':
                    this.emit('agent-error', agentId, data);
                    break;

                case 'log':
                    console.log(`[${agentId}] ${data.message}`);
                    break;

                default:
                    console.warn(`Unknown message type from agent ${agentId}:`, data.type);
            }
        } catch (error) {
            console.error('Failed to parse agent message:', message, error);
        }
    }

    sendToAgent(agentId, message) {
        const socket = this.agentCommunication.get(agentId);
        if (socket && !socket.destroyed) {
            socket.write(JSON.stringify(message) + '\n');
            return true;
        }
        return false;
    }

    async spawnAgent(agentConfig) {
        const { agentId, workspace, prompt, story, mode = 'normal' } = agentConfig;

        console.log(`🚀 Spawning Claude Code agent: ${agentId}`);

        try {
            // Create agent workspace if needed
            const agentWorkspace = workspace || path.join(this.workspaceRoot, '.aaf-agents', agentId);
            fs.mkdirSync(agentWorkspace, { recursive: true });

            // Create enhanced prompt with communication setup
            const enhancedPrompt = this.buildEnhancedPrompt(agentId, prompt, story, mode);
            const promptFile = path.join(agentWorkspace, `${agentId}-prompt.md`);
            fs.writeFileSync(promptFile, enhancedPrompt, 'utf8');

            // Create agent communication script
            const commScript = this.createAgentCommunicationScript(agentId);
            const commScriptPath = path.join(agentWorkspace, `${agentId}-comm.js`);
            fs.writeFileSync(commScriptPath, commScript, 'utf8');

            // Spawn Claude Code process with enhanced environment
            const claudeArgs = this.buildClaudeCodeArgs(agentId, promptFile, agentWorkspace);
            const claudeProcess = spawn(this.claudeCodePath, claudeArgs, {
                cwd: agentWorkspace,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    AAF_AGENT_ID: agentId,
                    AAF_COMMUNICATION_PORT: this.communicationPort,
                    AAF_COMMUNICATION_SCRIPT: commScriptPath,
                    AAF_WORKSPACE: agentWorkspace,
                    AAF_MODE: mode
                }
            });

            // Setup agent info
            const agent = {
                agentId,
                process: claudeProcess,
                workspace: agentWorkspace,
                story,
                mode,
                startTime: new Date(),
                status: 'starting',
                lastActivity: new Date()
            };

            this.agents.set(agentId, agent);

            // Monitor process output
            claudeProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[${agentId}] ${output}`);
                this.emit('agent-output', agentId, output);
                agent.lastActivity = new Date();
            });

            claudeProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`[${agentId}] ERROR: ${error}`);
                this.emit('agent-error', agentId, error);
            });

            claudeProcess.on('close', (code) => {
                console.log(`[${agentId}] Process exited with code ${code}`);
                agent.status = code === 0 ? 'completed' : 'failed';
                agent.endTime = new Date();
                this.emit('agent-process-exit', agentId, code);
                this.cleanupAgent(agentId);
            });

            claudeProcess.on('error', (error) => {
                console.error(`[${agentId}] Process error:`, error);
                agent.status = 'error';
                this.emit('agent-error', agentId, error);
            });

            // Wait for agent to connect via communication channel
            await this.waitForAgentConnection(agentId, 30000); // 30 second timeout

            agent.status = 'running';
            console.log(`✅ Agent ${agentId} spawned and connected successfully`);
            this.emit('agent-spawned', agent);

            return agent;

        } catch (error) {
            console.error(`Failed to spawn agent ${agentId}:`, error);
            this.emit('agent-spawn-error', agentId, error);
            return null;
        }
    }

    buildEnhancedPrompt(agentId, originalPrompt, story, mode) {
        return `# AAF Agent Communication Setup

You are Claude Code agent: **${agentId}**

## Communication Protocol
You have access to AAF agent communication via the environment variable AAF_COMMUNICATION_SCRIPT.
Use this for real-time status updates and coordination with other agents.

### Available Communication Commands:
\`\`\`javascript
// Load communication module
const aafComm = require(process.env.AAF_COMMUNICATION_SCRIPT);

// Send status updates
aafComm.updateStatus('In Progress', 25, 'Implementing user authentication');

// Report task completion
aafComm.taskComplete({
    success: true,
    testsPass: true,
    coveragePercent: 100,
    branchName: 'feature/story-001'
});

// Log important information
aafComm.log('Starting test suite execution');

// Report errors
aafComm.reportError('Test coverage below 100%', { coverage: 85 });
\`\`\`

## Your Original Task:
${originalPrompt}

## Agent Instructions:
1. **Start by connecting**: Run \`const aafComm = require(process.env.AAF_COMMUNICATION_SCRIPT);\`
2. **Report progress regularly**: Use \`aafComm.updateStatus()\` at key milestones
3. **Report completion**: Use \`aafComm.taskComplete()\` when done
4. **Coordinate with other agents**: Your updates help other agents know when to start reviews

## Success Criteria:
- Complete all requirements from the original task
- Maintain regular communication via AAF protocol
- Report final success/failure status
- Ensure 100% test coverage and all tests pass

Begin your work and remember to use the communication protocol!`;
    }

    buildClaudeCodeArgs(agentId, promptFile, workspace) {
        // Build arguments for Claude Code
        const args = [];

        // Add prompt file
        args.push('--file', promptFile);

        // Add workspace/project context
        args.push('--project', path.basename(workspace));

        // Add any additional Claude Code specific arguments
        if (process.env.CLAUDE_CODE_ARGS) {
            args.push(...process.env.CLAUDE_CODE_ARGS.split(' '));
        }

        return args;
    }

    createAgentCommunicationScript(agentId) {
        return `// AAF Agent Communication Module for ${agentId}
const net = require('net');

class AAFAgentCommunication {
    constructor() {
        this.agentId = process.env.AAF_AGENT_ID;
        this.port = parseInt(process.env.AAF_COMMUNICATION_PORT);
        this.socket = null;
        this.connected = false;
        this.messageQueue = [];

        this.connect();
    }

    connect() {
        if (this.connected) return;

        this.socket = net.createConnection(this.port, 'localhost');

        this.socket.on('connect', () => {
            console.log('🔗 Connected to AAF communication server');
            this.connected = true;

            // Identify this agent
            this.send({
                type: 'agent-identify',
                agentId: this.agentId,
                timestamp: new Date().toISOString()
            });

            // Send any queued messages
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                this.send(message);
            }
        });

        this.socket.on('data', (data) => {
            const messages = data.toString().split('\\n').filter(Boolean);
            for (const msg of messages) {
                try {
                    const parsed = JSON.parse(msg);
                    this.handleMessage(parsed);
                } catch (error) {
                    console.error('Failed to parse message:', msg);
                }
            }
        });

        this.socket.on('close', () => {
            console.log('🔌 Disconnected from AAF communication server');
            this.connected = false;
        });

        this.socket.on('error', (error) => {
            console.error('Communication error:', error);
            this.connected = false;
        });
    }

    send(message) {
        if (this.connected && this.socket) {
            this.socket.write(JSON.stringify(message) + '\\n');
        } else {
            this.messageQueue.push(message);
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'identification-confirmed':
                console.log('✅ Agent identification confirmed');
                break;
            case 'task-assignment':
                console.log('📋 New task assigned:', message.task);
                break;
            default:
                console.log('📨 Received message:', message);
        }
    }

    updateStatus(status, progress = 0, notes = '') {
        this.send({
            type: 'status-update',
            agentId: this.agentId,
            status: status,
            progress: progress,
            notes: notes,
            timestamp: new Date().toISOString()
        });
    }

    taskComplete(result) {
        this.send({
            type: 'task-complete',
            agentId: this.agentId,
            result: result,
            timestamp: new Date().toISOString()
        });
    }

    log(message) {
        console.log(message);
        this.send({
            type: 'log',
            agentId: this.agentId,
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    reportError(error, details = {}) {
        this.send({
            type: 'error',
            agentId: this.agentId,
            error: error,
            details: details,
            timestamp: new Date().toISOString()
        });
    }
}

// Export singleton instance
module.exports = new AAFAgentCommunication();`;
    }

    async waitForAgentConnection(agentId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkConnection = () => {
                if (this.agentCommunication.has(agentId)) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Agent ${agentId} failed to connect within ${timeout}ms`));
                } else {
                    setTimeout(checkConnection, 1000);
                }
            };

            checkConnection();
        });
    }

    async sendTaskToAgent(agentId, task) {
        return this.sendToAgent(agentId, {
            type: 'task-assignment',
            task: task,
            timestamp: new Date().toISOString()
        });
    }

    async killAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            console.warn(`Agent ${agentId} not found for termination`);
            return false;
        }

        console.log(`🔪 Terminating agent ${agentId}`);

        try {
            // Close communication channel
            const socket = this.agentCommunication.get(agentId);
            if (socket) {
                socket.end();
                this.agentCommunication.delete(agentId);
            }

            // Kill process
            if (agent.process && !agent.process.killed) {
                agent.process.kill('SIGTERM');

                // Force kill after 5 seconds if still running
                setTimeout(() => {
                    if (!agent.process.killed) {
                        agent.process.kill('SIGKILL');
                    }
                }, 5000);
            }

            agent.status = 'terminated';
            agent.endTime = new Date();

            this.emit('agent-killed', agentId);
            return true;

        } catch (error) {
            console.error(`Failed to kill agent ${agentId}:`, error);
            return false;
        }
    }

    cleanupAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        // Remove from maps
        this.agents.delete(agentId);
        this.agentCommunication.delete(agentId);

        // Cleanup workspace if needed
        try {
            const tempWorkspace = agent.workspace;
            if (tempWorkspace && tempWorkspace.includes('.aaf-agents')) {
                const fs = require('fs');
                fs.rmSync(tempWorkspace, { recursive: true, force: true });
                console.log(`🧹 Cleaned up workspace for ${agentId}`);
            }
        } catch (error) {
            console.warn(`Failed to cleanup workspace for ${agentId}:`, error.message);
        }

        this.emit('agent-cleanup-complete', agentId);
    }

    getAgentStatus(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return null;

        return {
            agentId: agent.agentId,
            status: agent.status,
            startTime: agent.startTime,
            endTime: agent.endTime,
            lastActivity: agent.lastActivity,
            workspace: agent.workspace,
            story: agent.story,
            mode: agent.mode,
            connected: this.agentCommunication.has(agentId)
        };
    }

    getAllAgents() {
        return Array.from(this.agents.keys()).map(agentId => this.getAgentStatus(agentId));
    }

    async shutdown() {
        console.log('🛑 Shutting down Claude Code Agent Manager...');

        // Kill all agents
        const killPromises = Array.from(this.agents.keys()).map(agentId => this.killAgent(agentId));
        await Promise.all(killPromises);

        // Close communication server
        if (this.communicationServer) {
            this.communicationServer.close();
        }

        console.log('✅ Agent Manager shutdown complete');
    }
}

module.exports = ClaudeCodeAgentManager;