<!-- Powered by AAF™ Core -->

# setup-monitoring

Implement comprehensive monitoring, logging, and alerting systems for infrastructure and application observability.

## Purpose

Design and implement end-to-end observability solutions that provide visibility into application performance, infrastructure health, user experience, and business metrics. Enable proactive issue detection, rapid troubleshooting, and data-driven optimization decisions.

## Prerequisites

- Infrastructure and application architecture understanding
- Access to deployment environments and systems
- Performance and availability requirements defined
- Incident response procedures and team structure
- Budget and resource allocation for monitoring tools
- Compliance and data retention requirements

## Monitoring Strategy Framework

### Phase 1: Observability Architecture Design

#### Three Pillars of Observability
```markdown
**Metrics (What is happening):**
- [ ] System and infrastructure metrics (CPU, memory, disk, network)
- [ ] Application performance metrics (response time, throughput, errors)
- [ ] Business metrics (user engagement, conversion, revenue)
- [ ] Custom metrics specific to application functionality
- [ ] Real User Monitoring (RUM) and synthetic monitoring

**Logs (Detailed context):**
- [ ] Application logs (errors, warnings, info, debug)
- [ ] System and infrastructure logs
- [ ] Security and audit logs
- [ ] Database and query logs
- [ ] Load balancer and proxy logs

**Traces (Request flow):**
- [ ] Distributed tracing across microservices
- [ ] Database query tracing
- [ ] External API call tracing
- [ ] User session and transaction tracing
- [ ] Performance profiling and bottleneck identification
```

#### Monitoring Architecture Components
```markdown
**Data Collection:**
- [ ] Metrics collection agents (Prometheus, Telegraf, Datadog Agent)
- [ ] Log aggregation (Fluentd, Logstash, Vector)
- [ ] APM agents for application monitoring
- [ ] Infrastructure monitoring (Node Exporter, WMI Exporter)
- [ ] Custom instrumentation and SDK integration

**Data Storage:**
- [ ] Time-series databases (Prometheus, InfluxDB, TimescaleDB)
- [ ] Log storage and indexing (Elasticsearch, Loki, CloudWatch)
- [ ] Trace storage (Jaeger, Zipkin, AWS X-Ray)
- [ ] Long-term storage and data retention policies
- [ ] Data compression and cost optimization

**Visualization and Analysis:**
- [ ] Dashboard platforms (Grafana, Kibana, Datadog)
- [ ] Alert management systems (AlertManager, PagerDuty)
- [ ] Analytics and query engines
- [ ] Custom reporting and business intelligence
- [ ] Mobile and on-call accessibility
```

### Phase 2: Infrastructure Monitoring Implementation

#### System-Level Monitoring
```markdown
**Server and Instance Monitoring:**
- [ ] CPU utilization and load average
- [ ] Memory usage and swap utilization
- [ ] Disk space, I/O, and performance
- [ ] Network interface statistics and errors
- [ ] Process monitoring and resource consumption

**Container and Orchestration Monitoring:**
- [ ] Docker container resource usage
- [ ] Kubernetes cluster and node health
- [ ] Pod resource consumption and limits
- [ ] Service mesh metrics (Istio, Linkerd)
- [ ] Container registry and image scanning

**Database Monitoring:**
- [ ] Connection pool and active connections
- [ ] Query performance and slow query analysis
- [ ] Replication lag and consistency
- [ ] Backup success and recovery testing
- [ ] Database-specific metrics (buffer hits, locks)
```

#### Network and Security Monitoring
```markdown
**Network Performance:**
- [ ] Bandwidth utilization and throughput
- [ ] Latency and packet loss monitoring
- [ ] DNS resolution and service discovery
- [ ] Load balancer health and distribution
- [ ] CDN performance and cache hit rates

**Security Monitoring:**
- [ ] Failed authentication attempts
- [ ] Unusual access patterns and anomalies
- [ ] SSL certificate expiration monitoring
- [ ] Vulnerability scan results
- [ ] Compliance monitoring and reporting
```

### Phase 3: Application Performance Monitoring (APM)

#### Application Metrics
```markdown
**Performance Metrics:**
- [ ] Response time percentiles (p50, p95, p99)
- [ ] Request rate and throughput (RPS, QPS)
- [ ] Error rates and HTTP status codes
- [ ] Database query performance
- [ ] External API call performance and failures

**Business Metrics:**
- [ ] User registration and activation rates
- [ ] Feature usage and adoption metrics
- [ ] Transaction volume and success rates
- [ ] Revenue and conversion tracking
- [ ] User engagement and retention metrics

**Custom Application Metrics:**
- [ ] Function-level performance monitoring
- [ ] Business logic execution metrics
- [ ] Background job processing
- [ ] Cache performance and hit rates
- [ ] Feature flag usage and performance impact
```

#### Error Tracking and Debugging
```markdown
**Error Monitoring:**
- [ ] Exception tracking and stack traces
- [ ] Error rate trends and patterns
- [ ] User impact and affected sessions
- [ ] Error correlation across services
- [ ] Automated error detection and classification

**Debug and Troubleshooting:**
- [ ] Request tracing and correlation IDs
- [ ] Performance profiling and flame graphs
- [ ] Memory leak detection
- [ ] Database connection and query analysis
- [ ] Third-party service dependency monitoring
```

