# Workspace Management Strategies

## Problem: Multiple Agents, File Conflicts

When multiple AI agents work in the same project directory, they can:
- ✅ Overwrite each other's changes
- ✅ Create merge conflicts
- ✅ Work on the same files simultaneously
- ✅ Lose work due to concurrent edits

## Solution Options

### **Option 1: Branch-Based Workspaces** (Recommended)

**Concept**: Each agent gets their own Git branch as workspace

**Pros:**
- ✅ No disk space duplication
- ✅ Git handles conflict resolution
- ✅ Easy to merge work back
- ✅ Full project context available
- ✅ Branch-per-story natural workflow

**Implementation:**
```bash
# Agent Sarah claims story 21.1
git checkout -b agent-sarah/story-21-1

# Agent James claims story 21.2
git checkout -b agent-james/story-21-2

# When ready for review
git checkout main
git merge agent-sarah/story-21-1
```

**Integration with find-work:**
```bash
aaf workflow claim-story 21.1
# Automatically creates: agent-sarah/story-21-1
# Automatically switches to that branch
```

### **Option 2: File-Level Locking**

**Concept**: Shared workspace with file-level coordination

**Pros:**
- ✅ No directory duplication
- ✅ Granular conflict prevention
- ✅ Agents see each other's work
- ✅ Automatic lock cleanup

**Usage:**
```javascript
const workspace = new WorkspaceManager();

// Before editing a file
const lock = await workspace.claimFile('src/auth.js', 'AgentSarah');
if (!lock.success) {
    console.log(`File locked by ${lock.lockedBy}`);
    return;
}

// Do work...

// Release when done
await workspace.releaseFile('src/auth.js', 'AgentSarah');
```

**Lock Status:**
```bash
aaf workspace locks
# Shows:
# src/auth.js        - Locked by AgentSarah (2 hours ago)
# src/components.js  - Locked by AgentJames (30 minutes ago)
```

### **Option 3: Hybrid Approach** (Best of Both)

**Concept**: Combine branches + file locking

```javascript
async claimStoryWorkspace(storyId, agentName) {
    // 1. Create/switch to agent branch
    const branchName = `agent-${agentName}/story-${storyId}`;
    await this.ensureBranch(branchName);

    // 2. Lock story-related files
    const storyFiles = await this.getStoryFiles(storyId);
    const locks = await this.lockFiles(storyFiles, agentName);

    return { branchName, locks };
}
```

### **Option 4: Workspace Coordination via Server**

Add workspace management to coordination server:

```javascript
// In coordination server
socket.on('claim-workspace', async (data, callback) => {
    const { storyId, agentName, files } = data;

    // Check if any files are already claimed
    const conflicts = await this.checkFileConflicts(files, agentName);

    if (conflicts.length > 0) {
        callback({
            success: false,
            conflicts: conflicts.map(c => ({
                file: c.file,
                claimedBy: c.agentName,
                since: c.claimedAt
            }))
        });
        return;
    }

    // Claim workspace
    await this.claimWorkspace(storyId, agentName, files);
    callback({ success: true });
});
```

## **Recommended Implementation**

### **Phase 1: Branch-Based (Immediate)**
```bash
# Extend find-work command
aaf workflow find-work Developer --auto-select --create-branch

# This would:
# 1. Find available work
# 2. Auto-select story (e.g., 21.1)
# 3. Create branch: agent-sarah/story-21-1
# 4. Switch to that branch
# 5. Notify coordination server
```

### **Phase 2: Smart Branch Management**
```javascript
// Add to workflow orchestrator
async setupWorkspace(storyId) {
    const branchName = `agent-${this.agentName}/story-${storyId}`;

    // Check if branch exists remotely (other agent working on it)
    const remoteBranch = await this.checkRemoteBranch(branchName);
    if (remoteBranch) {
        throw new Error(`Story ${storyId} already being worked on by another agent`);
    }

    // Create and switch to branch
    await this.createAndSwitchBranch(branchName);

    // Notify coordination server
    await this.publishWorkspaceClaimStatus(storyId, branchName);
}
```

### **Phase 3: Integration**
```bash
# When agent finishes work
aaf workflow status-change 21.1 "In Progress" "Ready for Review" --merge-to-main

# This would:
# 1. Commit current work
# 2. Switch to main branch
# 3. Merge agent branch
# 4. Push to remote
# 5. Notify reviewers
```

## **Usage Examples**

### **Conflict Prevention:**
```bash
Agent Sarah: aaf workflow claim-story 21.1
# Creates: agent-sarah/story-21-1

Agent James: aaf workflow claim-story 21.1
# Error: Story 21.1 already claimed by AgentSarah
```

### **Parallel Work:**
```bash
Agent Sarah: aaf workflow claim-story 21.1 (auth system)
Agent James: aaf workflow claim-story 21.2 (password reset)
Agent Alex:  aaf workflow claim-story 21.3 (RBAC)

# All work in parallel, no conflicts
```

### **Review Workflow:**
```bash
# Sarah finishes
aaf workflow status-change 21.1 "In Progress" "Ready for Review"

# Reviewer checks out Sarah's branch
git checkout agent-sarah/story-21-1

# After review approval
git checkout main
git merge agent-sarah/story-21-1 --no-ff
git push origin main
```

This approach eliminates the need for multiple project directories while providing strong isolation and conflict prevention!