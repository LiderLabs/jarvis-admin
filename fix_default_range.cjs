const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

// Change default from 7 to 1 (Today)
src = src.replace(
  "const [rangeDays, setRangeDays] = useState(7);",
  "const [rangeDays, setRangeDays] = useState(1);"
);

fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("Fixed:", src.includes("useState(1)"));
