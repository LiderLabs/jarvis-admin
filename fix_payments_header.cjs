const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminPayments.tsx", "utf8");
src = src.replace(
  `          <div className="flex items-center justify-between">\r\n            <CardTitle>Filters</CardTitle>\r\n            <Button variant="outline" size="sm" onClick={handleClearFilters}>\r\n              Clear Filters\r\n            </Button>\r\n          </div>`,
  `          <div className="flex items-center justify-end">\r\n            <Button variant="outline" size="sm" onClick={handleClearFilters}>\r\n              Clear Filters\r\n            </Button>\r\n          </div>`
);
fs.writeFileSync("components/admin/AdminPayments.tsx", src, "utf8");
console.log("Filters header removed:", !src.includes("<CardTitle>Filters</CardTitle>"));
