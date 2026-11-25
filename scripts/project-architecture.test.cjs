'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const {readGlobalStyles}=require('./support/global-styles.cjs');
const read=p=>fs.readFileSync(p,'utf8');
const page=read('src/app/page.tsx');
assert(page.split('\n').length<70,'Route should compose feature components, not contain every section');
for(const name of ["ConversionProof","AuthorityStrip","MarketEntry","EditorialPromise","FormationPackagesBanner","HomeEditorial","ServicesSection","JourneySection","SourcesSection","ContactSection"]){
  assert(page.includes('import '+name+' from "@/components/home/'+name+'";'),name+' import');
  assert(page.includes('<'+name+' '),name+' mounted');
  assert(fs.existsSync('src/components/home/'+name+'.tsx'),name+' source');
}
assert(page.includes('await loadHomeModel()')&&page.includes('JSON.stringify(schema)'),'server model and structured data');
const rootLayout=read('src/app/layout.tsx');
assert(rootLayout.split('\n').length<80,'Layout must delegate shell rendering');
for(const name of ['SiteHeader','SiteFooter'])assert(rootLayout.includes('<'+name+' '));
const residency=read('src/components/PremiumResidencyPage.tsx');
assert(residency.split('\n').length<40,'Residency route must compose sections');
for(const name of ["ResidencyHero","ResidencyProducts","ResidencyComparison","ResidencyGuidance","ResidencyReferences"])assert(residency.includes('<'+name+' '),name+' mounted');
const admin=read('src/app/admin/dashboard/page.tsx');
for(const name of ["DashboardSidebar","DashboardHeader","DashboardOverview","DashboardContact"])assert(admin.includes('<'+name+' '),name+' is mounted');
assert(read('src/components/admin/dashboard/hooks/useDashboardState.ts').includes("from '@/lib/admin/dashboard/navigation'"),'Dashboard registry is separate');
for(const name of ["DashboardContent","DashboardAgentStatus","DashboardReviews","DashboardSettings","DashboardCompetitors","DashboardKeywords","DashboardOpportunities","DashboardGoals","DashboardEvidence"])assert(admin.includes('<'+name+' '),name+' mounted');
assert(admin.split('\n').length<180,'Dashboard route only composes authenticated feature views');
assert(admin.includes('useDashboardController()')&&!admin.includes('sessionStorage.')&&!admin.includes('fetch('),'Dashboard route owns no network or session operations');
for(const path of ["src/components/admin/dashboard/hooks/useDashboardState.ts","src/components/admin/dashboard/hooks/useDashboardSession.ts","src/components/admin/dashboard/hooks/useDashboardMarket.ts","src/components/admin/dashboard/hooks/useDashboardContentActions.ts","src/components/admin/dashboard/hooks/useDashboardController.ts"])assert(fs.existsSync(path),path+' exists');
const service=read('src/components/ServicePage.tsx');
for(const name of ["ServiceHeader","ServicePreparation","ServiceReferences","ServiceRelated","ServiceNextStep"])assert(service.includes('<'+name+' '),name+' mounted');
assert(service.split('\n').length<50,'Service composition boundary');
const packages=read('src/components/packages/PackageRequest.tsx');
assert(packages.includes('usePackageRequest(lang)')&&packages.includes('<PackageSelection ')&&packages.includes('<PackageWizard '),'Package selection and submission separated');
const market=read('src/lib/market-intelligence.ts');
assert(market.split('\n').length<30,'Market entrypoint must only expose stable contracts');
for(const name of ["types","classification","scoring","domain-exclusions","keyword-clustering","storage","competitors","keywords","opportunities","goals","runs","analysis","discovery","radar"])assert(fs.existsSync('src/lib/market/'+name+'.ts'),name+' market domain');
const storage=read('src/lib/market/storage.ts');
assert(storage.includes('let fileLock: Promise<void> = Promise.resolve()')&&storage.includes('getSupabaseCredentials()'),'Shared server storage adapter keeps original lock and credential boundary');
assert(!market.includes("from './market/storage'"),'No public export of internal storage helpers');
const publication=read('src/lib/geo-auto-publication.ts');
assert(publication.split('\n').length<15,'GEO publication facade');
assert(read('src/lib/geo/publication/runner.ts').includes('runGuardedAutoPublishing'),'GEO publication runner');
const cronGsc=read('src/app/api/cron-gsc/route.ts');
assert(cronGsc.split('\n').length<30&&cronGsc.includes('if (!authorized(req))')&&cronGsc.includes('return runGscSync()'),'GSC auth stays at route boundary');
const telegram=read('src/app/api/telegram/operations/route.ts');
assert(telegram.split('\n').length<65&&telegram.includes('core.authentic')&&telegram.includes('await claimDelivery'),'Telegram auth and idempotency stay at route boundary');
assert(read('src/lib/telegram/transport.ts').includes('length>65536'),'Telegram request size bound');
const reportExport=read('src/components/DashboardReportExport.tsx');
assert(reportExport.split('\n').length<40&&reportExport.includes("from '@/lib/admin/reports/pdf'")&&reportExport.includes("from '@/lib/admin/reports/xlsx'"),'Report view delegates format generation');
const impactCenter=read('src/components/ContentImpactCenter.tsx');
assert(impactCenter.includes('usePublicationControls(adminSecret)')&&impactCenter.includes('<PublicationControls '),'Publication control state and view separated');
const manifest=read('src/app/globals.css');
assert(!/\{[^}]*:[^}]*\}/s.test(manifest),'Global entrypoint only imports styles');
const css=readGlobalStyles();
for(const marker of ['@tailwind base;','@tailwind components;','@tailwind utilities;'])assert.equal(css.split(marker).length,2,marker);
const baseline=process.argv[2];
if(baseline){
  assert.equal(css,cp.execFileSync('git',['show',baseline+':src/app/globals.css'],{encoding:'utf8'}),'Refactor must preserve every original CSS byte in cascade order');
  const original=cp.execFileSync('git',['show',baseline+':src/app/page.tsx'],{encoding:'utf8'}).split('\n');
  const sections=[["ConversionProof",67,79],["AuthorityStrip",80,85],["MarketEntry",86,132],["EditorialPromise",133,145],["HomeEditorial",146,153],["ServicesSection",154,184],["JourneySection",185,205],["SourcesSection",206,247],["ContactSection",248,267]];
  for(const [name,start,end] of sections){assert(read('src/components/home/'+name+'.tsx').includes(original.slice(start-1,end).join('\n')),name+' original markup unchanged');}
  const layout=cp.execFileSync('git',['show',baseline+':src/app/layout.tsx'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [['SiteHeader',56,83],['SiteFooter',85,120]])assert(read('src/components/layout/'+name+'.tsx').includes(layout.slice(start-1,end).join('\n')),name+' original markup');
  const residency=cp.execFileSync('git',['show',baseline+':src/components/PremiumResidencyPage.tsx'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [["ResidencyHero",39,47],["ResidencyProducts",50,61],["ResidencyComparison",62,66],["ResidencyGuidance",67,72],["ResidencyReferences",73,74]])assert(read('src/components/residency/'+name+'.tsx').includes(residency.slice(start-1,end).join('\n')),name+' original markup');
  const adminOriginal=cp.execFileSync('git',['show',baseline+':src/app/admin/dashboard/page.tsx'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [["DashboardSidebar",523,565],["DashboardHeader",568,585],["DashboardOverview",593,630],["DashboardContact",635,685]])assert(read('src/components/admin/dashboard/'+name+'.tsx').includes(adminOriginal.slice(start-1,end).join('\n')),name+' original markup');
  for(const [name,start,end] of [["DashboardContent",689,733],["DashboardAgentStatus",740,778],["DashboardReviews",782,835],["DashboardSettings",866,872],["DashboardCompetitors",878,952],["DashboardKeywords",956,1025],["DashboardOpportunities",1029,1079],["DashboardGoals",1083,1145],["DashboardEvidence",1155,1230]])assert(read('src/components/admin/dashboard/'+name+'.tsx').includes(adminOriginal.slice(start-1,end).join('\n')),name+' original markup');
  const serviceOriginal=cp.execFileSync('git',['show',baseline+':src/components/ServicePage.tsx'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [["ServiceHeader",76,93],["ServicePreparation",95,121],["ServiceReferences",122,147],["ServiceRelated",149,168],["ServiceNextStep",169,177]])assert(read('src/components/services/'+name+'.tsx').includes(serviceOriginal.slice(start-1,end).join('\n')),name+' original markup');
  const packageOriginal=cp.execFileSync('git',['show',baseline+':src/app/packages/PackageRequest.tsx'],{encoding:'utf8'}).split('\n');
  const marker=':<section className="package-form">';
  const split=packageOriginal[76].lastIndexOf(marker);
  assert(read('src/components/packages/PackageSelection.tsx').includes(packageOriginal[76].slice('{step===0?'.length,split)),'Package selection original markup');
  for(const [name,line] of [["PackageContactStep",78],["PackageInvestmentStep",79],["PackageReviewStep",80],["PackageSuccessStep",81]]){
    const match=packageOriginal[line-1].match(/^\{step===(\d)\?([\s\S]*):null\}(?:<\/section>\})?$/);
    assert(match&&read('src/components/packages/'+name+'.tsx').includes(match[2]),name+' original form markup');
  }
  const marketOriginal=cp.execFileSync('git',['show',baseline+':src/lib/market-intelligence.ts'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [["types",24,211],["classification",217,270],["scoring",272,306],["domain-exclusions",312,330],["keyword-clustering",336,378],["storage",384,478],["competitors",484,729],["keywords",735,892],["opportunities",898,1006],["goals",1012,1106],["runs",1112,1186],["analysis",1192,1338],["discovery",1344,1583],["radar",1585,1607]]){
    const normalized=s=>s.replace(/^export (async )?function (withFileLock|readFile|writeFile|sbFetch|assertOk|sbJson|isSupabase|nowIso|listRadarRuns)\b/gm,'$1function $2');
    assert(normalized(read('src/lib/market/'+name+'.ts')).includes(marketOriginal.slice(start-1,end).join('\n')),name+' original market implementation');
  }
  const geoOriginal=cp.execFileSync('git',['show',baseline+':src/lib/geo-auto-publication.ts'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [['types',12,18],['official-evidence',19,117],['policy-store',118,191],['citations',192,206],['runner',207,350]]){
    const normalized=read('src/lib/geo/publication/'+name+'.ts').replace('export type Policy=','type Policy=').replace('export async function restCall(','async function restCall(');
    assert(normalized.includes(geoOriginal.slice(start-1,end).join('\n')),name+' original GEO implementation');
  }
  const gscOriginal=cp.execFileSync('git',['show',baseline+':src/app/api/cron-gsc/route.ts'],{encoding:'utf8'}).split('\n');
  assert(read('src/lib/gsc/sync-service.ts').includes(gscOriginal.slice(20,102).join('\n')),'original GSC sync orchestration');
  const tgOriginal=cp.execFileSync('git',['show',baseline+':src/app/api/telegram/operations/route.ts'],{encoding:'utf8'}).split('\n');
  assert(read('src/lib/telegram/operations-data.ts').replace('export async function dataFor(','async function dataFor(').includes(tgOriginal.slice(22,64).join('\n')),'original Telegram data collection');
  assert(read('src/lib/telegram/transport.ts').replace('export async function send(','async function send(').replace('export async function boundedBody(','async function boundedBody(').includes(tgOriginal.slice(64,83).join('\n')),'original Telegram transport and body bounds');
  assert(telegram.includes(tgOriginal.slice(83,120).join('\n')),'original Telegram webhook security and dispatch');
  const exportOriginal=cp.execFileSync('git',['show',baseline+':src/components/DashboardReportExport.tsx'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [['model',5,55],['xlsx',59,89],['pdf',90,163]]){
    const normalized=read('src/lib/admin/reports/'+name+'.ts').replace('export function build(','function build(').replace('export function excel(','function excel(').replace('export async function pdf(','async function pdf(');
    assert(normalized.includes(exportOriginal.slice(start-1,end).join('\n')),name+' original report implementation');
  }
  const impactOriginal=cp.execFileSync('git',['show',baseline+':src/components/ContentImpactCenter.tsx'],{encoding:'utf8'}).split('\n');
  assert(read('src/components/admin/impact/usePublicationControls.ts').includes(impactOriginal.slice(40,91).join('\n')),'original publication control state and confirmation flow');
  assert(read('src/components/admin/impact/PublicationControls.tsx').includes(impactOriginal.slice(148,195).join('\n')),'original publication control markup');
  console.log('PASS exact baseline CSS, public/admin markup, package steps, reports and backend implementations');
}
console.log('PASS ordered CSS manifest and composed homepage architecture');
