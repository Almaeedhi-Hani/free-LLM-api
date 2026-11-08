---
name: rtl-responsive
description: "Implement or fix Arabic RTL, mixed-direction content and responsive layouts for the investor-services Next.js platform."
---

# rtl-responsive

## When to use
Implement or fix Arabic RTL, mixed-direction content, safe areas and responsive layouts for the Invest in Saudi investor-services Next.js platform. Select for matching UI work, not backend-only tasks.

## Workflow
1. Read the relevant page/component and inspect actual entrypoints, navigation, direction configuration and layout utilities (`src/app/layout.tsx`, Tailwind config).
2. Use start/end intent. Web uses logical CSS and `lang`/`dir` attributes. Do not blindly map native properties into web CSS.
3. Keep phone numbers, amounts and IDs directionally isolated (`<bdi>`/`dir`). Mirror only directional icons.
4. Use available container widths and content needs around 640/768/1024/1280 breakpoints. Ensure page content reflows.
5. Verify 320/390/640/768/1024/1280 widths where relevant, enlarged text, long Arabic strings, screen readers, keyboard focus and reduced motion. Run `npm run build`; report unavailable device coverage.

Paths are relative to the project root. Preserve the user task scope and existing business contracts.