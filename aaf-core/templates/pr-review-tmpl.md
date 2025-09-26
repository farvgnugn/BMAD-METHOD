<!-- Template for GitHub PR Review Comments -->

# Pull Request Review Template

Use this template for all GitHub pull request reviews to ensure consistent, structured feedback.

## Standard Review Format

```markdown
## 🔍 Code Review Analysis

**Story/Issue**: #{issue_number} - {story_title}
**Reviewer**: Marcus (Senior Code Review Specialist)
**Review Date**: {date}

### ✅ Approved Areas
{list_approved_areas}

### ⚠️ Issues Requiring Changes
{blocking_issues}

### 💡 Suggestions (Non-blocking)
{non_blocking_suggestions}

### 📊 Review Summary
- **Security**: {pass/fail with summary}
- **Architecture**: {pass/fail with summary}
- **Performance**: {pass/fail with summary}
- **Standards**: {pass/fail with summary}
- **Testing**: {pass/fail with summary}

### 📝 Next Steps
{action_items_checklist}

---
*This review ensures code quality, security, and architectural consistency.*
```

## Issue Format Template

For specific code issues, use this format:

```markdown
**{CATEGORY}**: {brief_description}
- **File**: `{file_path}`
- **Lines**: {line_numbers}
- **Issue**: {detailed_description}
- **Impact**: {what_could_go_wrong}
- **Fix**: {specific_remediation_steps}
- **Reference**: {link_to_standards_or_docs}
```

## Categories for Issues

- **SECURITY** - Vulnerabilities, injection risks, auth issues
- **ARCHITECTURE** - Design pattern violations, layer breaches
- **PERFORMANCE** - Efficiency, memory, scalability concerns
- **STANDARDS** - Coding conventions, documentation, style
- **TESTING** - Coverage gaps, test quality issues
- **DEPENDENCIES** - Library issues, version conflicts

## Severity Indicators

- 🔴 **CRITICAL** - Security vulnerability, production breaking
- 🟠 **HIGH** - Architecture violation, significant issue
- 🟡 **MEDIUM** - Should fix soon, not immediately blocking
- 🟢 **LOW** - Nice to have, minor improvement

## Quick Response Templates

### Approval Template
```markdown
## ✅ APPROVED

Excellent work! Code meets all quality standards:
- Security analysis: PASS
- Architecture compliance: PASS
- Performance impact: MINIMAL
- Test coverage: ADEQUATE
- Standards compliance: PASS

Ready for merge. 👍
```

### Request Changes Template
```markdown
## ⚠️ CHANGES REQUESTED

Code review identified {number} issues that must be addressed before merge:

{list_blocking_issues}

Once these are resolved, I'll re-review promptly.
```

### Minor Issues Template
```markdown
## 💬 COMMENTS

Code looks good overall! I have {number} suggestions for improvement:

{list_suggestions}

These are non-blocking - feel free to address now or in a follow-up PR.
```

## Final Review Actions

- **APPROVE**: All standards met, ready for merge
- **REQUEST CHANGES**: Blocking issues must be resolved
- **COMMENT**: Feedback provided, developer decides next steps

---

*Template ensures consistent, professional code review feedback that helps maintain code quality while supporting developer growth.*