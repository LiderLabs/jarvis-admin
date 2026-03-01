const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const idx = src.indexOf("Calendar");
console.log(JSON.stringify(src.substring(idx - 50, idx + 200)));
