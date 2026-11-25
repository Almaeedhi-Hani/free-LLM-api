# Cinematic homepage review — no production deployment

Scope: homepage hero, homepage-only CSS treatment of the existing global header, and regression coverage. The rest of the homepage, existing metadata and JSON-LD, global layout, services, contact section, packages, official sources, admin and backend are unchanged.

Media: actual Riyadh skyline photo by Steven Jeffery, Pexels photo 31849530, https://www.pexels.com/photo/modern-riyadh-skyline-with-iconic-buildings-31849530/ . Pexels license https://www.pexels.com/license/ permits free use and modification including commercial websites. Visual treatment: responsive WebP, grayscale via CSS, central editorial composition. No implication of endorsement or affiliation. Both WebP binaries are committed under public/media; the PR browser workflow checks their SHA-256 against the acquisition artifact. No runtime external image requests or acquisition workflow remain. Licensed video remains a separate requirement. Verified source and license 2026-11-25.

CTAs: consultation links to the existing #contact section (existing WhatsApp and phone actions); packages uses localizedPath; services remains a tertiary link. Arabic and Chinese do not use Latin italic typography.

Validation: run npm ci, npm run build, npm run test:packages, npm run test:whatsapp, npm run test:impact (includes the new static test), node scripts/cinematic-homepage.test.cjs. Verify /, /en, /zh at widths 320, 390, 768, 1440, 1920 and with reduced motion. Check keyboard navigation, focus, horizontal overflow, all CTA destinations, language switching, mobile menu and sticky header. Compare screenshots on actual application with browser cache disabled; collect Lighthouse mobile and desktop performance/accessibility, do not infer Core Web Vitals from static inspection.

Rollback before merge: close PR; production stays unchanged. If separately approved and merged later, revert the merge commit; no database migration or configuration rollback is necessary.

PR-only browser review uses a local development fixture (no production credentials or writes), captures actual Next.js hero and full-page screenshots in ar/en/zh at 390 and 1440 pixels, checks all 15 viewport/locale combinations, and uploads artifacts. It is not a production Lighthouse or Core Web Vitals measurement. Existing automation schedules remain untouched.

Owner correction: use light silver-gray, charcoal, monochrome architecture, centered oversized display lettering and restrained pill buttons. The former blue/green illustrated hero is replaced, not recolored. Existing business content and routes are unchanged.

## Local poster integrity

- `public/media/riyadh-monochrome.webp`: 117882 bytes, expected SHA-256 `afb2873e2d42dcbbcd8a063e77491cc597ea6ab959ca9eb99497ed110aa7a8eb` (verified by CI before rendering).
- `public/media/riyadh-monochrome-mobile.webp`: 32574 bytes, expected SHA-256 `42be2b340ec5932a28b21bf8ed95d13d6edec60bcb45edef5acf1c02b8f8c890` (verified by CI before rendering).
