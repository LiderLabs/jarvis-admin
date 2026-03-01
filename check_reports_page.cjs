const fs = require("fs");

// Check the reports page
const page = fs.readFileSync("app/(protected)/dashboard/reports/page.tsx", "utf8");
console.log("=== reports page ===");
console.log(page);
