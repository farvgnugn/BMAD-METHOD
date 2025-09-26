# Private npm Registry Setup

## Option 1: Verdaccio (Self-hosted)

1. Install Verdaccio globally:
   ```bash
   npm install -g verdaccio
   ```

2. Start Verdaccio:
   ```bash
   verdaccio
   ```

3. Configure your project to use the private registry:
   ```bash
   npm set registry http://localhost:4873/
   ```

4. Create a user:
   ```bash
   npm adduser --registry http://localhost:4873/
   ```

5. Publish your package:
   ```bash
   npm publish --registry http://localhost:4873/
   ```

6. Install on other machines:
   ```bash
   pnpm add aaf-method --registry http://your-verdaccio-server:4873/
   ```

## Option 2: GitHub Packages

1. Update package.json with your GitHub username:
   ```json
   {
     "name": "@yourusername/aaf-method",
     "repository": {
       "url": "git+https://github.com/yourusername/aaf-method.git"
     },
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

2. Create .npmrc in project root:
   ```
   @yourusername:registry=https://npm.pkg.github.com
   ```

3. Authenticate:
   ```bash
   npm login --scope=@yourusername --registry=https://npm.pkg.github.com
   ```

4. Publish:
   ```bash
   npm publish
   ```

5. Install on team machines:
   ```bash
   pnpm add @yourusername/aaf-method
   ```

## Team Installation Instructions

After setting up private registry, team members can install with:

```bash
# Create .npmrc in their project
echo "@yourusername:registry=https://npm.pkg.github.com" >> .npmrc

# Install the package
pnpm add @yourusername/aaf-method

# Or install globally
pnpm add -g @yourusername/aaf-method
```

## Usage After Installation

```bash
# CLI commands available globally
aaf --help
aaf install
aaf workflow dashboard

# Or use via npx
npx @yourusername/aaf-method install
```