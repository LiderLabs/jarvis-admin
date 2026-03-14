const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");
const idx = src.indexOf("const stats");
console.log(src.substring(idx, idx + 300));
