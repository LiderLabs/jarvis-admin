const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");

// Find and replace just the stats calculation
const oldStats = src.match(/const completedPayments[\s\S]*?cash: completedPayments[\s\S]*?\}\s*\}/)?.[0];
console.log("Found stats block:", !!oldStats);
if (oldStats) {
  const newStats = `const stats = {
    total: summary?.totalAmount || 0,
    count: summary?.totalTransactions || 0,
    mobileMoney: summary?.byMethod?.mobile_money || 0,
    card: summary?.byMethod?.card || 0,
    cash: summary?.byMethod?.cash || 0,
  }`;
  src = src.replace(oldStats, newStats);
  fs.writeFileSync("components/admin/AdminPayments.tsx", src, "utf8");
  console.log("Done:", src.includes("summary?.totalAmount"));
}
