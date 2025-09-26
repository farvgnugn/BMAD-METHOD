<!-- Powered by AAF™ Core -->

# create-api-docs

Generate complete API documentation with examples, use cases, and developer-focused guidance.

## Purpose

Create comprehensive, developer-friendly API documentation that enables successful integration and usage. Focus on practical examples, clear error handling, and real-world use cases that developers encounter.

## Prerequisites

- Access to API endpoints, schemas, and functionality
- Understanding of API architecture and data models
- Knowledge of target developer audience and use cases
- Ability to test all API endpoints and scenarios
- Access to authentication and authorization mechanisms

## API Documentation Framework

### Core Documentation Elements

#### API Overview Section
```markdown
- [ ] What the API does and primary use cases
- [ ] Authentication and authorization methods
- [ ] Base URLs and versioning strategy
- [ ] Rate limiting and usage policies
- [ ] SDKs and client libraries available
```

#### Getting Started Guide
```markdown
- [ ] Authentication setup with real examples
- [ ] First successful API call walkthrough
- [ ] Common integration patterns
- [ ] Quick-start code samples in popular languages
- [ ] Troubleshooting first API call issues
```

#### Endpoint Reference
```markdown
For each endpoint:
- [ ] Purpose and use case description
- [ ] HTTP method and full URL
- [ ] Required and optional parameters
- [ ] Request body schema and examples
- [ ] Response schema and examples
- [ ] Error responses and handling
- [ ] Code samples in multiple languages
```

#### Data Models and Schemas
```markdown
- [ ] Complete data structure definitions
- [ ] Field descriptions and validation rules
- [ ] Relationship mappings between entities
- [ ] Enum values and constants
- [ ] Example objects with realistic data
```

## Developer Experience Optimization

### Code Example Standards
```markdown
- [ ] Working examples that developers can copy/paste
- [ ] Multiple programming languages for popular endpoints
- [ ] Real-world scenarios, not toy examples
- [ ] Error handling and edge case coverage
- [ ] Integration with common frameworks and libraries
```

### Interactive Elements
```markdown
- [ ] API explorer/playground for testing
- [ ] Curl command generation
- [ ] Request/response example toggling
- [ ] Parameter validation and testing
- [ ] Authentication token management
```

### Error Documentation
```markdown
- [ ] Complete error code reference
- [ ] Error message examples and meanings
- [ ] Common causes and resolution steps
- [ ] HTTP status code explanations
- [ ] Debugging tips and best practices
```

## Content Structure Standards

### Endpoint Documentation Template
```markdown
## {HTTP_METHOD} {endpoint_path}

{Brief description of what this endpoint does}

### Use Cases
- {Primary use case with business context}
- {Secondary use case with example scenario}

### Parameters
#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| {name} | {type} | ✅ | {description with constraints} |

#### Query Parameters
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| {name} | {type} | ❌ | {description} | {default_value} |

#### Request Body
{Schema description or JSON example}

### Response Format
#### Success Response (200)
{JSON example with realistic data}

#### Error Responses
- **400 Bad Request**: {when this happens and how to fix}
- **401 Unauthorized**: {authentication issues}
- **404 Not Found**: {resource not found scenarios}
- **429 Too Many Requests**: {rate limiting information}

### Code Examples
{Language-specific examples showing real usage}

### Try It Out
{Interactive API explorer or curl examples}
```

### Authentication Documentation
```markdown
- [ ] Step-by-step authentication setup
- [ ] Token generation and management
- [ ] Scopes and permissions explanation
- [ ] Security best practices
- [ ] Common authentication errors and fixes
```

## Language-Specific Examples

### Priority Languages (Include for All Major Endpoints)
```markdown
- JavaScript (Node.js and browser)
- Python
- PHP
- Java
- C#/.NET
- Ruby
- Go
- Swift (if mobile-relevant)
```

### Code Sample Quality Standards
```markdown
- [ ] Complete, runnable examples
- [ ] Proper error handling included
- [ ] Environment variable usage for secrets
- [ ] Comments explaining non-obvious parts
- [ ] Realistic data in examples
```

## API Testing and Validation

### Endpoint Testing Protocol
```markdown
- [ ] Test all endpoints with various parameter combinations
- [ ] Verify all error conditions and responses
- [ ] Test rate limiting and edge cases
- [ ] Validate authentication and authorization
- [ ] Check response times and performance characteristics
```

### Documentation Testing
```markdown
- [ ] All code examples execute successfully
- [ ] Authentication examples work with real API keys
- [ ] Error scenarios match actual API behavior
- [ ] Response schemas match real API responses
- [ ] Links and references are functional
```

## Advanced Documentation Features

### Integration Patterns
```markdown
- [ ] Common workflow implementations
- [ ] Webhook setup and handling
- [ ] Pagination strategies and examples
- [ ] Bulk operations and batching
- [ ] Real-time data and streaming
```

### Performance Guidance
```markdown
- [ ] Rate limiting details and strategies
- [ ] Caching recommendations
- [ ] Efficient query patterns
- [ ] Bulk operation guidance
- [ ] Performance optimization tips
```

### SDK and Library Documentation
```markdown
- [ ] Official SDK installation and setup
- [ ] Library-specific examples and patterns
- [ ] Version compatibility information
- [ ] Migration guides between versions
- [ ] Community-contributed libraries
```

## Quality Assurance Checklist

### Technical Accuracy
```markdown
- [ ] All endpoints tested and verified
- [ ] Code examples execute without errors
- [ ] Parameter types and constraints verified
- [ ] Error responses match actual behavior
- [ ] Authentication flows tested end-to-end
```

### Developer Experience
```markdown
- [ ] Documentation is scannable for quick reference
- [ ] Examples are relevant to real use cases
- [ ] Error messages help developers debug issues
- [ ] Getting started guide enables quick success
- [ ] Advanced features are discoverable
```

### Completeness Check
```markdown
- [ ] All endpoints documented
- [ ] All parameters and responses covered
- [ ] Error conditions explained
- [ ] Authentication methods detailed
- [ ] Rate limiting and policies documented
```

## Output Requirements

### API Documentation Structure
```markdown
# {API Name} Documentation

## Overview
- API purpose and capabilities
- Authentication overview
- Base URLs and versioning
- Rate limits and policies

## Getting Started
- Authentication setup
- First API call tutorial
- Common integration patterns
- Quick-start examples

## API Reference
- Organized by functional groups
- Complete endpoint documentation
- Request/response examples
- Error handling guide

## Advanced Topics
- Webhooks and real-time data
- Bulk operations and batching
- Performance optimization
- SDK and library usage

## Support and Resources
- Community forums and support
- Status page and uptime information
- Changelog and migration guides
- Contact information for developers
```

### Interactive Elements
```markdown
- [ ] API explorer with live testing
- [ ] Code sample generation tools
- [ ] Authentication token management
- [ ] Response format examples
- [ ] Error simulation and debugging tools
```

## Integration Points

- Link to SDKs and client libraries
- Connect to developer community resources
- Reference troubleshooting and support documentation
- Integration with product changelog and updates
- Connection to developer onboarding flows

## Key Principles

- **Developer Success**: Enable developers to integrate successfully and quickly
- **Real-World Focus**: Examples reflect actual usage patterns and scenarios
- **Error Prevention**: Anticipate and address common integration issues
- **Discoverability**: Information is easy to find when developers need it
- **Accuracy**: Documentation stays in sync with actual API behavior
- **Completeness**: No gaps that force developers to experiment or guess