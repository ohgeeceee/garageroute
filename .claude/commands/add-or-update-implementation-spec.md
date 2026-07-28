---
name: add-or-update-implementation-spec
description: Workflow command scaffold for add-or-update-implementation-spec in garageroute.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-implementation-spec

Use this workflow when working on **add-or-update-implementation-spec** in `garageroute`.

## Goal

Adds or updates detailed implementation specification documents for new features or phases, including architecture decisions, scope, and trade-offs.

## Common Files

- `docs/IMPLEMENTATION_SPEC.md`
- `docs/SELLER_ACTIVATION_SPEC.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update a markdown spec file in docs/
- Describe scope, audience, success metrics, and key technical decisions
- Commit the markdown file with a descriptive message

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.