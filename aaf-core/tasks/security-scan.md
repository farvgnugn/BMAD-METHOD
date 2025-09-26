<!-- Powered by AAF™ Core -->

# security-scan

Perform focused security analysis on code changes to identify vulnerabilities, injection risks, and secure coding violations.

## Purpose

Execute comprehensive security review of code changes to prevent vulnerabilities from reaching production. Focuses on OWASP Top 10, injection attacks, authentication flaws, and data protection issues.

## Prerequisites

- Code files or PR changes to analyze
- Understanding of application security context
- Access to security checklist and coding standards
- Knowledge of project authentication/authorization patterns

## Security Analysis Framework

### OWASP Top 10 Focus Areas

#### 1. Broken Access Control
- Check authorization before every sensitive operation
- Verify user permissions match required access level
- Look for direct object reference vulnerabilities
- Validate session handling and token management

#### 2. Cryptographic Failures
- Identify hardcoded secrets or weak encryption
- Check for proper SSL/TLS implementation
- Verify password hashing uses strong algorithms
- Look for sensitive data in logs or error messages

#### 3. Injection Attacks
- SQL injection in database queries
- NoSQL injection in database operations
- Command injection in system calls
- LDAP, XML, and other injection vectors

#### 4. Insecure Design
- Missing security controls in business logic
- Insufficient rate limiting on critical endpoints
- Lack of input validation on user data
- Missing security headers and configurations

#### 5. Security Misconfiguration
- Default credentials or configurations
- Unnecessary features or services enabled
- Missing security patches or updates
- Improper error handling exposing internals

#### 6. Vulnerable Components
- Known vulnerabilities in dependencies
- Outdated libraries with security issues
- Insecure third-party integrations
- Missing security patches

#### 7. Authentication Failures
- Weak password policies or requirements
- Session fixation vulnerabilities
- Insufficient brute force protection
- Missing multi-factor authentication

#### 8. Data Integrity Failures
- Software and data integrity failures
- Insecure deserialization
- Missing integrity checks
- Supply chain attacks

#### 9. Security Logging Failures
- Missing security event logging
- Insufficient log monitoring
- Log injection vulnerabilities
- Sensitive data in logs

#### 10. Server-Side Request Forgery
- SSRF in URL handling
- Internal network access vulnerabilities
- Missing URL validation
- Insufficient network segmentation

## Code Analysis Checklist

### Input Validation
```markdown
- [ ] All user inputs are validated and sanitized
- [ ] Input length limits are enforced
- [ ] Special characters are properly escaped
- [ ] File uploads are validated (type, size, content)
- [ ] URL parameters are validated
```

### Authentication & Authorization
```markdown
- [ ] Authentication is required for protected resources
- [ ] Session management follows security best practices
- [ ] Authorization checks are performed consistently
- [ ] Password handling meets security standards
- [ ] JWT tokens are properly validated
```

### Data Protection
```markdown
- [ ] Sensitive data is encrypted at rest
- [ ] Data transmission uses encryption (HTTPS/TLS)
- [ ] Passwords are properly hashed (bcrypt, Argon2)
- [ ] API keys and secrets are not hardcoded
- [ ] Personal data handling follows privacy regulations
```

### Error Handling
```markdown
- [ ] Error messages don't expose sensitive information
- [ ] Stack traces are not shown to end users
- [ ] Logging captures security events appropriately
- [ ] Failed authentication attempts are logged
- [ ] Rate limiting is implemented for critical operations
```

## Vulnerability Risk Assessment

### CRITICAL (Must Fix Before Merge)
- SQL injection vulnerabilities
- Authentication bypasses
- Authorization failures
- Hardcoded secrets or credentials
- Remote code execution risks

### HIGH (Should Fix Before Release)
- XSS vulnerabilities
- CSRF vulnerabilities
- Insecure direct object references
- Weak encryption implementation
- Missing security headers

### MEDIUM (Fix in Next Sprint)
- Information disclosure
- Weak session management
- Missing rate limiting
- Insecure configurations
- Insufficient logging

### LOW (Track for Future Fix)
- Missing security headers (non-critical)
- Verbose error messages
- Minor information leakage
- Documentation gaps
- Style guide violations

## Security Finding Format

For each security issue found:

```yaml
finding_id: SEC-{number}
severity: CRITICAL|HIGH|MEDIUM|LOW
category: injection|auth|crypto|access|misc
description: "Brief description of the vulnerability"
location: "file:line or function name"
impact: "What could happen if exploited"
remediation: "Specific steps to fix the issue"
references: ["OWASP link", "Documentation link"]
```

## Output Requirements

1. **ALWAYS** classify findings by severity (CRITICAL/HIGH/MEDIUM/LOW)
2. **ALWAYS** provide specific file and line references
3. **ALWAYS** include remediation steps for each finding
4. **ALWAYS** assess potential impact of each vulnerability
5. **ALWAYS** reference OWASP or security standards when applicable

## Integration with Code Review

Security findings should be integrated into PR reviews with:

```markdown
## 🛡️ Security Analysis Results

### CRITICAL Issues (Must Fix)
- **SEC-001**: SQL injection at `user.service.js:45`
  - **Impact**: Database compromise, data theft
  - **Fix**: Use parameterized queries instead of string concatenation

### HIGH Issues (Should Fix)
- **SEC-002**: Missing authentication check at `api/admin.js:12`
  - **Impact**: Unauthorized admin access
  - **Fix**: Add authentication middleware before admin routes

### Recommendations
- Enable security headers (CSP, HSTS, X-Frame-Options)
- Implement rate limiting on authentication endpoints
- Add input validation middleware
```

## Key Principles

- Security vulnerabilities always block merge
- Provide clear remediation steps for each finding
- Reference security standards and best practices
- Focus on exploitability and business impact
- Educate developers on secure coding practices
- Balance security with development productivity