const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

const idx = src.indexOf("paystack");
console.log("=== admin paystack ===");
console.log(JSON.stringify(src.substring(idx - 50, idx + 300)));

const idx2 = src.indexOf("Paystack");
console.log("=== admin Paystack label ===");
console.log(JSON.stringify(src.substring(idx2 - 50, idx2 + 200)));
