const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");
console.log(src.length, "chars");
console.log(src.substring(0, 200));
console.log("---");
console.log(src.substring(src.indexOf('const stats'), src.indexOf('const stats') + 500));
