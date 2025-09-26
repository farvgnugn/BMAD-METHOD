<!-- Powered by AAF™ Core -->

# setup-ci-cd-pipeline

Design and implement continuous integration and deployment pipelines for reliable, automated software delivery.

## Purpose

Create robust CI/CD pipelines that automate testing, building, and deployment processes while ensuring code quality, security, and reliability. Enable teams to deploy confidently and frequently with minimal manual intervention.

## Prerequisites

- Source code repository access (Git-based)
- Understanding of application architecture and dependencies
- Target deployment environments defined
- Testing strategy and requirements established
- Security and compliance requirements identified
- Team workflow and approval processes defined

## CI/CD Pipeline Design Framework

### Phase 1: Pipeline Strategy and Architecture

#### Pipeline Requirements Analysis
```markdown
**Application Analysis:**
- [ ] Technology stack and build requirements
- [ ] Testing framework and coverage requirements
- [ ] Security scanning and compliance needs
- [ ] Performance testing and benchmarking
- [ ] Database migration and data management

**Environment Strategy:**
- [ ] Development environment automation
- [ ] Staging/UAT environment requirements
- [ ] Production deployment constraints
- [ ] Rollback and disaster recovery needs
- [ ] Multi-region or multi-cloud deployments

**Team Workflow Integration:**
- [ ] Branching strategy (GitFlow, GitHub Flow, etc.)
- [ ] Code review and approval processes
- [ ] Release management and versioning
- [ ] Hotfix and emergency deployment procedures
- [ ] Feature flag and gradual rollout strategies
```

#### Platform Selection and Architecture
```markdown
**CI/CD Platform Options:**
- [ ] GitHub Actions (integrated with GitHub repos)
- [ ] GitLab CI/CD (integrated GitLab platform)
- [ ] Jenkins (self-hosted, highly customizable)
- [ ] Azure DevOps (Microsoft ecosystem integration)
- [ ] AWS CodePipeline (AWS-native solution)
- [ ] CircleCI (cloud-based, Docker-friendly)
- [ ] TeamCity (JetBrains enterprise solution)

**Architecture Considerations:**
- [ ] Scalability and concurrent build capacity
- [ ] Security and secrets management
- [ ] Integration with existing tools and systems
- [ ] Cost implications and billing models
- [ ] Maintenance and administrative overhead
- [ ] Compliance and audit requirements
```

### Phase 2: Continuous Integration Setup

#### Source Code Integration
```markdown
**Repository Configuration:**
- [ ] Webhook setup for automatic trigger
- [ ] Branch protection rules and policies
- [ ] Required status checks before merge
- [ ] Automated security scanning on commits
- [ ] Code quality gates and thresholds

**Build Process Automation:**
- [ ] Automated dependency installation
- [ ] Code compilation and artifact generation
- [ ] Static code analysis and linting
- [ ] Security vulnerability scanning
- [ ] License compliance checking
```

#### Testing Automation Strategy
```markdown
**Testing Pipeline Stages:**
1. **Unit Tests**: Fast, isolated component testing
2. **Integration Tests**: Database and service integration
3. **API Tests**: Endpoint functionality and contracts
4. **Security Tests**: Vulnerability and penetration testing
5. **Performance Tests**: Load and stress testing
6. **End-to-End Tests**: Full user workflow validation

**Test Environment Management:**
- [ ] Test data management and provisioning
- [ ] Database seeding and migration testing
- [ ] Service mocking and test doubles
- [ ] Test environment cleanup and isolation
- [ ] Parallel test execution and optimization
```

#### Quality Gates and Checks
```markdown
**Code Quality Standards:**
- [ ] Code coverage thresholds (e.g., 80% minimum)
- [ ] Static analysis quality gates
- [ ] Security vulnerability severity limits
- [ ] Performance regression detection
- [ ] Documentation and comment requirements

**Automated Quality Checks:**
- [ ] SonarQube or similar code quality analysis
- [ ] ESLint, Prettier, or language-specific linting
- [ ] Dependency vulnerability scanning (Snyk, OWASP)
- [ ] License compliance verification
- [ ] API contract testing and validation
```

### Phase 3: Continuous Deployment Implementation

