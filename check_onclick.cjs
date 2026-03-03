const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
const idx = src.indexOf("View Details");
console.log(src.substring(idx - 300, idx + 50));
