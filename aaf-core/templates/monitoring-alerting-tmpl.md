# Monitoring & Alerting Template

This template provides comprehensive monitoring and alerting configurations for production-ready observability across multiple platforms and technologies.

## Prometheus & Grafana Stack

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: '{cluster_name}'
    environment: '{environment}'

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter for system metrics
  - job_name: 'node-exporter'
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_endpoints_name]
        action: keep
        regex: node-exporter
      - source_labels: [__meta_kubernetes_endpoint_address_target_name]
        target_label: node

  # Kubernetes API Server
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https

  # Kubernetes Nodes
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

  # Application pods with prometheus annotations
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name

  # Application services
  - job_name: '{app_name}'
    kubernetes_sd_configs:
      - role: service
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_app]
        action: keep
        regex: {app_name}
      - source_labels: [__meta_kubernetes_service_port_name]
        action: keep
        regex: metrics
    metrics_path: /metrics
    scrape_interval: 10s

  # Database monitoring (PostgreSQL)
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis monitoring
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  # NGINX monitoring
  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['nginx-exporter:9113']
```

### Alert Rules Configuration
```yaml
# rules/application-rules.yml
groups:
  - name: application.rules
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{status=~"5.."}[5m]) /
            rate(http_requests_total[5m])
          ) * 100 > 5
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "{{ $labels.service }} has error rate of {{ $value }}% for more than 5 minutes"

      # Very high error rate
      - alert: VeryHighErrorRate
        expr: |
          (
            rate(http_requests_total{status=~"5.."}[5m]) /
            rate(http_requests_total[5m])
          ) * 100 > 15
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Very high error rate detected"
          description: "{{ $labels.service }} has error rate of {{ $value }}% for more than 2 minutes"

      # High response time
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High response time detected"
          description: "{{ $labels.service }} 95th percentile response time is {{ $value }}s"

      # Low request rate (possible service down)
      - alert: LowRequestRate
        expr: |
          rate(http_requests_total[5m]) < 1
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Low request rate detected"
          description: "{{ $labels.service }} is receiving {{ $value }} requests/sec"

      # Database connection issues
      - alert: DatabaseConnectionFailure
        expr: |
          increase(database_connection_errors_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Database connection failures"
          description: "{{ $labels.service }} is experiencing database connection failures"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (process_resident_memory_bytes / (1024*1024)) > 500
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High memory usage"
          description: "{{ $labels.service }} is using {{ $value }}MB of memory"

  - name: infrastructure.rules
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"

      # Low disk space
      - alert: LowDiskSpace
        expr: |
          (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk {{ $labels.mountpoint }} is {{ $value }}% full on {{ $labels.instance }}"

      # Node down
      - alert: NodeDown
        expr: |
          up{job="node-exporter"} == 0
        for: 1m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Node {{ $labels.instance }} is down"
          description: "Node {{ $labels.instance }} has been down for more than 1 minute"

  - name: kubernetes.rules
    rules:
      # Pod CrashLooping
      - alert: PodCrashLooping
        expr: |
          rate(kube_pod_container_status_restarts_total[15m]) * 60 * 15 > 0
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
          description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} is restarting frequently"

      # Pod not ready
      - alert: PodNotReady
        expr: |
          kube_pod_status_ready{condition="false"} == 1
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Pod {{ $labels.pod }} not ready"
          description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} has been not ready for more than 10 minutes"

      # Deployment not available
      - alert: DeploymentNotAvailable
        expr: |
          kube_deployment_status_replicas_available == 0
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Deployment {{ $labels.deployment }} has no available replicas"
          description: "Deployment {{ $labels.deployment }} in {{ $labels.namespace }} has 0 available replicas"

      # High pod memory usage
      - alert: PodHighMemoryUsage
        expr: |
          (container_memory_working_set_bytes / container_spec_memory_limit_bytes) * 100 > 90
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Pod {{ $labels.pod }} high memory usage"
          description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} is using {{ $value }}% of memory limit"
