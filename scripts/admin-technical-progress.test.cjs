'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const route=fs.readFileSync('src/app/api/admin/technical-tasks/route.ts','utf8');
for(const check of ["issues/'+number+'/timeline","githubRead('pulls/'+id)","process.env.RENDER_GIT_COMMIT","compare/'+chosen.merge_commit_sha","render_deploy_status:'unverified'","if(!authorized(req))"]){
 assert(route.includes(check),'Missing real evidence-gated progress: '+check);
}
assert(!/status:'completed'/.test(route),'Never infer task completion from a GitHub issue');
const ui=fs.readFileSync('src/components/TechnicalTaskBoard.tsx','utf8');
for(const text of ['github_pr_state','render_deploy_status','النشر لم يتأكد','تم التحقق من وصول PR'])
 assert(ui.includes(text),'Missing progress disclosure: '+text);
console.log('PASS GEO technical progress: issue -> PR -> merged -> Render ancestor evidence, no invented completion or SQL writes');
