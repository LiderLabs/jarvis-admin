const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

// Find JSX Popover - search after the imports section
const importEnd = src.indexOf("export default") !== -1 ? src.indexOf("export default") : src.indexOf("export function");
const jsxStart = src.indexOf("<Popover>", importEnd);
console.log("JSX Popover at:", jsxStart);

if (jsxStart !== -1) {
  console.log(JSON.stringify(src.substring(jsxStart, jsxStart + 1200)));
} else {
  // Try finding the date filter section
  const idx = src.indexOf("dateFilter");
  console.log("dateFilter:", JSON.stringify(src.substring(idx - 50, idx + 400)));
  
  const idx2 = src.indexOf("CalendarIcon");
  if (idx2 !== -1) console.log("CalendarIcon:", JSON.stringify(src.substring(idx2 - 100, idx2 + 400)));
}
