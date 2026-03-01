const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

// Find CalendarIcon usage in JSX
const all = [...src.matchAll(/CalendarIcon/g)];
all.forEach(m => {
  console.log("at", m.index);
  console.log(JSON.stringify(src.substring(m.index - 100, m.index + 400)));
  console.log("---");
});
