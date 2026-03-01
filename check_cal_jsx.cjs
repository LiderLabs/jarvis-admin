const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
// Find the second PopoverContent (the rendered one, not the import)
const idx = src.indexOf("PopoverContent", src.indexOf("PopoverContent") + 1);
console.log(JSON.stringify(src.substring(idx, idx + 600)));
