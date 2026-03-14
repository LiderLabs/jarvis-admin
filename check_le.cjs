const fs = require("fs");
const src = fs.readFileSync("components/admin/PaymentTableRow.tsx", "utf8");
const idx = src.indexOf("Payment Method");
const chunk = src.substring(idx, idx + 150);
for (let i = 0; i < chunk.length; i++) {
  if (chunk.charCodeAt(i) === 13) process.stdout.write("[CR]");
  else if (chunk.charCodeAt(i) === 10) process.stdout.write("[LF]");
  else process.stdout.write(chunk[i]);
}
