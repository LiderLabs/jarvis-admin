const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const idx = src.indexOf("selectedDate");
console.log(JSON.stringify(src.substring(idx - 50, idx + 600)));
