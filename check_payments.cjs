const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");

// Check current startDate/endDate default
const idx = src.indexOf("const [startDate");
console.log(JSON.stringify(src.substring(idx - 10, idx + 100)));
