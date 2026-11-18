# Autonomous Site Development — Initial Bounded Release (2026-11-18)

## Purpose
The owner wants scheduled website development and deployment with no routine manual approval. The site already has a separate daily GEO visitor-content publishing schedule and an existing automatic Render deployment from main. This workflow addresses a **limited technical-development class** rather than changing public GEO publication policies.

## Approved unattended loop
- Mondays, 05:40 UTC / 08:40 Arabia Standard Time, run \`.github/workflows/autonomous-site-maintenance.yml\`.
- Pick precisely **one** missing reverse link between two existing live service nodes. Such a link is valid only when one existing curated relationship already points in the other direction.
- Change only \`src/data/content-tree.json\`, adding precisely one \`related_nodes\` ID. Do not create new URLs, pages or legal claims.
- Validate the exact manifest change and execute market, editorial, impact, package and production build checks **before** the step that obtains a GitHub write token.
- Create a PR, merge after verified in-job checks and repository policy permitting it, allow Render auto-deploy, and dispatch an independent post-merge production acceptance check tied to the merge commit SHA.
- When no valid safe task remains, exit successfully **without opening an empty PR**.
- No model or untrusted research input can write code or see a GitHub write token.

## Existing publishing
Daily GEO content publication remains controlled by the already-approved database policy (including its high-risk permission and rolling quota). This new workflow does not modify publishing, source verification rules, prices or Supabase RLS and does not change GEO research cadence.

## Requirements and limitations
- The GitHub repo must permit GitHub Actions to create PRs; GitHub branch protection and repository settings can prevent unattended merging. A narrowly scoped \`AUTODEV_GITHUB_TOKEN\` is optional if \`GITHUB_TOKEN\` cannot create PRs. Do **not** weaken branch protection merely to make automation pass.
- GitHub Actions events created with default \`GITHUB_TOKEN\` may not trigger normal PR/push CI, so the generating workflow executes tests before merging and explicitly dispatches a separate post-merge production check.
- \`AUTODEV_PAUSED=true\` (GitHub repository variable) stops future executions; disabling the workflow also stops it. This does not pause the independent GEO publishing workflow.
- A merge is not proof of deployment, indexing, AI citations or leads. Verify the matching Render revision and live HTTP after any merge.
- The current auto-development task class is finite, intentionally narrow and deterministic. **This does not constitute unrestricted AI coding**; broader code modifications, SQL, auth, payments, legal or pricing changes require separate approved limits and additional acceptance evidence.
- On errors, stop without force-push, branch protection bypass or automatic rollback of live customer content.

## Acceptance
A complete end-to-end claim requires an actual run showing: task selected, exact one-link diff, green tests, PR created, merge SHA, matching Render live SHA, and successful post-merge HTTP acceptance. A workflow file present in GitHub is **configured**, not proof of an executed cycle.
