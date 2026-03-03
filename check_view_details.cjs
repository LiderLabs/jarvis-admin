const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
const idx = src.indexOf("View Details") !== -1 ? src.indexOf("View Details") : src.indexOf("onViewReport");
console.log(src.substring(idx - 100, idx + 300));
