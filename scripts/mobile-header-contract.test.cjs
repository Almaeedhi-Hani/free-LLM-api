"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const layout=fs.readFileSync("src/app/layout.tsx","utf8");
const header=fs.readFileSync("src/components/layout/SiteHeader.tsx","utf8");
assert(layout.includes("<SiteHeader lang={lang} hasGuides={hasGuides} />"),"Shared header mounted");
const menu=fs.readFileSync("src/components/MobileFloatingNav.tsx","utf8");
const css=require('./support/global-styles.cjs').readGlobalStyles();

assert(header.includes('<MobileFloatingNav locale={lang} brand={t.brand} hasGuides={hasGuides} />'),
  "Mobile header must be shared across all trilingual public routes");
const desktop=fs.readFileSync("src/components/layout/DesktopNavigation.tsx","utf8");
assert(header.includes('<DesktopNavigation ')&&desktop.includes('<nav className="desktop-nav"'),"Desktop navigation retained");
assert(desktop.includes('aria-current={active===item.key?')&&desktop.includes('hashchange'),"Desktop selection follows route and anchor");
assert(header.includes('<LanguageSwitcher locale={lang} />'),"Desktop language switcher is preserved");
assert(layout.includes('body')&&css.includes('body:has(.admin-route) .site-header'),
  "Admin routes retain the existing header exclusion");

assert(menu.includes('aria-expanded={open}')&&menu.includes('aria-controls={id}'),
  "Hamburger button must announce its expandable menu");
assert(menu.includes('onClick={()=>setOpen(v=>!v)}')&&menu.includes('setOpen(false)'),
  "Dropdown opens and closes without leaving stale state");
assert(menu.includes('event.key==="Escape"')&&menu.includes('mobile-floating-menu-backdrop'),
  "Escape and click-outside close the overlay");
assert(menu.includes('usePathname()')&&menu.includes('selectedPage(pathname,hash)'),
  "Current page must determine active menu selection");
assert(menu.includes('aria-current={active===item.key?"page":undefined}'),
  "Current navigation item must be marked semantically");
assert(menu.includes('hashchange')&&menu.includes('"/packages"')&&menu.includes('"/insights"'),
  "Page and anchor navigation update active highlighting");
assert(menu.includes('hasGuides?')&&menu.includes('langHref(lang)'),
  "Optional guides and locale links are preserved");
assert(menu.includes('site-language=${lang};'),"Language changes retain the configured cookie");
assert(menu.includes('className="mobile-floating-header-languages"'),
  "Language choices must be visible in the top header without opening the dropdown");
assert(menu.indexOf('className="mobile-floating-header-languages"') < menu.indexOf('className="mobile-floating-menu-toggle"'),
  "Language selector belongs between brand and hamburger button");
assert(!menu.includes('className="mobile-floating-languages"'),
  "The bottom-of-menu duplicate language row must be removed");
assert(menu.includes('lang==="ar"?"العربية":lang==="en"?"English":"中文"'),
  "Show all three language names visibly in the header");

assert(menu.includes('labels={')&&menu.includes('ar:{')&&menu.includes('en:{')&&menu.includes('zh:{'),
  "Arabic, English and Chinese navigation text must be present");

assert(css.includes('.mobile-floating-nav-shell{display:none}'),
  "Desktop hides mobile-only header");
assert(css.includes('.site-header .header-inner,.site-header .mobile-nav{display:none!important}'),
  "Legacy crowded mobile header is replaced, not duplicated");
const corners=fs.readFileSync("src/styles/components/public-corner-radius.css","utf8");
assert(css.includes(corners)&&css.includes("--discovery-card-radius:20px;"),"approved shared radius imported");
assert(corners.includes(".mobile-floating-nav-bar")&&corners.includes(".mobile-floating-menu-cta"),"shared radius on mobile header and actions");
const cornerDeclarations=[...corners.replace(/\/\*[\s\S]*?\*\//g,"").matchAll(/\{([^{}]*)\}/g)].map(m=>m[1].trim());
assert.deepEqual(cornerDeclarations,["border-radius:var(--discovery-card-radius);","border-radius:var(--discovery-card-radius);"],"radius-only contract, no size or style changes");
assert(css.includes('.mobile-floating-menu-link.is-active')&&css.includes('background:#202a36')&&css.includes('background:#d1d5db'),
  "Active page uses charcoal, white text and a restrained gold underline");
assert(css.includes('width:min(200px,calc(100vw - 48px))') &&
  css.includes('right:22px;left:auto') &&
  css.includes('min-height:40px') &&
  css.includes('padding:12px 12px 13px'),
  "Dropdown must be narrower, aligned to the marked side, and shorter than before");
assert(css.includes('.mobile-floating-header-languages a[aria-current="page"]'),
  "Active language must be visible in the pill, including RTL support");
assert(css.includes('.mobile-floating-header-languages a:focus-visible'),
  "The header language links must remain keyboard accessible");
assert(css.includes('max-height:calc(100dvh')&&css.includes('overflow-y:auto'),
  "Long mobile menus stay scrollable in small viewports");
assert(css.includes('body:not(:has(.admin-route)) #main'),
  "Public routes have room below fixed header while admin is unaffected");
assert(css.includes('focus-visible')&&css.includes('prefers-reduced-motion'),
  "Keyboard focus and reduced-motion support must be retained");
assert(!menu.includes('Alpha Oak')&&!menu.includes('Bosphorus'),
  "Reference brand identity must not be copied");

console.log("PASS mobile floating header: trilingual routes, selection, interaction, semantics, responsive layout and admin/desktop isolation");
