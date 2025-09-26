<!-- Template for API Documentation -->

# API Documentation Template

Use this template to create comprehensive, developer-friendly API documentation.

## Complete API Documentation Structure

```markdown
# {API Name} Documentation

*{Brief description of what the API enables developers to build}*

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Getting Started](#getting-started)
4. [API Reference](#api-reference)
5. [SDKs and Libraries](#sdks-and-libraries)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)
8. [Webhooks](#webhooks) *(if applicable)*
9. [Changelog](#changelog)

---

## Overview

### What is the {API Name}?
{Clear explanation of API purpose and capabilities}

### Base URL
```
{production_base_url}
{staging_base_url} (for testing)
```

### API Version
Current version: `{version_number}`

Versioning strategy: {how versions are handled}

### Supported Formats
- Request format: `application/json`
- Response format: `application/json`
- Character encoding: `UTF-8`

---

## Authentication

### Authentication Method
{API uses Bearer tokens / API keys / OAuth 2.0 / etc.}

### Getting Your API Key
1. {Step to sign up or access developer portal}
2. {Step to generate API key}
3. {Step to configure permissions if applicable}

### Making Authenticated Requests
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  {example_endpoint}
```

```javascript
// JavaScript example
const response = await fetch('{example_endpoint}', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});
```

```python
# Python example
import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
response = requests.get('{example_endpoint}', headers=headers)
```

### Authentication Errors
- `401 Unauthorized`: {when this occurs and how to fix}
- `403 Forbidden`: {when this occurs and how to fix}

---

## Getting Started

### Your First API Call
Let's make a simple request to verify your API key works:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  {simple_test_endpoint}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "API key is valid",
  "user": {
    "id": "user_123",
    "name": "Your Name"
  }
}
```

### Common Integration Patterns
{Brief examples of typical workflows}

---

## API Reference

### {Resource Category 1}

#### GET /{resource}
Get a list of {resources}

**Parameters:**
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `limit` | integer | No | Number of items to return (1-100) | 20 |
| `offset` | integer | No | Number of items to skip | 0 |
| `filter` | string | No | Filter criteria | null |

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "{base_url}/{resource}?limit=10&filter=active"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "item_123",
      "name": "Example Item",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

**Possible Errors:**
- `400 Bad Request`: Invalid filter criteria
- `401 Unauthorized`: Missing or invalid API key

---

#### GET /{resource}/{id}
Get a specific {resource} by ID

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the {resource} |

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "{base_url}/{resource}/item_123"
```

**Example Response:**
```json
{
  "id": "item_123",
  "name": "Example Item",
  "description": "Detailed description",
  "status": "active",
  "properties": {
    "key1": "value1",
    "key2": "value2"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T14:20:00Z"
}
```

**Possible Errors:**
- `404 Not Found`: {Resource} with specified ID does not exist
- `401 Unauthorized`: Missing or invalid API key

---

#### POST /{resource}
Create a new {resource}

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "properties": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

**Example Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Item",
    "description": "This is a new item",
    "properties": {
      "category": "example"
    }
  }' \
  "{base_url}/{resource}"
```

**Example Response (201 Created):**
```json
{
  "id": "item_456",
  "name": "New Item",
  "description": "This is a new item",
  "status": "active",
  "properties": {
    "category": "example"
  },
  "created_at": "2024-01-16T09:15:00Z",
  "updated_at": "2024-01-16T09:15:00Z"
}
```

**Possible Errors:**
- `400 Bad Request`: Missing required fields or invalid data
- `409 Conflict`: {Resource} with this name already exists
- `422 Unprocessable Entity`: Validation errors

---

#### PUT /{resource}/{id}
Update an existing {resource}

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the {resource} |

**Request Body:** (Same as POST, all fields optional for update)

**Example Request:**
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }' \
  "{base_url}/{resource}/item_123"
```

**Example Response (200 OK):**
```json
{
  "id": "item_123",
  "name": "Example Item",
  "description": "Updated description",
  "status": "active",
  "properties": {
    "key1": "value1",
    "key2": "value2"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T11:45:00Z"
}
```

---

#### DELETE /{resource}/{id}
Delete a {resource}

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the {resource} |

**Example Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "{base_url}/{resource}/item_123"
```

**Example Response (204 No Content):**
```
(Empty response body)
```

**Possible Errors:**
- `404 Not Found`: {Resource} with specified ID does not exist
- `409 Conflict`: Cannot delete {resource} due to dependencies

---

## SDKs and Libraries

### Official SDKs
- **JavaScript/Node.js**: `npm install {package-name}`
- **Python**: `pip install {package-name}`
- **PHP**: `composer require {package-name}`
- **Java**: {Maven/Gradle instructions}

### JavaScript SDK Example
```javascript
import { ApiClient } from '{package-name}';

