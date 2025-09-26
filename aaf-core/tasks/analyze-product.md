<!-- Powered by AAF™ Core -->

# analyze-product

Conduct comprehensive product analysis to understand what needs documenting, for whom, and in what format.

## Purpose

Systematically analyze any product, system, or codebase to identify documentation needs, target audiences, and optimal content strategy. This is the foundation for all subsequent documentation work.

## Prerequisites

- Access to product/system to be documented
- Ability to explore codebase, APIs, or system interfaces
- Access to existing documentation (if any)
- Contact with stakeholders, users, or product team (preferred)

## Analysis Framework

### Phase 1: Product Discovery

#### System Understanding
```markdown
- [ ] What does this product/system actually do?
- [ ] What problems does it solve for users?
- [ ] What are the core features and capabilities?
- [ ] How complex is it to use/implement?
- [ ] What are the technical requirements?
```

#### Architecture Analysis
```markdown
- [ ] What is the overall system architecture?
- [ ] What are the main components and how do they interact?
- [ ] Are there APIs, SDKs, or integration points?
- [ ] What technologies/frameworks are used?
- [ ] What are the deployment and hosting considerations?
```

#### User Interface Analysis
```markdown
- [ ] How do users interact with the system?
- [ ] What are the main user workflows?
- [ ] Where are the complexity and friction points?
- [ ] What requires explanation vs. what is intuitive?
- [ ] Are there different interfaces for different user types?
```

### Phase 2: Audience Research

#### Primary User Types
```markdown
- [ ] Who are the primary users? (developers, admins, end-users, etc.)
- [ ] What is their technical skill level?
- [ ] What are their main goals and use cases?
- [ ] What is their context when using the product?
- [ ] What are their biggest pain points or challenges?
```

#### User Journey Mapping
```markdown
- [ ] How do new users discover and start using the product?
- [ ] What does a typical workflow look like?
- [ ] Where do users typically get stuck or confused?
- [ ] What advanced capabilities do power users need?
- [ ] How do users troubleshoot when things go wrong?
```

#### Stakeholder Analysis
```markdown
- [ ] Product managers: business goals and priorities
- [ ] Engineers: technical implementation details
- [ ] Support team: common user questions and issues
- [ ] Sales team: customer objections and use cases
- [ ] Customer success: onboarding and adoption patterns
```

### Phase 3: Content Gap Analysis

#### Existing Documentation Audit
```markdown
- [ ] What documentation currently exists?
- [ ] What is the quality and accuracy of existing docs?
- [ ] What formats are used? (web, PDF, video, etc.)
- [ ] How discoverable and organized is the content?
- [ ] What feedback exists about current documentation?
```

#### Critical Gap Identification
```markdown
- [ ] What essential information is completely missing?
- [ ] Where do users have to guess or experiment?
- [ ] What causes the most support tickets or confusion?
- [ ] What prevents successful onboarding or adoption?
- [ ] What blocks advanced usage or integration?
```

#### Content Prioritization Matrix
```markdown
| Content Type | User Impact | Implementation Effort | Priority |
|--------------|-------------|----------------------|----------|
| Quick Start | High | Low | P0 |
| API Docs | High | Medium | P0 |
| Troubleshooting | Medium | Medium | P1 |
| Advanced Tutorials | Low | High | P2 |
```

### Phase 4: Technical Assessment

#### Documentation Infrastructure
```markdown
- [ ] What tools/platforms are available for documentation?
- [ ] What is the current workflow for creating and updating docs?
- [ ] How are docs deployed and maintained?
- [ ] What are the constraints and requirements?
- [ ] What automation or tooling could improve the process?
```

#### Integration Points
```markdown
- [ ] How can documentation integrate with the product?
- [ ] Are there opportunities for contextual help?
- [ ] Can examples be auto-generated or tested?
- [ ] How can documentation stay in sync with product changes?
- [ ] What metrics can track documentation effectiveness?
```

## Research Methods

### User Research Techniques
- **User Interviews**: Talk to 5-10 users about their workflows and pain points
- **Support Ticket Analysis**: Review common questions and issues
- **Analytics Review**: See where users drop off or struggle
- **Competitive Analysis**: How do similar products handle documentation?
- **Card Sorting**: Understand how users mentally organize information

### Technical Research Methods
- **Code Exploration**: Read through source code to understand capabilities
- **API Testing**: Try all endpoints and features hands-on
- **Integration Testing**: Attempt common integration scenarios
- **Performance Testing**: Understand system limitations and requirements
- **Error Condition Testing**: Document what happens when things go wrong

## Output Requirements

### Product Analysis Report
```markdown
# Product Analysis Report: {Product Name}

## Executive Summary
- Product purpose and value proposition
- Target audiences and use cases
- Key documentation needs identified
- Recommended content strategy overview

## Product Overview
- Core functionality and features
- Technical architecture summary
- User interaction models
- Integration capabilities

## Audience Analysis
- Primary user personas with needs/goals
- User journey maps and workflows
- Skill levels and technical backgrounds
- Context and environment of use

## Documentation Gap Analysis
- Current state assessment
- Critical missing content identified
- Content prioritization matrix
- Success metrics and goals

## Recommendations
- Content strategy overview
- Priority content creation plan
- Information architecture proposal
- Tools and process recommendations
```

### Content Strategy Foundation
```markdown
- [ ] Document target audiences with specific needs
- [ ] Map user journeys to required content types
- [ ] Prioritize content creation based on impact/effort
- [ ] Define success metrics for documentation effectiveness
- [ ] Establish content maintenance and update processes
```

## Key Principles

- **User-Centered**: All analysis focuses on actual user needs, not product features
- **Evidence-Based**: Conclusions supported by research and data
- **Actionable**: Analysis leads to specific, implementable content recommendations
- **Holistic**: Consider entire user experience, not just individual content pieces
- **Iterative**: Plan for ongoing research and content improvement
- **Measurable**: Define success criteria and metrics for documentation effectiveness

## Integration Points

- Analysis informs all subsequent content creation tasks
- Findings guide information architecture and content organization
- User research feeds into content templates and style decisions
- Technical assessment shapes tooling and workflow recommendations
- Gap analysis drives content creation prioritization