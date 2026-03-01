const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const lines = src.split("\n");
// Show lines 285-320
lines.slice(284, 320).forEach((l, i) => console.log(i + 285, JSON.stringify(l)));
