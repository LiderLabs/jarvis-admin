const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

src = src.replace("useState(30)", "useState(1)");

fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("Default set to Today:", src.includes("useState(1)"));
