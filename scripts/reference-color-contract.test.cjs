'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {readGlobalStyles}=require('./support/global-styles.cjs');
const allowed=new Set(["202a36","1a2229","111827","374151","4b5563","6b7280","d1d5db","f9fafb","ffffff","1f2937","9ca3af"]);
const css=readGlobalStyles()+fs.readFileSync('src/components/PremiumResidencyPage.module.css','utf8');
for(const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)){let c=m[0].slice(1).toLowerCase();if(c.length===3||c.length===4)c=c.split('').map(x=>x+x).join('');assert(allowed.has(c.slice(0,6)),'Non-reference color '+m[0]);}
for(const path of ['src/components/WhatsAppFloat.tsx','src/components/CookieConsent.tsx'])for(const m of fs.readFileSync(path,'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g))assert(allowed.has(m[0].slice(1).toLowerCase()),path+' '+m[0]);
assert(css.includes('.cinematic-headline {color:var(--skyelite-heading-muted);}')&&css.includes('--skyelite-heading-muted: #6B7280;'));
assert(css.includes('.cinematic-primary {background:var(--skyelite-primary);')&&css.includes('.cinematic-primary:hover {background:var(--skyelite-primary-hover);'));
console.log('PASS original reference palette on public styles, contact and consent');
