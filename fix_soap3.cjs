const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReportDetail.tsx", "utf8");

// Remove the entire soap warning block from comment to closing )}
const start = src.indexOf("      {/* Soap usage warning (example threshold) */}");
const end = src.indexOf("      {/* Main 3-col card row */}");

if (start !== -1 && end !== -1) {
  src = src.substring(0, start) + src.substring(end);
  console.log("Block removed!");
} else {
  console.log("start:", start, "end:", end);
}

fs.writeFileSync("components/admin/AdminReportDetail.tsx", src, "utf8");
console.log("Clean:", !src.includes("Soap usage warning") && !src.includes("> 3 && ("));
