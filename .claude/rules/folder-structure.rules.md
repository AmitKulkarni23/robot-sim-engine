---
paths:
  - "src/**/*"
---

# Frontend Folder Structure

**Load when:** creating, moving, or renaming files; scaffolding a new feature.

## Standard src/ Layout

```
src/
├── api/            # HTTP calls only. One file per domain.
├── components/     # Reusable UI components.
│   ├── ui/         # ShadCN base components. Installed via npx shadcn@latest add.
│   └── {domain}/   # Subdirectory when a domain has 3+ related components.
├── config/         # Static config: constants, feature flags, env values.
├── hooks/          # Custom React hooks. One hook per file.
├── layouts/        # Route-level layout wrappers only.
├── lib/            # Utility libraries. Contains utils.ts with cn() helper.
├── pages/          # One file per route.
├── store/          # Global client state (e.g. Redux).
│   └── slices/
├── styles/         # globals.css with Tailwind directives and CSS variables.
├── types/          # Shared TypeScript interfaces and types.
└── utils/          # Pure functions. No API calls, no React imports.
```

## Rules

- Files MUST be placed in the folder that matches their purpose above.
- A `{domain}/` subdirectory MUST be created when a folder contains 3 or more files serving the same domain (e.g. `components/auth/`).
- `pages/` MUST NOT contain business logic. Data fetching and state belong in hooks or components.
- `utils/` MUST NOT import from React or any API module.
- A `services/` folder MAY be used for non-HTTP integrations (e.g. analytics, monitoring) if there are 3 or more such files. Fewer than 3 SHOULD be placed in `utils/`.
- Planning documents and design artifacts MUST NOT live at the project root. Use `docs/` or delete them.
- Barrel exports (`index.ts`) MUST re-export all members of their folder, or be omitted entirely. Partial barrel exports MUST NOT exist.
- Build tooling artifacts from a previous framework (e.g. CRA files in a Vite project) MUST be deleted.
