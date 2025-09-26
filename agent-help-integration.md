# Agent Help Menu Integration

## For Claude Code (CLAUDE.md)

Add this section to your project's CLAUDE.md:

```markdown
## AAF Workflow Commands

### Developer Role
When working as a developer agent:

```bash
# Find available work with smart prioritization
aaf workflow find-work Developer --auto-select

# Check your assigned tasks
aaf workflow my-tasks Developer

# Claim and start working on a story
aaf workflow claim-story 21.1

# Mark story ready for review
aaf workflow status-change 21.1 "In Progress" "Ready for Review"

# View dashboard
aaf workflow dashboard Developer
```

### QA/Reviewer Role
When working as a QA or reviewer agent:

```bash
# Find available reviews
aaf workflow find-work Reviewer --auto-select

# List pending reviews
aaf workflow list-reviews

# Claim a review
aaf workflow claim-review 21.1

# Complete review with findings
aaf workflow complete-review 21.1 needs-changes "Missing tests" "Error handling needed"

# Complete review with approval
aaf workflow complete-review 21.1 approved
```

### Quick Start
- Type `/developer` to start as developer and find work
- Type `/reviewer` to start as reviewer and find reviews
- Use `--auto-select` to automatically pick highest priority work
```

## For Other AI Tools (Cursor, Windsurf, etc.)

Create help functions they can call:

### dev-help.sh
```bash
#!/bin/bash
echo "🔧 Developer Commands:"
echo "  aaf workflow find-work Developer --auto-select    # Find work automatically"
echo "  aaf workflow my-tasks Developer                   # Check assigned tasks"
echo "  aaf workflow claim-story <id>                     # Claim story"
echo "  aaf workflow status-change <id> <old> <new>       # Update status"
echo ""
echo "Example workflow:"
echo "  1. aaf workflow find-work Developer --auto-select"
echo "  2. git checkout -b feature/story-21-1"
echo "  3. # Do development work"
echo "  4. aaf workflow status-change 21.1 'In Progress' 'Ready for Review'"
```

### qa-help.sh
```bash
#!/bin/bash
echo "🔍 QA/Reviewer Commands:"
echo "  aaf workflow find-work Reviewer --auto-select     # Find reviews automatically"
echo "  aaf workflow list-reviews                         # List pending reviews"
echo "  aaf workflow claim-review <id>                    # Claim review"
echo "  aaf workflow complete-review <id> <status>        # Complete review"
echo ""
echo "Review statuses: approved, needs-changes, rejected"
echo ""
echo "Example workflow:"
echo "  1. aaf workflow find-work Reviewer --auto-select"
echo "  2. git checkout <branch-name>"
echo "  3. # Review code"
echo "  4. aaf workflow complete-review 21.1 needs-changes 'Missing tests'"
```

## Integration Patterns

### Auto-Discovery on Role Activation
```bash
# When agent takes developer role
alias dev-start='aaf workflow find-work Developer --auto-select'

# When agent takes reviewer role
alias qa-start='aaf workflow find-work Reviewer --auto-select'
```

### Interruptible Workflow
```bash
# Non-blocking work discovery (shows options but doesn't auto-claim)
aaf workflow find-work Developer  # Shows options, waits for choice

# Auto-select for autonomous operation
aaf workflow find-work Developer --auto-select  # Picks work automatically
```

### Conversation-Friendly Integration
```markdown
## Agent Behavior

**Starting Work:**
- Agent can run `aaf workflow find-work` to discover available work
- Use `--auto-select` only when you want autonomous operation
- Without `--auto-select`, agent presents options and waits for user choice

**During Conversation:**
- Agent remains available for conversation
- Work discovery is manual/on-demand
- Agent can pause work to discuss or get guidance

**Resuming Work:**
- Agent can run `find-work` again to see current priorities
- Contextual awareness shows work on current git branch
```

This approach gives you:
- ✅ Work discovery when agents need it
- ✅ Conversation interruption capability
- ✅ Clear help/guidance for each role
- ✅ Flexibility between autonomous and guided operation