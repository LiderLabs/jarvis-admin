const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

// Replace the entire Popover/Calendar block with a clean date input
const start = src.indexOf("<PopoverTrigger asChild>");
const end = src.indexOf("</Popover>", start) + "</Popover>".length;

const replacement = `<div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <CalendarIcon className="absolute left-3 h-4 w-4 text-primary pointer-events-none z-10" />
                  <input
                    type="date"
                    value={format(selectedDate, "yyyy-MM-dd")}
                    max={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(new Date(e.target.value + "T12:00:00"))
                    }}
                    className="h-9 pl-9 pr-3 rounded-md border-2 border-primary/30 hover:border-primary/60 bg-background text-sm font-medium focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  />
                </div>
                {!isSelectedToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-medium border-primary/30 text-primary hover:text-primary"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Today
                  </Button>
                )}
              </div>`;

src = src.substring(0, start) + replacement + src.substring(end);

fs.writeFileSync("components/admin/AdminOrders.tsx", src, "utf8");
console.log("Fixed:", src.includes('type="date"'));
console.log("No more Popover calendar:", !src.includes("<PopoverTrigger asChild>"));
