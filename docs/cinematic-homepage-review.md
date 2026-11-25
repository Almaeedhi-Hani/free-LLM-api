# Cinematic homepage review — no production deployment

Scope: homepage hero, homepage-only CSS treatment of the existing global header, and regression coverage. The rest of the homepage, existing metadata and JSON-LD, global layout, services, contact section, packages, official sources, admin and backend are unchanged.

Media: original in-repository architectural CSS artwork adapted to a full-bleed dusk panorama. It is an illustration, not a photograph or a verified depiction of a particular district. No third-party footage, network requests, audio, new fonts or dependencies. Licensed Saudi skyline footage and poster are follow-up requirements, not part of this PR.

CTAs: consultation links to the existing #contact section (existing WhatsApp and phone actions); packages uses localizedPath; services remains a tertiary link. Arabic and Chinese do not use Latin italic typography.

Validation: run npm ci, npm run build, npm run test:packages, npm run test:whatsapp, npm run test:impact (includes the new static test), node scripts/cinematic-homepage.test.cjs. Verify /, /en, /zh at widths 320, 390, 768, 1440, 1920 and with reduced motion. Check keyboard navigation, focus, horizontal overflow, all CTA destinations, language switching, mobile menu and sticky header. Compare screenshots on actual application with browser cache disabled; collect Lighthouse mobile and desktop performance/accessibility, do not infer Core Web Vitals from static inspection.

Rollback before merge: close PR; production stays unchanged. If separately approved and merged later, revert the merge commit; no database migration or configuration rollback is necessary.

PR-only browser review uses a local development fixture (no production credentials or writes), captures actual Next.js hero and full-page screenshots in ar/en/zh at 390 and 1440 pixels, checks all 15 viewport/locale combinations, and uploads artifacts. It is not a production Lighthouse or Core Web Vitals measurement. Existing automation schedules remain untouched.
