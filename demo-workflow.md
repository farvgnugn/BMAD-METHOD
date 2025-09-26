# Workflow Orchestration Demo

This document demonstrates the complete workflow orchestration system for AAF Method agents.

## Prerequisites

1. Start the coordination server:
   ```bash
   node bmad-core/utils/test-coordination-server.js
   ```

2. Open multiple terminal windows for different agent roles.

## Demo Scenario: Complete Dev→Review→Dev Cycle

### Step 1: Developer Dashboard
```bash
# Agent James (Developer) checks their dashboard
node aaf-core/utils/workflow-orchestrator.js dashboard Developer MyProject
```

### Step 2: Status Change - Ready for Review
```bash
# James completes Story 21.1 and marks it ready for review
node aaf-core/utils/workflow-orchestrator.js status-change 21.1 "In Progress" "Ready for Review" "Feature complete with unit tests"
```

**What happens:**
- Coordination server broadcasts status change to all project agents
- Reviewers receive notification that story 21.1 is ready for review
- Story is added to pending reviews queue
- Branch information is tracked automatically

### Step 3: Reviewer Dashboard
```bash
# Agent Sarah (Reviewer) checks available reviews
node aaf-core/utils/workflow-orchestrator.js dashboard Reviewer MyProject
```

### Step 4: Claim Review
```bash
# Sarah claims the review
node aaf-core/utils/workflow-orchestrator.js claim-review 21.1 code-review
```

**What happens:**
- Story 21.1 is marked as claimed by Sarah
- James receives notification that his story is being reviewed
- Other reviewers see the story is no longer available

### Step 5: Complete Review with Changes
```bash
# Sarah completes review and requests changes
node aaf-core/utils/workflow-orchestrator.js complete-review 21.1 needs-changes "Missing integration tests" "Error handling needs improvement"
```

**What happens:**
- Review completion is broadcast to all project agents
- James receives notification that changes are needed
- Story returns to development queue with specific findings
- Review findings are tracked for James to address

### Step 6: Developer Checks Tasks
```bash
# James checks his tasks after review
node aaf-core/utils/workflow-orchestrator.js my-tasks Developer
```

**Expected output:**
```
My Developer Tasks:
  - 21.1: Address review findings for 21.1 (Status: needs-changes)
    Branch: feature/story-21-1
    Review Findings:
      • Missing integration tests
      • Error handling needs improvement
```

### Step 7: Status Change - Approved Flow
```bash
# After addressing findings, James resubmits
node aaf-core/utils/workflow-orchestrator.js status-change 21.1 "In Progress" "Ready for Review" "Addressed all review findings"

# Sarah reviews again
node aaf-core/utils/workflow-orchestrator.js claim-review 21.1 code-review

# Sarah approves
node aaf-core/utils/workflow-orchestrator.js complete-review 21.1 approved
```

**What happens:**
- Story moves to approved status
- James receives approval notification
- Story can proceed to deployment/done status
- Review tracking is cleaned up

## Key Features Demonstrated

### Real-time Communication
- All status changes are broadcast to relevant agents
- Project-scoped communication channels
- Role-based notifications (reviewers only see review requests, etc.)

### Story Claiming System
- Prevents reviewer conflicts through claiming mechanism
- Tracks who is working on what
- Automatic cleanup on disconnect

### Branch Integration
- Automatically detects current git branch
- Tracks branch information with stories
- Reviewers see which branch to review

### Targeted Notifications
- Developers get notified when their stories need changes
- Reviewers get notified when stories are ready for review
- Project-wide notifications for major milestones

### Task Management
- Each role sees relevant tasks in their dashboard
- Review findings are preserved and displayed
- Status tracking throughout the workflow

## Agent Integration

Agents can integrate this workflow system by:

1. **Connecting to workflow events:**
   ```javascript
   const WorkflowOrchestrator = require('./aaf-core/utils/workflow-orchestrator');
   const orchestrator = new WorkflowOrchestrator();
   await orchestrator.connect('AgentID', 'Developer', 'ProjectName', 'AgentName');
   ```

2. **Publishing status changes:**
   ```javascript
   await orchestrator.publishStoryStatusChange('21.1', 'In Progress', 'Ready for Review');
   ```

3. **Listening for notifications:**
   ```javascript
   orchestrator.socket.on('workflow-notification', (data) => {
       console.log(`📋 ${data.message}`);
   });
   ```

This creates a seamless workflow where agents communicate automatically as they progress through user stories, ensuring proper handoffs and preventing work conflicts.