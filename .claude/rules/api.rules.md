---
paths:
  - "src/api/**/*.{ts,tsx}"
---

# Frontend API Call Conventions

**Load when:** creating or editing files in `src/api/` or any file that makes HTTP calls.

## Rules

- All HTTP calls MUST go through `src/api/`. Raw `fetch` or direct `axios` calls MUST NOT appear in components or hooks.
- Each domain MUST have its own file — e.g. `api/ideas.ts`, `api/payment.ts`. Cross-domain logic MUST NOT be mixed into one file.
- The shared HTTP client (Axios instance, auth headers, base URL) MUST live in `api/client.ts` and MUST be imported from there.
- `src/api/` files MUST NOT import from React or any React hook.
- API functions MUST be named as verbs describing the action — e.g. `createIdea`, `getDashboard`, `submitPayment`.
- API functions SHOULD have explicit TypeScript return types.
- Error handling (retry, toast, logging) MUST NOT live in `src/api/`. It belongs in the calling hook or component.

## Pattern

```ts
// src/api/ideas.ts
import api from './client';
import { CreateIdeaRequest, Idea } from '../types';

export const createIdea = async (data: CreateIdeaRequest): Promise<Idea> => {
  const response = await api.post('/ideas', data);
  return response.data;
};
```

```tsx
// In a hook or component
import { createIdea } from '../api/ideas';

const handleSubmit = async () => {
  setLoading(true);
  try {
    const result = await createIdea(formData);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed');
  } finally {
    setLoading(false);
  }
};
```

## File Naming

- camelCase `.ts` — e.g. `ideas.ts`, `payment.ts`, `dashboard.ts`
- No React imports in `src/api/` files.
