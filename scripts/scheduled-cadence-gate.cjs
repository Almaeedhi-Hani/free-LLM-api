#!/usr/bin/env node
'use strict';
/**
 * Temporary 2-hour cadence ends at 2026-11-22 00:00 Asia/Riyadh.
 * From then on, work executes every four hours, while GitHub continues
 * emitting the 2-hour cron triggers (the intervening runs are deliberate
 * no-ops). GitHub Actions cron uses UTC and can be delayed.
 */
const SWITCH_UTC='2026-11-21T21:00:00.000Z';
function shouldRun({event='schedule',slot='even',now=new Date()}={}){
 if(!['even','odd'].includes(slot))throw Error('Invalid cadence slot');
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid time');
 if(event!=='schedule')return true; // explicit manual or exact workflow-file bootstrap
 const saudiHour=(now.getUTCHours()+3)%24;
 const expected=slot==='even'?0:1;
 if(now.getTime()<Date.parse(SWITCH_UTC))return saudiHour%2===expected;
 return saudiHour%4===expected;
}
function main(args=process.argv.slice(2)){
 const slotFlag=args.find(x=>x.startsWith('--slot='));
 if(!slotFlag)throw Error('Missing --slot=even|odd');
 const slot=slotFlag.slice(7);
 const event=process.env.GITHUB_EVENT_NAME||'schedule';
 const run=shouldRun({event,slot});
 process.stdout.write('run='+(run?'true':'false')+'\n');
 console.error('[CADENCE] '+(run?'RUN':'SKIP')+' event='+event+' slot='+slot+
  ' phase='+(Date.now()<Date.parse(SWITCH_UTC)?'two-hour':'four-hour')+
  ' switchSaudi=2026-11-22T00:00:00+03:00');
 return run;
}
if(require.main===module){
 try{main()}catch(e){console.error(e.message);process.exitCode=1}
}
module.exports={SWITCH_UTC,shouldRun,main};
