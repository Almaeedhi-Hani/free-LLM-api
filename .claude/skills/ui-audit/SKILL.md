---
name: ui-audit
description: "Review or finish investor-services UI changes for theme consistency, duplication, RTL, accessibility and responsive behavior."
---

# ui-audit

## When to use
Review or finish UI changes for the Invest in Saudi investor-services platform for theme consistency, duplication, RTL, accessibility and responsive behavior. Select for matching UI work, not backend-only tasks.

## Workflow
1. Identify changed files and affected flows; do not expand into unrelated redesigns. Read the relevant Tailwind config and components.
2. Run `npm run build`. Treat static warnings as review findings, not proof of a UI defect or a passing accessibility audit.
3. Inspect actual tooling and run relevant existing lint/typecheck. Do not install dependencies or invent successful checks.
4. Review semantic variants, token reuse, copied JSX/styles, all interaction states, RTL mixed content, typography scaling, focus/labels, target sizes, contrast and reduced motion.
5. Visually inspect affected UI at relevant sizes when runnable. Fix in-scope defects and rerun impacted checks. Report exact commands, findings, skipped checks and material limitations.

Paths are relative to the project root. Preserve the user task scope and existing business contracts.