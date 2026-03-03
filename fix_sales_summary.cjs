const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReportDetail.tsx", "utf8");

src = src.replace(
  `          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Wash Token</p>     
              <p className="text-base font-bold text-foreground">
                GHS {((report.washerTokensUsed || 0) * 25).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dry Tokens</p>     
              <p className="text-base font-bold text-foreground">
                GHS {((report.dryerTokensUsed || 0) * 25).toFixed(2)}
              </p>
            </div>
          </div>`,
  `          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Wash Tokens</p>
              <p className="text-xl font-bold text-foreground">{report.washerTokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">GHS {((report.washerTokensUsed || 0) * 25).toFixed(2)}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dry Tokens</p>
              <p className="text-xl font-bold text-foreground">{report.dryerTokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">GHS {((report.dryerTokensUsed || 0) * 25).toFixed(2)}</p>
            </div>
          </div>`
);

fs.writeFileSync("components/admin/AdminReportDetail.tsx", src, "utf8");
console.log("Fixed:", src.includes("text-xl font-bold text-foreground\">{report.washerTokensUsed"));
