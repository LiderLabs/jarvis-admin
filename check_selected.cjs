const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
const idx = src.indexOf("selectedReportId");
console.log(src.substring(idx - 100, idx + 400));
