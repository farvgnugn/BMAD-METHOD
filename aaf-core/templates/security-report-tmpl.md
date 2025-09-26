<!-- Template for Security Analysis Reports -->

# Security Analysis Report Template

Use this template for detailed security findings and recommendations.

## Executive Summary Template

```markdown
# 🛡️ Security Analysis Report

**Target**: {PR_number} - {description}
**Analyst**: Marcus (Senior Code Review Specialist)
**Analysis Date**: {date}
**Risk Level**: {CRITICAL|HIGH|MEDIUM|LOW}

## Executive Summary

{brief_overview_of_security_posture}

**Findings**: {total_findings} security issues identified
- 🔴 Critical: {count}
- 🟠 High: {count}
- 🟡 Medium: {count}
- 🟢 Low: {count}

**Recommendation**: {BLOCK_MERGE|FIX_BEFORE_RELEASE|ACCEPTABLE_RISK}
```

## Detailed Findings Template

```markdown
## 🔍 Detailed Security Findings

### CRITICAL Issues

#### SEC-{number}: {vulnerability_name}
- **OWASP Category**: {owasp_category}
- **Location**: `{file}:{line}`
- **Vulnerability**: {technical_description}
- **Attack Vector**: {how_it_could_be_exploited}
- **Business Impact**: {what_data/systems_at_risk}
- **CVSS Score**: {score}/10
- **Remediation**:
  ```{language}
  {example_secure_code}
  ```
- **Verification**: {how_to_test_the_fix}
- **References**:
  - [OWASP Guide]({link})
  - [Security Standard]({link})

### HIGH Issues

{repeat_format_for_high_issues}

### MEDIUM Issues

{repeat_format_for_medium_issues}

### LOW Issues

{repeat_format_for_low_issues}
```

## Risk Assessment Matrix

```markdown
## 📊 Risk Assessment

| Finding ID | Vulnerability | Likelihood | Impact | Risk Score | Priority |
|------------|---------------|------------|--------|------------|----------|
| SEC-001    | SQL Injection | High       | High   | 9/10       | P0       |
| SEC-002    | Missing Auth  | Medium     | High   | 7/10       | P1       |
| SEC-003    | Info Leak     | Low        | Medium | 4/10       | P2       |

**Risk Scoring**: (Likelihood × Impact) = Risk Score
- **P0** (9-10): Fix immediately, block merge
- **P1** (7-8): Fix before release
- **P2** (5-6): Fix in next sprint
- **P3** (1-4): Track for future improvement
```

## Quick Security Checklist

```markdown
## ✅ Security Checklist Results

### Input Validation
- [ ] All user inputs validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] File upload restrictions and validation
- [ ] URL/path validation for SSRF prevention

### Authentication & Authorization
- [ ] Authentication required for protected resources
- [ ] Session management follows security best practices
- [ ] Authorization checks performed consistently
- [ ] Password policies and hashing standards met
- [ ] JWT/token validation implemented correctly

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Data transmission uses HTTPS/TLS
- [ ] API keys and secrets not hardcoded
- [ ] Personal data handling complies with privacy laws
- [ ] Database credentials properly secured

### Error Handling & Logging
- [ ] Error messages don't expose sensitive information
- [ ] Security events properly logged
- [ ] Rate limiting on critical operations
- [ ] Failed authentication attempts tracked
- [ ] Audit trail for sensitive operations

### Dependencies & Infrastructure
- [ ] Third-party dependencies scanned for vulnerabilities
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS policy properly configured
- [ ] File permissions and access controls set
- [ ] Environment configurations secured
```

## Remediation Plan Template

```markdown
## 🔧 Remediation Plan

### Immediate Actions (Block Merge)
1. **SEC-001**: Fix SQL injection in user query
   - **Assigned**: {developer}
   - **ETA**: {timeframe}
   - **Verification**: Security scan + manual test

### Before Release Actions
2. **SEC-002**: Implement missing authentication check
   - **Assigned**: {developer}
   - **ETA**: {timeframe}
   - **Verification**: Integration test

### Future Improvements
3. **SEC-003**: Add comprehensive input validation
   - **Priority**: Next sprint
   - **Effort**: {estimate}
   - **Owner**: {team/developer}

### Security Hardening Recommendations
- Implement Content Security Policy (CSP)
- Add rate limiting to authentication endpoints
- Regular security dependency updates
- Security training for development team
```

## Follow-up Template

```markdown
## 📋 Follow-up Requirements

### Re-review Criteria
- [ ] All CRITICAL and HIGH findings addressed
- [ ] Security tests added for vulnerabilities
- [ ] Code changes verified by security scan
- [ ] Documentation updated with security considerations

### Security Testing Requirements
- [ ] Automated security tests added
- [ ] Penetration testing scheduled (if needed)
- [ ] Security regression tests implemented
- [ ] Monitoring/alerting configured

### Sign-off Requirements
- [ ] Development team review complete
- [ ] Security findings addressed
- [ ] QA testing includes security scenarios
- [ ] Ready for production deployment
```

## Templates by Risk Level

### CRITICAL Security Issue
```markdown
🚨 **CRITICAL SECURITY VULNERABILITY DETECTED**

**{vulnerability_type}** found in `{file}:{line}`

**IMMEDIATE ACTION REQUIRED**: This vulnerability could lead to {impact}.

**Block merge until resolved.**

{detailed_technical_analysis}

{remediation_steps}
```

### Standard Security Finding
```markdown
🛡️ **Security Finding**: {vulnerability_name}

- **Risk**: {level}
- **Location**: `{file}:{line}`
- **Issue**: {description}
- **Fix**: {remediation}
- **Reference**: {security_standard_link}
```

---

*This template ensures comprehensive security analysis and clear communication of security risks to development teams.*