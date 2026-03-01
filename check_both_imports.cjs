const fs = require("fs");

// Fix 1: Remove duplicate X in NewOrderContent
let src1 = fs.readFileSync("components/washstation/pages/NewOrderContent.tsx", "utf8");
// Find both lucide imports and show them
const matches = [...src1.matchAll(/import \{[^}]+\} from "lucide-react"/g)];
matches.forEach((m, i) => console.log("Import", i+1, ":", JSON.stringify(m[0].substring(0, 100))));
