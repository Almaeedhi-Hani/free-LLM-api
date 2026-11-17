'use strict';
const assert=require('node:assert/strict');
const {officialSourceQueries,isSaudiGovernmentCandidate,officialResultsFromRss}=
 require('../.editorial-test-build/lib/editorial-official-source-search.js');

const queries=officialSourceQueries({
 title:'Saudi investment registration and licensing',
 primary_keyword:'MISA foreign investment license requirements',
 target:'misa-license',lang:'en',
});
assert.equal(queries.length,2);
assert(queries.every(q=>q.includes('site:gov.sa')));
assert(queries[0].includes('Ministry of Investment'));
assert(queries[0].includes('MISA foreign investment license'));
assert.equal(officialSourceQueries({title:'Saudi registration',lang:'en',target:'misa-license'}).length,1);
assert.equal(officialSourceQueries({title:'الاستثمار site:evil.test',lang:'ar'}).every(q=>q.includes('site:gov.sa')&&!q.includes('evil.test')),true);
assert.equal(officialSourceQueries({title:'Test title',lang:'invalid'}).length,0);
const arRegistration=officialSourceQueries({
 title:'دليل خطوات التسجيل الاستثماري للمستثمر الأجنبي',
 primary_keyword:'تسجيل المستثمرين في السعودية',
 target:'misa-license',lang:'ar',
});
assert(arRegistration[0].includes('وزارة الاستثمار'),'Arabic planned registration guides should search the MISA authority');
const enDocuments=officialSourceQueries({
 title:'Guide to company incorporation documents',
 target:'company-formation',lang:'en',
});
assert(enDocuments[0].includes('Ministry of Commerce'),'English company documents should search the Commerce authority');
const zhDocuments=officialSourceQueries({
 title:'沙特外资企业设立文件准备指南',
 target:'company-formation',lang:'zh',
});
assert(zhDocuments[0].includes('商业部'),'Chinese company documents should search the Commerce authority');
assert([...arRegistration,...enDocuments,...zhDocuments].every(q=>q.includes('site:gov.sa')),
 'All languages must retain strict gov.sa search scope');
for(const url of [
 'https://misa.gov.sa.evil.example/faq',
 'https://gov.sa.evil.example/',
 'https://user:pass@misa.gov.sa/',
 'https://misa.gov.sa:444/faq',
 'http://misa.gov.sa/faq',
 'javascript:alert(1)',
 'https://cma.org.sa/funds',
])assert.equal(isSaudiGovernmentCandidate(url),false,url);
assert.equal(isSaudiGovernmentCandidate('https://misa.gov.sa/en/faq'),true);
assert.equal(isSaudiGovernmentCandidate('https://sama.gov.sa/'),true);
const item=(url,title)=>'<item><title><![CDATA['+title+']]></title><link>'+url.replace(/&/g,'&amp;')+'</link><description>Read &amp; review <b>official</b> guidance.</description></item>';
const xml='<rss><channel>'+
 item('https://misa.gov.sa/en/faq?topic=1&lang=en','MISA official guide')+
 item('https://misa.gov.sa/en/faq?topic=1&lang=en','Duplicate')+
 item('https://misa.gov.sa.evil.example/','Fake official')+
 item('https://mc.gov.sa/en/','Ministry of Commerce')+
 '</channel></rss>';
const results=officialResultsFromRss(xml);
assert.equal(results.length,2);
assert.equal(results[0].url,'https://misa.gov.sa/en/faq?topic=1&lang=en');
assert.equal(results[0].snippet,'Read & review official guidance.');
assert.equal(officialResultsFromRss(xml,0).length,0);
assert.equal(officialResultsFromRss(xml,1).length,1);
console.log('PASS bounded official source queries, SSRF-safe candidate URLs and RSS extraction');
