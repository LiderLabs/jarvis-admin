const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
// Find the full calendar popup render
const idx = src.indexOf("SELECT DATE");
console.log(JSON.stringify(src.substring(idx - 50, idx + 1000)));
