# Task: <NNN> — <concise title>

## Summary

[One paragraph: what to build and why. Reference the parent design doc.]

## Read First

- `docs/specs/<relevant>.md` — [specific section]

## Conventions

Read and follow these before writing ANY code:
- `.claude/skills/<stack>-conventions/references/testing.md`
- `.claude/skills/<stack>-conventions/references/<relevant>.md`

## Requirements

[Numbered, RFC 2119 keywords (MUST/SHOULD/MAY). Group by concern if needed.]

### [Concern 1, e.g., Backend]

1. The handler MUST ...
2. The response SHOULD ...

### [Concern 2, e.g., Infrastructure]

3. The CDK stack MUST ...

## Technical Notes

[Key decisions, constraints, or gotchas. Keep brief. Only include what prevents wrong turns.]

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `methodName_givenCondition_shouldBehavior` | expected outcome | `src/test/...` |
| 2 | ... | ... | ... |

### GREEN — Implementation Order

1. Create X to make tests 1-3 pass
2. Create Y to make tests 4-5 pass

### REFACTOR

- [What to clean up after green, e.g., extract shared validation]
- [Or "None expected" if the task is simple]

## Dependencies

- `TASK-NNN` — [reason] (or "None")

## Files to Create/Modify

- `src/main/.../Handler.java` (create)
- `src/test/.../HandlerTest.java` (create)
- `cdk/lib/stack.ts` (modify — add table + lambda)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] [Criteria mapping to each requirement above]

## Spec Updates

- [ ] Update `docs/specs/<file>.md` — [what changed]
- [ ] [Or "None" if no spec changes needed]
