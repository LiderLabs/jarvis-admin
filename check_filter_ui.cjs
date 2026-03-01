const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

const idx = src.indexOf("Select value={String(rangeDays)");
console.log("=== Filter UI ===");
console.log(JSON.stringify(src.substring(idx, idx + 500)));
