# AAF Method

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

**A Universal AI Agent Framework for Multi-Agent Coordination and Development**

AAF Method is a powerful framework for orchestrating AI agents in distributed development environments. It enables real-time coordination, project-aware agent naming, and seamless multi-machine collaboration.

⭐ **If you find this project helpful or useful, please give it a star!** It helps others discover AAF Method and supports continued development.

## 🚀 Key Features

- **Multi-Agent Coordination**: Real-time story claiming, progress tracking, and conflict resolution
- **Project-Aware Agent Names**: Unique agent identities per project with collision avoidance
- **Distributed Development**: Cross-machine agent communication via Socket.IO
- **Intelligent Discovery**: Automatic server detection and connectivity validation
- **Terminal Integration**: Dynamic terminal titles showing project, role, and agent name
- **Network Flexibility**: Local development, shared servers, or hosted coordination

## 📦 Installation

```bash
# Install AAF Method with coordination setup
npx aaf-method install

# Configure coordination for existing project
npx aaf-method setup-coordination

# Install in specific directory
npx aaf-method install -d /path/to/project
```

## 🔗 Multi-Agent Coordination

### Quick Start
1. **Install AAF Method**: `npx aaf-method install`
2. **Choose Mode**: Local development, Team server, or Host server
3. **Start Agents**: Agents automatically connect and claim unique names
4. **Collaborate**: Real-time coordination across all connected agents

### Agent Commands
```bash
# Connect agent with identity
node aaf-core/utils/socket-coordination.js connect MyUser Developer MyProject James

# Switch between projects
node aaf-core/utils/socket-coordination.js switch-project OtherProject

# Manage stories
node aaf-core/utils/socket-coordination.js claim 15.3 Epic-15
node aaf-core/utils/socket-coordination.js status 15.3 InProgress 50
node aaf-core/utils/socket-coordination.js release 15.3

# Monitor team
node aaf-core/utils/socket-coordination.js list-agents
node aaf-core/utils/socket-coordination.js list-projects
```

## 🏗️ Architecture

- **Agent Identity System**: Project-scoped unique naming with fallback sequences
- **Socket.IO Coordination**: Real-time communication between agents
- **Configuration Management**: YAML-based project configuration
- **Network Discovery**: Automatic server detection and connectivity testing
- **Terminal Integration**: Cross-platform terminal title updates

## 📖 Documentation

- [Coordination Setup Guide](docs/coordination-setup.md) - Complete setup instructions
- [Network Configuration](docs/network-config.md) - Distributed team setup
- [Troubleshooting Guide](docs/troubleshooting.md) - Common issues and solutions

## 🙏 Acknowledgments

**This project builds upon the foundational work of the [BMAD Method](https://github.com/bmadcode/BMAD-METHOD)** - a breakthrough methodology for AI-driven agile development created by Brian Madison.

Key concepts inherited from BMAD Method:
- Agent-driven development workflows
- Configuration management patterns
- CLI tooling architecture
- Project organization structures

We extend our sincere gratitude to Brian Madison and the BMAD Method community for creating the foundation that made this project possible. While AAF has evolved in its own direction with focus on multi-agent coordination, it stands on the shoulders of the innovative work done in the BMAD Method ecosystem.

**Original BMAD Method**: https://github.com/bmadcode/BMAD-METHOD
**Created by**: Brian (BMad) Madison

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*AAF Method - Enabling seamless multi-agent development collaboration*
