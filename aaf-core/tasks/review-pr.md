<!-- Powered by AAF™ Core -->

# review-pr

Perform comprehensive pull request review including architecture, security, performance, and standards compliance analysis.

## Purpose

Execute multi-layered code review to ensure pull requests meet quality, security, and architectural standards before merge. Provides structured feedback directly in GitHub while maintaining detailed analysis records.

## Prerequisites

- Pull request exists and is ready for review
- Access to related story/issue for context
- Understanding of project architecture and coding standards
- Security checklist and performance benchmarks available

## Review Layers

### Layer 1: Story Alignment
- Verify changes align with acceptance criteria
- Check for scope creep or unrelated modifications
- Validate all requirements are addressed
- Confirm no breaking changes without proper deprecation

### Layer 2: Architecture Compliance
- Validate domain boundaries and separation of concerns
- Check adherence to established design patterns
- Verify proper dependency injection and inversion
- Ensure SOLID principles are followed

### Layer 3: Security Analysis
- Scan for OWASP Top 10 vulnerabilities
- Check input validation and sanitization
- Verify authentication/authorization implementation
- Review data handling and storage practices

### Layer 4: Performance Impact
- Analyze algorithmic complexity (Big O)
- Check for potential memory leaks
- Verify database query optimization
- Assess caching and resource utilization

### Layer 5: Code Quality
- Verify coding standards compliance
- Check error handling and logging
- Validate test coverage and quality
- Review documentation completeness

## Review Decision Matrix

### APPROVE
- All layers pass validation
- No security or architectural violations
- Adequate test coverage
- Meets performance standards

### REQUEST CHANGES (BLOCKING)
- Security vulnerabilities present
- Architectural violations detected
- Breaking changes without proper handling
- Critical performance issues

### COMMENT (NON-BLOCKING)
- Minor style violations
- Documentation improvements needed
- Suggestion for optimization
- Educational feedback

## GitHub Review Format

Use structured format for all GitHub review comments:

```markdown
## 🔍 Code Review Analysis

### ✅ Approved Areas
- [List areas that meet standards]

### ⚠️ Issues Requiring Changes
- **Security**: [Specific vulnerability with line reference]
- **Architecture**: [Violation with correction needed]
- **Performance**: [Issue with optimization suggestion]

### 💡 Suggestions (Non-blocking)
- [Improvement recommendations]

### 📝 Next Steps
- [ ] Fix security issue at line X
- [ ] Refactor component Y to follow pattern Z
- [ ] Add integration tests for new endpoint

---
*Reviewed by Marcus (Senior Code Review Specialist)*
```

## File Analysis Checklist

**For each changed file:**
1. Read entire file for context
2. Analyze changes against established patterns
3. Check imports and dependencies
4. Verify error handling
5. Validate test coverage
6. Document findings with line references

## Security Focus Areas

- **Input Validation**: SQL injection, XSS, command injection
- **Authentication**: Proper session handling, token security
- **Authorization**: Access control, privilege escalation
- **Data Protection**: Encryption, sensitive data exposure
- **Dependencies**: Known vulnerabilities, license issues

## Performance Analysis

- **Complexity**: Algorithm efficiency, nested loops
- **Memory**: Leaks, excessive allocation, caching
- **Database**: N+1 queries, missing indices, inefficient joins
- **Network**: API calls, payload size, connection pooling

## Output Requirements

1. **ALWAYS** provide GitHub review with structured format
2. **ALWAYS** reference specific line numbers for issues
3. **ALWAYS** provide actionable remediation steps
4. **ALWAYS** distinguish between blocking and non-blocking issues
5. **ALWAYS** explain WHY changes are needed, not just WHAT

## Integration Points

- Link to story/issue being implemented
- Reference architectural decision records (ADRs)
- Connect to security policies and standards
- Relate to performance benchmarks and SLAs

## Key Principles

- Security vulnerabilities are always blocking
- Architecture violations require justification
- Provide educational feedback, not just criticism
- Be specific with line numbers and exact issues
- Offer solutions, not just problem identification
- Balance thoroughness with development velocity