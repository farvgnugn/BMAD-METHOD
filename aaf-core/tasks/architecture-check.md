<!-- Powered by AAF™ Core -->

# architecture-check

Validate architectural compliance, design patterns, and domain boundaries in code changes to ensure consistency with established system design.

## Purpose

Ensure code changes adhere to established architectural principles, design patterns, and domain boundaries. Prevents architectural drift and maintains system integrity as the codebase evolves.

## Prerequisites

- Understanding of project architecture and design patterns
- Access to architectural decision records (ADRs)
- Knowledge of domain boundaries and business logic
- Familiarity with established coding patterns in the codebase

## Architectural Analysis Framework

### Domain-Driven Design (DDD) Validation

#### Bounded Context Integrity
- Verify domain boundaries are not violated
- Check for proper context mapping between domains
- Validate aggregate root relationships
- Ensure domain services stay within boundaries

#### Domain Model Consistency
- Business logic belongs in domain layer
- Infrastructure concerns separated from domain
- Value objects used appropriately
- Domain events properly implemented

#### Anti-Corruption Layer
- External service integrations use ACL pattern
- Domain models not polluted by external concerns
- Proper translation between domain and external models
- Infrastructure adapters follow port/adapter pattern

### Clean Architecture Compliance

#### Layer Separation
```markdown
- [ ] Application layer doesn't depend on infrastructure
- [ ] Domain layer has no external dependencies
- [ ] Infrastructure layer implements domain interfaces
- [ ] Presentation layer only orchestrates use cases
```

#### Dependency Inversion
```markdown
- [ ] High-level modules don't depend on low-level modules
- [ ] Both depend on abstractions (interfaces)
- [ ] Abstractions don't depend on details
- [ ] Details depend on abstractions
```

#### Single Responsibility Principle
```markdown
- [ ] Each class has one reason to change
- [ ] Functions do one thing well
- [ ] Modules have cohesive responsibilities
- [ ] Separation of concerns is maintained
```

### Design Pattern Validation

#### Repository Pattern
- Data access abstracted through repositories
- Domain entities don't contain persistence logic
- Repository interfaces defined in domain layer
- Concrete implementations in infrastructure layer

#### Factory Pattern
- Complex object creation encapsulated
- Domain object construction rules enforced
- Factory methods provide clear object creation
- Abstract factories for related object families

#### Strategy Pattern
- Algorithm variations properly encapsulated
- Context uses strategy interface
- Strategies are interchangeable
- Open/closed principle maintained

#### Observer Pattern
- Event-driven communication implemented correctly
- Loose coupling between publishers and subscribers
- Domain events used for business logic side effects
- Event handlers don't violate bounded contexts

## Architecture Violation Categories

### CRITICAL Violations (Block Merge)
- Domain logic mixed with infrastructure concerns
- Circular dependencies between layers
- Direct database access from presentation layer
- Business rules in controllers or UI components

### HIGH Violations (Should Fix)
- Missing abstraction layers
- Tight coupling between unrelated modules
- God objects or classes violating SRP
- Inconsistent error handling patterns

### MEDIUM Violations (Plan to Fix)
- Naming conventions don't reflect architecture
- Missing documentation for architectural decisions
- Inconsistent dependency injection patterns
- File organization doesn't match logical architecture

### LOW Violations (Track for Future)
- Minor pattern inconsistencies
- Missing unit tests for architectural components
- Code organization improvements
- Documentation gaps

## Architectural Checklist

### Module Dependencies
```markdown
- [ ] Dependencies flow in correct direction (inward)
- [ ] No circular dependencies detected
- [ ] Interface segregation principle followed
- [ ] Modules are loosely coupled, highly cohesive
```

### Business Logic Placement
```markdown
- [ ] Business rules in domain layer
- [ ] Validation logic in appropriate layer
- [ ] Cross-cutting concerns properly handled
- [ ] Infrastructure concerns isolated
```

### Data Flow Patterns
```markdown
- [ ] Commands and queries separated (CQRS if applicable)
- [ ] Data transformations at layer boundaries
- [ ] DTOs used for external communication
- [ ] Domain models not exposed to external layers
```

### Error Handling Architecture
```markdown
- [ ] Consistent error handling strategy
- [ ] Domain exceptions properly defined
- [ ] Error boundaries at appropriate layers
- [ ] Logging and monitoring integration
```

## Architecture Finding Format

```yaml
finding_id: ARCH-{number}
severity: CRITICAL|HIGH|MEDIUM|LOW
category: domain|layer|pattern|dependency|design
description: "Brief description of architectural issue"
location: "file:line or component name"
violation: "Which architectural principle is violated"
impact: "How this affects system maintainability/scalability"
remediation: "Specific steps to align with architecture"
pattern_reference: "Link to design pattern or ADR"
```

## Common Architectural Anti-Patterns

### Anemic Domain Model
- Domain objects without behavior
- Business logic scattered in services
- DTOs masquerading as domain models
- Missing domain invariants

### God Object/Class
- Single class with too many responsibilities
- Violation of single responsibility principle
- Difficult to test and maintain
- High coupling with many other classes

### Spaghetti Code
- Tangled control flow
- No clear separation of concerns
- Difficult to follow execution path
- Mixed abstraction levels

### Vendor Lock-in
- Direct dependencies on specific vendors
- Missing abstraction layers
- Difficult to switch implementations
- Infrastructure concerns in business logic

## Output Requirements

1. **ALWAYS** reference specific architectural principles violated
2. **ALWAYS** provide remediation aligned with established patterns
3. **ALWAYS** consider impact on system maintainability and scalability
4. **ALWAYS** reference ADRs or architectural documentation
5. **ALWAYS** validate consistency with existing codebase patterns

## Integration with Code Review

Architecture findings should be presented as:

```markdown
## 🏗️ Architecture Analysis Results

### CRITICAL Issues (Must Fix)
- **ARCH-001**: Business logic in controller at `orders.controller.js:34`
  - **Violation**: Clean Architecture - business rules in presentation layer
  - **Impact**: Difficult to test, reuse, and maintain business logic
  - **Fix**: Move logic to domain service, inject into controller

### Pattern Violations
- **ARCH-002**: Direct database access in service at `user.service.js:67`
  - **Pattern**: Repository pattern not followed
  - **Fix**: Create UserRepository interface and implementation

### Recommendations
- Consider implementing CQRS for complex queries
- Extract common validation logic to domain value objects
- Implement domain events for cross-boundary communication
```

## Key Principles

- Architecture consistency enables long-term maintainability
- Domain integrity is non-negotiable
- Patterns should be applied consistently across codebase
- Dependencies must flow in correct direction
- Business logic belongs in domain layer
- Infrastructure concerns should be isolated and abstracted