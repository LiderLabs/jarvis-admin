const fs = require("fs");

// ── 1. AdminReports.tsx ──────────────────────────────────────────────────────
let reports = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

// Add AdminReportDetail import
if (!reports.includes("import AdminReportDetail")) {
  reports = reports.replace(
    "const AdminReportsOverview",
    "import AdminReportDetail from './AdminReportDetail';\n\nconst AdminReportsOverview"
  );
}

// Add branchMap
if (!reports.includes("branchMap =")) {
  reports = reports.replace(
    "  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];\r\n  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];",
    "  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];\r\n  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];\r\n  const branchMap = Object.fromEntries(branches.map((b: any) => [b._id, b.name]));"
  );
}

// Fix branch name in table
reports = reports.replace(
  "{r.branchName || '—'}",
  "{r.branchName || branchMap[r.branchId] || '—'}"
);

// Fix dailyReports query to filter by branch and use limit 100
reports = reports.replace(
  "      startDate: format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),\r\n      endDate: format(new Date(), 'yyyy-MM-dd'),\r\n      limit: 50,",
  "      startDate: format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),\r\n      endDate: format(new Date(), 'yyyy-MM-dd'),\r\n      ...(selectedBranch !== 'all' ? { branchId: selectedBranch } : {}),\r\n      limit: 100,"
);

// Fix stats to use dailyReports revenue
if (!reports.includes("drRevenue")) {
  reports = reports.replace(
    "    const totalRevenue = filtered.reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);",
    "    const drRevenue = dailyReports.reduce((s: number, r: any) => s + (r.totalRevenue || 0), 0);\r\n    const totalRevenue = drRevenue > 0 ? drRevenue : filtered.reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);"
  );
  reports = reports.replace(
    "    const mobileMoney = filtered.filter((o: any) => o.paymentMethod === 'mobile_money').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);\r\n    const card = filtered.filter((o: any) => o.paymentMethod === 'card').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);\r\n    const cash = filtered.filter((o: any) => o.paymentMethod === 'cash').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);",
    "    const mobileMoney = dailyReports.reduce((s: number, r: any) => s + (r.mobileMoneylAmount || 0), 0) || filtered.filter((o: any) => o.paymentMethod === 'mobile_money').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);\r\n    const card = dailyReports.reduce((s: number, r: any) => s + (r.cardAmount || 0), 0) || filtered.filter((o: any) => o.paymentMethod === 'card').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);\r\n    const cash = dailyReports.reduce((s: number, r: any) => s + (r.cashAmount || 0), 0) || filtered.filter((o: any) => o.paymentMethod === 'cash').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);"
  );
}

// Wire up detail view
if (!reports.includes("selectedReportId")) {
  reports = reports.replace(
    "export default AdminReportsOverview;",
    `const AdminReports = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  if (selectedReportId) {
    return <AdminReportDetail reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />;
  }
  return <AdminReportsOverview onViewReport={(id) => setSelectedReportId(id)} />;
};
export default AdminReports;`
  );
}

fs.writeFileSync("components/admin/AdminReports.tsx", reports, "utf8");
console.log("Reports fixed:", reports.includes("selectedReportId") && reports.includes("branchMap") && reports.includes("drRevenue"));

// ── 2. OrderTable.tsx ────────────────────────────────────────────────────────
let table = fs.readFileSync("components/admin/OrderTable.tsx", "utf8");
if (!table.includes("Final Paid")) {
  table = table.replace(
    '              <TableHead className="w-[100px] whitespace-nowrap">Amount</TableHead>',
    '              <TableHead className="w-[100px] whitespace-nowrap">Amount</TableHead>\r\n              <TableHead className="w-[110px] whitespace-nowrap">Final Paid</TableHead>'
  );
  fs.writeFileSync("components/admin/OrderTable.tsx", table, "utf8");
}
console.log("OrderTable fixed:", table.includes("Final Paid"));

// ── 3. OrderTableRow.tsx ─────────────────────────────────────────────────────
let row = fs.readFileSync("components/admin/OrderTableRow.tsx", "utf8");
if (!row.includes("totalPrice ?? order.finalPrice")) {
  row = row.replace(
    '      {/* Amount */}\r\n      <TableCell className="whitespace-nowrap">\r\n        <div className="flex items-center gap-1">\r\n          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />\r\n          <span className="font-semibold">₵{order.finalPrice.toFixed(2)}</span>\r\n        </div>\r\n      </TableCell>',
    '      {/* Amount */}\r\n      <TableCell className="whitespace-nowrap">\r\n        <div className="flex items-center gap-1">\r\n          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />\r\n          <span className="font-semibold">₵{(order.totalPrice ?? order.finalPrice ?? 0).toFixed(2)}</span>\r\n        </div>\r\n      </TableCell>\r\n      {/* Final Paid */}\r\n      <TableCell className="whitespace-nowrap">\r\n        <div className="flex flex-col">\r\n          <span className="font-semibold text-green-600">₵{(order.finalPrice ?? order.totalPrice ?? 0).toFixed(2)}</span>\r\n          {(order.totalPrice ?? 0) > (order.finalPrice ?? 0) && (\r\n            <span className="text-xs text-muted-foreground line-through">₵{(order.totalPrice ?? 0).toFixed(2)}</span>\r\n          )}\r\n        </div>\r\n      </TableCell>'
  );
  fs.writeFileSync("components/admin/OrderTableRow.tsx", row, "utf8");
}
console.log("OrderTableRow fixed:", row.includes("totalPrice ?? order.finalPrice"));

// ── 4. PaymentTableRow.tsx ───────────────────────────────────────────────────
let payrow = fs.readFileSync("components/admin/PaymentTableRow.tsx", "utf8");
if (!payrow.includes("finalPrice ?? payment.amount")) {
  payrow = payrow.replace(
    '      {/* Amount */}\r\n      <TableCell className="whitespace-nowrap">\r\n        <div className="flex items-center gap-1">\r\n          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />\r\n          <span className="font-semibold">\r\n            {payment.currency} {payment.amount.toFixed(2)}\r\n          </span>\r\n        </div>\r\n      </TableCell>',
    '      {/* Amount */}\r\n      <TableCell className="whitespace-nowrap">\r\n        <div className="flex flex-col">\r\n          <div className="flex items-center gap-1">\r\n            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />\r\n            <span className="font-semibold text-green-600">\r\n              {payment.currency} {(payment.order?.finalPrice ?? payment.amount ?? 0).toFixed(2)}\r\n            </span>\r\n          </div>\r\n          {payment.order?.totalPrice && payment.order.totalPrice > (payment.order?.finalPrice ?? payment.amount) && (\r\n            <span className="text-xs text-muted-foreground line-through ml-4">₵{payment.order.totalPrice.toFixed(2)}</span>\r\n          )}\r\n        </div>\r\n      </TableCell>'
  );
  fs.writeFileSync("components/admin/PaymentTableRow.tsx", payrow, "utf8");
}
console.log("PaymentTableRow fixed:", payrow.includes("finalPrice ?? payment.amount"));
