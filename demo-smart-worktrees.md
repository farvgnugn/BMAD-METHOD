# Smart Worktree Workflow Demo

This demonstrates the complete automated workspace management system for AI agents.

## 🎯 The Problem Solved

**Before**: Multiple agents in same directory → file conflicts, overwritten work, merge disasters
**After**: Each agent gets isolated worktree → parallel work, no conflicts, shared Git history

## 🚀 Complete Agent Startup Flow

### **Super Simple: One Command Does Everything**

```bash
aaf workflow start-work Developer MyProject
```

**What happens automatically:**
1. 🔍 **Find work** - Scans available stories with smart prioritization
2. 🎯 **Auto-select** - Picks highest priority work (or prompts if multiple)
3. 📝 **Claim story** - Marks story as "In Progress"
4. 🌿 **Create worktree** - Sets up `../AgentName-workspace/`
5. 🌱 **Create branch** - `feature/story-21-1`
6. 📁 **Switch directory** - Auto-cd to workspace (when possible)

**Example Output:**
```
🚀 Starting work as Developer in MyProject...

🔍 Finding work for Agent Sarah (Developer) in MyProject...

🎯 Auto-selecting high priority work: 21.1

🎯 Auto-claiming: 21.1

🌿 Created worktree: ../Sarah-workspace
🌱 Branch: feature/story-21-1

✅ Ready to work!
📁 Workspace: ../Sarah-workspace
🌱 Branch: feature/story-21-1

🎬 To start working:
   cd ../Sarah-workspace

💡 Attempting to change directory...
✅ Changed to: /project/Sarah-workspace
```

## 🔄 Multi-Agent Scenario

### **Agent Sarah (Developer)**
```bash
cd /project
aaf workflow start-work Developer MyProject
# Creates: /project/Sarah-workspace/ on feature/story-21-1
```

### **Agent James (Developer) - Simultaneously**
```bash
cd /project
aaf workflow start-work Developer MyProject
# Creates: /project/James-workspace/ on feature/story-21-2
```

### **Agent Alex (Reviewer) - Simultaneously**
```bash
cd /project
aaf workflow start-work Reviewer MyProject
# Finds review work, no worktree needed (reviews in main dir)
```

## 🔧 Manual Control Options

### **If You Want Specific Story:**
```bash
aaf workflow claim-story 21.3
# Still creates worktree automatically
# Only creates worktree, doesn't change directory
```

### **If You Don't Want Worktree:**
```bash
aaf workflow claim-story 21.3 --no-worktree
# Works in main directory (single agent mode)
```

### **Clean Up When Done:**
```bash
aaf workflow cleanup-workspace
# Removes ../AgentName-workspace/ completely
```

## 📋 Complete Workflow Example

### **1. Agent Startup**
```bash
# Agent Sarah starts work
cd /my-project
aaf workflow start-work Developer

# Output:
🚀 Starting work as Developer in my-project...
🎯 Auto-selecting: 21.1 - User Authentication System
🌿 Created worktree: ../Sarah-workspace
✅ Ready to work!
💡 Changed to: /my-project/Sarah-workspace
```

### **2. Development Work**
```bash
# Sarah is now in ../Sarah-workspace with feature/story-21-1 branch
echo "auth code" > src/auth.js
git add src/auth.js
git commit -m "Add authentication logic"
git push origin feature/story-21-1
```

### **3. Ready for Review**
```bash
aaf workflow status-change 21.1 "In Progress" "Ready for Review" "Auth system complete"

# This broadcasts to all project agents
# Reviewers get notified automatically
```

### **4. Reviewer Takes Over**
```bash
# Agent Alex (Reviewer) gets notification and claims review
aaf workflow claim-review 21.1

# Alex works in main directory (or Sarah's branch)
git checkout feature/story-21-1
# Review the code...
```

### **5. Review Complete**
```bash
aaf workflow complete-review 21.1 approved
# Sarah gets notification that story is approved
```

### **6. Cleanup**
```bash
# Sarah cleans up workspace when moving to next story
aaf workflow cleanup-workspace
# Removes ../Sarah-workspace/

# Or automatically when claiming new story:
aaf workflow start-work Developer  # Auto-cleans old, creates new
```

## 🎯 Integration with AI Tools

### **For Claude Code (CLAUDE.md):**
```markdown
## Agent Startup

When starting work as a developer:
```bash
aaf workflow start-work Developer
```

This will automatically:
- Find available work
- Create isolated workspace
- Set up proper Git branch
- Change to workspace directory
```

### **For Other AI Tools:**
Create alias or function:
```bash
# .bashrc or equivalent
dev-start() {
    node aaf-core/utils/workflow-orchestrator.js start-work Developer $(basename $(pwd))
}

reviewer-start() {
    node aaf-core/utils/workflow-orchestrator.js start-work Reviewer $(basename $(pwd))
}
```

## ✅ Benefits Achieved

### **🚫 Problems Eliminated:**
- ❌ File conflicts between agents
- ❌ Overwritten work
- ❌ Git merge disasters
- ❌ Manual workspace setup
- ❌ Directory coordination issues

### **✅ Benefits Gained:**
- ✅ **Parallel Work**: Multiple agents work simultaneously
- ✅ **Isolated Changes**: Each agent has private workspace
- ✅ **Shared History**: All Git history/branches shared
- ✅ **Auto-Setup**: One command does everything
- ✅ **Smart Cleanup**: Automatic workspace management
- ✅ **Zero Conflicts**: Impossible for agents to interfere

### **💾 Storage Efficiency:**
- **Shared Git**: Only one `.git` directory
- **File Duplication**: Only working files copied (not history)
- **Typical Overhead**: ~10-50MB per workspace vs full clone
- **Easy Cleanup**: Worktrees removed when done

This creates the perfect multi-agent development environment where agents can work in parallel without any coordination overhead or conflict risks!