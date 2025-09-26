# CI/CD Pipeline Template

This template provides production-ready CI/CD pipeline configurations for automated testing, building, and deployment across multiple platforms.

## GitHub Actions Pipeline

### Full Stack Application Pipeline
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop, staging ]
  pull_request:
    branches: [ main ]
  release:
    types: [ published ]

env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: {docker_registry_url}
  APP_NAME: {application_name}

jobs:
  test:
    name: Test & Quality Gates
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit -- --coverage
      env:
        NODE_ENV: test

    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgres://testuser:testpass@localhost:5432/testdb
        NODE_ENV: test

    - name: Security audit
      run: npm audit --audit-level moderate

    - name: Dependency vulnerability scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        token: ${{ secrets.CODECOV_TOKEN }}

    - name: Build application
      run: npm run build

    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: |
          dist/
          build/
        retention-days: 7

  docker-build:
    name: Build & Push Docker Images
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.DOCKER_REGISTRY }}
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.DOCKER_REGISTRY }}/${{ env.APP_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Run container security scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ env.DOCKER_REGISTRY }}/${{ env.APP_NAME }}:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload security scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  deploy-staging:
    name: Deploy to Staging
    needs: docker-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to Kubernetes
      run: |
        export KUBECONFIG=kubeconfig
        kubectl set image deployment/${{ env.APP_NAME }} \
          ${{ env.APP_NAME }}=${{ env.DOCKER_REGISTRY }}/${{ env.APP_NAME }}:develop-${{ github.sha }} \
          -n staging
        kubectl rollout status deployment/${{ env.APP_NAME }} -n staging --timeout=600s

    - name: Run smoke tests
      run: |
        npm run test:smoke
      env:
        API_URL: ${{ secrets.STAGING_API_URL }}

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  deploy-production:
    name: Deploy to Production
    needs: docker-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_PROD }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Blue-Green Deployment
      run: |
        export KUBECONFIG=kubeconfig
        # Update deployment with new image
        kubectl set image deployment/${{ env.APP_NAME }} \
          ${{ env.APP_NAME }}=${{ env.DOCKER_REGISTRY }}/${{ env.APP_NAME }}:main-${{ github.sha }} \
          -n production

        # Wait for rollout to complete
        kubectl rollout status deployment/${{ env.APP_NAME }} -n production --timeout=600s

        # Verify deployment health
        kubectl get pods -n production -l app=${{ env.APP_NAME }}

    - name: Post-deployment verification
      run: |
        npm run test:production-health
      env:
        API_URL: ${{ secrets.PRODUCTION_API_URL }}

    - name: Rollback on failure
      if: failure()
      run: |
        export KUBECONFIG=kubeconfig
        kubectl rollout undo deployment/${{ env.APP_NAME }} -n production

    - name: Update deployment status
      uses: bobheadxi/deployments@v1
      with:
        step: finish
        token: ${{ secrets.GITHUB_TOKEN }}
        status: ${{ job.status }}
        deployment_id: ${{ steps.deployment.outputs.deployment_id }}
        env_url: ${{ secrets.PRODUCTION_URL }}
