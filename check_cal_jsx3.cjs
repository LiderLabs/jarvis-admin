const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const idx = src.indexOf("PopoverContent", src.indexOf("PopoverContent") + 1);
console.log(JSON.stringify(src.substring(idx + 1400, idx + 2400)));
