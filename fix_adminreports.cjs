const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

// Fix 1: Pass branchId filter to dailyReports.getAll query
src = src.replace(
  `  const dailyReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      limit: 50,
    }
  ) ?? [];`,
  `  const dailyReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      limit: 50,
      ...(selectedBranch !== 'all' ? { branchId: selectedBranch } : {}),
    }
  ) ?? [];`
);

// Fix 2: Replace the reports table headers - remove Attendant, keep Branch filter working
src = src.replace(
  `                  {['Date', 'Branch', 'Attendant', 'Tokens', 'Revenue', 'Status', 'Action'].map(h => (`,
  `                  {['Date', 'Branch', 'Attendants on Duty', 'Tokens', 'Revenue', 'Status', 'Action'].map(h => (`
);

fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("Done");
