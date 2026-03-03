const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReportDetail.tsx", "utf8");
const idx = src.indexOf("washerTokensUsed || 0) * 25");
// Find all occurrences
let i = 0;
let pos = src.indexOf("washerTokensUsed || 0) * 25");
while (pos !== -1) {
  console.log(`Occurrence ${++i} at ${pos}:`);
  console.log(JSON.stringify(src.substring(pos - 100, pos + 100)));
  pos = src.indexOf("washerTokensUsed || 0) * 25", pos + 1);
}
