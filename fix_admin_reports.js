const fs = require('fs');
let src = fs.readFileSync('components/admin/AdminReports.tsx', 'utf8');

src = src.replace('import { usePaginatedQuery }', 'import { usePaginatedQuery, useQuery }');

src = src.replace(
  "useState<'overview' | 'revenue' | 'customers' | 'orders'>('overview');",
  "useState<'overview' | 'revenue' | 'customers' | 'orders' | 'daily'>('overview');\n  const [dailyExpandedId, setDailyExpandedId] = React.useState(null);"
);

src = src.replace(
  '<SelectItem value="orders">All Orders</SelectItem>',
  '<SelectItem value="orders">All Orders</SelectItem>\n                  <SelectItem value="daily">Daily Branch Reports</SelectItem>'
);

const before = "  if (status === 'LoadingFirstPage') {";
const inject = [
  "  const dailyReports = useQuery((api as any).dailyReports.getAll, reportType === 'daily' ? { startDate, endDate, limit: 100 } : 'skip') || [];",
  "  const exportDailyCSV = () => {",
  "    if (!dailyReports.length) return toast.error('No reports to export');",
  "    const rows = [",
  "      ['Date','Attendants','Washer Tokens','Dryer Tokens','Total Tokens','Cash','Mobile Money','Card','Paystack','Soap Units','Free Washes','Washing Plans','Tech Faults','Total Revenue','Status'],",
  "      ...dailyReports.map((r) => [r.date,(r.attendantsOnShift||[]).join('|'),r.washerTokensUsed,r.dryerTokensUsed,r.totalTokensUsed,r.cashAmount?.toFixed(2),r.mobileMoneylAmount?.toFixed(2),r.cardAmount?.toFixed(2),r.paystackAmount?.toFixed(2),r.soapUnitsUsed,r.freeWashCount,r.washingPlanCount,r.technicalFaultCount,r.totalRevenue?.toFixed(2),r.status])",
  "    ];",
  "    const csv = rows.map(r => r.join(',')).join('\\n');",
  "    const blob = new Blob([csv], {type:'text/csv'});",
  "    const url = URL.createObjectURL(blob);",
  "    const a = document.createElement('a');",
  "    a.href=url; a.download='washlab-daily-'+startDate+'-'+endDate+'.csv'; a.click();",
  "    URL.revokeObjectURL(url);",
  "    toast.success('CSV downloaded');",
  "  };",
  ""
].join('\n');
src = src.replace(before, inject + before);

const marker = "{reportType === 'orders' && (";
const panel = [
  "{reportType === 'daily' && (",
  "        <div className=\"space-y-4\">",
  "          <div className=\"flex justify-between items-center\">",
  "            <div><h2 className=\"text-lg font-semibold\">Daily Branch Reports</h2><p className=\"text-sm text-muted-foreground\">End-of-day reports submitted by attendants</p></div>",
  "            <Button variant=\"outline\" size=\"sm\" onClick={exportDailyCSV}><Download className=\"w-4 h-4 mr-2\" />Export CSV</Button>",
  "          </div>",
  "          {dailyReports.length === 0 ? (",
  "            <Card><CardContent className=\"py-16 text-center text-muted-foreground\">No daily reports found for this date range.</CardContent></Card>",
  "          ) : (",
  "            <div className=\"space-y-3\">",
  "              {dailyReports.map((r) => (",
  "                <Card key={r._id} className=\"overflow-hidden\">",
  "                  <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/30\" onClick={() => setDailyExpandedId(dailyExpandedId === r._id ? null : r._id)}>",
  "                    <div className=\"flex items-center gap-3\">",
  "                      <div className=\"w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center\"><FileText className=\"w-5 h-5 text-primary\" /></div>",
  "                      <div><p className=\"font-semibold text-sm\">{r.date}</p><p className=\"text-xs text-muted-foreground\">{(r.attendantsOnShift||[]).join(', ')||'No attendants listed'}</p></div>",
  "                    </div>",
  "                    <div className=\"flex items-center gap-4 flex-wrap\">",
  "                      <div className=\"text-center\"><p className=\"text-xs text-muted-foreground\">Tokens</p><p className=\"font-bold text-sm\">{r.totalTokensUsed}</p></div>",
  "                      <div className=\"text-center\"><p className=\"text-xs text-muted-foreground\">Revenue</p><p className=\"font-bold text-sm text-primary\">GHS {r.totalRevenue?.toFixed(2)}</p></div>",
  "                      <Badge variant={r.status === 'submitted' ? 'default' : 'secondary'} className=\"capitalize\">{r.status}</Badge>",
  "                      <ChevronDown className={\"w-4 h-4 transition-transform \" + (dailyExpandedId === r._id ? 'rotate-180' : '')} />",
  "                    </div>",
  "                  </div>",
  "                  {dailyExpandedId === r._id && (",
  "                    <div className=\"border-t bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3\">",
  "                      {[['Washer Tokens',r.washerTokensUsed],['Dryer Tokens',r.dryerTokensUsed],['Cash','GHS '+r.cashAmount?.toFixed(2)],['Mobile Money','GHS '+r.mobileMoneylAmount?.toFixed(2)],['Card','GHS '+r.cardAmount?.toFixed(2)],['Paystack','GHS '+r.paystackAmount?.toFixed(2)],['Soap Units',r.soapUnitsUsed],['Free Washes',r.freeWashCount],['Washing Plans',r.washingPlanCount],['Tech Faults',r.technicalFaultCount]].map(([label,value]) => (",
  "                        <div key={String(label)} className=\"bg-card border rounded-lg p-3\"><p className=\"text-xs text-muted-foreground mb-1\">{label}</p><p className=\"font-semibold text-sm\">{value}</p></div>",
  "                      ))}",
  "                      {r.serviceBreakdown?.length > 0 && (<div className=\"col-span-2 sm:col-span-3 md:col-span-4 bg-card border rounded-lg p-3\"><p className=\"text-xs text-muted-foreground mb-2\">Service Breakdown</p><div className=\"flex flex-wrap gap-2\">{r.serviceBreakdown.map((s) => (<span key={s.serviceType} className=\"text-xs bg-primary/10 text-primary px-2 py-1 rounded-full\">{s.label}: {s.count} orders · {s.tokensUsed} tokens</span>))}</div></div>)}",
  "                      {r.technicalFaultNotes && (<div className=\"col-span-2 sm:col-span-3 md:col-span-4 bg-destructive/5 border border-destructive/20 rounded-lg p-3\"><p className=\"text-xs text-destructive mb-1\">Fault Notes</p><p className=\"text-sm\">{r.technicalFaultNotes}</p></div>)}",
  "                      {r.notes && (<div className=\"col-span-2 sm:col-span-3 md:col-span-4 bg-muted/50 rounded-lg p-3\"><p className=\"text-xs text-muted-foreground mb-1\">Notes</p><p className=\"text-sm\">{r.notes}</p></div>)}",
  "                    </div>",
  "                  )}",
  "                </Card>",
  "              ))}",
  "            </div>",
  "          )}",
  "        </div>",
  "      )}",
  "",
  "      " + marker
].join('\n');

src = src.replace(marker, panel);
fs.writeFileSync('components/admin/AdminReports.tsx', src, 'utf8');
console.log('Done! Lines:', src.split('\n').length);
