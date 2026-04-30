'use client';

import { useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  ChevronRight, Download, Wrench,
  Smartphone, CreditCard, Banknote,
  MessageSquare, Users, Tag, Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportDetailProps {
  reportId: string;
  onBack?: () => void;
}

function fmt(n: number) {
  return `GHS ${n.toFixed(2)}`;
}

function serviceLabel(st: string) {
  if (st === 'wash_only') return 'Wash Only';
  if (st === 'wash_and_dry') return 'Wash & Dry';
  if (st === 'dry_only') return 'Dry Only';
  return st;
}

function methodLabel(m: string) {
  if (m === 'mobile_money') return 'Mobile Money';
  if (m === 'card') return 'Card';
  if (m === 'cash') return 'Cash';
  return m;
}

function discountTypeBadge(type: string) {
  if (type === 'free_wash') return { label: 'Free Wash', cls: 'bg-green-100 text-green-700' };
  if (type === 'loyalty') return { label: 'Loyalty', cls: 'bg-purple-100 text-purple-700' };
  if (type === 'percentage') return { label: '% Off', cls: 'bg-blue-100 text-blue-700' };
  if (type === 'fixed') return { label: 'Fixed', cls: 'bg-orange-100 text-orange-700' };
  return { label: type, cls: 'bg-muted text-muted-foreground' };
}

// ── Fault deserializer — handles both JSON (new) and legacy [id] desc format ──
function parseFaults(raw: string): Array<{ machineName: string; serialNumber?: string; faultTypes: string[]; description: string }> {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  // Legacy format
  return raw.split('\n').filter(Boolean).map((line: string) => {
    const match = line.match(/^\[(.+?)\]\s*(.*)$/)
    return {
      machineName: match ? match[1] : '—',
      faultTypes: [],
      description: match ? match[2] : line,
    }
  })
}

const AdminReportDetail = ({ reportId, onBack }: ReportDetailProps) => {
  const report = useQuery(
    (api as any).dailyReports.getById,
    reportId ? { reportId } : 'skip'
  );
  const liveData = useQuery(
    (api as any).dailyReports.getAutoData,
    report ? { branchId: report.branchId, date: report.date } : 'skip'
  );

  const outstandingData = useQuery(
    (api as any).dailyReports.getOutstandingOrders,
    reportId ? { reportId } : 'skip'
  );

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cashAmount   = report.cashAmount || 0;
  const mobileAmount = report.mobileMoneylAmount || 0;
  const cardAmount   = (report.cardAmount || 0) + (report.paystackAmount || 0);

  // Day's own payments — shown in Payment Breakdown
  const dayRevenue = cashAmount + mobileAmount + cardAmount;

  const voucherBreakdown: any[]  = report.voucherBreakdown || [];
  const totalVoucherDiscount     = voucherBreakdown.reduce((s: number, v: any) => s + (v.totalDiscount || 0), 0);
  const outstandingOrders: any[] = outstandingData?.outstanding ?? [];
  const receivedOrders: any[]    = outstandingData?.received ?? [];
  const outstandingTotal         = outstandingOrders.reduce((s, o) => s + (o.finalPrice || 0), 0);
  const receivedTotal            = receivedOrders.reduce((s, o) => s + (o.amount || 0), 0);

  // End of Day Total = day's payments + any outstanding recovered today
  const endOfDayTotal = dayRevenue + receivedTotal;

  const statusText = report.status === 'submitted_with_outstanding' ? 'Outstanding'
    : report.status === 'submitted' ? 'Closed' : 'Open';

  const faults = parseFaults(report.technicalFaultNotes || '')

  // ── Token revenue: prefer liveData (exact per-service prices per order) ──────
  // liveData.washerTokenRevenue / dryerTokenRevenue are calculated in getAutoData
  // using the actual branchServices price for each order — so "Big Wash" at GHS 50
  // shows GHS 50, not the wash_only fallback of GHS 35.
  // Fall back to the old formula only if liveData hasn't loaded yet.
  const washerTokenRevenue = liveData?.washerTokenRevenue
    ?? (report.washerTokensUsed || 0) * (report.washerPrice || 25);
  const dryerTokenRevenue = liveData?.dryerTokenRevenue
    ?? (report.dryerTokensUsed || 0) * (report.dryerPrice || 25);
  const totalTokenRevenue = washerTokenRevenue + dryerTokenRevenue;

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Allow popups');

    const voucherRows = voucherBreakdown.map((v: any) =>
      `<tr>
        <td style="padding:6px 8px">${v.name}</td>
        <td style="padding:6px 8px;font-family:monospace">${v.code}</td>
        <td style="padding:6px 8px;text-align:center">${v.count}</td>
        <td style="padding:6px 8px;text-align:right">${v.discountType === 'loyalty' ? `${v.totalDiscount} pts` : fmt(v.totalDiscount)}</td>
      </tr>`
    ).join('');

    const outstandingRows = outstandingOrders.map((o: any) =>
      `<tr>
        <td style="padding:6px 8px;font-family:monospace">${o.orderNumber}</td>
        <td style="padding:6px 8px"><strong>${o.customerName}</strong><br/><span style="color:#6b7280;font-size:12px">${o.customerPhone}</span></td>
        <td style="padding:6px 8px">${serviceLabel(o.serviceType)}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600">${fmt(o.finalPrice)}</td>
      </tr>`
    ).join('');

    const receivedRows = receivedOrders.map((o: any) =>
      `<tr>
        <td style="padding:6px 8px">${methodLabel(o.paymentMethod)}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600">${fmt(o.amount)}</td>
        <td style="padding:6px 8px;color:#6b7280">${format(new Date(o.orderDate), 'MMM d')}</td>
      </tr>`
    ).join('');

    const faultRows = faults.map(f =>
      `<tr>
        <td style="padding:6px 8px;font-weight:600">${f.machineName}</td>
        <td style="padding:6px 8px;font-family:monospace;font-size:12px;color:#6b7280">${(f as any).serialNumber || '—'}</td>
        <td style="padding:6px 8px">${f.faultTypes?.join(', ') || ''}</td>
        <td style="padding:6px 8px">${f.description}</td>
      </tr>`
    ).join('');

    w.document.write(`
      <html><head><title>WashLab Report — ${report.branchName} ${report.date}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:system-ui,sans-serif;padding:40px;color:#111;max-width:900px;margin:0 auto}
        h1{font-size:22px;font-weight:700;margin:0 0 4px}
        .meta{color:#6b7280;font-size:13px;margin-bottom:28px;display:flex;gap:16px;flex-wrap:wrap}
        .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#f3f4f6;border:1px solid #e5e7eb}
        .total-block{text-align:center;padding:24px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin-bottom:24px}
        .total-label{font-size:15px;color:#6b7280;font-weight:500}
        .total-value{font-size:48px;font-weight:900;letter-spacing:-2px;margin:4px 0 0}
        .total-sub{font-size:12px;color:#6b7280;margin-top:4px}
        .section{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px}
        .section h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#374151;margin:0 0 12px}
        .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
        .stat{background:white;border:1px solid #e5e7eb;border-radius:6px;padding:12px}
        .stat-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
        .stat-value{font-size:20px;font-weight:700;margin-top:2px}
        .stat-sub{font-size:12px;color:#6b7280;margin-top:2px}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;padding:6px 8px;border-bottom:2px solid #e5e7eb}
        td{font-size:13px;border-bottom:1px solid #f3f4f6}
        tfoot td{border-top:2px solid #e5e7eb;font-weight:700;padding:8px}
        .pay-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
        .pay-row:last-child{border:none;font-weight:700;padding-top:8px;margin-top:4px;border-top:1px solid #e5e7eb}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        @media print{body{padding:20px}}
      </style></head><body>

      <h1>${report.branchName} — ${format(new Date(report.date), 'd MMMM yyyy')}</h1>
      <div class="meta">
        <span class="badge">Status: ${statusText}</span>
        <span>Attendants: ${(report.attendantsOnShift || []).join(', ') || '—'}</span>
        <span>Last updated: ${format(new Date(report._creationTime), 'h:mm a')}</span>
      </div>

      <div class="total-block">
        <div class="total-label">End of Day Total</div>
        <div class="total-value">GHS ${endOfDayTotal.toFixed(2)}</div>
        ${receivedTotal > 0 ? `<div class="total-sub">Includes GHS ${receivedTotal.toFixed(2)} outstanding recovered · Day payments: GHS ${dayRevenue.toFixed(2)}</div>` : ''}
      </div>

      <!-- Payment Breakdown (day only) -->
      <div class="section">
        <h2>Payment Breakdown (Today's Orders)</h2>
        <div class="pay-row"><span>Mobile Money</span><span>${fmt(mobileAmount)}</span></div>
        <div class="pay-row"><span>Card / Paystack</span><span>${fmt(cardAmount)}</span></div>
        <div class="pay-row"><span>Cash</span><span>${fmt(cashAmount)}</span></div>
        <div class="pay-row"><span>Day Subtotal</span><span>${fmt(dayRevenue)}</span></div>
        ${receivedTotal > 0 ? `<div class="pay-row"><span>+ Outstanding Recovered</span><span>${fmt(receivedTotal)}</span></div>` : ''}
        <div class="pay-row"><span>End of Day Total</span><span>${fmt(endOfDayTotal)}</span></div>
      </div>

      <!-- Wash Summary -->
      <div class="section">
        <h2>Wash Summary</h2>
        <div class="grid3">
          <div class="stat">
            <div class="stat-label">Wash Tokens</div>
            <div class="stat-value">${report.washerTokensUsed || 0}</div>
            <div class="stat-sub">GHS ${washerTokenRevenue.toFixed(2)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Dry Tokens</div>
            <div class="stat-value">${report.dryerTokensUsed || 0}</div>
            <div class="stat-sub">GHS ${dryerTokenRevenue.toFixed(2)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Soap Used</div>
            <div class="stat-value">${report.soapUnitsUsed || 0}</div>
          </div>
        </div>
      </div>

      ${outstandingOrders.length > 0 ? `
      <div class="section">
        <h2>Unpaid Orders — Total: ${fmt(outstandingTotal)}</h2>
        <table>
          <thead><tr><th>Order ID</th><th>Customer</th><th>Service</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${outstandingRows}</tbody>
          <tfoot><tr><td colspan="3">Total</td><td style="text-align:right">${fmt(outstandingTotal)}</td></tr></tfoot>
        </table>
      </div>` : ''}

      ${receivedOrders.length > 0 ? `
      <div class="section">
        <h2>Outstanding Payment Received — Total: ${fmt(receivedTotal)}</h2>
        <table>
          <thead><tr><th>Method</th><th style="text-align:right">Amount</th><th>Order Date</th></tr></thead>
          <tbody>${receivedRows}</tbody>
          <tfoot><tr><td>Total</td><td style="text-align:right">${fmt(receivedTotal)}</td><td></td></tr></tfoot>
        </table>
      </div>` : ''}

      ${voucherBreakdown.length > 0 ? `
      <div class="section">
        <h2>Discounts & Vouchers — Total: ${fmt(totalVoucherDiscount)}</h2>
        <table>
          <thead><tr><th>Voucher</th><th>Code</th><th>Uses</th><th style="text-align:right">Total Discount</th></tr></thead>
          <tbody>${voucherRows}</tbody>
          <tfoot><tr><td colspan="3">Total</td><td style="text-align:right">${fmt(totalVoucherDiscount)}</td></tr></tfoot>
        </table>
      </div>` : ''}

      ${faults.length > 0 ? `
      <div class="section">
        <h2>Technical Faults (${faults.length})</h2>
        <table>
          <thead><tr><th>Machine</th><th>Serial No.</th><th>Fault Types</th><th>Description</th></tr></thead>
          <tbody>${faultRows}</tbody>
        </table>
      </div>` : ''}

      <div class="two-col">
        ${report.notes ? `
        <div class="section">
          <h2>Manager Comments</h2>
          <p style="font-style:italic;font-size:13px;margin:0">"${report.notes}"</p>
        </div>` : ''}
        <div class="section">
          <h2>Attendants on Duty</h2>
          <p style="font-weight:600;font-size:13px;margin:0">${(report.attendantsOnShift || []).join(' | ') || '—'}</p>
        </div>
      </div>

      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
    toast.success('PDF ready');
  };

  return (
    <div className="space-y-5 pb-8 max-w-5xl mx-auto px-4">

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
              Status: {statusText}
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

      {/* Big total — includes recovered outstanding */}
      <div className="text-center py-4">
        <p className="text-lg text-muted-foreground font-medium">End Of Day Total</p>
        <p className="text-5xl sm:text-6xl font-black text-foreground tracking-tight mt-1">
          GHS {endOfDayTotal.toFixed(2)}
        </p>
        {receivedTotal > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Day payments <span className="font-semibold text-foreground">{fmt(dayRevenue)}</span>
            {' '}+{' '}outstanding recovered{' '}
            <span className="font-semibold text-green-600">{fmt(receivedTotal)}</span>
          </p>
        )}
      </div>

      {/* 4-col card row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Wash Summary — uses liveData token revenue for correct per-service pricing */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-foreground">Wash Summary</h2>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">Token Value</p>
          <p className="text-2xl font-bold text-foreground mb-0.5">
            {/* ── FIX: use liveData revenue (exact per-service price per order)
                instead of tokens × fallback wash_only price.
                This means "Big Wash" at GHS 50 shows GHS 50, not GHS 35. ── */}
            {liveData ? fmt(totalTokenRevenue) : fmt((report.washerTokensUsed || 0) * (report.washerPrice || 25) + (report.dryerTokensUsed || 0) * (report.dryerPrice || 25))}
          </p>
          <div className="w-full h-1 bg-blue-500 rounded-full mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Wash Tokens</p>
              <p className="text-xl font-bold text-foreground">{report.washerTokensUsed || 0}</p>
              {/* Per-machine revenue from liveData, fallback to old formula */}
              <p className="text-xs text-muted-foreground">
                {liveData ? fmt(washerTokenRevenue) : fmt((report.washerTokensUsed || 0) * (report.washerPrice || 25))}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dry Tokens</p>
              <p className="text-xl font-bold text-foreground">{report.dryerTokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">
                {liveData ? fmt(dryerTokenRevenue) : fmt((report.dryerTokensUsed || 0) * (report.dryerPrice || 25))}
              </p>
            </div>
          </div>
        </div>

        {/* Vouchers Used */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3">Vouchers Used</h2>
          {voucherBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vouchers used</p>
          ) : (
            <div className="space-y-2">
              {voucherBreakdown.map((v: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[120px]">{v.name}</span>
                  <span className="font-semibold text-foreground">
                    {v.discountType === 'loyalty' ? `${v.totalDiscount} pts` : fmt(v.totalDiscount)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-foreground">{fmt(totalVoucherDiscount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Breakdown — day's orders only, no outstanding */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-1">Payment Breakdown</h2>
          <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wide">Today's orders only</p>
          <div className="space-y-2.5">
            {[
              { label: 'Mobile Money', value: mobileAmount, icon: Smartphone, color: 'text-blue-500' },
              { label: 'Card', value: cardAmount, icon: CreditCard, color: 'text-indigo-500' },
              { label: 'Cash', value: cashAmount, icon: Banknote, color: 'text-green-500' },
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
            <span className="text-sm font-semibold text-foreground">Day Subtotal</span>
            <span className="text-sm font-bold text-foreground">{fmt(dayRevenue)}</span>
          </div>
        </div>

        {/* Outstanding Payment Received */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3">Outstanding Recovered</h2>
          {receivedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding payments received</p>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                <div className="grid grid-cols-3 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-1 border-b border-border">
                  <span>Method</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Order Date</span>
                </div>
                {receivedOrders.map((o: any, i: number) => (
                  <div key={i} className="grid grid-cols-3 gap-1 text-xs py-1 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      <span className="text-muted-foreground truncate">{methodLabel(o.paymentMethod)}</span>
                    </div>
                    <span className="text-right font-semibold text-foreground">{fmt(o.amount)}</span>
                    <span className="text-right text-muted-foreground">{format(new Date(o.orderDate), 'MMM d')}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-sm font-bold text-green-600">{fmt(receivedTotal)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unpaid Orders */}
      {outstandingOrders.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-4">Unpaid Orders</h2>
          <div className="sm:hidden space-y-2">
            {outstandingOrders.map((o: any, i: number) => (
              <div key={i} className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{o.customerName}</p>
                    <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{fmt(o.finalPrice)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{o.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">{serviceLabel(o.serviceType)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-semibold text-sm">
              <span>Total</span>
              <span>{fmt(outstandingTotal)}</span>
            </div>
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Order ID', 'Customer', 'Service', 'Amount'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outstandingOrders.map((o: any, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-sm font-mono text-muted-foreground">{o.orderNumber}</td>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-semibold text-foreground">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{serviceLabel(o.serviceType)}</td>
                    <td className="py-3 text-sm font-semibold text-foreground">{fmt(o.finalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={2} />
                  <td className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground uppercase">Total</td>
                  <td className="py-2.5 text-sm font-bold text-foreground">{fmt(outstandingTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-sm text-foreground mb-3">Entries</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a5 5 0 1 0 5 5A5 5 0 0 0 12 2zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm9 11v-1a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v1"/></svg>
              </div>
              <span className="text-sm text-muted-foreground">Soap Used</span>
            </div>
            <span className="text-sm font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{report.soapUnitsUsed || 0}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5 text-red-600" />
              </div>
              <span className="text-sm text-muted-foreground">Technical Faults</span>
            </div>
            <span className="text-sm font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-md">{report.technicalFaultCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Voucher breakdown table */}
      {voucherBreakdown.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Discounts & Vouchers Used
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              Total discounted: <span className="font-semibold text-foreground">{fmt(totalVoucherDiscount)}</span>
            </span>
          </h2>
          <div className="sm:hidden space-y-2">
            {voucherBreakdown.map((v: any, i: number) => {
              const badge = discountTypeBadge(v.discountType);
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{v.name}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{v.count}×</p>
                    <p className="text-xs text-muted-foreground">{fmt(v.totalDiscount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
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
            </table>
          </div>
        </div>
      )}

      {/* Technical Faults */}
      {faults.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-destructive" />
            Technical Faults
          </h2>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2 pr-4">Machine</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2 pr-4">Serial No.</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2 pr-4">Fault Types</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {faults.map((f, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-sm font-semibold text-foreground">{f.machineName || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs font-mono text-muted-foreground">{(f as any).serialNumber || '—'}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {f.faultTypes?.length > 0
                          ? f.faultTypes.map((ft: string) => (
                              <span key={ft} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full">{ft}</span>
                            ))
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </div>
                    </td>
                    <td className="py-2.5 text-sm text-muted-foreground">{f.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-2">
            {faults.map((f, i) => (
              <div key={i} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-destructive">{f.machineName || '—'}</p>
                  {(f as any).serialNumber && (
                    <span className="text-[10px] font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                      SN: {(f as any).serialNumber}
                    </span>
                  )}
                </div>
                {f.faultTypes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {f.faultTypes.map((ft: string) => (
                      <span key={ft} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{ft}</span>
                    ))}
                  </div>
                )}
                {f.description && <p className="text-sm text-foreground mt-1">{f.description}</p>}
              </div>
            ))}
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
            <p className="text-sm text-foreground italic leading-relaxed">&ldquo;{report.notes}&rdquo;</p>
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