'use strict';
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
// Source contracts span the actual composing route, registry, helpers and mounted views.
function readAdminDashboardSource(){return [
  'src/lib/admin/dashboard/navigation.ts',
  'src/lib/admin/dashboard/contact-form.ts',
  'src/lib/admin/dashboard/presentation.ts',
  'src/app/admin/dashboard/page.tsx',
  'src/components/admin/dashboard/hooks/useDashboardState.ts',
  'src/components/admin/dashboard/hooks/useDashboardSession.ts',
  'src/components/admin/dashboard/hooks/useDashboardMarket.ts',
  'src/components/admin/dashboard/hooks/useDashboardContentActions.ts',
  'src/components/admin/dashboard/hooks/useDashboardController.ts',
  'src/lib/admin/dashboard/summary.ts',
  "src/components/admin/dashboard/DashboardSidebar.tsx",
  "src/components/admin/dashboard/DashboardHeader.tsx",
  "src/components/admin/dashboard/DashboardOverview.tsx",
  "src/components/admin/dashboard/DashboardContact.tsx"
,
  'src/components/admin/dashboard/DashboardContent.tsx',
  'src/components/admin/dashboard/DashboardAgentStatus.tsx',
  'src/components/admin/dashboard/DashboardReviews.tsx',
  'src/components/admin/dashboard/DashboardSettings.tsx',
  'src/components/admin/dashboard/DashboardCompetitors.tsx',
  'src/components/admin/dashboard/DashboardKeywords.tsx',
  'src/components/admin/dashboard/DashboardOpportunities.tsx',
  'src/components/admin/dashboard/DashboardGoals.tsx',
  'src/components/admin/dashboard/DashboardEvidence.tsx'
].map(read).join('\n');}
module.exports={readAdminDashboardSource};
