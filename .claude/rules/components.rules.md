---
paths:
  - "src/components/**/*.tsx"
---

# Frontend Component Conventions

**Load when:** creating or editing component files.

## Component Pattern

```tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MyComponentProps = {
  title: string;
  onAction: () => void;
};

const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={onAction}>Take Action</Button>
      </CardContent>
    </Card>
  );
};

export default MyComponent;
```

## Rules

- Components MUST use default exports.
- Props type MUST be defined directly above the component, not inline or in a separate file.
- File names MUST be PascalCase with `.tsx` extension — e.g. `LoginPopup.tsx`, `StatCard.tsx`.
- Import order MUST be: React → external libraries → ShadCN `@/components/ui/` → internal modules (components, hooks, types, utils).
- Components MUST NOT contain raw API calls. API calls belong in `src/api/` and SHOULD be accessed via hooks.

## ShadCN Component Usage

- ShadCN components live in `src/components/ui/`. These are installed via `npx shadcn@latest add <component>`.
- MUST NOT modify ShadCN base components in `src/components/ui/` unless absolutely necessary. Build wrapper components instead.
- When a ShadCN component exists for the job, MUST use it instead of building from scratch. Check the ShadCN docs before creating custom components.
- Common ShadCN components: `Button`, `Card`, `Dialog`, `Input`, `Label`, `Select`, `Table`, `Tabs`, `Toast`, `Dropdown Menu`, `Sheet`, `Badge`, `Avatar`.

## Import Order Example

```tsx
// 1. React
import React, { useState } from 'react';

// 2. External libraries
import { useNavigate } from 'react-router-dom';

// 3. ShadCN components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// 4. Internal — components, hooks, types, utils
import StatCard from '../components/StatCard';
import { useDashboard } from '../hooks/useDashboard';
import { Idea } from '../types';
import { formatDate } from '../utils/formatDate';
```

## Path Aliases

- `@/` MUST alias to `src/`. Configure in `tsconfig.json` and `vite.config.ts`.
- ShadCN components MUST be imported using `@/components/ui/` path.
- Other internal imports MAY use relative paths or `@/` — be consistent within the project.
