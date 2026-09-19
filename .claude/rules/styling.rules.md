---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
  - "src/**/*.scss"
---

# Frontend Styling Conventions

**Load when:** adding or changing styles or themed components.

## Rules

- Inline `style={{}}` MUST NOT be used except for truly dynamic values (e.g. computed widths, positions).
- Hardcoded color hex/rgb values MUST NOT appear in component files. Use CSS variables or theme tokens.
- Per-component CSS files MUST NOT be created unless using CSS Modules. Global styles belong in one `globals.css` (or `index.css`) file.
- Layout SHOULD use flexbox/grid utilities or CSS classes rather than manual pixel calculations.

## CSS Variables for Theming

SHOULD define design tokens as CSS custom properties for consistency across the app.

```css
/* globals.css */
:root {
  --color-primary: #2563eb;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #64748b;
  --color-destructive: #dc2626;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --radius: 0.5rem;
}
```

```tsx
// Good — theme token
<div style={{ color: 'var(--color-primary)' }} />

// Good — className referencing theme
<div className="text-primary" />

// Bad — hardcoded color
<div style={{ color: '#2563eb' }} />
```

## Conditional Classes

SHOULD use a utility like `clsx` or `classnames` for conditional class composition.
MUST NOT use string concatenation or template literals for conditional classes.

```tsx
import clsx from 'clsx';

// Good
<div className={clsx(
  "card",
  isActive && "card--active",
  isDisabled && "card--disabled"
)} />

// Bad — string concatenation
<div className={`card ${isActive ? 'card--active' : ''}`} />
```

## Responsive Design

MUST design mobile-first. Breakpoints SHOULD be handled via CSS media queries or the project's utility framework (e.g. Tailwind responsive prefixes).

## Dark Mode

When dark mode is needed, SHOULD use CSS custom properties that swap under a `data-theme` attribute or `prefers-color-scheme` media query.
