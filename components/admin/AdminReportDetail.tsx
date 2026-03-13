'use client';

import { useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  ChevronRight, Download, Wrench,
  Smartphone, CreditCard, Banknote, CheckCircle2,
  MessageSquare, Users, Tag,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportDetailProps {
  reportId: string;
  onBack?: () => void;
}

function fmt(n: number) {
  return `GHS ${n.toFixed(2)}`;
}

function discountTypeBadge(type: string) {
  if (type === 'free_wash') return { label: 'Free Wash', cls: 'bg-green-100 text-green-700' };
  if (type === 'loyalty') return { label: 'Loyalty', cls: 'bg-purple-100 text-purple-700' };
  if (type === 'percentage') return { label: '% Off', cls: 'bg-blue-100 text-blue-700' };
  if (type === 'fixed') return { label: 'Fixed', cls: 'bg-orange-100 text-orange-700' };
  return { label: type, cls: 'bg-muted text-muted-foreground' };
}

const AdminReportDetail = ({ reportId, onBack }: ReportDetailProps) => {
  const report = useQuery(
    (api as any).dailyReports.getById,
    reportId ? { reportId } : 'skip'
  );

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = (report.cashAmount || 0) + (report.mobileMoneylAmount || 0) + (report.cardAmount || 0) + (report.paystackAmount || 0);
  const cardTotal = (report.cardAmount || 0) + (report.paystackAmount || 0);
  const totalPaymentRecorded = totalRevenue;
  const voucherBreakdown: any[] = report.voucherBreakdown || [];
  const totalVoucherDiscount = voucherBreakdown.reduce((s: number, v: any) => s + (v.totalDiscount || 0), 0);

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Allow popups');
    const voucherRows = voucherBreakdown.map((v: any) =>
      `<tr><td style="padding:6px 8px">${v.name}</td><td style="padding:6px 8px;text-align:center">${v.count}</td><td style="padding:6px 8px;text-align:right">${v.discountType === 'loyalty' ? `${v.totalDiscount} pts` : fmt(v.totalDiscount)}</td></tr>`
    ).join('');
    w.document.write(`
      <html><head><title>WashLab Report - ${report.branchName} ${report.date}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:40px;color:#111}
        h1{font-size:24px;font-weight:700;margin-bottom:4px}
        .meta{color:#666;font-size:13px;margin-bottom:24px}
        .section{background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px}
        .section h2{font-size:14px;font-weight:600;margin-bottom:12px;color:#374151}
        .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .stat{background:white;border:1px solid #e5e7eb;border-radius:6px;padding:12px}
        .stat-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
        .stat-value{font-size:18px;font-weight:700;margin-top:2px}
        .fault{background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px;margin-bottom:8px}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;padding:6px 8px;border-bottom:1px solid #e5e7eb}
        td{font-size:13px;border-bottom:1px solid #f3f4f6}
        @media print{body{padding:20px}}
      </style></head><body>
      <nav style="font-size:12px;color:#6b7280;margin-bottom:16px">Reports › ${report.branchName}</nav>
      <h1>${report.branchName} - ${format(new Date(report.date), 'd MMM yyyy')}</h1>
      <div class="meta">
        Status: ${report.status === 'submitted_with_outstanding' ? 'Outstanding' : report.status === 'submitted' ? 'Closed' : 'Open'} &nbsp;|&nbsp; 
        Attendants: ${(report.attendantsOnShift || []).join(', ')}
      </div>
      <div class="section">
        <h2>Sales Summary</h2>
        <div style="font-size:28px;font-weight:800;margin-bottom:8px">${fmt(totalRevenue)}</div>
        <div class="grid">
          <div class="stat"><div class="stat-label">Wash Tokens</div><div class="stat-value">GHS ${((report.washerTokensUsed || 0) * (report.washerPrice || 25)).toFixed(2)}</div></div>
          <div class="stat"><div class="stat-label">Dry Tokens</div><div class="stat-value">GHS ${((report.dryerTokensUsed || 0) * (report.dryerPrice || 25)).toFixed(2)}</div></div>
        </div>
      </div>
      <div class="section">
        <h2>Payment Breakdown</h2>
        <div class="grid">
          <div class="stat"><div class="stat-label">Mobile Money</div><div class="stat-value">${fmt(report.mobileMoneylAmount || 0)}</div></div>
          <div class="stat"><div class="stat-label">Card</div><div class="stat-value">${fmt(cardTotal)}</div></div>
          <div class="stat"><div class="stat-label">Cash</div><div class="stat-value">${fmt(report.cashAmount || 0)}</div></div>
        </div>
        <div style="margin-top:12px;font-weight:600">Total Recorded: ${fmt(totalPaymentRecorded)}</div>
      </div>
      ${voucherBreakdown.length > 0 ? `
      <div class="section">
        <h2>Discounts & Vouchers</h2>
        <table>
          <thead><tr><th>Voucher / Reward</th><th style="text-align:center">Uses</th><th style="text-align:right">Total Discount</th></tr></thead>
          <tbody>${voucherRows}</tbody>
        </table>
        <div style="margin-top:10px;font-weight:600;text-align:right">Total Discounted: ${fmt(totalVoucherDiscount)}</div>
      </div>` : ''}
      ${report.technicalFaultNotes ? `
      <div class="section">
        <h2>Technical Faults</h2>
        <div class="fault">${report.technicalFaultNotes}</div>
      </div>` : ''}
      ${report.notes ? `
      <div class="section">
        <h2>Manager Comments</h2>
        <p style="font-style:italic;color:#374151">"${report.notes}"</p>
      </div>` : ''}
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
    toast.success('PDF ready');
  };

  const faultLines = (report.technicalFaultNotes || '').split('\n').filter(Boolean) as string[];
  const parsedFaults = faultLines.map(line => {
    const match = line.match(/^\[(.+?)\]\s*(.+)$/);
    return match ? { machineId: match[1], description: match[2] } : { machineId: '—', description: line };
  });

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto px-4">
      {/* Outstanding payments warning */}
      {(report.status === 'submitted_with_outstanding') && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Outstanding Payments at Submission</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
              {report.outstandingOrderCount ?? 0} order{(report.outstandingOrderCount ?? 0) !== 1 ? 's' : ''} were unpaid when this report was submitted.
              Expected outstanding amount: <span className="font-bold">GHS {(report.outstandingAmount ?? 0).toFixed(2)}</span>.
              These payments may have been collected on a subsequent day.
            </p>
          </div>
        </div>
      )}

      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
            <button onClick={onBack} className="hover:text-foreground transition-colors">Reports</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{report.branchName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {report.branchName} - {format(new Date(report.date), 'd MMM yyyy')}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge className={`text-xs ${
                report.status === 'submitted_with_outstanding' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                report.status === 'submitted' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
              Status: {report.status === 'submitted_with_outstanding' ? 'Outstanding' : report.status === 'submitted' ? 'Closed' : 'Open'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Last updated: {format(new Date(report._creationTime), 'h:mm a')}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF} className="flex-shrink-0">
          <Download className="w-4 h-4 mr-1.5" /> Export
        </Button>
      </div>

      {/* Main 3-col card row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sales Summary */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center justify-between">
            Sales Summary
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </h2>
          <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-foreground mb-3">{fmt(totalRevenue)}</p>
          <div className="w-full h-1.5 bg-blue-500 rounded-full mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Wash Tokens</p>
              <p className="text-xl font-bold text-foreground">{report.washerTokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">GHS {((report.washerTokensUsed || 0) * (report.washerPrice || 25)).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dry Tokens</p>
              <p className="text-xl font-bold text-foreground">{report.dryerTokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">GHS {((report.dryerTokensUsed || 0) * (report.dryerPrice || 25)).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3">Payment Breakdown</h2>
          <div className="space-y-2.5">
            {[
              { label: 'Mobile Money', value: report.mobileMoneylAmount || 0, icon: Smartphone, color: 'text-blue-500' },
              { label: 'Card', value: cardTotal, icon: CreditCard, color: 'text-indigo-500' },
              { label: 'Cash', value: report.cashAmount || 0, icon: Banknote, color: 'text-green-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{fmt(value)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">Total Recorded</span>
            <span className="text-sm font-bold text-foreground">{fmt(totalPaymentRecorded)}</span>
          </div>
        </div>

        {/* Entries */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3">Entries</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a5 5 0 1 0 5 5A5 5 0 0 0 12 2zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm9 11v-1a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v1"/></svg>
                </div>
                <span className="text-sm text-muted-foreground">Soap Used</span>
              </div>
              <span className="text-sm font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                {report.soapUnitsUsed || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center">
                  <Wrench className="w-3.5 h-3.5 text-red-600" />
                </div>
                <span className="text-sm text-muted-foreground">Technical Faults</span>
              </div>
              <span className="text-sm font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-md">
                {report.technicalFaultCount || parsedFaults.length || 0}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* Voucher & Discount Breakdown */}
      {voucherBreakdown.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Discounts & Vouchers Used
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              Total discounted: <span className="font-semibold text-foreground">{fmt(totalVoucherDiscount)}</span>
            </span>
          </h2>
          {/* Mobile: stacked cards */}
          <div className="sm:hidden space-y-2">
            {voucherBreakdown.map((v: any, i: number) => {
              const badge = discountTypeBadge(v.discountType);
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{v.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                      <span className="text-xs text-muted-foreground">Code: {v.code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{v.count}×</p>
                    <p className="text-xs text-muted-foreground">
                      {v.discountType === 'loyalty' ? fmt(v.totalDiscount) : v.discountType === 'percentage' ? `${v.discountValue ?? ''}% → ${fmt(v.totalDiscount)}` : fmt(v.totalDiscount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Voucher / Reward', 'Code', 'Type', 'Uses', 'Total Discount'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {voucherBreakdown.map((v: any, i: number) => {
                  const badge = discountTypeBadge(v.discountType);
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 text-sm font-semibold text-foreground">{v.name}</td>
                      <td className="py-2.5 pr-4 text-sm text-muted-foreground font-mono">{v.code}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-sm font-bold text-foreground">{v.count}</td>
                      <td className="py-2.5 text-sm font-semibold text-foreground">
                        {v.discountType === 'loyalty' ? `${v.totalDiscount} pts` : v.discountType === 'percentage' ? `${v.discountValue ?? ''}% → ${fmt(v.totalDiscount)}` : fmt(v.totalDiscount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={3} />
                  <td className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground uppercase">Total</td>
                  <td className="py-2.5 text-sm font-bold text-foreground">{fmt(totalVoucherDiscount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Technical Faults Table */}
      {parsedFaults.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-destructive" />
            Technical Faults
          </h2>
          {/* Mobile */}
          <div className="sm:hidden space-y-2">
            {parsedFaults.map((f, i) => (
              <div key={i} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-xs font-semibold text-destructive">{f.machineId}</p>
                <p className="text-sm text-foreground mt-0.5">{f.description}</p>
              </div>
            ))}
          </div>
          {/* Desktop */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2 pr-4">Machine ID</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2">Fault Description</th>
                </tr>
              </thead>
              <tbody>
                {parsedFaults.map((f, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-sm font-semibold text-foreground">{f.machineId}</td>
                    <td className="py-2.5 text-sm text-muted-foreground">{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manager Comments + Attendants */}
      <div className="grid sm:grid-cols-2 gap-4">
        {report.notes && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Manager Comments
            </h2>
            <p className="text-sm text-foreground italic leading-relaxed">
              &ldquo;{report.notes}&rdquo;
            </p>
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Users className="w-4 h-4 text-muted-foreground" />
            Attendant on Duty
          </h2>
          <p className="text-sm font-semibold text-foreground">
            {(report.attendantsOnShift || []).join(' | ') || '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminReportDetail;