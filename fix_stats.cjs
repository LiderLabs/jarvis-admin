const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");

// Fix stats to use summary from backend instead of paginated results
const old = `  const completedPayments = payments.filter((p: any) => p.status === "completed")
  const stats = {
    total: completedPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0),
    count: summary?.totalTransactions || 0,
    mobileMoney: completedPayments.filter((p: any) => p.paymentMethod === "mobile_money").reduce((s: number, p: any) => s + (p.amount || 0), 0),
    card: completedPayments.filter((p: any) => p.paymentMethod === "card").reduce((s: number, p: any) => s + (p.amount || 0), 0),
    cash: completedPayments.filter((p: an`;

console.log("Found start:", src.includes(old.substring(0, 60)));

// Find and replace the whole stats block
const statsIdx = src.indexOf("  const completedPayments");
const afterStats = src.indexOf("\n\n", statsIdx);
console.log("Stats block found at:", statsIdx, "ends at:", afterStats);

const oldStats = src.substring(statsIdx, afterStats);
console.log("Old stats block:", oldStats.substring(0, 100));

const newStats = `  const stats = {
    total: summary?.totalAmount || 0,
    count: summary?.totalTransactions || 0,
    mobileMoney: summary?.byMethod?.mobile_money || 0,
    card: summary?.byMethod?.card || 0,
    cash: summary?.byMethod?.cash || 0,
  }`;

src = src.substring(0, statsIdx) + newStats + src.substring(afterStats);
fs.writeFileSync("components/admin/AdminPayments.tsx", src, "utf8");
console.log("Done:", src.includes("summary?.totalAmount"));
