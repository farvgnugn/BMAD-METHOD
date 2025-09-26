# Docker & Kubernetes Template

This template provides production-ready containerization and orchestration configurations for scalable, secure deployments.

## Dockerfile Templates

### Node.js Application Dockerfile
```dockerfile
# Multi-stage build for optimal image size and security
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run application
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 {app_name}

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Security hardening
RUN apk add --no-cache dumb-init
RUN chown -R {app_name}:nodejs /app
USER {app_name}

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Python Application Dockerfile
```dockerfile
FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -r {app_name} && useradd -r -g {app_name} {app_name}
RUN chown -R {app_name}:{app_name} /app
USER {app_name}

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "app:app"]
```

### Go Application Dockerfile
```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main .

# Final stage
FROM scratch

# Copy CA certificates and timezone data from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /app/main /main

EXPOSE 8080

# Health check (requires adding health endpoint in Go app)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["/main", "health"] || exit 1

ENTRYPOINT ["/main"]
```

## Kubernetes Manifests

### Namespace Configuration
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {namespace}
  labels:
    name: {namespace}
    environment: {environment}
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: {namespace}-quota
  namespace: {namespace}
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "4"
    services: "10"
```

### Application Deployment
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {app_name}
  namespace: {namespace}
  labels:
    app: {app_name}
    version: "{version}"
    environment: {environment}
spec:
  replicas: {replica_count}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%
      maxSurge: 25%
  selector:
    matchLabels:
      app: {app_name}
  template:
    metadata:
      labels:
        app: {app_name}
        version: "{version}"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: {app_name}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: {app_name}
        image: {docker_registry}/{app_name}:{image_tag}
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          protocol: TCP
        env:
        - name: NODE_ENV
          value: {environment}
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: {app_name}-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: {app_name}-secrets
              key: jwt-secret
        resources:
          limits:
            cpu: {cpu_limit}
            memory: {memory_limit}
          requests:
            cpu: {cpu_request}
            memory: {memory_request}
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: config
        configMap:
          name: {app_name}-config
      - name: logs
        emptyDir: {}
      imagePullSecrets:
      - name: docker-registry-secret
```

### Service Configuration
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {app_name}
  namespace: {namespace}
  labels:
    app: {app_name}
    service: {app_name}
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: {app_name}
```

### Horizontal Pod Autoscaler
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {app_name}
  namespace: {namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {app_name}
  minReplicas: {min_replicas}
  maxReplicas: {max_replicas}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Ingress Configuration
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {app_name}
  namespace: {namespace}
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  tls:
  - hosts:
    - {domain_name}
    secretName: {app_name}-tls
  rules:
  - host: {domain_name}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {app_name}
            port:
              number: 80
```

### ConfigMap and Secrets
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {app_name}-config
  namespace: {namespace}
data:
  app.properties: |
    # Application configuration
    log.level=info
    feature.flags=true
    cache.ttl=3600

  nginx.conf: |
    server {
      listen 80;
      server_name _;
      root /usr/share/nginx/html;

      location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
      }
    }

---
apiVersion: v1
kind: Secret
metadata:
  name: {app_name}-secrets
  namespace: {namespace}
type: Opaque
data:
  database-url: {base64_encoded_database_url}
  jwt-secret: {base64_encoded_jwt_secret}
  api-key: {base64_encoded_api_key}
```

### Service Account and RBAC
```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {app_name}
  namespace: {namespace}
  labels:
    app: {app_name}

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: {app_name}
  namespace: {namespace}
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: {app_name}
  namespace: {namespace}
subjects:
- kind: ServiceAccount
  name: {app_name}
  namespace: {namespace}
roleRef:
  kind: Role
  name: {app_name}
  apiGroup: rbac.authorization.k8s.io
```

## Helm Chart Structure

### Chart.yaml
```yaml
apiVersion: v2
name: {app_name}
description: A Helm chart for {app_name}
version: 0.1.0
appVersion: "{app_version}"
dependencies:
  - name: postgresql
    version: "11.9.13"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "17.3.7"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

### Values.yaml
```yaml
# Default values for {app_name}
replicaCount: 2

image:
  repository: {docker_registry}/{app_name}
  pullPolicy: IfNotPresent
  tag: "latest"

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/metrics"

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1001
  capabilities:
    drop:
    - ALL

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: {domain_name}
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: {app_name}-tls
      hosts:
        - {domain_name}

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - {app_name}
        topologyKey: kubernetes.io/hostname

# Database configuration
postgresql:
  enabled: true
  auth:
    postgresPassword: "changeme"
    database: "{app_name}"
  primary:
    persistence:
      enabled: true
      size: 8Gi

# Redis configuration
redis:
  enabled: true
  auth:
    enabled: false
  master:
    persistence:
      enabled: true
      size: 8Gi

# Application-specific configuration
config:
  environment: "production"
  logLevel: "info"
  features:
    metrics: true
    tracing: true
    healthChecks: true

# Monitoring
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
    path: /metrics
```

## Docker Compose for Development

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:password@postgres:5432/{app_name}
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    command: npm run dev

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: {app_name}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: {app_name}_network
```

## Customization Variables

Replace these placeholders when using the templates:

- `{app_name}` - Your application name
- `{namespace}` - Kubernetes namespace
- `{environment}` - Environment (dev/staging/prod)
- `{docker_registry}` - Docker registry URL
- `{domain_name}` - Application domain
- `{version}` - Application version
- `{replica_count}` - Number of replicas
- `{cpu_limit}` / `{memory_limit}` - Resource limits
- `{cpu_request}` / `{memory_request}` - Resource requests

## Best Practices Included

✅ **Security**
- Non-root user execution
- Read-only root filesystem
- Security contexts and policies
- Secret management

✅ **Reliability**
- Health checks and probes
- Resource limits and requests
- Pod disruption budgets
- Anti-affinity rules

✅ **Scalability**
- Horizontal pod autoscaling
- Rolling updates
- Load balancing
- Caching strategies

✅ **Observability**
- Prometheus metrics
- Structured logging
- Distributed tracing
- Custom dashboards

---

*This template provides production-ready containerization and orchestration with security, scalability, and observability built-in.*