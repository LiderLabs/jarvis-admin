'use client';

import { useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  ChevronRight, Download, AlertTriangle, Wrench,
  Smartphone, CreditCard, Banknote, CheckCircle2,
  MessageSquare, Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportDetailProps {
  reportId: string;
  onBack?: () => void;
}

function fmt(n: number) {
  return `GHS ${n.toFixed(2)}`;
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
  const totalPaymentRecorded = (report.cashAmount || 0) + (report.mobileMoneylAmount || 0) + (report.cardAmount || 0) + (report.paystackAmount || 0);
  const hasDiscrepancy = Math.abs(totalRevenue - (report.totalRevenue || 0)) > 0.01;

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Allow popups');
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
        @media print{body{padding:20px}}
      </style></head><body>
      <nav style="font-size:12px;color:#6b7280;margin-bottom:16px">Reports › ${report.branchName}</nav>
      <h1>${report.branchName} - ${format(new Date(report.date), 'd MMM yyyy')}</h1>
      <div class="meta">
        Status: ${report.status === 'submitted' ? 'Closed' : 'Open'} &nbsp;|&nbsp; 
        Attendants: ${(report.attendantsOnShift || []).join(', ')}
      </div>
      
      <div class="section">
        <h2>Sales Summary</h2>
        <div style="font-size:28px;font-weight:800;margin-bottom:8px">${fmt(totalRevenue)}</div>
        <div class="grid">
          <div class="stat"><div class="stat-label">Wash Tokens</div><div class="stat-value">GHS ${((report.washerTokensUsed || 0) * 25).toFixed(2)}</div></div>
          <div class="stat"><div class="stat-label">Dry Tokens</div><div class="stat-value">GHS ${((report.dryerTokensUsed || 0) * 25).toFixed(2)}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>Payment Breakdown</h2>
        <div class="grid">
          <div class="stat"><div class="stat-label">Mobile Money</div><div class="stat-value">${fmt(report.mobileMoneylAmount || 0)}</div></div>
          <div class="stat"><div class="stat-label">Card</div><div class="stat-value">${fmt(report.cardAmount || 0)}</div></div>
          <div class="stat"><div class="stat-label">Cash</div><div class="stat-value">${fmt(report.cashAmount || 0)}</div></div>
        </div>
        <div style="margin-top:12px;font-weight:600">Total Recorded: ${fmt(totalPaymentRecorded)}</div>
      </div>

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

  // Parse faults from notes string "[MachineID] description"
  const faultLines = (report.technicalFaultNotes || '').split('\n').filter(Boolean) as string[];
  const parsedFaults = faultLines.map(line => {
    const match = line.match(/^\[(.+?)\]\s*(.+)$/);
    return match ? { machineId: match[1], description: match[2] } : { machineId: '—', description: line };
  });

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto px-4">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
            <button onClick={onBack} className="hover:text-foreground transition-colors">Reports</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{report.branchName}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {report.branchName} - {format(new Date(report.date), 'd MMM yyyy')}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge
              className={`text-xs ${report.status === 'submitted'
                ? 'bg-gray-100 text-gray-600 border-gray-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'}`}
            >
              Status: {report.status === 'submitted' ? 'Closed' : 'Open'}
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
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Wash Token</p>
              <p className="text-xl font-bold text-foreground">{report.washerTokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">GHS {((report.washerTokensUsed || 0) * 25).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dry Tokens</p>
              <p className="text-xl font-bold text-foreground">{report.dryerTokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">GHS {((report.dryerTokensUsed || 0) * 25).toFixed(2)}</p>
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
            {(report.freeWashCount || 0) > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span className="text-sm text-muted-foreground">Free Washes</span>
                <span className="text-sm font-bold">{report.freeWashCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Faults Table */}
      {parsedFaults.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-destructive" />
            Technical Faults
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2 pr-4">Machine ID</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold py-2">Fault Description</th>
              </tr>
            </thead>
            <tbody>
              {parsedFaults.map((f: { machineId: string; description: string }, i: number) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 text-sm font-semibold text-foreground">{f.machineId}</td>
                  <td className="py-2.5 text-sm text-muted-foreground">{f.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
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