"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const layout=fs.readFileSync("src/app/layout.tsx","utf8");
const menu=fs.readFileSync("src/components/MobileFloatingNav.tsx","utf8");
const css=fs.readFileSync("src/app/globals.css","utf8");

assert(layout.includes('<MobileFloatingNav locale={lang} brand={t.brand} hasGuides={hasGuides} />'),
  "Mobile header must be shared across all trilingual public routes");
assert(layout.includes('<nav className="desktop-nav"'),"Desktop navigation remains unchanged");
assert(layout.includes('<LanguageSwitcher locale={lang} />'),"Desktop language switcher is preserved");
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
assert(menu.includes('labels={')&&menu.includes('ar:{')&&menu.includes('en:{')&&menu.includes('zh:{'),
  "Arabic, English and Chinese navigation text must be present");

assert(css.includes('.mobile-floating-nav-shell{display:none}'),
  "Desktop hides mobile-only header");
assert(css.includes('.site-header .header-inner,.site-header .mobile-nav{display:none!important}'),
  "Legacy crowded mobile header is replaced, not duplicated");
assert(css.includes('.mobile-floating-nav-bar')&&css.includes('border-radius:999px'),
  "Warm floating pill presentation present");
assert(css.includes('.mobile-floating-menu-link.is-active')&&css.includes('background:#104148')&&css.includes('background:#c7a365'),
  "Active page uses project emerald and a restrained gold underline");
assert(css.includes('max-height:calc(100dvh')&&css.includes('overflow-y:auto'),
  "Long mobile menus stay scrollable in small viewports");
assert(css.includes('body:not(:has(.admin-route)) #main'),
  "Public routes have room below fixed header while admin is unaffected");
assert(css.includes('focus-visible')&&css.includes('prefers-reduced-motion'),
  "Keyboard focus and reduced-motion support must be retained");
assert(!menu.includes('Alpha Oak')&&!menu.includes('Bosphorus'),
  "Reference brand identity must not be copied");

console.log("PASS mobile floating header: trilingual routes, selection, interaction, semantics, responsive layout and admin/desktop isolation");
