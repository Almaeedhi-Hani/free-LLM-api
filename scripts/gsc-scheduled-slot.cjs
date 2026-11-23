'use strict';

const { appendFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { SWITCH_UTC } = require('./scheduled-cadence-gate.cjs');

function scheduledSlot(expression, createdAt) {
  // One cron expression per UTC hour preserves that hour in the event payload.
  // Use the immutable run creation time only to anchor the UTC calendar day.
  const rapidAcceptance = expression === '*/5 * * * *';
  const match = /^(0 (?:0|2|4|6|8|10|12|14|16|18|20|22)|45 0) \* \* \*$/.exec(expression);
  if (!rapidAcceptance && !match) throw Error('Unrecognized GSC cron expression');
  const created = new Date(createdAt);
  if (typeof createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(createdAt) ||
      !Number.isFinite(created.getTime()) ||
      created.toISOString() !== (createdAt.length === 20 ? createdAt.replace(/Z$/, '.000Z') : createdAt)) {
    throw Error('Invalid GSC workflow creation timestamp');
  }
  const slot = new Date(created);
  let allowed;
  if (rapidAcceptance) {
    // GitHub does not expose the original per-five-minute fire timestamp.
    // Use immutable run creation time, never delayed runner wall-clock time.
    slot.setUTCMinutes(Math.floor(created.getUTCMinutes() / 5) * 5, 0, 0);
    allowed = true;
  } else {
    const [minuteText, hourText] = match[1].split(' ');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    slot.setUTCHours(hour, minute, 0, 0);
    if (slot > created) slot.setUTCDate(slot.getUTCDate() - 1);
    allowed = (minute === 45 && hour === 0) ||
      (minute === 0 && (slot.getTime() < Date.parse(SWITCH_UTC) || (hour + 3) % 4 === 1));
  }
  return { allowed, instant: slot.toISOString() };
}

async function chooseGscSync({ event, schedule, runId, attempt }, fetchJson) {
  if (event === 'workflow_dispatch') return { run: true, reason: 'manual' };
  if (event !== 'schedule') throw Error('Unexpected GSC event');
  if (!/^[1-9]\d*$/.test(attempt)) throw Error('Invalid GSC workflow attempt');
  if (attempt !== '1') return { run: false, reason: 'scheduled_rerun' };
  if (!/^[1-9]\d*$/.test(runId)) throw Error('Invalid GSC workflow run ID');

  const run = await fetchJson(`/actions/runs/${runId}`);
  if (String(run?.id) !== runId || run.event !== 'schedule') {
    throw Error('GSC workflow metadata did not match this scheduled run');
  }
  const { allowed, instant } = scheduledSlot(schedule, run.created_at);
  if (!allowed) return { run: false, reason: 'outside_four_hour_cadence', instant };

  const marker = schedule === '*/5 * * * *'
    ? `gsc-scheduled-slot-${instant.slice(0, 16).replace('T', '-').replace(':', '-')}`
    : `gsc-scheduled-slot-${instant.slice(0, 13).replace('T', '-')}`;
  const matches = await fetchJson(`/actions/artifacts?name=${marker}&per_page=1`);
  if (!Number.isSafeInteger(matches?.total_count) || matches.total_count < 0 ||
      !Array.isArray(matches.artifacts) || (matches.total_count > 0) !== (matches.artifacts.length === 1) ||
      matches.artifacts.some(artifact => artifact?.name !== marker)) {
    throw Error('Invalid GSC slot lookup response');
  }
  if (matches.total_count > 0) return { run: false, reason: 'already_claimed', instant };
  return { run: true, reason: 'scheduled_slot', instant, marker };
}

async function main(env) {
  const { GITHUB_EVENT_NAME, GSC_EVENT_CRON, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT,
    GITHUB_REPOSITORY, GITHUB_API_URL, GH_TOKEN, GITHUB_OUTPUT, RUNNER_TEMP } = env;
  const fetchJson = async path => {
    const response = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}${path}`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${GH_TOKEN}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw Error(`GSC workflow metadata lookup failed (HTTP ${response.status})`);
    return response.json();
  };
  const { run, reason, instant, marker } = await chooseGscSync({
    event: GITHUB_EVENT_NAME, schedule: GSC_EVENT_CRON, runId: GITHUB_RUN_ID, attempt: GITHUB_RUN_ATTEMPT,
  }, fetchJson);
  if (marker) await writeFile(join(RUNNER_TEMP, 'gsc-scheduled-slot.txt'), `${instant}\n`);
  await appendFile(GITHUB_OUTPUT, `run=${run}\nmarker=${marker ?? ''}\n`);
  console.log(`[GSC_CADENCE] ${run ? 'RUN' : 'SKIP'} reason=${reason} slot_utc=${instant ?? 'none'}`);
}

if (require.main === module) {
  main(process.env).catch(error => {
    console.error(`[GSC_CADENCE] ERROR ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { scheduledSlot, chooseGscSync };
