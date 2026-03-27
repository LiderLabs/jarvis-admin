const fs = require("fs");
const path = "components/admin/AdminOverview.tsx";
let src = fs.readFileSync(path, "utf8");

const old1 = `            {weeklyTarget > 0\n              ? \`\${weeklyOrders} / \${weeklyTarget} orders\`\n              : "No target set"}\n            <span className="ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity text-[10px]">\n              · click to edit\n            </span>`;
const new1 = `            {weeklyTarget > 0\n              ? \`\${weeklyOrders} / \${weeklyTarget} orders\`\n              : "No target set"}`;
src = src.replace(old1, new1);
console.log("1. click to edit removed:", !src.includes("click to edit") ? "YES" : "NO");

const old2 = `    const hasReports       = (dailyReports as any[]).length > 0\n    const totalMobileMoney = hasReports\n      ? (dailyReports as any[]).reduce((s: number, r: any) => s + (r.mobileMoneylAmount || 0), 0)\n      : (selectedStats as any)?.mobileMoneylAmount ?? 0\n    const totalCard = hasReports\n      ? (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cardAmount || 0) + (r.paystackAmount || 0), 0)\n      : (selectedStats as any)?.cardAmount ?? 0\n    const totalCash = hasReports\n      ? (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cashAmount || 0), 0)\n      : (selectedStats as any)?.cashAmount ?? 0`;
const new2 = `    const totalMobileMoney = (selectedStats as any)?.mobileMoneylAmount ?? 0\n    const totalCard        = (selectedStats as any)?.cardAmount ?? 0\n    const totalCash        = (selectedStats as any)?.cashAmount ?? 0`;
src = src.replace(old2, new2);
console.log("2. live stats fix:", src.includes("totalMobileMoney = (selectedStats") ? "YES" : "NO");

const old3 = `    ;(dailyReports as any[]).forEach((r: any) => {\n      const key = format(new Date(r.date), "MMM d")\n      if (dayMap[key]) {\n        dayMap[key].mobileMoney = r.mobileMoneylAmount || 0\n        dayMap[key].cash        = r.cashAmount || 0\n        dayMap[key].card        = (r.cardAmount || 0) + (r.paystackAmount || 0)\n      }\n    })`;
const new3 = `    const totalAll = totalCash + totalMobileMoney + totalCard\n    if (totalAll > 0 && totalCash > 0) {\n      Object.keys(dayMap).forEach(key => {\n        const dayCash = dayMap[key].cash\n        if (dayCash > 0) {\n          const ratio = dayCash / totalCash\n          dayMap[key].mobileMoney = Math.round(totalMobileMoney * ratio * 100) / 100\n          dayMap[key].card        = Math.round(totalCard * ratio * 100) / 100\n        }\n      })\n    }`;
src = src.replace(old3, new3);
console.log("3. chart live fix:", src.includes("const totalAll = totalCash") ? "YES" : "NO");

const old4 = `                  {(dailyReports as any[]).length === 0 && (\n                    <span className="ml-1 text-yellow-500">\u00b7 Live</span>\n                  )}`;
const new4 = `                  <span className="ml-1 text-green-500">\u00b7 Live</span>`;
src = src.replace(old4, new4);
console.log("4. always live:", src.includes('text-green-500') ? "YES" : "NO");

const old5 = `                <Button\n                  variant="outline"\n                  size="sm"\n                  className="h-7 text-xs px-2.5 gap-1.5"\n                  onClick={() => setShowWeeklyReports(true)}\n                >\n                  <BarChart2 className="w-3 h-3" />\n                  Weekly Reports\n                </Button>`;
src = src.replace(old5, ``);
console.log("5. weekly reports btn removed:", !src.includes("Weekly Reports") ? "YES" : "NO");

fs.writeFileSync(path, src);
console.log("\nAll done.");
