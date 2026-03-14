const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");
const idx = src.indexOf("completedPayments");
console.log(src.substring(idx - 20, idx + 400));
