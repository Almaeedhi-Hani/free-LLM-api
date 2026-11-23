'use strict';
// Read-only proof of persisted work for the unified 10-minute integration test.
// Does not invoke providers, mutate rows, print secrets or infer freshness from a green job.
const assert = require('node:assert/strict');
const HOST = 'https://free-llm-api-1-didl.onrender.com';
const TARGETS = Object.freeze(['W01','W02','W03','W04']);
async function verify(target, {key=process.env.GEO_API_KEY, fetchImpl=fetch}={}) {
  if (!TARGETS.includes(target)) throw Error('Invalid system code');
  if (typeof key !== 'string' || !key) throw Error('Protected readback credential unavailable');
  const url = HOST + '/api/geo/monitor-readback?scope=weekly';
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'error',
    headers: { 'x-geo-api-key': key, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000)
  });
  if (!response || response.status !== 200) throw Error('Protected readback HTTP failure');
  const data = await response.json();
  if (data?.source !== 'supabase' || data?.scope !== 'weekly') {
    throw Error('Untrusted readback source');
  }
  const item = data?.storage?.[target];
  if (item?.status !== 'observed' || !Number.isFinite(Date.parse(item.latestTimestamp))) {
    throw Error(target + ' persistence is not independently observed');
  }
  return {system:target,storage:'observed',latest:item.latestTimestamp,
    gsc:data?.gsc?.status === 'observed'?'observed':'unknown'};
}
if (require.main === module) {
  verify(process.argv[2]).then(v=>{
    console.log('[V3_UNIFIED_READBACK] '+JSON.stringify(v));
  }).catch(e=>{
    console.error('[V3_UNIFIED_READBACK] ERROR '+String(e.message).slice(0,100));
    process.exitCode=1;
  });
}
module.exports={HOST,TARGETS,verify};
