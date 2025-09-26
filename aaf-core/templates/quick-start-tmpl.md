<!-- Template for Quick-Start Guides -->

# Quick-Start Guide Template

Use this template to create getting started guides that get users to success quickly.

## Template Structure

```markdown
# Get Started with {Product Name}

*{Action they'll complete} in {time estimate}*

## What You'll Accomplish
{Brief description of the valuable outcome they'll achieve and why it matters to them}

## Before You Begin
Make sure you have:
- [ ] {Prerequisite 1 with link if setup required}
- [ ] {Prerequisite 2}
- [ ] {Prerequisite 3}

*Estimated time: {X} minutes*

---

## Step 1: {Action-Oriented Title}
{Clear, specific instruction with expected outcome}

{Code sample, screenshot, or additional guidance if needed}

✅ **Success check**: {Specific way to verify this step worked}

⚠️ **If something went wrong**: {Most common issue and quick fix}

---

## Step 2: {Action-Oriented Title}
{Clear, specific instruction with expected outcome}

{Visual aid or code example}

✅ **Success check**: {How they know it worked}

---

{Continue pattern for remaining steps - keep to 3-7 steps total}

---

## 🎉 Congratulations!
{Celebrate what they accomplished and reinforce the value}

### What You Just Built
{Summary of the outcome with emphasis on business value or capabilities gained}

### Next Steps
Now that you've got the basics working, here's what to explore next:
- [ ] {Logical next action 1 with link}
- [ ] {Logical next action 2 with link}
- [ ] {Advanced tutorial or feature with link}

### Get Help
- 💬 {Community forum or support channel}
- 📖 {Complete documentation link}
- 🐛 {Bug reporting or feedback mechanism}
- 📧 {Direct support contact if available}

---

*Having trouble? {Link to troubleshooting guide or support}*
```

## Writing Guidelines for Quick-Starts

### Opening Section Best Practices
```markdown
✅ GOOD Examples:
- "Build your first chatbot in 10 minutes"
- "Deploy a secure API to production in 15 minutes"
- "Create a dashboard that visualizes your data in 5 minutes"

❌ AVOID Examples:
- "Learn about our platform capabilities"
- "Understand the system architecture"
- "Explore various configuration options"
```

### Step Writing Patterns
```markdown
✅ GOOD Step Titles:
- "Connect to your database"
- "Create your first workflow"
- "Test the integration"

❌ AVOID Step Titles:
- "Database connectivity"
- "Workflow management"
- "Integration testing"
```

### Success Check Examples
```markdown
✅ GOOD Success Checks:
- "You should see a green 'Connected' status in the dashboard"
- "The API should return a 200 status with your user data"
- "Your terminal should display 'Build successful' in green text"

❌ AVOID Success Checks:
- "Ensure the connection is established"
- "Verify successful completion"
- "Check that everything is working"
```

## Template Variations by Product Type

### Developer Tool Quick-Start
```markdown
# Get Started with {Tool Name}

*Build and deploy your first {application type} in {time}*

## What You'll Build
A working {specific example} that demonstrates {key capability}

## Prerequisites
- [ ] {Runtime/language version} installed
- [ ] {Development environment} set up
- [ ] {Account/API access} configured

## Step 1: Install and Initialize
```bash
{actual installation command}
{initialization command}
```

✅ **Success check**: {specific output or file that should exist}

## Step 2: Create Your First {Component}
{Code example that actually works}

✅ **Success check**: {what happens when they run it}

## Step 3: Deploy and Test
{deployment commands or process}

✅ **Success check**: {live URL or working endpoint they can verify}
```

### Business Application Quick-Start
```markdown
# Get Started with {Application Name}

*Complete your first {business process} in {time}*

## What You'll Accomplish
{Business outcome they'll achieve and why it's valuable}

## Step 1: Set Up Your Account
1. {Specific setup action}
2. {Configuration step}
3. {Verification step}

✅ **Success check**: {dashboard view or confirmation they should see}

## Step 2: {Core Workflow Action}
{Step-by-step process through the main workflow}

{Screenshot of key interface elements}

✅ **Success check**: {specific result or status they should see}

## Step 3: Review Your Results
{How to interpret and verify the outcome}

✅ **Success check**: {what successful completion looks like}
```

### API/Integration Quick-Start
```markdown
# Get Started with {API Name}

*Make your first successful API call in {time}*

## What You'll Accomplish
{Specific data or functionality they'll access and why it's useful}

## Prerequisites
- [ ] API key from {where to get it}
- [ ] {HTTP client or programming language} ready
- [ ] Basic understanding of {relevant concepts}

## Step 1: Authenticate
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  {authentication endpoint}
```

✅ **Success check**: Should return `{"status": "authenticated", "user": "..."}`

## Step 2: Make Your First Request
```bash
{complete working API call with real parameters}
```

✅ **Success check**: {exact response format they should see}

## Step 3: Process the Response
{code showing how to handle the data they received}

✅ **Success check**: {what they can do with the data}
```

## Quality Checklist Template

```markdown
## Quick-Start Quality Review

### Content Validation
- [ ] Completed from scratch in clean environment
- [ ] All code examples actually work
- [ ] Screenshots are current and accurate
- [ ] Time estimate is realistic (tested with real users)
- [ ] Success checks are specific and verifiable

### User Experience
- [ ] Value proposition is clear upfront
- [ ] Prerequisites are minimal and clearly stated
- [ ] Each step builds logically on the previous
- [ ] Common failure points are addressed
- [ ] Next steps provide clear path forward

### Technical Accuracy
- [ ] All commands and code tested recently
- [ ] Version dependencies are current
- [ ] External links are functional
- [ ] Error scenarios are documented
- [ ] Security best practices followed
```

## Customization Guidelines

### Adapt for Your Audience
```markdown
For Beginners:
- More detailed explanations
- Additional context and background
- Extra verification steps
- Links to foundational concepts

For Experienced Users:
- Streamlined instructions
- Focus on unique/different aspects
- Assume knowledge of common tools
- Emphasize advanced configuration options
```

### Adapt for Your Product
```markdown
For Complex Products:
- Break into smaller sub-goals
- Provide multiple entry points
- Include troubleshooting sections
- Offer alternative approaches

For Simple Products:
- Showcase advanced capabilities
- Connect to broader workflows
- Demonstrate integration possibilities
- Highlight unique value propositions
```

---

*This template ensures quick-start guides focus on user success and provide genuine value in minimal time.*