const client = new ApiClient('YOUR_API_KEY');

// Get all items
const items = await client.{resource}.list({ limit: 10 });

// Get specific item
const item = await client.{resource}.get('item_123');

// Create new item
const newItem = await client.{resource}.create({
  name: 'New Item',
  description: 'Created via SDK'
});
```

### Python SDK Example
```python
from {package_name} import ApiClient

client = ApiClient('YOUR_API_KEY')

# Get all items
items = client.{resource}.list(limit=10)

# Get specific item
item = client.{resource}.get('item_123')

# Create new item
new_item = client.{resource}.create(
    name='New Item',
    description='Created via SDK'
)
```

---

## Error Handling

### HTTP Status Codes
| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no response body |
| 400 | Bad Request | Invalid request format or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authentication valid but insufficient permissions |
| 404 | Not Found | Requested resource does not exist |
| 409 | Conflict | Request conflicts with current resource state |
| 422 | Unprocessable Entity | Request valid but contains semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, try again later |

### Error Response Format
All errors return a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid parameters",
    "details": [
      {
        "field": "name",
        "message": "Name is required and cannot be empty"
      }
    ],
    "request_id": "req_123456789"
  }
}
```

### Common Error Codes
| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_API_KEY` | API key missing or invalid | Check your API key and authentication |
| `VALIDATION_ERROR` | Request data validation failed | Review the `details` field for specific issues |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist | Verify the resource ID is correct |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before retrying, see Rate Limits section |

---

## Rate Limits

### Current Limits
- **Requests per minute**: {number} per API key
- **Requests per hour**: {number} per API key
- **Concurrent connections**: {number} per API key

### Rate Limit Headers
Every response includes rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits
When you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "retry_after": 60
  }
}
```

**Best Practices:**
- Implement exponential backoff for retries
- Cache responses when possible
- Use webhooks instead of polling for real-time updates

---

## Webhooks
*(Include if applicable)*

### Setting Up Webhooks
{Instructions for webhook configuration}

### Event Types
{List of available webhook events}

### Webhook Payload Example
```json
{
  "event": "resource.created",
  "data": {
    "id": "item_789",
    "name": "New Item"
  },
  "timestamp": "2024-01-16T15:30:00Z"
}
```

---

## Changelog

### Version {current_version} ({date})
- {New feature or improvement}
- {Bug fix or change}
- {Deprecation notice if any}

### Version {previous_version} ({date})
- {Historical changes}

---

## Support and Resources

### Getting Help
- 📖 Documentation: {documentation_url}
- 💬 Community Forum: {forum_url}
- 📧 Support: {support_email}
- 🐛 Bug Reports: {bug_report_url}

### Status and Uptime
- 📊 API Status: {status_page_url}
- 📈 Performance Metrics: {metrics_url}

---

*Last updated: {date}*
```

## Language-Specific Example Templates

### JavaScript Examples Template
```javascript
// {Brief description of what this example does}
const response = await fetch('{endpoint}', {
  method: '{method}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // Request body
  })
});

const data = await response.json();
console.log(data);

// Error handling
if (!response.ok) {
  console.error('API Error:', data.error.message);
}
```

### Python Examples Template
```python
# {Brief description of what this example does}
import requests

url = '{endpoint}'
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
data = {
    # Request body
}

response = requests.{method.lower()}(url, headers=headers, json=data)

if response.status_code == {expected_status}:
    result = response.json()
    print(result)
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

## Quality Checklist

```markdown
## API Documentation Quality Review

### Completeness
- [ ] All endpoints documented with examples
- [ ] All parameters and responses defined
- [ ] Error conditions explained with solutions
- [ ] Authentication methods clearly explained
- [ ] Rate limits and policies documented

### Developer Experience
- [ ] Working code examples in multiple languages
- [ ] Quick-start guide gets developers to success quickly
- [ ] Error messages help developers debug issues
- [ ] SDKs and libraries documented with examples
- [ ] Real-world use cases and integration patterns

### Technical Accuracy
- [ ] All examples tested and work correctly
- [ ] Response schemas match actual API behavior
- [ ] Error codes and messages are accurate
- [ ] Rate limits and constraints are current
- [ ] Links and references are functional
```

---

*This template ensures API documentation is comprehensive, accurate, and enables developer success.*