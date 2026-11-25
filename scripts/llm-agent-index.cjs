#!/usr/bin/env node
'use strict';
/**
 * Narrow machine-readable index publisher for already PUBLIC site content.
 * No LLM-generated factual claims, no changes to legal/pricing/source policy.
 * Only the generated public/llms.txt may change on an automatic run.
 *
 * Production /api/llm-version is dynamic. This index gives agents a concise,
 * quality-checked entry point; it does not claim to block other site updates.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const SITE='https://free-llm-api-1-didl.onrender.com';
const FEED=SITE+'/api/llm-version';
const OUTPUT=path.join('public','llms.txt');
const LANGS=['ar','en','zh'];
const SLUGS=['company-formation','misa-license','corporate-banking',
 'contract-drafting','premium-residency','investment-funds'];

function validSiteLink(value){
 if(typeof value!=='string'||value.length>380)return null;
 try {
  const u=new URL(value);
  if(u.origin!==SITE||u.username||u.password||u.search||u.port)return null;
  // Approved home editorials resolve to exact localized public roots.
  // Other paths remain restricted to known public service/package/editorial routes.
  if(u.pathname!=='/'&&!/^\/(?:en|zh)\/$/.test(u.pathname)&&!/^\/(?:en\/|zh\/)?(?:services\/[a-z0-9-]+|packages|insights\/[a-z0-9-]+)$/.test(u.pathname))return null;
  if(u.hash&&!(u.pathname.endsWith('/packages')&&/^#[a-z0-9-]+$/.test(u.hash)))return null;
  return u.href;
 }catch{return null}
}
function exactLineValues(s,prefix){
 const lines=s.split(/\r?\n/);
 return lines.filter(line=>line.startsWith(prefix)).map(line=>line.slice(prefix.length).trim()).filter(Boolean);
}
function safeUniqueLinks(items){
 const values=items.map(validSiteLink);
 if(values.some(x=>!x))throw Error('Unsafe or invalid public page URL in LLM feed');
 return [...new Set(values)].sort();
}
function validateFeed(feed){
 if(typeof feed!=='string'||feed.length<3000||feed.length>1500000||feed.includes('\uFFFD'))
  throw Error('LLM feed is missing or invalid');
 const required=[
  'Canonical machine-readable version: '+FEED,
  'This site is an independent private service provider',
  'government fees, official charges and taxes are never discounted',
  'Do not infer a guaranteed timeline',
  '## Published editorial content (publication method and source provenance retained)',
  'Citation URLs (not independently verified by this feed)',
  'Editor-verified source URLs:'
 ];
 for(const item of required)if(!feed.includes(item))throw Error('Missing LLM feed policy: '+item);
 const sections={};
 for(const [index,lang] of LANGS.entries()){
  const marker='## Language: '+lang;
  const start=feed.indexOf(marker);
  if(start<0||feed.indexOf(marker,start+marker.length)>=0)
   throw Error('Missing or repeated LLM language section '+lang);
  const next=index<LANGS.length-1?feed.indexOf('## Language: '+LANGS[index+1],start+marker.length):
   feed.indexOf('## How to choose a formation route',start+marker.length);
  if(next<start)throw Error('Malformed LLM language order');
  const block=feed.slice(start,next);
  const services=safeUniqueLinks(exactLineValues(block,'Service URL: '));
  const offers=safeUniqueLinks(exactLineValues(block,'Offer URL: '));
  if(services.length!==SLUGS.length)throw Error('Missing or duplicated services for '+lang);
  const prefix=lang==='ar'?'':'/'+lang;
  for(const slug of SLUGS)if(!services.includes(SITE+prefix+'/services/'+slug))
    throw Error('Known service missing from '+lang+': '+slug);
  if(offers.length<2)throw Error('No bilingual/trilingual package offers for '+lang);
  if(!block.includes('Service fee: 27000 SAR')||!block.includes('Service fee: 77000 SAR'))
   throw Error('Fee/source invariants failed for '+lang);
  sections[lang]={services,offers};
 }
 const begin=feed.indexOf('## Published editorial content (publication method and source provenance retained)');
 const end=feed.indexOf('## Contact',begin);
 if(begin<0||end<begin)throw Error('Missing published editorials segment');
 const editorial=safeUniqueLinks(exactLineValues(feed.slice(begin,end),'Public page: '));
 if(editorial.length>180)throw Error('Unbounded editorials; investigate before indexing');
 return {sections,editorial};
}
function generateIndex(feed){
 const {sections,editorial}=validateFeed(feed);
 const names={ar:'Arabic / العربية',en:'English',zh:'Simplified Chinese / 简体中文'};
 const lines=[
  '# Invest in Saudi — AI Agent Site Index',
  '',
  '> Independent private Saudi investor services provider; not a Saudi government agency.',
  '> This directory links only to the site’s public services, offers and already-published editorial pages.',
  '> Professional service fees exclude Saudi government charges, taxes and third-party costs.',
  '> Verify current regulatory and official costs with the responsible authority; do not infer approvals or outcomes.',
  '',
  '## Canonical detailed machine-readable version',
  '- '+FEED,
  '',
  '## Direct text feeds (choose only the relevant scope)','',
  ...require('../src/lib/llm-discovery.cjs').PATHS.filter(p=>p!=='/llms.txt'&&p!=='/api/llm-version').map(p=>'- '+SITE+p),'',
  '## General packages',
  '- '+SITE+'/packages',
  ''
 ];
 for(const lang of LANGS){
  lines.push('## '+names[lang]+' ('+lang+')','',
   '### Services',...sections[lang].services.map(url=>'- '+url),'',
   '### Package offers',...sections[lang].offers.map(url=>'- '+url),'');
 }
 lines.push('## Other already-published editorial pages','');
 if(editorial.length)lines.push(...editorial.map(url=>'- '+url));
 else lines.push('No independently indexed editorial pages yet. The canonical feed lists approved content when available.');
 lines.push('','## Attribution and update policy',
  '- This list is deterministic from the public feed; it does not generate legal claims or unapproved editorial copy.',
  '- An update is proposed only if these verified links genuinely change, then code checks/build and a pull request precede deployment.',
  '- The canonical detailed version updates dynamically as the approved published site content changes.','');
 const output=lines.join('\n');
 if(output.length>80000)throw Error('Generated LLM index exceeds safe size');
 return output;
}
async function downloadFeed(url=FEED,fetchImpl=fetch){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetchImpl(url,{method:'GET',redirect:'error',
    headers:{Accept:'text/plain'},signal:AbortSignal.timeout(90000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const contentType=response.headers?.get?.('content-type')||'';
   if(!contentType.toLowerCase().includes('text/plain'))throw Error('Unexpected LLM feed content type');
   return await response.text();
  }catch(e){
   if(attempt===1)throw Error('Canonical LLM feed unavailable: '+String(e.message).slice(0,150));
  }
 }
 throw Error('Unreachable');
}
async function run(args=process.argv.slice(2)){
 if(!args.includes('--update'))throw Error('Use --update to check the live feed and propose only verified changes');
 const feed=await downloadFeed();
 const next=generateIndex(feed);
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 const prev=fs.existsSync(OUTPUT)?fs.readFileSync(OUTPUT,'utf8'):null;
 const changed=prev!==next;
 if(changed)fs.writeFileSync(OUTPUT,next,'utf8');
 const hash=crypto.createHash('sha256').update(next).digest('hex');
 console.log('[LLM_INDEX] verified=true changed='+changed+' sha256='+hash+' services=18 languages=3');
 return {changed,hash};
}
if(require.main===module){
 run().catch(e=>{console.error('[LLM_INDEX] '+e.message);process.exitCode=1});
}
module.exports={SITE,FEED,OUTPUT,LANGS,SLUGS,validSiteLink,validateFeed,generateIndex,downloadFeed,run};
