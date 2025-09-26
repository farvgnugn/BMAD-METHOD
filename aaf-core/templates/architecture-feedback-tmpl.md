<!-- Template for Architectural Feedback in Code Reviews -->

# Architecture Feedback Template

Use this template when providing architectural guidance and feedback in code reviews.

## Standard Architecture Review Format

```markdown
## 🏗️ Architectural Analysis

**Reviewer**: Marcus (Senior Code Review Specialist)
**Focus**: {domain_boundaries|design_patterns|clean_architecture|dependency_management}

### ✅ Architecture Compliance
{areas_that_follow_established_patterns}

### ⚠️ Architectural Concerns
{violations_requiring_attention}

### 🎯 Design Pattern Recommendations
{suggested_improvements_with_patterns}

### 📐 Structural Impact Assessment
- **Maintainability**: {impact_on_code_maintenance}
- **Scalability**: {impact_on_system_growth}
- **Testability**: {impact_on_testing_ability}
- **Reusability**: {impact_on_component_reuse}
```

## Architectural Issue Templates

### Domain Boundary Violation
```markdown
**DOMAIN VIOLATION**: {brief_description}
- **Location**: `{file}:{line}`
- **Issue**: Business logic for {domain_A} found in {domain_B} context
- **Impact**: Breaks domain isolation, increases coupling
- **Solution**: Move logic to appropriate domain service/aggregate
- **Pattern**: Domain-Driven Design bounded contexts
- **Reference**: [ADR-{number}]({link}) - Domain Boundaries
```

### Layer Separation Issue
```markdown
**LAYER VIOLATION**: {brief_description}
- **Location**: `{file}:{line}`
- **Issue**: {layer_A} directly accessing {layer_B} (skipping abstraction)
- **Impact**: Violates Clean Architecture, increases coupling
- **Solution**: Introduce interface in {appropriate_layer}
- **Pattern**: Dependency Inversion Principle
- **Example**:
  ```{language}
  // Instead of direct access:
  {bad_example}

  // Use interface:
  {good_example}
  ```
```

### Design Pattern Misuse
```markdown
**PATTERN MISUSE**: {pattern_name} incorrectly implemented
- **Location**: `{file}:{line}`
- **Issue**: {specific_pattern_violation}
- **Impact**: {consequences_of_misuse}
- **Correct Implementation**:
  ```{language}
  {proper_pattern_implementation}
  ```
- **Reference**: [Design Patterns Documentation]({link})
```

## Architecture Decision Guidance

### When to Suggest Repository Pattern
```markdown
🏗️ **Consider Repository Pattern**

Current implementation mixes data access with business logic. Consider:

```{language}
// Current (mixed concerns):
class UserService {
  async getUser(id) {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return this.validateUser(user);
  }
}

// Recommended (separated concerns):
interface UserRepository {
  findById(id: string): Promise<User>;
}

class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    return this.validateUser(user);
  }
}
```

**Benefits**: Testability, maintainability, dependency inversion
```

### When to Suggest Factory Pattern
```markdown
🏗️ **Consider Factory Pattern**

Complex object creation logic detected. A factory could improve:

- **Encapsulation**: Hide complex creation logic
- **Consistency**: Ensure objects are created correctly
- **Testability**: Mock factories for testing
- **Flexibility**: Easy to change creation strategies

```{language}
// Consider implementing:
class {EntityName}Factory {
  static create{EntityName}({parameters}): {EntityName} {
    // Complex creation logic here
    return new {EntityName}({...});
  }
}
```
```

## Architecture Quality Gates

### CRITICAL Architecture Issues
```markdown
🚨 **ARCHITECTURE BLOCKING ISSUES**

These violations must be fixed before merge:

1. **Domain Logic in Infrastructure Layer**
   - Business rules belong in domain layer
   - Infrastructure should only handle technical concerns

2. **Circular Dependencies Detected**
   - Module A depends on B, B depends on A
   - Breaks dependency inversion principle

3. **God Object/Class Identified**
   - Single class handling too many responsibilities
   - Violates Single Responsibility Principle
```

### Architecture Improvement Suggestions
```markdown
💡 **Architecture Enhancement Opportunities**

Non-blocking suggestions for better architecture:

1. **Extract Command/Query Objects**
   - Consider CQRS for complex operations
   - Improves separation of read/write concerns

2. **Implement Domain Events**
   - Decouple business logic side effects
   - Improves maintainability and testing

3. **Add Anti-Corruption Layer**
   - Protect domain from external service changes
   - Implement adapter pattern for third-party integration
```

## Consistency Check Template

```markdown
## 📏 Architectural Consistency Review

### Pattern Consistency
- [ ] Follows established repository pattern
- [ ] Service layer properly abstracts business logic
- [ ] Controller only handles HTTP concerns
- [ ] DTOs used for external communication
- [ ] Error handling follows project conventions

### Naming and Organization
- [ ] File structure matches logical architecture
- [ ] Naming conventions reflect architectural layers
- [ ] Imports follow dependency flow rules
- [ ] Module boundaries clearly defined

### Documentation Alignment
- [ ] Code matches architectural documentation
- [ ] ADRs (Architectural Decision Records) followed
- [ ] Design patterns documented where used
- [ ] Breaking changes properly communicated
```

## Long-term Architecture Health

```markdown
## 🔮 Long-term Architecture Impact

### Positive Contributions
- {how_changes_improve_architecture}

### Technical Debt Assessment
- {potential_debt_introduced}

### Scalability Considerations
- {impact_on_system_scalability}

### Maintenance Impact
- {effect_on_future_maintenance}

### Recommendations for Future
- {suggestions_for_next_iterations}
```

---

*This template ensures architectural feedback is constructive, specific, and aligned with established system design principles.*