#### Environment Management Strategy
```markdown
**Environment Promotion Pipeline:**
1. **Development**: Automatic deployment on feature branch
2. **Staging**: Automatic deployment on main branch merge
3. **Production**: Manual approval + automatic deployment
4. **Hotfix**: Fast-track deployment for critical fixes

**Environment Configuration:**
- [ ] Infrastructure as Code for environment consistency
- [ ] Environment-specific configuration management
- [ ] Secrets and credential management
- [ ] Database migration automation
- [ ] Blue-green or canary deployment strategies
```

#### Deployment Automation
```markdown
**Deployment Strategies:**
- [ ] **Blue-Green Deployment**: Zero-downtime with instant rollback
- [ ] **Rolling Deployment**: Gradual instance replacement
- [ ] **Canary Deployment**: Gradual traffic shifting with monitoring
- [ ] **Feature Flags**: Runtime feature toggling and gradual rollout

**Deployment Process:**
- [ ] Pre-deployment health checks and validations
- [ ] Automated database migrations and schema updates
- [ ] Service dependency management and ordering
- [ ] Post-deployment smoke tests and validation
- [ ] Automated rollback triggers and procedures
```

#### Monitoring and Observability
```markdown
**Deployment Monitoring:**
- [ ] Application health and performance metrics
- [ ] Error rate and response time monitoring
- [ ] Database performance and connection monitoring
- [ ] Infrastructure resource utilization tracking
- [ ] User experience and transaction monitoring

**Alerting and Notifications:**
- [ ] Deployment success/failure notifications
- [ ] Performance degradation alerts
- [ ] Error rate threshold violations
- [ ] Security incident and anomaly detection
- [ ] Capacity and resource shortage warnings
```

## Platform-Specific Implementation

