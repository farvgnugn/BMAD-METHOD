# pnpm + Worktree Setup Guide

## Package.json Script Modifications

### **Smart Port Assignment**
```json
{
  "scripts": {
    "dev": "node scripts/auto-port-dev.js",
    "test": "jest --runInBand",
    "test:watch": "jest --watch --runInBand",
    "build": "node scripts/worktree-build.js"
  }
}
```

### **Auto-Port Dev Script**
```javascript
// scripts/auto-port-dev.js
const { spawn } = require('child_process');
const path = require('path');

function getAgentPort() {
  const cwd = process.cwd();
  const agentName = path.basename(cwd).replace('-workspace', '');

  // Assign ports based on agent name
  const portMap = {
    'Sarah': 3000,
    'James': 3001,
    'Alex': 3002,
    'Maria': 3003
  };

  return portMap[agentName] || 3000;
}

const port = getAgentPort();
console.log(`🚀 Starting dev server for ${path.basename(process.cwd())} on port ${port}`);

spawn('npm', ['run', 'dev:internal', '--', '--port', port], {
  stdio: 'inherit',
  shell: true
});
```

### **Worktree-Aware Build Script**
```javascript
// scripts/worktree-build.js
const { execSync } = require('child_process');
const path = require('path');

function getAgentBuildDir() {
  const cwd = process.cwd();
  const isWorktree = cwd.includes('-workspace');

  if (isWorktree) {
    const agentName = path.basename(cwd).replace('-workspace', '');
    return `dist-${agentName}`;
  }

  return 'dist';
}

const buildDir = getAgentBuildDir();
console.log(`🏗️ Building to: ${buildDir}`);

execSync(`BUILD_DIR=${buildDir} npm run build:internal`, { stdio: 'inherit' });
```

## Recommended Package.json Setup

```json
{
  "scripts": {
    // Public commands (worktree-aware)
    "dev": "node scripts/auto-port-dev.js",
    "test": "jest --runInBand --testNamePattern=\"$(basename $(pwd))\"",
    "build": "node scripts/worktree-build.js",

    // Internal commands (used by scripts)
    "dev:internal": "vite serve",
    "build:internal": "vite build",

    // Safe for all agents
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "type-check": "tsc --noEmit"
  }
}
```

## Usage Examples

### **Sarah's Workspace:**
```bash
cd ../Sarah-workspace
pnpm dev      # Starts on port 3000
pnpm test     # Runs tests with "Sarah" pattern
pnpm build    # Builds to dist-Sarah/
```

### **James's Workspace (Simultaneously):**
```bash
cd ../James-workspace
pnpm dev      # Starts on port 3001 (no conflict!)
pnpm test     # Runs tests with "James" pattern
pnpm build    # Builds to dist-James/
```

### **Safe Commands (Always Work):**
```bash
# These work perfectly in parallel:
pnpm lint     # Static analysis
pnpm format   # Code formatting
pnpm type-check # TypeScript checking
```

## Alternative: Environment Variables

### **Set Agent-Specific Variables:**
```bash
# In worktree creation
echo "export AGENT_NAME=Sarah" > ../Sarah-workspace/.env.local
echo "export DEV_PORT=3000" >> ../Sarah-workspace/.env.local
echo "export BUILD_DIR=dist-Sarah" >> ../Sarah-workspace/.env.local
```

### **Package.json Using Environment:**
```json
{
  "scripts": {
    "dev": "vite serve --port ${DEV_PORT:-3000}",
    "build": "vite build --outDir ${BUILD_DIR:-dist}",
    "test": "jest --testNamePattern=${AGENT_NAME:-''}"
  }
}
```

## Testing Strategies

### **Parallel Test Execution:**
```bash
# Option 1: Different test patterns
pnpm test -- --testNamePattern="auth"     # Sarah tests auth
pnpm test -- --testNamePattern="profile"  # James tests profile

# Option 2: Different test files
pnpm test src/auth.test.js                # Sarah
pnpm test src/profile.test.js             # James

# Option 3: Isolated test runs
pnpm test -- --runInBand --isolatedModules
```

### **Database/External Service Conflicts:**
```bash
# Use different test databases per agent
TEST_DB_NAME=test_sarah pnpm test    # Sarah
TEST_DB_NAME=test_james pnpm test    # James
```