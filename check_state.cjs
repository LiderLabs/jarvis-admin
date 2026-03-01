const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
const idx = src.indexOf("useState");
// Find all useState with numbers
const matches = src.match(/useState\(\d+\)/g);
console.log("useState with numbers:", matches);