### Phase 4: Alerting and Incident Management

#### Alert Strategy and Configuration
```markdown
**Alert Types and Thresholds:**
- [ ] **Critical**: Service down, data loss, security breach
- [ ] **High**: Performance degradation, error rate spike
- [ ] **Medium**: Resource utilization, capacity warnings
- [ ] **Low**: Informational, trend notifications

**Alert Routing and Escalation:**
- [ ] On-call rotation and escalation policies
- [ ] Alert routing by service, team, and severity
- [ ] Integration with incident management tools
- [ ] Multi-channel notifications (email, SMS, Slack)
- [ ] Alert fatigue prevention and tuning

**Smart Alerting:**
- [ ] Anomaly detection and machine learning
- [ ] Correlation analysis to reduce noise
- [ ] Alert suppression during maintenance
- [ ] Dynamic thresholds based on historical data
- [ ] Alert context and suggested remediation
```

#### Incident Response Integration
```markdown
**Incident Management Workflow:**
- [ ] Automatic incident creation for critical alerts
- [ ] Incident severity classification and routing
- [ ] War room and communication coordination
- [ ] Status page and customer communication
- [ ] Post-incident analysis and improvement

**On-Call and Response:**
- [ ] On-call schedule management
- [ ] Alert acknowledgment and escalation
- [ ] Runbook integration and guided remediation
- [ ] Incident timeline and communication tracking
- [ ] Performance metrics and SLA monitoring
```

## Technology Stack Implementation

### Prometheus + Grafana Stack
```yaml
# docker-compose.yml for monitoring stack
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=90d'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

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

volumes:
  prometheus-data:
  grafana-data:
```

```yaml
# prometheus.yml configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'application'
    static_configs:
      - targets: ['app:8080']
    metrics_path: /metrics
    scrape_interval: 5s
```

### ELK Stack (Elasticsearch, Logstash, Kibana)
```yaml
# docker-compose.yml for logging stack
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    ports:
      - "5044:5044"
      - "9600:9600"
    volumes:
      - ./logstash/config:/usr/share/logstash/config
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

### Application Instrumentation Examples

#### Node.js/Express Monitoring
```javascript
// monitoring.js
const client = require('prom-client');
const express = require('express');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  app: 'myapp',
  timeout: 10000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  register
});

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);

// Middleware for automatic instrumentation
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });

  next();
};

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.end(metrics);
});

module.exports = { metricsMiddleware, register };
```

#### Structured Logging
```javascript
// logger.js
const winston = require('winston');
const { format } = winston;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'myapp',
    version: process.env.VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'combined.log'
    })
  ]
});

// Express request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });

  next();
};

module.exports = { logger, requestLogger };
```

## Cloud Platform Monitoring

### AWS CloudWatch Implementation
```yaml
# CloudFormation template for CloudWatch setup
AWSTemplateFormatVersion: '2010-09-09'
Description: 'CloudWatch monitoring setup'

Resources:
  ApplicationDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: !Sub '${AWS::StackName}-application-dashboard'
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "${LoadBalancer}"],
                  [".", "RequestCount", ".", "."],
                  [".", "HTTPCode_Target_4XX_Count", ".", "."],
                  [".", "HTTPCode_Target_5XX_Count", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "Application Load Balancer Metrics"
              }
            }
          ]
        }

  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${AWS::StackName}-high-error-rate'
      AlarmDescription: 'High error rate detected'
      MetricName: HTTPCode_Target_5XX_Count
      Namespace: AWS/ApplicationELB
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopic

  SNSTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub '${AWS::StackName}-alerts'
      DisplayName: 'Application Alerts'
```

### Kubernetes Monitoring
```yaml
# prometheus-config.yaml for Kubernetes monitoring
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
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

    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

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
```

## Success Metrics and KPIs

### Monitoring Effectiveness
```markdown
**Observability Coverage:**
- Percentage of services with monitoring coverage
- Mean time to detection (MTTD) for incidents
- Alert accuracy and false positive rate
- Dashboard usage and team adoption metrics
- Monitoring cost per service or transaction

**Operational Efficiency:**
- Mean time to recovery (MTTR) improvement
- Incident prevention through proactive monitoring
- Reduction in manual troubleshooting time
- Improved deployment confidence and rollback speed
- Team productivity and on-call experience metrics
```

### Business Impact Metrics
```markdown
- Service availability and uptime improvements
- User experience and performance gains
- Cost optimization through resource efficiency
- Compliance and audit readiness
- Team satisfaction and reduced operational burden
```

## Key Principles

- **Three Pillars Focus**: Comprehensive coverage of metrics, logs, and traces
- **Proactive Detection**: Alert on trends and anomalies, not just thresholds
- **Context-Rich**: Provide enough context for rapid troubleshooting
- **Scalable Architecture**: Design for growth and high-volume environments
- **Cost-Conscious**: Balance observability depth with operational costs
- **Team-Centric**: Design dashboards and alerts for specific team needs
- **Continuous Improvement**: Regular review and optimization of monitoring strategy