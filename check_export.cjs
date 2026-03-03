const fs = require("fs");
const src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");
const idx = src.lastIndexOf("export default");
console.log(src.substring(idx, idx + 600));
