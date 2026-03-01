const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

// Fix calendar grid layout - use grid instead of flex for rows
src = src.replace(
  `head_row: "flex",\r\n                      head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem] flex items-center justify-center",\r\n                      row: "flex w-full mt-2",`,
  `head_row: "grid grid-cols-7",\r\n                      head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem] flex items-center justify-center",\r\n                      row: "grid grid-cols-7 w-full mt-2",`
);

fs.writeFileSync("components/admin/AdminOrders.tsx", src, "utf8");
console.log("Fixed:", src.includes("grid grid-cols-7"));
