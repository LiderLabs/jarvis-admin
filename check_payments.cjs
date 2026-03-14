const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");
console.log(src.substring(0, 4000));
