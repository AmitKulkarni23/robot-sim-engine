---
paths:
  - "**/*.test.{ts,tsx}"
---

# Frontend Testing Conventions

**Load when:** writing, editing, or reviewing test files (`.test.tsx`, `.test.ts`).

## Test Runner

- Vitest MUST be used for all frontend tests. Jest MUST NOT be used in Vite projects.
- Test environment MUST be `jsdom`.
- `@testing-library/react` MUST be used for component tests.
- `@testing-library/user-event` MUST be used for simulating user interactions.

## File Naming and Location

- Test files MUST be co-located next to source: `LoginPopup.test.tsx` next to `LoginPopup.tsx`.
- Test files MUST use the `.test.ts` or `.test.tsx` extension.
- Shared test utilities (mocks, factories, helpers) SHOULD live in `src/test/`.

## Test Structure

Every test file MUST follow this structure:

```tsx
describe("ComponentName", () => {
  // Group by condition or feature area
  describe("when user is logged in", () => {
    it("should display dashboard link when user is authenticated", () => {});
    it("should show username in navigation when profile is loaded", () => {});
  });

  describe("when form is submitted", () => {
    it("should call onSubmit handler when all fields are valid", () => {});
    it("should show 'Email is required' when email field is empty", () => {});
  });
});
```

### Rules

- Every test file MUST have a top-level `describe` block named after the unit under test (component name, hook name, function name).
- Related tests MUST be grouped in nested `describe` blocks using `"when [condition]"` format.
- `it` blocks MUST NOT be placed directly under the top-level `describe`. Always group them under a nested `describe("when ...")`.

## Test Naming

Tests MUST use `"should"` + verb format with the trigger event included.

```tsx
// Good — clear behavior, clear trigger
it("should display error message when validation fails", () => {});
it("should increment counter when plus button is clicked", () => {});
it("should enable checkout button when cart has items", () => {});
it("should show skeleton loader while fetching dashboard data", () => {});
it("should change status from pending to approved when admin clicks approve", () => {});

// Bad — vague, no trigger
it("displays error message", () => {});
it("counter works", () => {});
it("button is enabled", () => {});
```

### Naming Patterns by Scenario

| Scenario | Pattern | Example |
|----------|---------|---------|
| User action | `should [outcome] when [action]` | `should close modal when X button is clicked` |
| State change | `should change [attr] from [A] to [B]` | `should change status from draft to published` |
| Async operation | `should [outcome] [during/after] [operation]` | `should show spinner while loading data` |
| Error case | `should show '[specific error]' when [condition]` | `should show 'Invalid email' when email format is wrong` |
| Precondition | `should [outcome] when [precondition]` | `should enable submit when all required fields are filled` |
| Multi-step flow | `should first/then/finally [step]` | `should first validate stock, then calculate total` |

### Language

- Use **business language**, not technical terms. Write from the user's perspective.
- Say `"should save customer order"` not `"should dispatch SET_ORDER action"`.
- Say `"should highlight field in red"` not `"should add error class to input"`.

## Querying Elements

MUST query by accessible attributes. MUST NOT query by class name, tag name, or test ID unless no accessible alternative exists.

```tsx
// Good — accessible queries (in order of preference)
screen.getByRole("button", { name: "Submit" });
screen.getByLabelText("Email address");
screen.getByText("Welcome back");
screen.getByPlaceholderText("Search...");

// Bad — implementation-coupled queries
document.querySelector(".submit-btn");
screen.getByTestId("submit-button");
container.querySelector("div > button");
```

## Mocking

- External dependencies (HTTP clients, SDKs, browser APIs) MUST be mocked. Tests MUST NOT make real network calls.
- Internal modules SHOULD be mocked only at module boundaries (hooks, API layer). MUST NOT mock internal implementation details of the unit under test.
- Mock data SHOULD use realistic values, not `"test"` or `"abc123"`.

```tsx
// Good — mock at the API boundary
vi.mock("@/api/ideas", () => ({
  getIdeas: vi.fn().mockResolvedValue([
    { id: "idea-1", title: "Mobile App for Dog Walkers", status: "draft" },
  ]),
}));

// Bad — mock internal state
vi.spyOn(React, "useState").mockReturnValue([mockState, mockSetState]);
```

## What to Test and What to Skip

### MUST test:
- Components with user interaction (forms, buttons, toggles, modals)
- Components with conditional rendering (auth-gated UI, error states, loading states)
- Custom hooks with state logic
- Redux reducers and slices
- API functions (request shape, response parsing)
- Pure utility functions

### MUST NOT test:
- Pure display components that only render props (e.g., `StatCard`)
- Third-party library internals (Stripe, Cognito, React Router)
- Styling or layout (visual, not behavioral)
- Implementation details (internal state, private methods, DOM structure)

## Assertions

- Each test MUST have at least one assertion. Tests without assertions MUST NOT exist.
- Prefer specific assertions over generic ones.

```tsx
// Good — specific
expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
expect(onSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
expect(screen.queryByText("Error")).not.toBeInTheDocument();

// Bad — generic
expect(result).toBeTruthy();
expect(wrapper.html()).toContain("Submit");
```

## Async Tests

- Async behavior MUST be tested using `findBy*` queries or `waitFor`.
- MUST NOT use arbitrary `setTimeout` or `sleep` in tests.

```tsx
// Good
await screen.findByText("Data loaded successfully");
await waitFor(() => expect(onSubmit).toHaveBeenCalled());

// Bad
await new Promise((r) => setTimeout(r, 1000));
expect(screen.getByText("Data loaded successfully")).toBeInTheDocument();
```
