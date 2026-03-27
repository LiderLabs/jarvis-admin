const fs = require("fs");
const path = "components/admin/AdminOverview.tsx";
let src = fs.readFileSync(path, "utf8");

// 1. Remove "click to edit" hint
src = src.replace(
  `            <span className="ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity text-[10px]">
              · click to edit
            </span>`,
  ``
);

// 2. Fix payment stats to always use live data (selectedStats) not daily reports
src = src.replace(
  `    const hasReports       = (dailyReports as any[]).length > 0
    const totalMobileMoney = hasReports
      ? (dailyReports as any[]).reduce((s: number, r: any) => s + (r.mobileMoneylAmount || 0), 0)
      : (selectedStats as any)?.mobileMoneylAmount ?? 0
    const totalCard = hasReports
      ? (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cardAmount || 0) + (r.paystackAmount || 0), 0)
      : (selectedStats as any)?.cardAmount ?? 0
    const totalCash = hasReports
      ? (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cashAmount || 0), 0)
      : (selectedStats as any)?.cashAmount ?? 0`,
  `    const totalMobileMoney = (selectedStats as any)?.mobileMoneylAmount ?? 0
    const totalCard = (selectedStats as any)?.cardAmount ?? 0
    const totalCash = (selectedStats as any)?.cashAmount ?? 0`
);

// 3. Fix chart data to use live stats per day not daily reports
src = src.replace(
  `    ;(dailyReports as any[]).forEach((r: any) => {
      const key = format(new Date(r.date), "MMM d")
      if (dayMap[key]) {
        dayMap[key].mobileMoney = r.mobileMoneylAmount || 0
        dayMap[key].cash        = r.cashAmount || 0
        dayMap[key].card        = (r.cardAmount || 0) + (r.paystackAmount || 0)
      }
    })`,
  `    // Use live stats byDay for chart - selectedStats.byDay has cash, use payment breakdown for mobile/card
    // Since byDay only has cash currently, distribute totals proportionally across days
    const totalAll = totalCash + totalMobileMoney + totalCard
    Object.keys(dayMap).forEach(key => {
      const dayCash = dayMap[key].cash
      if (totalAll > 0 && stats && dayCash > 0) {
        const ratio = dayCash / Math.max(totalCash, 1)
        dayMap[key].mobileMoney = Math.round(totalMobileMoney * ratio * 100) / 100
        dayMap[key].card = Math.round(totalCard * ratio * 100) / 100
      }
    })`
);

// 4. Remove Live indicator since its always live now
src = src.replace(
  `                  {(dailyReports as any[]).length === 0 && (
                    <span className="ml-1 text-yellow-500">· Live</span>
                  )}`,
  `<span className="ml-1 text-green-500">· Live</span>`
);

fs.writeFileSync(path, src);
console.log("click to edit removed:", !src.includes("click to edit") ? "YES" : "NO");
console.log("live stats fix:", src.includes("totalMobileMoney = (selectedStats") ? "YES" : "NO");
