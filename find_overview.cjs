const fs = require("fs");
const path = require("path");

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && !full.includes("node_modules") && !full.includes(".next")) {
      walk(full);
    } else if (f.endsWith(".tsx") || f.endsWith(".ts")) {
      const src = fs.readFileSync(full, "utf8");
      if (src.includes("report") && (src.includes("overview") || src.includes("Overview"))) {
        console.log("FOUND:", full);
      }
    }
  });
}
walk(".");