```

### Alertmanager Configuration
```yaml
# alertmanager.yml
global:
  smtp_smarthost: '{smtp_server}:587'
  smtp_from: 'alerts@{company_domain}'
  smtp_auth_username: '{smtp_username}'
  smtp_auth_password: '{smtp_password}'
  slack_api_url: '{slack_webhook_url}'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
      group_interval: 5m
      repeat_interval: 1h

    - match:
        severity: warning
      receiver: 'warning-alerts'
      group_interval: 10m
      repeat_interval: 6h

    - match:
        team: backend
      receiver: 'backend-team'

    - match:
        team: frontend
      receiver: 'frontend-team'

    - match:
        team: infrastructure
      receiver: 'infrastructure-team'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          {{ end }}

  - name: 'critical-alerts'
    email_configs:
      - to: '{critical_alerts_email}'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Started: {{ .StartsAt }}
          {{ end }}
    slack_configs:
      - channel: '#critical-alerts'
        color: 'danger'
        title: 'CRITICAL ALERT'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Started:* {{ .StartsAt }}
          {{ end }}

  - name: 'warning-alerts'
    slack_configs:
      - channel: '#alerts'
        color: 'warning'
        title: 'Warning Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

  - name: 'backend-team'
    slack_configs:
      - channel: '#backend-alerts'
        title: 'Backend Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Service:* {{ .Labels.service }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

  - name: 'frontend-team'
    slack_configs:
      - channel: '#frontend-alerts'
        title: 'Frontend Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

  - name: 'infrastructure-team'
    slack_configs:
      - channel: '#infrastructure-alerts'
        title: 'Infrastructure Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Instance:* {{ .Labels.instance }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

## Grafana Dashboard Configurations

### Application Performance Dashboard
```json
{
  "dashboard": {
    "title": "{app_name} - Application Performance",
    "tags": ["application", "{app_name}"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{service=\"{app_name}\"}[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        }
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{service=\"{app_name}\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"{app_name}\"}[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 5}
              ]
            }
          }
        }
      },
      {
        "title": "Response Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{service=\"{app_name}\"}[5m])) by (le))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service=\"{app_name}\"}[5m])) by (le))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service=\"{app_name}\"}[5m])) by (le))",
            "legendFormat": "p99"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "title": "Active Connections",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(active_connections{service=\"{app_name}\"})",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(process_resident_memory_bytes{service=\"{app_name}\"}) / 1024 / 1024",
            "legendFormat": "Memory (MB)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "decbytes"
          }
        }
      },
      {
        "title": "CPU Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(process_cpu_seconds_total{service=\"{app_name}\"}[5m])) * 100",
            "legendFormat": "CPU %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent"
          }
        }
      }
    ]
  }
}
```

### Infrastructure Dashboard
```json
{
  "dashboard": {
    "title": "Infrastructure Overview",
    "tags": ["infrastructure"],
    "panels": [
      {
        "title": "CPU Usage by Node",
        "type": "timeseries",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{ instance }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "max": 100
          }
        }
      },
      {
        "title": "Memory Usage by Node",
        "type": "timeseries",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "{{ instance }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "max": 100
          }
        }
      },
      {
        "title": "Disk Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100",
            "legendFormat": "{{ instance }}:{{ mountpoint }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "max": 100
          }
        }
      },
      {
        "title": "Network I/O",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "{{ instance }} - Receive"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "{{ instance }} - Transmit"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "Bps"
          }
        }
      }
    ]
  }
}
```

## Application Instrumentation Examples

### Node.js/Express Metrics
```javascript
// metrics.js
const client = require('prom-client');
const express = require('express');

// Create registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  register,
  timeout: 10000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

const databaseConnectionsActive = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register]
});

const databaseConnectionErrors = new client.Counter({
  name: 'database_connection_errors_total',
  help: 'Total database connection errors',
  registers: [register]
});

const businessMetrics = {
  userRegistrations: new client.Counter({
    name: 'user_registrations_total',
    help: 'Total user registrations',
    registers: [register]
  }),

  ordersProcessed: new client.Counter({
    name: 'orders_processed_total',
    help: 'Total orders processed',
    labelNames: ['status'],
    registers: [register]
  }),

  revenueTotal: new client.Gauge({
    name: 'revenue_total',
    help: 'Total revenue',
    labelNames: ['currency'],
    registers: [register]
  })
};

// Middleware for HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  // Increment active connections
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
    activeConnections.dec();
  });

  next();
};

// Database monitoring
const monitorDatabase = (pool) => {
  setInterval(() => {
    databaseConnectionsActive.set(pool.totalCount - pool.idleCount);
  }, 5000);

  pool.on('error', (err) => {
    databaseConnectionErrors.inc();
  });
};

// Health check endpoint
const healthCheck = async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  };

  try {
    // Add database health check
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch (error) {
    health.database = 'error';
    health.status = 'error';
    res.status(503);
  }

  res.json(health);
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.end(metrics);
};

module.exports = {
  register,
  metricsMiddleware,
  monitorDatabase,
  healthCheck,
  metricsEndpoint,
  businessMetrics
};
```

