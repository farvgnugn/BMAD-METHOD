# Find Work Command Demo

This demonstrates the intelligent work-finding capabilities for AI agents.

## Setup

Start the coordination server:
```bash
node bmad-core/utils/test-coordination-server.js
```

## Use Cases

### 1. **Agent Starting Fresh** (No current work)

```bash
aaf workflow find-work Developer MyProject
```

**Expected Output:**
```
🔍 Finding work for Agent James (Developer) in MyProject...

🎯 Available Work for Agent James (Developer):
============================================================

📝 AVAILABLE:
1. 15.1: User Authentication System
   └─ Available story in Epic 15

2. 15.2: Password Reset Flow
   └─ Available story in Epic 15

3. 15.3: Role-Based Access Control
   └─ Available story in Epic 15

💡 Commands:
  aaf workflow claim-story <storyId>     # Claim and start work
  aaf workflow find-work --auto-select   # Auto-select work
```

### 2. **Agent with Auto-Select** (Smart selection)

```bash
aaf workflow find-work Developer MyProject --auto-select
```

**Expected Output:**
```
🔍 Finding work for Agent James (Developer) in MyProject...

🎯 Available Work for Agent James (Developer):
============================================================

📝 AVAILABLE:
1. 15.1: User Authentication System
   └─ Available story in Epic 15

🎯 Auto-selecting contextual work: 15.1

🎯 Selected: 15.1 - User Authentication System
📋 Action: Start working on this story
💡 Next steps:
  1. aaf workflow claim-story 15.1
  2. git checkout -b feature/story-15-1
```

### 3. **Agent on Feature Branch** (Contextual awareness)

```bash
# If agent is on branch 'feature/story-21-1' with pending changes
git checkout feature/story-21-1
aaf workflow find-work Developer MyProject --auto-select
```

**Expected Output:**
```
🔍 Finding work for Agent Sarah (Developer) in MyProject...

🎯 Available Work for Agent Sarah (Developer):
============================================================

🔥 HIGH PRIORITY:
1. 21.1: Address review findings for 21.1
   └─ You're currently on branch 'feature/story-21-1' for this story
   └─ Branch: feature/story-21-1
   └─ Findings: "Missing unit tests", "Error handling needs improvement"

🎯 Auto-selecting contextual work: 21.1

🎯 Selected: 21.1 - Address review findings for 21.1
📋 Action: address review findings
💡 You're already on the right branch: feature/story-21-1
```

### 4. **Reviewer Looking for Work**

```bash
aaf workflow find-work Reviewer MyProject
```

**Expected Output:**
```
🔍 Finding work for Agent Alex (Reviewer) in MyProject...

🎯 Available Work for Agent Alex (Reviewer):
============================================================

📋 MEDIUM PRIORITY:
1. 21.2: Review Story 21.2
   └─ Review requested by James
   └─ Branch: feature/user-profile

2. 21.3: Review Story 21.3
   └─ Review requested by Sarah
   └─ Branch: feature/dashboard

💡 Commands:
  aaf workflow claim-review <storyId>    # Claim review
  aaf workflow find-work --auto-select   # Auto-select work
```

### 5. **Complex Priority Scenario**

```bash
# Agent with multiple types of work available
aaf workflow find-work Developer MyProject
```

**Expected Output:**
```
🎯 Available Work for Agent Maria (Developer):
============================================================

🔥 HIGH PRIORITY:
1. 20.5: Address review findings for 20.5
   └─ Review completed with changes needed
   └─ Findings: "Performance optimization needed", "Add error logging"

📋 MEDIUM PRIORITY:
2. 19.1: Continue development on 19.1
   └─ Task assigned to you

📝 AVAILABLE:
3. 21.4: Implement search functionality
   └─ Available story in Epic 21

4. 21.5: Add user preferences
   └─ Available story in Epic 21

💡 Commands:
  aaf workflow claim-story <storyId>     # Claim and start work
  aaf workflow find-work --auto-select   # Auto-select work
```

## Integration with AI Agents

### For Claude Code

Add to your project's CLAUDE.md:

```markdown
## Workflow Integration

When starting work, run:
```bash
aaf workflow find-work Developer $(basename $(pwd)) --auto-select
```

This will:
1. Connect to coordination server
2. Register as a Developer agent
3. Find highest priority work
4. Auto-select if there's obvious work to do
5. Provide next steps for claiming/starting work
```

### For Cursor/Other IDEs

Create a script or alias:

```bash
#!/bin/bash
# save as find-my-work.sh
node aaf-core/utils/workflow-orchestrator.js find-work Developer $(basename $(pwd)) --auto-select
```

## Key Features

### 🧠 **Smart Prioritization**
1. **HIGH**: Stories needing changes from failed reviews
2. **MEDIUM**: Assigned tasks and available reviews
3. **LOW**: General available stories

### 🔍 **Contextual Awareness**
- Detects current git branch
- Finds work related to current branch
- Suggests continuing interrupted work

### ⚡ **Auto-Selection Logic**
- Single high-priority item → auto-selects
- Current branch work → auto-selects
- Multiple options → presents choice

### 🎯 **Role-Specific Work**
- **Developers**: Get stories and review fixes
- **Reviewers**: Get review requests
- **QA/Architects**: Get specialized reviews

This creates a seamless "looking for work" experience where AI agents can intelligently discover and prioritize their next tasks based on context, priority, and role.