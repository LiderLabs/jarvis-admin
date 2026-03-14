const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");

const idx = src.indexOf("  const completedPayments");
const endIdx = src.indexOf("\n\n", idx);
console.log("Start:", idx, "End:", endIdx);

if (idx !== -1 && endIdx !== -1) {
  const newStats = `  const stats = {
    total: summary?.totalAmount || 0,
    count: summary?.totalTransactions || 0,
    mobileMoney: summary?.byMethod?.mobile_money || 0,
    card: summary?.byMethod?.card || 0,
    cash: summary?.byMethod?.cash || 0,
  }`;
  src = src.substring(0, idx) + newStats + src.substring(endIdx);
  fs.writeFileSync("components/admin/AdminPayments.tsx", src, "utf8");
  console.log("Done:", src.includes("summary?.totalAmount"));
} else {
  // Try with \r\n
  const endIdx2 = src.indexOf("\r\n\r\n", idx);
  console.log("End with CRLF:", endIdx2);
  if (idx !== -1 && endIdx2 !== -1) {
    const newStats = `  const stats = {\r\n    total: summary?.totalAmount || 0,\r\n    count: summary?.totalTransactions || 0,\r\n    mobileMoney: summary?.byMethod?.mobile_money || 0,\r\n    card: summary?.byMethod?.card || 0,\r\n    cash: summary?.byMethod?.cash || 0,\r\n  }`;
    src = src.substring(0, idx) + newStats + src.substring(endIdx2);
    fs.writeFileSync("components/admin/AdminPayments.tsx", src, "utf8");
    console.log("Done CRLF:", src.includes("summary?.totalAmount"));
  }
}
