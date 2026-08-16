---
paths:
  - "src/hooks/**/*.{ts,tsx}"
  - "src/**/use*.{ts,tsx}"
---

# Frontend Hooks Conventions

**Load when:** creating or editing files in `src/hooks/`.

## Rules

- Hooks MUST call `src/api/` functions. They MUST NOT contain raw `fetch` or direct `axios` calls.
- Each hook MUST live in its own file. File naming MUST be camelCase `.ts` — e.g. `useAuth.ts`, `useDashboard.ts`.
- Data-fetching hooks SHOULD return a `{ data, loading, error }` shape for consistency.
- Hooks MUST NOT be created for one-off form submit handlers. A direct `src/api/` call from the component is sufficient in that case.

## Pattern

```ts
// src/hooks/useIdeas.ts
import { useState, useEffect } from 'react';
import { getIdeas } from '../api/ideas';
import { Idea } from '../types';

export const useIdeas = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        setIdeas(await getIdeas());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { ideas, loading, error };
};
```
