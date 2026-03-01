const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

const idx = src.indexOf("PopoverTrigger", 8000);
const start = src.lastIndexOf("<Popover", idx);
const end = src.indexOf("</Popover>", idx) + "</Popover>".length;
console.log("start:", start, "end:", end);
console.log(JSON.stringify(src.substring(start, end)));
