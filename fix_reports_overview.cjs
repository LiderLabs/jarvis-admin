const fs = require("fs");

// Fix 1: AdminReports.tsx - getBranches needs paginationOpts
let src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
src = src.replace(
  "const branchesRaw = useQuery(api.admin.getBranches, {} as any) ?? [];",
  "const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];\n  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];"
);
// Remove duplicate branches line if it exists
src = src.replace(
  "  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];\n  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];",
  "  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];"
);
fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("AdminReports getBranches fixed");

// Fix 2: AdminOverview.tsx - rename "Pending Orders" to "Orders in Progress"
src = fs.readFileSync("components/admin/AdminOverview.tsx", "utf8");
src = src.replace(
  '"Pending Orders"',
  '"Orders in Progress"'
);
src = src.replace(
  "<p className=\"text-sm font-medium text-muted-foreground\">Pending Orders</p>",
  "<p className=\"text-sm font-medium text-muted-foreground\">Orders in Progress</p>"
);
// Also filter to only in_progress status
src = src.replace(
  "const pendingOrders = orders.filter((o: any) =>\n      o.status === 'pending' ||\n      o.status === 'pending_dropoff' ||\n      o.status === 'in_progress' ||",
  "const pendingOrders = orders.filter((o: any) =>\n      o.status === 'in_progress' ||"
);
fs.writeFileSync("components/admin/AdminOverview.tsx", src, "utf8");
console.log("AdminOverview pending->in_progress fixed");
