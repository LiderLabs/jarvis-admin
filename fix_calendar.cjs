const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminOrders.tsx", "utf8");

// Remove Calendar and Popover imports
src = src.replace(
  `import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"`,
  ``
);

// Remove CalendarIcon from lucide imports
src = src.replace(`, CalendarIcon`, ``);

// Remove calendarOpen state
src = src.replace(`  const [calendarOpen, setCalendarOpen] = useState(false)\n`, ``);

// Replace the entire Date Selector Card
const oldDateSelector = `      {/* Date Selector */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground shrink-0 mr-1">
              Viewing orders for:
            </span>

            {/* Prev */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevDay}
              className="h-9 w-9 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Calendar trigger */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 min-w-[200px] justify-start gap-2 font-medium border-2 border-primary/30 hover:border-primary/60 transition-colors"
                >
                  <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {isSelectedToday
                      ? "Today · " + format(selectedDate, "MMM d, yyyy")
                      : format(selectedDate, "EEE, MMM d, yyyy")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 shadow-lg border rounded-xl overflow-hidden"
                align="start"
                sideOffset={6}
              >
                {/* Calendar header */}
                <div className="bg-primary px-4 py-3">
                  <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">
                    Select Date
                  </p>
                  <p className="text-lg font-bold text-primary-foreground mt-0.5">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </p>
                </div>

                {/* Calendar widget */}
                <div className="p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date)
                        setCalendarOpen(false)
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    classNames={{
                      months: "flex flex-col space-y-4",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-muted rounded-md inline-flex items-center justify-center",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem] flex items-center justify-center",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-muted inline-flex items-center justify-center",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md font-semibold",
                      day_today: "bg-accent text-accent-foreground font-semibold",
                      day_outside: "text-muted-foreground opacity-40",
                      day_disabled: "text-muted-foreground opacity-25 cursor-not-allowed",
                      day_hidden: "invisible",
                    }}
                  />
                </div>

                {/* Footer: Today shortcut */}
                {!isSelectedToday && (
                  <div className="border-t px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs font-medium text-primary hover:text-primary"
                      onClick={() => {
                        setSelectedDate(new Date())
                        setCalendarOpen(false)
                      }}
                    >
                      Jump to Today
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Next */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="h-9 w-9 shrink-0"
              disabled={isSelectedToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Today pill — only when on a past date */}
            {!isSelectedToday && (
              <Button
                variant="secondary"
                size="sm"
                onClick={goToToday}
                className="h-9 px-4 font-medium"
              >
                Back to Today
              </Button>
            )}
          </div>
        </CardContent>
      </Card>`;

const newDateSelector = `      {/* Date Selector */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground shrink-0">
              Viewing orders for:
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevDay} className="h-9 w-9 shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => {
                    if (e.target.value) setSelectedDate(new Date(e.target.value + 'T12:00:00'))
                  }}
                  className="h-9 px-3 rounded-lg border border-input bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                />
              </div>
              <Button variant="outline" size="icon" onClick={goToNextDay} className="h-9 w-9 shrink-0" disabled={isSelectedToday}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {isSelectedToday ? (
              <span className="text-sm font-semibold text-primary">Today</span>
            ) : (
              <Button variant="secondary" size="sm" onClick={goToToday} className="h-9 px-4 font-medium">
                Back to Today
              </Button>
            )}
          </div>
        </CardContent>
      </Card>`;

src = src.replace(oldDateSelector, newDateSelector);
fs.writeFileSync("components/admin/AdminOrders.tsx", src, "utf8");
console.log("Done");
