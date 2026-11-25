# Project architecture — incremental refactor

## References
- Next.js 14 project organization: https://nextjs.org/docs/14/app/building-your-application/routing/colocation
- CSS Modules: https://nextjs.org/docs/14/app/building-your-application/styling/css-modules
- Composition patterns: https://nextjs.org/docs/14/app/building-your-application/rendering/composition-patterns
- Production checklist: https://nextjs.org/docs/14/app/building-your-application/deploying/production-checklist

## Rules
Use the existing App Router and Next.js 14/React 18 stack. Keep route entries small; route files own routing/metadata and delegate UI to feature components. Server-side loaders prepare content, authorization and structured data; client components are used only for interactions. Shared components and helpers remain reusable. Feature-local styles prefer CSS Modules for new components; existing global selector contracts move without modifying cascade, colors, spacing or DOM. The global entrypoint imports ordered styles; do not append another unrelated feature block there. Preserve RTL, three languages, URLs, canonical/hreflang, schema, notices, admin auth, Supabase and all automation schedules. Never change the approved visual direction as part of refactoring. No new design colors are introduced here.

## Inventory (baseline 169a8f7a1cf8ad0d794df29af8e9b8694c92d490)
497 tracked files; app 67, components 30, lib 90, scripts 149, supabase 31. The dashboard route (1,240 lines) and market engine (~62 KB) need separate behavior-preserving phases; the public home route (271 lines) and global CSS (1,553 lines) are the first migration slice.

## Current migration
- src/app/page.tsx: route composition + metadata and JSON-LD output.
- src/lib/home/model.ts: server data preparation and schema.
- src/components/home/: nine feature components, existing hero imported separately.
- src/app/globals.css: ordered stylesheet manifest.
- src/styles/foundation/: base, utilities, responsive and accessibility rules.
- src/styles/layout/: header, footer, public shell and mobile navigation.
- src/styles/components/: legacy reusable controls and hero rules.
- src/styles/features/: homepage, services, packages and cinematic hero.
- scripts/project-architecture.test.cjs: structure and optional exact baseline CSS/section checks.

Legacy global style order is intentionally preserved. Some responsive/shared legacy rules remain grouped by cascade phase; move them into scoped CSS Modules only with visual regression coverage. PostCSS imports use the already locked postcss-import version as an explicit dev dependency. No runtime dependency or UI redesign.

## Subsequent phases
1. Public layout: extract shared header/footer, then feature content and styles for services, packages and residency; preserve paths and client state.
2. Admin: extract tab registry, types, server API adapters, state hooks and tab components one bounded PR at a time. Keep auth and write semantics unchanged.
3. Backend: split market, GEO, GSC and Telegram internals by domain behind stable interfaces, after mapping imports and scheduled consumers. Do not move API routes or SQL migrations prematurely.
4. Verify static contracts, build, fixture/browser coverage, and review before each merge; rollback by reverting each isolated PR. No production deploy in this foundation PR.
