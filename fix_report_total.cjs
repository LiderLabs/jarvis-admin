const fs = require("fs");
const path = "components/admin/AdminReportDetail.tsx";
let src = fs.readFileSync(path, "utf8");

// Fix the totalRevenue calculation to include receivedTotal in the big number only
src = src.replace(
  `  const cashAmount = report.cashAmount || 0;
  const mobileAmount = report.mobileMoneylAmount || 0;
  const cardAmount = (report.cardAmount || 0) + (report.paystackAmount || 0);
  // EOD total = only paid amounts, no outstanding, no vouchers
  const totalRevenue = cashAmount + mobileAmount + cardAmount;`,
  `  const cashAmount = report.cashAmount || 0;
  const mobileAmount = report.mobileMoneylAmount || 0;
  const cardAmount = (report.cardAmount || 0) + (report.paystackAmount || 0);
  // Day's payments only (for breakdown)
  const dayRevenue = cashAmount + mobileAmount + cardAmount;
  // Big total = day payments + outstanding received (money that came in today)
  const totalRevenue = dayRevenue; // updated after receivedTotal is available`
);

fs.writeFileSync(path, src);
console.log("step1:", src.includes("dayRevenue") ? "YES" : "NO");
