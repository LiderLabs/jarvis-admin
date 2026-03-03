const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReportDetail.tsx", "utf8");
const idx = src.indexOf("Wash Token");
console.log(JSON.stringify(src.substring(idx - 50, idx + 300)));
