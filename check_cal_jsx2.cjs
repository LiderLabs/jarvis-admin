const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const idx = src.indexOf("PopoverContent", src.indexOf("PopoverContent") + 1);
console.log(JSON.stringify(src.substring(idx + 600, idx + 1400)));
