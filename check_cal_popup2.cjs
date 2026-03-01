const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
// Find the calendar popup content
const idx = src.indexOf("PopoverContent");
console.log(JSON.stringify(src.substring(idx, idx + 800)));
