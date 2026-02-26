const fs = require("fs");

// Fix AdminReportDetail.tsx - add types to parameters
let src = fs.readFileSync("components/admin/AdminReportDetail.tsx", "utf8");
src = src.replace(
  "const faultLines = (report.technicalFaultNotes || '').split('\\n').filter(Boolean);",
  "const faultLines = (report.technicalFaultNotes || '').split('\\n').filter(Boolean) as string[];"
);
src = src.replace(
  "{parsedFaults.map((f, i) => (",
  "{parsedFaults.map((f: { machineId: string; description: string }, i: number) => ("
);
fs.writeFileSync("components/admin/AdminReportDetail.tsx", src, "utf8");
console.log("AdminReportDetail fixed");

// Fix AdminReports.tsx - branches query and usePaginatedQuery args
src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

// Fix branches - usePaginatedQuery needs args
src = src.replace(
  "const branches = useQuery(api.admin.getBranches) ?? [];",
  "const branchesRaw = useQuery(api.admin.getBranches) ?? [];\n  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];"
);

// Fix usePaginatedQuery - needs empty args object
src = src.replace(
  "usePaginatedQuery(api.admin.getOrders, {}, { initialNumItems: 200 })",
  "usePaginatedQuery(api.admin.getOrders, {} as any, { initialNumItems: 200 })"
);

// Fix dailyReports.map type
src = src.replace(
  "dailyReports.slice(0, 10).map((r: any) => (",
  "((dailyReports as any[]) || []).slice(0, 10).map((r: any) => ("
);

fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("AdminReports fixed");
