# Story File Format

The AAF coordination server can read user stories from `/docs/stories` directory in multiple formats.

## Supported File Formats

### 1. YAML Format (.yaml, .yml)

```yaml
# docs/stories/21.1-user-auth.yaml
id: "21.1"
title: "User Authentication System"
description: "Implement secure user login and session management"
status: "Available"  # Available, In Progress, Ready for Review, Done
priority: "high"     # high, medium, low
epic_id: "21"
details: |
  ## Acceptance Criteria
  - Users can log in with email/password
  - Sessions expire after 24 hours
  - Failed login attempts are rate limited

  ## Technical Notes
  - Use JWT tokens for sessions
  - Implement bcrypt for password hashing
```

### 2. JSON Format (.json)

```json
{
  "id": "21.2",
  "title": "Password Reset Flow",
  "description": "Allow users to reset forgotten passwords via email",
  "status": "Available",
  "priority": "medium",
  "epic_id": "21",
  "details": "Send secure reset tokens via email with 1-hour expiration"
}
```

### 3. Markdown with Frontmatter (.md)

```markdown
---
id: "21.3"
title: "Role-Based Access Control"
status: "Available"
priority: "high"
epic_id: "21"
---

# Role-Based Access Control

Implement user roles and permissions system.

## Acceptance Criteria
- Admin users can manage other users
- Regular users have limited access
- Guest users are read-only

## Implementation Notes
- Use middleware for route protection
- Store permissions in database
- Cache user permissions for performance
```

### 4. Simple Markdown (.md)

```markdown
# Story 21.4: Search Functionality

Add global search capability across the application.

Users should be able to search for content, users, and documents
from a unified search interface.
```

## Field Mapping

The coordination server maps story fields as follows:

| Field | YAML/JSON | Markdown | Default |
|-------|-----------|----------|---------|
| ID | `id` or `story_id` | Frontmatter `id` or filename | filename |
| Title | `title` | Frontmatter `title` or first `#` heading | `"Story {filename}"` |
| Description | `description` | `description` in frontmatter | `""` |
| Status | `status` | `status` in frontmatter | `"Available"` |
| Priority | `priority` | `priority` in frontmatter | `"medium"` |
| Epic ID | `epic_id` or `epicId` | `epic_id` in frontmatter | Extracted from story ID |

## File Organization Examples

```
docs/
└── stories/
    ├── 21.1-user-auth.yaml         # Epic 21, Story 1
    ├── 21.2-password-reset.json    # Epic 21, Story 2
    ├── 21.3-rbac.md                # Epic 21, Story 3
    ├── 22.1-search.md              # Epic 22, Story 1
    └── backlog/
        ├── future-feature.yaml     # Future stories
        └── ideas.md                # Story ideas
```

## Automatic Loading

The coordination server:

1. **Scans** for `/docs/stories` directory in:
   - Current working directory
   - Parent directory
   - Relative to server location

2. **Loads** all `.yaml`, `.yml`, `.json`, and `.md` files

3. **Watches** for file changes and reloads automatically

4. **Preserves** claimed story status during reloads

## Integration with find-work

Stories loaded from files are automatically available for the `find-work` command:

```bash
aaf workflow find-work Developer MyProject --auto-select
```

**Output:**
```
🔍 Finding work for Agent Sarah (Developer) in MyProject...

📝 AVAILABLE:
1. 21.1: User Authentication System
   └─ Available story in Epic 21
   └─ Priority: high

2. 21.2: Password Reset Flow
   └─ Available story in Epic 21
   └─ Priority: medium
```

## Best Practices

1. **Consistent Naming**: Use `{epic}.{story}` format for story IDs
2. **Status Management**: Update status as stories progress
3. **Priority Setting**: Use priorities to guide work selection
4. **Rich Descriptions**: Include acceptance criteria and technical notes
5. **File Organization**: Group related stories by epic or feature