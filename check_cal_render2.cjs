const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const idx = src.indexOf("Viewing orders for");
console.log(JSON.stringify(src.substring(idx - 100, idx + 800)));