### GitHub Actions CI/CD
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test

    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

    - name: Security audit
      run: npm audit --audit-level moderate

    - name: Build application
      run: npm run build

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to staging
      run: |
        # Deployment commands here
        echo "Deploying to staging environment"

    - name: Run smoke tests
      run: npm run test:smoke
      env:
        API_URL: ${{ secrets.STAGING_API_URL }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to production
      run: |
        # Production deployment commands
        echo "Deploying to production environment"

    - name: Post-deployment verification
      run: npm run test:production-health
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
        DATABASE_URL = credentials('database-url')
        API_KEY = credentials('api-key')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                sh '''
                    nvm install $NODE_VERSION
                    nvm use $NODE_VERSION
                    npm ci
                '''
            }
        }

        stage('Lint and Test') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'test-results.xml'
                            publishCoverage adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')]
                        }
                    }
                }
                stage('Security Scan') {
                    steps {
                        sh 'npm audit --audit-level moderate'
                        sh 'npx snyk test'
                    }
                }
            }
        }

        stage('Integration Tests') {
            steps {
                sh '''
                    docker-compose up -d postgres
                    npm run test:integration
                    docker-compose down
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Deploy Staging') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    # Deploy to staging
                    kubectl set image deployment/app app=myapp:${BUILD_NUMBER} -n staging
                    kubectl rollout status deployment/app -n staging
                '''
            }
        }

        stage('Production Approval') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy',
                      submitterParameter: 'APPROVER'
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    # Blue-green deployment to production
                    kubectl set image deployment/app app=myapp:${BUILD_NUMBER} -n production
                    kubectl rollout status deployment/app -n production
                '''
            }
            post {
                success {
                    slackSend channel: '#deployments',
                             message: "✅ Successfully deployed ${env.JOB_NAME} ${env.BUILD_NUMBER} to production"
                }
                failure {
                    slackSend channel: '#deployments',
                             message: "❌ Failed to deploy ${env.JOB_NAME} ${env.BUILD_NUMBER} to production"
                }
            }
        }
    }
}
```

### GitLab CI/CD
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy-staging
  - deploy-production

variables:
  NODE_VERSION: "18"
  POSTGRES_DB: testdb
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres

cache:
  paths:
    - node_modules/

test:
  stage: test
  image: node:18
  services:
    - postgres:13
  variables:
    DATABASE_URL: postgres://postgres:postgres@postgres:5432/testdb
  before_script:
    - npm ci
  script:
    - npm run lint
    - npm run test:unit
    - npm run test:integration
    - npm audit --audit-level moderate
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: node:18
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

deploy-staging:
  stage: deploy-staging
  image: alpine/kubectl
  script:
    - kubectl config use-context staging
    - kubectl set image deployment/app app=myapp:$CI_COMMIT_SHA
    - kubectl rollout status deployment/app
  environment:
    name: staging
    url: https://staging.myapp.com
  only:
    - main

deploy-production:
  stage: deploy-production
  image: alpine/kubectl
  script:
    - kubectl config use-context production
    - kubectl set image deployment/app app=myapp:$CI_COMMIT_SHA
    - kubectl rollout status deployment/app
  environment:
    name: production
    url: https://myapp.com
  when: manual
  only:
    - main
```

## Security and Compliance Integration

### Secrets Management
```markdown
**Secrets Storage:**
- [ ] Use platform-native secret storage (GitHub Secrets, etc.)
- [ ] External secret managers (HashiCorp Vault, AWS Secrets Manager)
- [ ] Environment-specific secret isolation
- [ ] Secret rotation and expiration policies
- [ ] Audit logging for secret access

**Security Scanning:**
- [ ] Dependency vulnerability scanning
- [ ] Static Application Security Testing (SAST)
- [ ] Dynamic Application Security Testing (DAST)
- [ ] Container image security scanning
- [ ] Infrastructure as Code security validation
```

### Compliance and Auditing
```markdown
**Audit Requirements:**
- [ ] Change tracking and approval workflows
- [ ] Deployment history and rollback capabilities
- [ ] Security scanning results and remediation
- [ ] Compliance report generation
- [ ] Access control and permission management

**Regulatory Compliance:**
- [ ] SOC 2 compliance for security controls
- [ ] GDPR compliance for data processing
- [ ] HIPAA compliance for healthcare data
- [ ] PCI DSS for payment processing
- [ ] Industry-specific regulatory requirements
```

## Performance Optimization

### Pipeline Performance
```markdown
**Build Optimization:**
- [ ] Dependency caching strategies
- [ ] Parallel job execution
- [ ] Build artifact optimization
- [ ] Test execution optimization
- [ ] Resource allocation tuning

**Deployment Optimization:**
- [ ] Blue-green deployment for zero downtime
- [ ] Canary releases for risk mitigation
- [ ] Database migration optimization
- [ ] CDN cache invalidation strategies
- [ ] Health check and readiness probes
```

### Monitoring and Metrics
```markdown
**Pipeline Metrics:**
- [ ] Build success/failure rates
- [ ] Build duration and trends
- [ ] Test execution time and flakiness
- [ ] Deployment frequency and lead time
- [ ] Mean time to recovery (MTTR)

**Application Metrics:**
- [ ] Deployment success rate
- [ ] Application performance post-deployment
- [ ] Error rates and user impact
- [ ] Infrastructure resource utilization
- [ ] Cost per deployment and maintenance
```

## Output Requirements

### CI/CD Implementation Plan
```markdown
# CI/CD Pipeline Implementation: {Project Name}

## Current State Assessment
- Existing development and deployment processes
- Technology stack and infrastructure analysis
- Team workflow and approval requirements
- Security and compliance constraints

## Proposed Pipeline Architecture
- Platform selection and justification
- Pipeline stages and job definitions
- Environment strategy and promotion flow
- Security and quality gate implementation

## Implementation Roadmap
- Phase 1: Basic CI setup and testing automation
- Phase 2: CD implementation for staging environment
- Phase 3: Production deployment automation
- Phase 4: Advanced features and optimization

## Success Metrics and Monitoring
- Deployment frequency and lead time targets
- Quality metrics and error rate thresholds
- Performance benchmarks and SLA requirements
- Cost optimization and resource efficiency goals
```

### Technical Documentation
```markdown
- [ ] Pipeline configuration files and documentation
- [ ] Environment setup and configuration guides
- [ ] Troubleshooting and maintenance procedures
- [ ] Security and compliance validation processes
- [ ] Team training and onboarding materials
```

## Key Principles

- **Automation First**: Minimize manual intervention and human error
- **Security Integration**: Build security into every stage of the pipeline
- **Fast Feedback**: Provide rapid feedback on code quality and deployments
- **Reliability Focus**: Ensure consistent, predictable deployment processes
- **Observability**: Maintain visibility into all pipeline and application metrics
- **Continuous Improvement**: Regularly optimize pipeline performance and reliability
- **Team Enablement**: Empower development teams with self-service capabilities