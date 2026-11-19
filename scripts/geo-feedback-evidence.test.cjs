'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {applyFeedbackToEvidence}=require('./geo-feedback-filter.cjs');
const items=[
 {type:'keyword_suggestion',name:'saudi arabia formation football',language:'en'},
 {type:'keyword',name:'تأسيس شركة أجنبية في السعودية',language:'ar'},
 {type:'competitor_candidate',url:'https://www.blocked.example.com/services',language:'en'},
 {type:'competitor',domain:'valid.example.org',language:'en'},
 {type:'observation',url:'https://blocked.example.com/guide',language:'en'}
];
const rules=[
 {subject_type:'keyword',subject_key:'saudi arabia formation football',language:'en'},
 {subject_type:'competitor',subject_key:'blocked.example.com',language:null}
];
const result=applyFeedbackToEvidence(items,rules);
assert.equal(result.excluded,3);
assert.deepEqual(result.items.map(x=>x.type),['keyword','competitor']);
assert.equal(applyFeedbackToEvidence(items,[]).excluded,0);
const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
assert(runner.includes("+'/api/geo/feedback'"),'model runner must retrieve feedback from authenticated server');
assert(runner.includes('no GEO model evidence submitted'),'the model fails closed on a missing feedback result');
assert(runner.indexOf("require('./geo-feedback-filter.cjs')")<runner.indexOf('chooseResearchEvidence(evidenceItems,60)'),
 'reviewer memory must be applied before selecting model prompt evidence');
const route=fs.readFileSync('src/app/api/geo/feedback/route.ts','utf8');
assert(route.includes('timingSafeEqual')&&route.includes('getGeoFeedbackIndex()'));
assert(route.includes("row.decision!=='valid'"),'valid reviews must override older rejections');
assert(!route.includes('export async function POST'),'only read-only feedback access from model runner');
console.log('PASS GEO evidence filtering: before model inference, no historical deletion, trusted read-only API');
