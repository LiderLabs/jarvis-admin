const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReportDetail.tsx", "utf8");

src = src.replace(
  ">\r\n              <p className=\"text-base font-bold text-foreground\">\r\n                GHS {((report.washerTokensUsed || 0) * 25).toFixed(2)}\r\n              </p>\r\n            </div>\r\n            <div>\r",
  ">\r\n              <p className=\"text-xl font-bold text-foreground\">{report.washerTokensUsed || 0}</p>\r\n              <p className=\"text-xs text-muted-foreground\">GHS {((report.washerTokensUsed || 0) * 25).toFixed(2)}</p>\r\n            </div>\r\n            <div>\r"
);

// Also fix dry tokens
src = src.replace(
  /(<p className="text-\[10px\] uppercase tracking-wider text-muted-foreground font-medium">Dry Tokens<\/p>\s*)<p className="text-base font-bold text-foreground">\s*GHS \{\(\(report\.dryerTokensUsed \|\| 0\) \* 25\)\.toFixed\(2\)\}\s*<\/p>/,
  '$1<p className="text-xl font-bold text-foreground">{report.dryerTokensUsed || 0}</p>\r\n              <p className="text-xs text-muted-foreground">GHS {((report.dryerTokensUsed || 0) * 25).toFixed(2)}</p>'
);

fs.writeFileSync("components/admin/AdminReportDetail.tsx", src, "utf8");
console.log("Washer fixed:", src.includes('text-xl font-bold text-foreground\">{report.washerTokensUsed'));
console.log("Dryer fixed:", src.includes('text-xl font-bold text-foreground\">{report.dryerTokensUsed'));
