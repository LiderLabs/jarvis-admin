const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
const lines = src.split("\n");
// Show lines 250-295
lines.slice(249, 295).forEach((l, i) => console.log(i + 250, JSON.stringify(l)));
