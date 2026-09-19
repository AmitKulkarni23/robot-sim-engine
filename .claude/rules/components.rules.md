---
paths:
  - "src/components/**/*.tsx"
---

# Frontend Component Conventions

**Load when:** creating or editing component files.

## Component Pattern

```tsx
import React from 'react';

type MyComponentProps = {
  title: string;
  onAction: () => void;
};

const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Take Action</button>
    </div>
  );
};

export default MyComponent;
```

## Rules

- Components MUST use default exports.
- Props type MUST be defined directly above the component, not inline or in a separate file.
- File names MUST be PascalCase with `.tsx` extension — e.g. `LoginPopup.tsx`, `StatCard.tsx`.
- Import order MUST be: React → external libraries → internal components → hooks → types → utils.
- Components MUST NOT contain raw API calls. API calls belong in `src/api/` and SHOULD be accessed via hooks.

## UI Component Libraries

- When a project uses a component library (e.g. MUI, Chakra, Ant Design), MUST prefer library components over building from scratch.
- Library base components MUST NOT be modified directly. Build wrapper components instead.
- Check library docs before creating custom components — the library likely has what you need.

## Import Order Example

```tsx
// 1. React
import React, { useState } from 'react';

// 2. External libraries
import { useNavigate } from 'react-router-dom';

// 3. Internal components
import StatCard from '../components/StatCard';

// 4. Hooks
import { useDashboard } from '../hooks/useDashboard';

// 5. Types and utils
import { Idea } from '../types';
import { formatDate } from '../utils/formatDate';
```

## Path Aliases

- `@/` SHOULD alias to `src/`. Configure in `tsconfig.json` and the bundler config (e.g. `vite.config.ts`).
- Other internal imports MAY use relative paths or `@/` — be consistent within the project.
