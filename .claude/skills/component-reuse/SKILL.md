---
name: component-reuse
description: "Create or refactor investor-services UI components using existing Tailwind primitives, composition and typed semantic variants."
---

# component-reuse

## When to use
Create or refactor UI components for the Invest in Saudi investor-services platform using existing Tailwind/React primitives, composition and typed semantic variants. Select for matching UI work, not backend-only tasks.

## Workflow
1. Search actual imports, components and styles before creating files; do not assume a components directory exists (current: `src/components`, `src/app`).
2. Identify shared behavior and semantic differences. Reuse primitives first; extract only a stable repeated pattern, not merely similar lines.
3. Use small typed variant maps and composition. Keep domain/API/navigation logic unchanged; avoid boolean-prop explosions and giant universal cards.
4. Share tokens/contracts across pages, not incompatible rendering APIs. Keep screen orchestration separate where useful.
5. Verify call sites, interaction states and existing component tests when present; run `npm run build` and review duplication warnings.

Paths are relative to the project root. Preserve the user task scope and existing business contracts.