const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

// Add Today to ranges
src = src.replace(
  "const RANGES = [\r\n  { label: 'Last 7 Days', days: 7 },\r\n  { label: 'Last 30 Days', days: 30 },\r\n  { label: 'Last 90 Days', days: 90 },\r\n];",
  "const RANGES = [\r\n  { label: 'Today', days: 1 },\r\n  { label: 'Last 7 Days', days: 7 },\r\n  { label: 'Last 30 Days', days: 30 },\r\n  { label: 'Last 90 Days', days: 90 },\r\n];"
);

// Find the default state and set to Today (1)
src = src.replace(
  "useState(7)",
  "useState(1)"
);

fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("Today added:", src.includes("label: 'Today'"));
console.log("Default today:", src.includes("useState(1)"));
