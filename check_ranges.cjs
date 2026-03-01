const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

const idx = src.indexOf("RANGES");
console.log("=== RANGES ===");
console.log(JSON.stringify(src.substring(idx, idx + 300)));

// Find the filter buttons UI
const idx2 = src.indexOf("rangeDays");
const allRefs = [...src.matchAll(/rangeDays/g)];
allRefs.forEach(m => console.log(m.index, JSON.stringify(src.substring(m.index - 30, m.index + 150))));
