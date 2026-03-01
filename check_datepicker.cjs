const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const idx = src.indexOf("subDays");
console.log(JSON.stringify(src.substring(idx - 200, idx + 600)));
