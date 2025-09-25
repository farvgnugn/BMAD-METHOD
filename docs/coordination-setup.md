# BMAD Multi-Agent Coordination Setup

This guide explains how to set up multi-agent coordination for distributed BMAD development teams.

## Overview

The BMAD coordination system allows multiple agents to work together in real-time across different machines. Key features include:

- **Project-aware agent naming** with collision detection
- **Real-time story claiming** and progress tracking
- **Automatic server discovery** on local networks
- **Cross-platform terminal title updates**
- **Network connectivity validation**

## Setup Options

### 1. During Installation

When installing BMAD, you'll be prompted to configure coordination:

```bash
npx bmad-method install
```

The installer will ask:
- ✅ Enable multi-agent coordination system?
- Choose setup mode: Local | Team Shared | Host Server

### 2. Existing Projects

Configure coordination for existing BMAD projects:

```bash
npx bmad-method setup-coordination
# or specify project path
npx bmad-method setup-coordination -p /path/to/project
```

## Coordination Modes

### Local Development (Single Machine)
- **Use case**: Solo development or testing
- **Config**: Auto-start server on localhost:54321
- **Benefits**: Zero configuration, works immediately

### Team Shared Server (Connect to Existing)
- **Use case**: Team with dedicated coordination server
- **Config**: Connect to shared server URL
- **Benefits**: Centralized coordination, team-wide visibility
- **Setup**: Enter server URL (with auto-discovery)

### Host Coordination Server
- **Use case**: Your machine hosts for the team
- **Config**: Bind to network interface, configure port
- **Benefits**: You control the server, team connects to you
- **Network**: Choose local network or all interfaces

## Network Discovery

The system automatically discovers coordination servers by scanning:
- **Ports**: 54321, 3000, 8080, 4000
- **Addresses**: localhost, 127.0.0.1
- **Validation**: Tests connectivity before configuration

## Agent Identity System

Each agent gets a unique identity with:
- **Project scope**: Agent names are unique per project
- **Collision avoidance**: James → JamesAlpha → JamesBeta → etc.
- **Terminal titles**: `ProjectName - Role - Agent Name`
- **Real-time updates**: Join/leave notifications

## Usage Examples

### Basic Agent Connection
```bash
# In your BMAD project directory
node bmad-core/utils/socket-coordination.js connect MyUser Developer MyProject James
```

### Project Switching
```bash
# Switch to different project (keeps same agent name if available)
node bmad-core/utils/socket-coordination.js switch-project OtherProject

# Switch with preferred agent name
node bmad-core/utils/socket-coordination.js switch-project OtherProject Sarah
```

### Story Management
```bash
# Claim a story for development
node bmad-core/utils/socket-coordination.js claim 15.3 Epic-15

# Update story progress
node bmad-core/utils/socket-coordination.js status 15.3 InProgress 50 "API endpoints complete"

# Release story
node bmad-core/utils/socket-coordination.js release 15.3
```

### Team Monitoring
```bash
# List active projects
node bmad-core/utils/socket-coordination.js list-projects

# List all active agents
node bmad-core/utils/socket-coordination.js list-agents

# List agents in specific project
node bmad-core/utils/socket-coordination.js list-agents MyProject
```

## Server Management

### Manual Server Control
```bash
# Check server status
node bmad-core/utils/socket-coordination.js server-status

# Start server manually
node bmad-core/utils/socket-coordination.js start-server

# Direct server startup (for hosting)
cd bmad-core/utils
npm run test-server
```

### Configuration Options
In `core-config.yaml`:
```yaml
coordination:
  enabled: true
  serverUrl: "http://localhost:54321"
  socketNamespace: "/dev-coordination"
  autoStartServer: true
  serverStartTimeout: 10  # seconds
  storyClaimTimeout: 3600 # seconds (1 hour)
  progressUpdateInterval: 300  # seconds (5 minutes)
  conflictResolution: "first-claim-wins"
```

## Distributed Team Setup

### Team Lead (Server Host)
1. Run: `npx bmad-method setup-coordination`
2. Choose: "Host coordination server"
3. Select network interface (local network/all)
4. Share connection URL with team
5. Start server: `cd bmad-core/utils && npm run test-server`

### Team Members
1. Run: `npx bmad-method setup-coordination`
2. Choose: "Team shared server"
3. Enter shared server URL (or select from discovered)
4. Test connectivity automatically
5. Start using agents with coordination enabled

### Connection URLs
- **Local network**: `http://<host-local-ip>:54321`
- **All interfaces**: `http://<host-public-ip>:54321`
- **Default port**: 54321 (configurable)

## Troubleshooting

### Server Not Found
- Check firewall settings on host machine
- Verify port is not blocked (default: 54321)
- Test connectivity: `telnet <server-ip> 54321`

### Agent Name Conflicts
- System automatically handles collisions
- Fallback sequence: Name → NameAlpha → NameBeta → Name1234
- Names are project-scoped (James can exist in multiple projects)

### Network Issues
- Server auto-discovery only works on local networks
- Manual URL entry always available as fallback
- Connectivity validation helps identify issues early

### Configuration Problems
- Check `core-config.yaml` coordination section
- Verify server URL format: `http://host:port`
- Ensure coordination is enabled: `enabled: true`

## Integration with Dev Agents

BMAD dev agents automatically use coordination when:
1. Coordination is enabled in `core-config.yaml`
2. Agent connects to server (auto-start if needed)
3. Agent claims unique name for the project
4. Terminal title updates to show agent identity

The dev agent workflow includes:
- **Coordination check**: Connect and claim agent name
- **Story claiming**: Claim stories before development
- **Progress updates**: Broadcast development progress
- **Release handling**: Release stories on completion

This seamless integration allows distributed teams to work together while maintaining BMAD process integrity.