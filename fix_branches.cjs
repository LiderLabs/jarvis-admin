const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
src = src.replace(
  "const branchesRaw = useQuery(api.admin.getBranches) ?? [];",
  "const branchesRaw = useQuery(api.admin.getBranches, {} as any) ?? [];"
);
fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("Done");
