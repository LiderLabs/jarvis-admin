const fs = require("fs");
const path = "components/admin/AdminOverview.tsx";
let src = fs.readFileSync(path, "utf8");

// Remove the Weekly Reports button
const oldBtn = `                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 gap-1.5"
                  onClick={() => setShowWeeklyReports(true)}
                >
                  <BarChart2 className="w-3 h-3" />
                  Weekly Reports
                </Button>`;

if (src.includes(oldBtn)) {
  src = src.replace(oldBtn, "");
  console.log("Button: REMOVED");
} else {
  const oldCRLF = oldBtn.replace(/\n/g, "\r\n");
  if (src.includes(oldCRLF)) {
    src = src.replace(oldCRLF, "");
    console.log("Button: REMOVED (CRLF)");
  } else {
    console.log("NOT FOUND");
  }
}

fs.writeFileSync(path, src);