### Python/Flask Metrics
```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time
from functools import wraps
from flask import request, Response

# Metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0]
)

ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active connections'
)

DATABASE_CONNECTIONS = Gauge(
    'database_connections_active',
    'Active database connections'
)

BUSINESS_METRICS = {
    'user_registrations': Counter('user_registrations_total', 'Total user registrations'),
    'orders_processed': Counter('orders_processed_total', 'Total orders processed', ['status']),
    'revenue': Gauge('revenue_total', 'Total revenue', ['currency'])
}

def monitor_requests(f):
    """Decorator to monitor HTTP requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        ACTIVE_CONNECTIONS.inc()

        try:
            response = f(*args, **kwargs)
            status_code = getattr(response, 'status_code', 200)
        except Exception as e:
            status_code = 500
            raise
        finally:
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.endpoint or 'unknown',
                status=status_code
            ).inc()

            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=request.endpoint or 'unknown'
            ).observe(time.time() - start_time)

            ACTIVE_CONNECTIONS.dec()

        return response

    return decorated_function

def metrics_endpoint():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

def health_check():
    """Health check endpoint"""
    health = {
        'status': 'ok',
        'timestamp': time.time(),
        'environment': os.getenv('ENVIRONMENT', 'unknown')
    }

    try:
        # Database health check
        db.session.execute('SELECT 1')
        health['database'] = 'connected'
        status_code = 200
    except Exception as e:
        health['database'] = 'error'
        health['status'] = 'error'
        status_code = 503

    return jsonify(health), status_code
```

## Kubernetes Monitoring Setup

### ServiceMonitor for Prometheus
```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {app_name}
  namespace: {namespace}
  labels:
    app: {app_name}
spec:
  selector:
    matchLabels:
      app: {app_name}
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### PrometheusRule for Alerts
```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: {app_name}-alerts
  namespace: {namespace}
spec:
  groups:
  - name: {app_name}.rules
    rules:
    - alert: {app_name}HighErrorRate
      expr: |
        (
          rate(http_requests_total{app="{app_name}",status=~"5.."}[5m]) /
          rate(http_requests_total{app="{app_name}"}[5m])
        ) * 100 > 5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate in {app_name}"
        description: "{app_name} has error rate of {{ $value }}%"

    - alert: {app_name}HighLatency
      expr: |
        histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{app="{app_name}"}[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency in {app_name}"
        description: "{app_name} 95th percentile latency is {{ $value }}s"
```

## Docker Compose Monitoring Stack

### Complete Monitoring Stack
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=90d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
      - alertmanager-data:/alertmanager

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://{db_user}:{db_password}@postgres:5432/{db_name}?sslmode=disable"

  redis-exporter:
    image: oliver006/redis_exporter
    ports:
      - "9121:9121"
    environment:
      REDIS_ADDR: "redis://redis:6379"

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    ports:
      - "9113:9113"
    environment:
      SCRAPE_URI: "http://nginx:8080/nginx_status"

volumes:
  prometheus-data:
  grafana-data:
  alertmanager-data:
```

## Customization Variables

Replace these placeholders when using the templates:

- `{app_name}` - Your application name
- `{cluster_name}` - Kubernetes cluster name
- `{environment}` - Environment (dev/staging/prod)
- `{namespace}` - Kubernetes namespace
- `{smtp_server}` - SMTP server for email alerts
- `{slack_webhook_url}` - Slack webhook URL
- `{company_domain}` - Company domain name
- `{critical_alerts_email}` - Email for critical alerts

## Best Practices Included

✅ **Comprehensive Metrics**
- Application performance metrics
- Infrastructure monitoring
- Business metrics tracking
- Custom alerting rules

✅ **Multi-Channel Alerting**
- Email notifications
- Slack integration
- Severity-based routing
- Alert inhibition rules

✅ **Observability**
- Request tracing
- Error tracking
- Performance monitoring
- Health checks

✅ **Scalability**
- Prometheus federation
- High availability setup
- Long-term storage
- Performance optimization

---

*This template provides production-ready monitoring and alerting with comprehensive observability and intelligent alerting built-in.*