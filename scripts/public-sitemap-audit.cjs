'use strict';
const assert=require('node:assert/strict');
/** The GEO publisher adds legitimately indexed insight hubs and guides.
 * Audit all fixed 24 localized service/package URLs PLUS any new indexable
 * insight pages. Never assume the sitemap has exactly 24 entries. */
function auditPublicSitemap(xml,canonicalBase,expectedPaths){
 const entries=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1].replace(/&amp;/g,'&'));
 const expected=new Set(expectedPaths.map(x=>new URL(x,canonicalBase).href));
 const seen=new Set();
 const extra=[];
 for(const candidate of entries){
  let url;
  try{url=new URL(candidate)}catch{throw Error('Invalid sitemap URL: '+candidate)}
  assert.equal(url.origin,new URL(canonicalBase).origin,'Sitemap must contain only canonical-origin URLs');
  assert(!url.search&&!url.hash,'Sitemap URLs must not contain query strings or fragments');
  assert(!seen.has(url.href),'Duplicate sitemap entry: '+url.href);
  seen.add(url.href);
  if(expected.has(url.href))continue;
  assert(/^\/(?:(?:en|zh)\/)?insights(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(url.pathname),
   'Unexpected non-editorial sitemap route: '+url.pathname);
  extra.push({url:url.href,path:url.pathname});
 }
 for(const expectedUrl of expected)assert(seen.has(expectedUrl),'Missing baseline public URL: '+expectedUrl);
 return {total:entries.length,baseline:expected.size,extra};
}
module.exports={auditPublicSitemap};
