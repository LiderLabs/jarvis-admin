const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

// Remove the leftover <Popover open=... > tag that now wraps our date input
src = src.replace(
  `{/* Calendar trigger */}\r\n            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>\r\n              <div className="flex items-center gap-2">`,
  `{/* Calendar trigger */}\r\n            <div className="flex items-center gap-2">`
);

// Fix the closing </div> that lost its \r\n (line 280 ends without \r\n before next comment)
src = src.replace(
  `              </div>\r\n\r\n            {/* Next */}`,
  `            </div>\r\n\r\n            {/* Next */}`
);

fs.writeFileSync("components/admin/AdminOrders.tsx", src, "utf8");
console.log("Popover removed:", !src.includes("onOpenChange={setCalendarOpen}"));
