# AAF Method Installation Guide

## 🚀 Quick Installation

Since AAF Method is not published to npm, install directly from GitHub:

```bash
# Install AAF Method from GitHub
npm install dferguson/AAF-METHOD

# Or using the full URL
npm install https://github.com/dferguson/AAF-METHOD.git
```

## 📦 Setup in Your Project

1. **Navigate to your project directory:**
   ```bash
   cd your-project
   ```

2. **Install AAF Method:**
   ```bash
   npm install dferguson/AAF-METHOD
   ```

3. **Run the installer:**
   ```bash
   npx aaf-method install
   ```

4. **Follow the interactive setup** to configure AAF for your project.

## 🎯 Alternative Installation Methods

### **Install Specific Version/Branch:**
```bash
# Install from specific branch
npm install dferguson/AAF-METHOD#main

# Install from specific tag
npm install dferguson/AAF-METHOD#v1.0.0

# Install from development branch
npm install dferguson/AAF-METHOD#development
```

### **Install as Dev Dependency:**
```bash
npm install --save-dev dferguson/AAF-METHOD
```

### **Global Installation:**
```bash
npm install -g dferguson/AAF-METHOD
```

## 🔧 Manual Setup (Alternative)

If you prefer to set up manually:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dferguson/AAF-METHOD.git
   cd AAF-METHOD
   npm install
   ```

2. **Copy AAF files to your project:**
   ```bash
   cp -r aaf-core/ your-project/
   cp -r claude-code-commands/ your-project/
   cp -r claude-code-integration/ your-project/
   cp aaf-execution.js your-project/
   ```

3. **Run the installer:**
   ```bash
   cd your-project
   node install.js
   ```

## 📋 Package.json Integration

Add AAF Method to your project's `package.json`:

```json
{
  "dependencies": {
    "aaf-method": "dferguson/AAF-METHOD"
  },
  "scripts": {
    "aaf:setup": "aaf-method install",
    "aaf:dev": "aaf-execution start",
    "aaf:status": "aaf-execution status"
  }
}
```

Then run:
```bash
npm install
npm run aaf:setup
```

## 🚀 Quick Start

After installation:

1. **Setup AAF in your project:**
   ```bash
   npx aaf-method install
   ```

2. **Add user stories** to `docs/stories/` directory

3. **Open project in Claude Code**

4. **Use slash commands:**
   ```
   /aaf:orchestrate:dev:3        # Spawn 3 development agents
   /aaf:orchestrate:dev:yolo:2   # YOLO mode for rapid prototyping
   /aaf:orchestrate:review:1     # Spawn review agent
   ```

## 🔄 Updating AAF Method

To update to the latest version:

```bash
npm install dferguson/AAF-METHOD@latest
```

Or to update to a specific commit:
```bash
npm install dferguson/AAF-METHOD#abc1234
```

## 🛠 Development Installation

For contributing to AAF Method:

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/AAF-METHOD.git
   cd AAF-METHOD
   npm install
   ```

3. **Test in a sample project:**
   ```bash
   cd /path/to/test-project
   npm install /path/to/AAF-METHOD
   npx aaf-method install
   ```

## 📞 Support

- **Issues:** https://github.com/dferguson/AAF-METHOD/issues
- **Documentation:** https://github.com/dferguson/AAF-METHOD#readme

## 🔐 Private Repository Access

If the repository becomes private, users will need:

1. **GitHub Personal Access Token** with repo access
2. **Install with token:**
   ```bash
   npm install git+https://YOUR_TOKEN@github.com/dferguson/AAF-METHOD.git
   ```

3. **Or configure npm with GitHub token:**
   ```bash
   npm config set //npm.pkg.github.com/:_authToken YOUR_TOKEN
   ```