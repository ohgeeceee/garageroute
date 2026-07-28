---
name: spec-aligned-code-and-doc-fix
description: Workflow command scaffold for spec-aligned-code-and-doc-fix in garageroute.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /spec-aligned-code-and-doc-fix

Use this workflow when working on **spec-aligned-code-and-doc-fix** in `garageroute`.

## Goal

Implements code changes to match security or product requirements, and simultaneously updates related specification documents to reflect the new state and decisions.

## Common Files

- `app/api/sales/[id]/route.ts`
- `app/api/sales/route.ts`
- `app/sales/[id]/page.tsx`
- `docs/IMPLEMENTATION_SPEC.md`
- `docs/SELLER_ACTIVATION_SPEC.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Identify and fix code issues in relevant API or app files
- Update one or more spec markdown files in docs/ to reflect the change
- Commit both code and doc/spec changes together

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.