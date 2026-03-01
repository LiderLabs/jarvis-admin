const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const idx = src.indexOf("calendarOpen");
const idx2 = src.indexOf("SELECT DATE");
const idx3 = src.indexOf("ChevronLeft");
// Find the calendar UI render
const renderIdx = src.indexOf("calendarOpen &&");
console.log(JSON.stringify(src.substring(renderIdx - 50, renderIdx + 800)));
