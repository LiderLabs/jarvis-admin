const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
// Find the date filter area
const idx = src.indexOf("Last 7 Days");
console.log(JSON.stringify(src.substring(idx - 200, idx + 400)));
