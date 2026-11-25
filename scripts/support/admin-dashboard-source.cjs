'use strict';
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
// Source contracts span the actual composing route, registry, helpers and mounted views.
function readAdminDashboardSource(){return [
  'src/lib/admin/dashboard/navigation.ts',
  'src/lib/admin/dashboard/contact-form.ts',
  'src/lib/admin/dashboard/presentation.ts',
  'src/app/admin/dashboard/page.tsx',
  "src/components/admin/dashboard/DashboardSidebar.tsx",
  "src/components/admin/dashboard/DashboardHeader.tsx",
  "src/components/admin/dashboard/DashboardOverview.tsx",
  "src/components/admin/dashboard/DashboardContact.tsx"
].map(read).join('\n');}
module.exports={readAdminDashboardSource};
