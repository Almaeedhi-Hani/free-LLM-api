'use strict';

const fs = require('node:fs');
const { analyzeAiCitationPanel } = require('../.ai-radar-test-build/src/lib/ai-citation-radar.js');

try {
  const evidence = JSON.parse(fs.readFileSync(0, 'utf8'));
  process.stdout.write(JSON.stringify(analyzeAiCitationPanel(evidence), null, 2) + '\n');
} catch {
  process.stderr.write('Invalid AI citation radar input. See docs/seo-geo-evidence-playbook.md.\n');
  process.exitCode = 1;
}
