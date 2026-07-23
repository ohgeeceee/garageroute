```markdown
# garageroute Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill provides guidance on the development conventions and workflows used in the `garageroute` TypeScript codebase. It covers file and code style, documentation and specification practices, and how to keep code and documentation in sync. The repository does not use a major framework, focusing on clear, maintainable TypeScript code with strong documentation alignment.

## Coding Conventions

### File Naming
- Use **snake_case** for all file names.
  - Example: `sales_route.ts`, `user_profile.test.ts`

### Imports
- Use **alias** imports for modules.
  - Example:
    ```typescript
    import apiRoutes from '@/app/api/routes';
    ```

### Exports
- Use **default exports** for modules.
  - Example:
    ```typescript
    const handler = () => { /* ... */ };
    export default handler;
    ```

### Commit Messages
- Follow **conventional commit** style.
- Common prefixes: `docs`, `fix`
  - Example: `fix: correct sales API response for edge case`

## Workflows

### Add or Update Implementation Spec
**Trigger:** When you need to formally document a new feature, product phase, or architectural decision.  
**Command:** `/new-spec`

1. Create or update a markdown spec file in the `docs/` directory.
   - Example: `docs/IMPLEMENTATION_SPEC.md`
2. In the spec, describe:
   - Scope
   - Audience
   - Success metrics
   - Key technical decisions and trade-offs
3. Commit the markdown file with a descriptive message.
   - Example commit: `docs: add implementation spec for seller activation`

#### Example Spec Structure
```markdown
# Seller Activation Feature

## Scope
Describe what is included/excluded.

## Audience
Who should read this?

## Success Metrics
How will we measure success?

## Architecture Decisions
- Use of REST API
- Data validation approach
- Trade-offs considered
```

---

### Spec-Aligned Code and Doc Fix
**Trigger:** When fixing a critical bug or security issue and ensuring documentation/specs stay up-to-date.  
**Command:** `/fix-and-spec-update`

1. Identify and fix code issues in relevant API or app files.
   - Example: `app/api/sales/[id]/route.ts`
2. Update one or more spec markdown files in `docs/` to reflect the change.
   - Example: `docs/IMPLEMENTATION_SPEC.md`
3. Commit both code and doc/spec changes together.
   - Example commit: `fix: patch sales API and update implementation spec`

#### Example Combined Commit
```typescript
// app/api/sales/[id]/route.ts
const handler = (req, res) => {
  // Fixed security check
  if (!req.user.isSeller) {
    return res.status(403).send('Forbidden');
  }
  // ...
};
export default handler;
```
```markdown
<!-- docs/IMPLEMENTATION_SPEC.md -->
## [Update] Security Checks for Sales API

- Added seller validation to prevent unauthorized access.
```

## Testing Patterns

- Test files use the pattern: `*.test.*`
  - Example: `sales_route.test.ts`
- The testing framework is not explicitly specified.
- Place test files alongside or near the code they test.

#### Example Test File
```typescript
// sales_route.test.ts
import handler from './sales_route';

test('returns 403 for non-seller', () => {
  const req = { user: { isSeller: false } };
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
  handler(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
});
```

## Commands

| Command              | Purpose                                                         |
|----------------------|-----------------------------------------------------------------|
| /new-spec            | Start or update an implementation/specification document        |
| /fix-and-spec-update | Apply a code fix and update the related spec documentation      |
```
