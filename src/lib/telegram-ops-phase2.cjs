'use strict';
const {createHash}=require('node:crypto');
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
function localParts(now){
 const p=Object.fromEntries(fmt.formatToParts(new Date(now)).map(x=>[x.type,x.value]));
 return {day:p.year+'-'+p.month+'-'+p.day,hour:Number(p.hour)};
}
function dailyKey(now){const p=localParts(now);return p.hour>=9&&p.hour<12?'daily:'+p.day:null;}
function classify(name,record,field,now,maxHours){
 const t=Date.parse(record?.[field]||'');const n=Date.parse(now);
 if(!record||!Number.isFinite(t)||!Number.isFinite(n)||t>n+300000)return {name,state:'unknown',when:null};
 const when=new Date(t).toISOString(),status=String(record.status||'');
 if(['failed','failure','error','partial','cancelled','timed_out','action_required'].includes(status))return {name,state:'failed',when};
 if((n-t)/3600000>maxHours)return {name,state:'stale',when};
 if(['success','success_with_data','success_no_data','completed'].includes(status))return {name,state:'recent',when};
 return {name,state:'unknown',when};
}
function health(d){
 return [classify('Market Radar',d.radar,'finished_at',d.now,7),
 classify('GEO',d.geo,'lastRun',d.now,7),classify('GSC',d.gsc,'checked_at',d.now,8),
 classify('Watchdog',d.watchdog,'finished_at',d.now,7)];
}
function issueKey(issue){return 'alert:watchdog:'+issue.number+':'+String(issue.created_at||'').slice(0,40);}
function alerts(d){
 const out=health(d).filter(x=>x.state==='failed'||x.state==='stale').map(x=>({
 key:'alert:'+createHash('sha256').update(JSON.stringify([x.name,x.state,x.when])).digest('hex'),
 text:'⚠️ '+x.name+' — '+(x.state==='failed'?'آخر نتيجة فاشلة':'آخر نتيجة تجاوزت حد الحداثة')+'\nآخر سجل: '+x.when
 }));
 if(Array.isArray(d.watchdogIssues))for(const x of d.watchdogIssues){
  if(Number.isSafeInteger(x.number)&&x.number>0)out.push({key:issueKey(x),text:'⚠️ Watchdog — بلاغ مفتوح #'+x.number+'\nhttps://github.com/Almaeedhi-Hani/free-LLM-api/issues/'+x.number});
 }
 return out;
}
function healthText(d){
 const labels={recent:'نتيجة ناجحة حديثة',failed:'فشل في آخر نتيجة',stale:'النتيجة قديمة',unknown:'غير مؤكد'};
 return health(d).map(x=>x.name+': '+labels[x.state]).join('\n')+'\nبلاغات Watchdog المفتوحة: '+(Array.isArray(d.watchdogIssues)?d.watchdogIssues.length+(d.watchdogIssues.length===100?' أو أكثر':''):'غير متاح')+'\nنجاح تشغيل Watchdog لا يعني غياب الأعطال.';
}
module.exports={dailyKey,classify,health,alerts,healthText};
