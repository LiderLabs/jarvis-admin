const fs = require("fs");

// Check AdminOrders changes
const orders = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");
console.log("AdminOrders length:", orders.length);

// Check AdminReports changes  
const reports = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
console.log("AdminReports length:", reports.length);
