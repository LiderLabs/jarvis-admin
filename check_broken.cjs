const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReportDetail.tsx", "utf8");
const lines = src.split("\n");
lines.slice(138, 170).forEach((l, i) => console.log(i+139, l));
