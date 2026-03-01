const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
const idx = src.indexOf("Last 7 Days");
console.log(JSON.stringify(src.substring(idx - 300, idx + 500)));
