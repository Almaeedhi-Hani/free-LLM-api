#!/usr/bin/env node
'use strict';
// Fail closed: an index bot may merge only after every applicable PR check
// finishes successfully. Two independent workflows share the name `verify`.
const fs = require('node:fs');
const REQUIRED = Object.freeze({
  'Build and regression tests': 1,
  'postgres-security': 1,
  verify: 2,
});

function assess(payload) {
  if (!payload || !Array.isArray(payload.check_runs)) {
    return { state: 'blocked', reason: 'invalid_check_runs_payload' };
  }
  const checks = payload.check_runs;
  const invalid = checks.find(c => c.status === 'completed' && c.conclusion !== 'success');
  if (invalid) return { state: 'blocked', reason: 'non_success_check:' + String(invalid.name || 'unknown') };
  for (const [name, requiredCount] of Object.entries(REQUIRED)) {
    const matched = checks.filter(c => c.name === name);
    if (matched.length < requiredCount) {
      return { state: 'pending', reason: 'missing_check:' + name, seen: matched.length, expected: requiredCount };
    }
    if (matched.some(c => c.status !== 'completed')) {
      return { state: 'pending', reason: 'unfinished_check:' + name };
    }
  }
  if (checks.some(c => c.status !== 'completed')) {
    return { state: 'pending', reason: 'other_check_unfinished' };
  }
  return { state: 'passed', reason: 'all_applicable_pr_checks_green', count: checks.length };
}

if (require.main === module) {
  try {
    const result = assess(JSON.parse(fs.readFileSync(0, 'utf8')));
    console.log('[LLM_PR_CI] ' + JSON.stringify(result));
    process.exitCode = result.state === 'passed' ? 0 : result.state === 'pending' ? 2 : 1;
  } catch (error) {
    console.error('[LLM_PR_CI] blocked: invalid JSON');
    process.exitCode = 1;
  }
}
module.exports = { assess, REQUIRED };
