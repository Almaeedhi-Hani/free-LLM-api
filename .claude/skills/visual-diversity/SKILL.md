---
name: visual-diversity
description: "Design or review investor-services cards and sections whose functional roles need distinct hierarchy and visual treatment."
---

# visual-diversity

## When to use
Design or review cards and sections for the Invest in Saudi investor-services platform whose functional roles need distinct hierarchy and visual treatment. Select for matching UI work, not backend-only tasks.

## Workflow
1. Compare affected elements by purpose and identify the primary action. Review Tailwind tokens in `tailwind.config.js`.
2. Apply shared foundation with distinct visual identity: service hero/action, metric cards, FAQ, contact CTA, legal/compliance notes.
3. Vary composition, density, shape and emphasis deliberately while preserving typography, spacing and semantic color roles. Do not create arbitrary colors or identical cards for unrelated functions.
4. Reuse primitives and semantic variants; review narrow/wide RTL layouts and states. Check that secondary actions do not compete with the primary action.
5. Run `npm run build` and inspect the affected composition when runnable; document only a new design rule.

Paths are relative to the project root. Preserve the user task scope and existing business contracts.