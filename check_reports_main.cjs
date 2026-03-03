const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

// Find the AdminReports default export and how it handles selectedReportId
const idx = src.lastIndexOf("const AdminReports");
console.log(src.substring(idx, idx + 600));
