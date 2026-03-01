const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

// Find the full Popover/Calendar block
const idx = src.indexOf("<Popover>");
console.log("=== Popover block ===");
console.log(JSON.stringify(src.substring(idx, idx + 1000)));