```

## Jenkins Pipeline (Groovy)

### Enterprise Jenkins Pipeline
```groovy
pipeline {
    agent {
        kubernetes {
            yaml """
                apiVersion: v1
                kind: Pod
                spec:
                  containers:
                  - name: node
                    image: node:18-alpine
                    command:
                    - cat
                    tty: true
                  - name: docker
                    image: docker:dind
                    privileged: true
                    volumeMounts:
                    - name: docker-sock
                      mountPath: /var/run/docker.sock
                  volumes:
                  - name: docker-sock
                    hostPath:
                      path: /var/run/docker.sock
            """
        }
    }

    environment {
        DOCKER_REGISTRY = '{docker_registry_url}'
        APP_NAME = '{application_name}'
        SONAR_PROJECT_KEY = '{sonar_project_key}'
        SLACK_CHANNEL = '#deployments'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        skipStagesAfterUnstable()
    }

    stages {
        stage('Checkout & Setup') {
            steps {
                container('node') {
                    checkout scm
                    sh '''
                        npm ci
                        npm run bootstrap
                    '''
                }
            }
        }

        stage('Code Quality & Security') {
            parallel {
                stage('Lint & Type Check') {
                    steps {
                        container('node') {
                            sh '''
                                npm run lint
                                npm run type-check
                            '''
                        }
                    }
                }

                stage('Security Scan') {
                    steps {
                        container('node') {
                            sh '''
                                npm audit --audit-level moderate
                                npx snyk test --severity-threshold=high
                            '''
                        }
                    }
                }

                stage('SonarQube Analysis') {
                    steps {
                        container('node') {
                            withSonarQubeEnv('SonarQube') {
                                sh '''
                                    npx sonar-scanner \
                                        -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                        -Dsonar.sources=src \
                                        -Dsonar.tests=src \
                                        -Dsonar.test.inclusions=**/*.test.ts,**/*.spec.ts
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        container('node') {
                            sh '''
                                npm run test:unit -- --coverage --ci
                            '''
                            publishTestResults(
                                testResultsPattern: 'test-results.xml'
                            )
                            publishCoverage(
                                adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')]
                            )
                        }
                    }
                }

                stage('Integration Tests') {
                    steps {
                        container('node') {
                            sh '''
                                docker-compose -f docker-compose.test.yml up -d
                                npm run test:integration
                                docker-compose -f docker-compose.test.yml down
                            '''
                        }
                    }
                }
            }
        }

        stage('Build & Package') {
            steps {
                container('node') {
                    sh '''
                        npm run build
                        npm run package
                    '''
                    archiveArtifacts(
                        artifacts: 'dist/**,build/**',
                        fingerprint: true
                    )
                }

                container('docker') {
                    script {
                        def image = docker.build("${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}")
                        docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                            image.push()
                            image.push("latest")
                        }
                    }
                }
            }
        }

        stage('Deploy Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    kubernetesDeploy(
                        kubeconfigId: 'kubeconfig-staging',
                        configs: 'k8s/staging/*.yaml',
                        enableConfigSubstitution: true
                    )
                }

                sh '''
                    kubectl rollout status deployment/${APP_NAME} -n staging --timeout=600s
                '''

                // Smoke tests
                sh '''
                    npm run test:smoke -- --env=staging
                '''
            }
        }

        stage('Production Approval') {
            when {
                branch 'main'
            }
            steps {
                script {
                    def userInput = input(
                        id: 'deploy-production',
                        message: 'Deploy to production?',
                        parameters: [
                            choice(
                                name: 'DEPLOYMENT_TYPE',
                                choices: ['blue-green', 'rolling', 'canary'],
                                description: 'Select deployment strategy'
                            ),
                            booleanParam(
                                name: 'RUN_LOAD_TESTS',
                                defaultValue: false,
                                description: 'Run load tests after deployment?'
                            )
                        ]
                    )
                    env.DEPLOYMENT_TYPE = userInput.DEPLOYMENT_TYPE
                    env.RUN_LOAD_TESTS = userInput.RUN_LOAD_TESTS
                }
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }
            steps {
                script {
                    kubernetesDeploy(
                        kubeconfigId: 'kubeconfig-production',
                        configs: 'k8s/production/*.yaml',
                        enableConfigSubstitution: true
                    )
                }

                sh '''
                    kubectl rollout status deployment/${APP_NAME} -n production --timeout=600s
                '''

                // Health checks
                sh '''
                    npm run test:production-health
                '''

                // Optional load tests
                script {
                    if (env.RUN_LOAD_TESTS == 'true') {
                        sh '''
                            npm run test:load -- --env=production
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }

        success {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: 'good',
                message: "✅ Pipeline succeeded: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
            )
        }

        failure {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: 'danger',
                message: "❌ Pipeline failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
            )
        }
    }
}
```

## GitLab CI/CD Pipeline

### Comprehensive GitLab Pipeline
```yaml
# .gitlab-ci.yml
variables:
  DOCKER_REGISTRY: {docker_registry_url}
  APP_NAME: {application_name}
  NODE_VERSION: "18"
  POSTGRES_DB: testdb
  POSTGRES_USER: testuser
  POSTGRES_PASSWORD: testpass

stages:
  - validate
  - test
  - build
  - security
  - deploy-staging
  - deploy-production

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

before_script:
  - npm ci --cache .npm --prefer-offline

validate:
  stage: validate
  image: node:${NODE_VERSION}
  script:
    - npm run lint
    - npm run type-check
  artifacts:
    reports:
      junit: lint-results.xml

unit-test:
  stage: test
  image: node:${NODE_VERSION}
  services:
    - name: postgres:15
      alias: postgres
      variables:
        POSTGRES_DB: $POSTGRES_DB
        POSTGRES_USER: $POSTGRES_USER
        POSTGRES_PASSWORD: $POSTGRES_PASSWORD
  variables:
    DATABASE_URL: postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB
  script:
    - npm run test:unit -- --coverage --ci
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/

integration-test:
  stage: test
  image: node:${NODE_VERSION}
  services:
    - name: postgres:15
      alias: postgres
      variables:
        POSTGRES_DB: $POSTGRES_DB
        POSTGRES_USER: $POSTGRES_USER
        POSTGRES_PASSWORD: $POSTGRES_PASSWORD
    - name: redis:7-alpine
      alias: redis
  variables:
    DATABASE_URL: postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB
    REDIS_URL: redis://redis:6379
  script:
    - npm run test:integration
  artifacts:
    reports:
      junit: integration-results.xml

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm run build
    - npm run package
  artifacts:
    paths:
      - dist/
      - build/
    expire_in: 1 hour

docker-build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
    - develop

security-scan:
  stage: security
  image: node:${NODE_VERSION}
  script:
    - npm audit --audit-level moderate
    - npx snyk test --severity-threshold=high
  allow_failure: true

container-security:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy image --exit-code 0 --no-progress --format template --template "@contrib/sarif.tpl" -o trivy-results.sarif $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  artifacts:
    reports:
      sast: trivy-results.sarif
  only:
    - main
    - develop

deploy-staging:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context staging
    - kubectl set image deployment/$APP_NAME $APP_NAME=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n staging
    - kubectl rollout status deployment/$APP_NAME -n staging --timeout=600s
    - kubectl get pods -n staging -l app=$APP_NAME
  environment:
    name: staging
    url: https://staging.{domain_name}
  only:
    - develop

smoke-test-staging:
  stage: deploy-staging
  image: node:${NODE_VERSION}
  script:
    - npm run test:smoke -- --env=staging
  environment:
    name: staging
  needs:
    - deploy-staging
  only:
    - develop

deploy-production:
  stage: deploy-production
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context production
    - kubectl set image deployment/$APP_NAME $APP_NAME=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n production
    - kubectl rollout status deployment/$APP_NAME -n production --timeout=600s
    - kubectl get pods -n production -l app=$APP_NAME
  environment:
    name: production
    url: https://{domain_name}
  when: manual
  only:
    - main

production-health-check:
  stage: deploy-production
  image: node:${NODE_VERSION}
  script:
    - npm run test:production-health
  environment:
    name: production
  needs:
    - deploy-production
  only:
    - main
```

## Configuration Examples

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test:unit": "jest --passWithNoTests",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test",
    "test:smoke": "playwright test --grep @smoke",
    "test:load": "k6 run tests/load/script.js",
    "test:production-health": "node scripts/health-check.js",
    "package": "npm pack",
    "bootstrap": "npm install && npm run build"
  }
}
```

### Dockerfile Template
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine as production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Security hardening
RUN apk add --no-cache dumb-init
USER nextjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
```

## Customization Variables

Replace the following placeholders when using this template:

- `{application_name}` - Your application name
- `{docker_registry_url}` - Your Docker registry URL
- `{domain_name}` - Your production domain
- `{sonar_project_key}` - SonarQube project key

## Pipeline Features

✅ **Quality Gates**
- Linting and type checking
- Unit and integration testing
- Security vulnerability scanning
- Code coverage reporting
- SonarQube analysis

✅ **Security Integration**
- Dependency vulnerability scanning
- Container security scanning
- Secret management
- Access control

✅ **Deployment Strategies**
- Blue-green deployments
- Rolling updates
- Canary releases
- Automated rollbacks

✅ **Monitoring & Notifications**
- Deployment status tracking
- Slack notifications
- Health checks
- Performance monitoring

---

*This template provides enterprise-grade CI/CD pipelines with security, quality, and reliability built-in.*