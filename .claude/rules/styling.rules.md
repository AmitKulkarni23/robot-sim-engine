---
paths:
  - "src/**/*.tsx"
  - "**/tailwind.config.*"
  - "src/**/*.css"
---

# Frontend Styling Conventions

**Load when:** adding or changing styles, working with Tailwind classes, or theming.

## Rules

- Styles MUST use Tailwind CSS utility classes. Inline `style={{}}` MUST NOT be used.
- CSS custom properties and `tailwind.config.ts` theme tokens SHOULD be preferred over hardcoded values.
- Per-component CSS files MUST NOT be created. Global styles belong in one `globals.css` file.
- Layout SHOULD use Tailwind's flex/grid utilities rather than custom CSS.

## Tailwind Usage

```tsx
// Good — Tailwind utilities
<div className="flex items-center gap-4 rounded-lg bg-background p-4">
  <h2 className="text-lg font-semibold text-foreground">Hello</h2>
</div>

// Bad — inline style
<div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
  <h2 style={{ color: '#666' }}>Hello</h2>
</div>

// Bad — hardcoded colors instead of theme tokens
<div className="bg-[#f8fafc] text-[#1976d2]">
```

## Conditional Classes with `cn()`

MUST use `cn()` from `@/lib/utils` for conditional or merged class names.
MUST NOT use string concatenation or template literals for conditional classes.

```tsx
import { cn } from '@/lib/utils';

// Good
<div className={cn(
  "rounded-lg border p-4",
  isActive && "border-primary bg-primary/10",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />

// Bad — string concatenation
<div className={`rounded-lg border p-4 ${isActive ? 'border-primary' : ''}`} />
```

## Theme Tokens

Use ShadCN's CSS variable-based theming. These are defined in `globals.css`
and accessed via Tailwind:

```tsx
// Semantic tokens — SHOULD use these
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground" />
<div className="bg-muted text-muted-foreground" />
<div className="border-border" />
<div className="text-primary" />
<div className="text-destructive" />

// Hardcoded — MUST NOT use when a token exists
<div className="bg-white text-gray-900" />
```

## Responsive Design

MUST use Tailwind's responsive prefixes. MUST NOT use CSS media queries.

```tsx
// Good — mobile-first responsive
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

// Bad — CSS media query
@media (min-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
```

## Dark Mode

ShadCN projects use `class` strategy for dark mode. MUST use the
`dark:` prefix for dark mode overrides when the default theme tokens
don't cover the case.

```tsx
<div className="bg-white dark:bg-slate-900">
```
