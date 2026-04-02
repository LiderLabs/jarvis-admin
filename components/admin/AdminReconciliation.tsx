'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { Banknote, CheckCircle, AlertTriangle, Download, Phone, ChevronDown, ChevronUp } from 'lucide-react';

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const fmt = (n: number) => 'GHS ' + n.toFixed(2);
const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'All time', days: 999 },
];

const statusCls: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
};

const AdminReconciliation = () => {
  const [datePreset, setDatePreset] = useState(7);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];
  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];
  const branchMap = Object.fromEntries(branches.map((b: any) => [b._id, b]));

  const reconciliations = useQuery((api as any).cashReconciliation.getAllForAdmin, { limit: 500 }) as any[] | undefined;
  const isLoading = reconciliations === undefined;

  const cutoff = datePreset === 999 ? null : subDays(new Date(), datePreset).getTime();

  const branchSummaries = useMemo(() => {
    const map: Record<string, any> = {};
    (reconciliations || []).forEach(r => {
      const rDate = new Date(r.date).getTime();
      if (cutoff && rDate < cutoff) return;
      if (selectedBranch !== 'all' && r.branchId !== selectedBranch) return;
      if (!map[r.branchId]) {
        const branch = branchMap[r.branchId];
        map[r.branchId] = {
          branchId: r.branchId,
          branchName: r.branchName,
          phone: branch?.phoneNumber || null,
          totalCollected: 0,
          totalSent: 0,
          entries: [],
        };
      }
      map[r.branchId].totalCollected += r.totalCashOrders || 0;
      if (r.status === 'completed') map[r.branchId].totalSent += r.amountSent || 0;
      map[r.branchId].entries.push(r);
    });
    return Object.values(map)
      .map(b => ({ ...b, outstanding: Math.max(0, b.totalCollected - b.totalSent) }))
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [reconciliations, cutoff, selectedBranch, JSON.stringify(branchMap)]);

  const totalCollected = branchSummaries.reduce((s, b) => s + b.totalCollected, 0);
  const totalSent = branchSummaries.reduce((s, b) => s + b.totalSent, 0);
  const totalOutstanding = branchSummaries.reduce((s, b) => s + b.outstanding, 0);
  const branchesWithIssues = branchSummaries.filter(b => b.outstanding > 0).length;

  const toggleBranch = (id: string) => setExpandedBranches(p => ({ ...p, [id]: !p[id] }));

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['Date', 'Branch', 'Cash Collected (GHS)', 'Amount Sent (GHS)', 'Orders', 'Status'],
      ...branchSummaries.flatMap(b =>
        b.entries.map((r: any) => [r.date, b.branchName, (r.totalCashOrders || 0).toFixed(2), (r.amountSent || 0).toFixed(2), r.orderCount || 0, r.status])
      ),
    ];
    downloadCSV(rows, 'reconciliations-' + format(new Date(), 'yyyy-MM-dd') + '.csv');
  };

  return (
    <div className='space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Cash Reconciliation</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>Daily cash collected per branch vs total sent to admin</p>
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          <div className='flex bg-muted rounded-lg p-0.5 gap-0.5'>
            {DATE_PRESETS.map(p => (
              <button key={p.days} onClick={() => setDatePreset(p.days)}
                className={'px-3 py-1.5 text-xs font-medium rounded-md transition-all ' + (datePreset === p.days ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {p.label}
              </button>
            ))}
          </div>
          <Button variant='outline' size='sm' onClick={exportCSV} className='gap-1.5'>
            <Download className='w-3.5 h-3.5' /> Export
          </Button>
        </div>
      </div>

      <div className='flex items-center gap-3'>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className='w-52'><SelectValue placeholder='All Branches' /></SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Branches</SelectItem>
            {branches.map((b: any) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='bg-card border border-border rounded-xl p-4'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>Total Cash Collected</p>
          <p className='text-xl font-bold text-foreground'>{fmt(totalCollected)}</p>
          <p className='text-xs text-muted-foreground mt-0.5'>Across all branches & days</p>
        </div>
        <div className='bg-card border border-border rounded-xl p-4'>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>Total Sent</p>
          <p className='text-xl font-bold text-green-600'>{fmt(totalSent)}</p>
          <p className='text-xs text-muted-foreground mt-0.5'>Confirmed MoMo submissions</p>
        </div>
        <div className={'rounded-xl p-4 border ' + (totalOutstanding > 0 ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800')}>
          <div className='flex items-center gap-1.5 mb-1'>
            {totalOutstanding > 0 ? <AlertTriangle className='w-3.5 h-3.5 text-red-500' /> : <CheckCircle className='w-3.5 h-3.5 text-green-600' />}
            <p className='text-xs text-muted-foreground uppercase tracking-wide'>Still Outstanding</p>
          </div>
          <p className={'text-xl font-bold ' + (totalOutstanding > 0 ? 'text-red-600' : 'text-green-600')}>{fmt(totalOutstanding)}</p>
          <p className='text-xs text-muted-foreground mt-0.5'>{totalOutstanding > 0 ? 'Collected but not yet sent' : 'All cash accounted for'}</p>
        </div>
        <div className={'rounded-xl p-4 border ' + (branchesWithIssues > 0 ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20' : 'bg-card border-border')}>
          <p className='text-xs text-muted-foreground uppercase tracking-wide mb-1'>Branches Pending</p>
          <p className={'text-xl font-bold ' + (branchesWithIssues > 0 ? 'text-orange-600' : 'text-foreground')}>{branchesWithIssues} / {branchSummaries.length}</p>
          <p className='text-xs text-muted-foreground mt-0.5'>Have unsent cash</p>
        </div>
      </div>

      {isLoading ? (
        <div className='flex justify-center py-16'><div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' /></div>
      ) : branchSummaries.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border border-border rounded-xl'>
          <Banknote className='w-10 h-10 mb-3 opacity-20' />
          <p className='text-sm'>No reconciliations in this period</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {branchSummaries.map(b => {
            const hasOutstanding = b.outstanding > 0;
            const isExpanded = expandedBranches[b.branchId];
            return (
              <div key={b.branchId} className={'rounded-xl border overflow-hidden ' + (hasOutstanding ? 'border-red-200 dark:border-red-800' : 'border-border')}>

                {/* Branch header row */}
                <div
                  className={'flex items-center gap-3 p-4 cursor-pointer transition-colors ' + (hasOutstanding ? 'bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50' : 'bg-card hover:bg-muted/30')}
                  onClick={() => toggleBranch(b.branchId)}
                >
                  <div className={'w-2.5 h-2.5 rounded-full flex-shrink-0 ' + (hasOutstanding ? 'bg-red-500' : 'bg-green-500')} />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-semibold text-sm text-foreground'>{b.branchName}</span>
                      {hasOutstanding
                        ? <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600'>{fmt(b.outstanding)} outstanding</span>
                        : <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600'>✓ All sent</span>}
                    </div>
                  </div>
                  <div className='hidden sm:flex items-center gap-5 text-right flex-shrink-0'>
                    <div>
                      <p className='text-[10px] text-muted-foreground uppercase'>Collected</p>
                      <p className='text-sm font-bold text-foreground'>{fmt(b.totalCollected)}</p>
                    </div>
                    <div>
                      <p className='text-[10px] text-muted-foreground uppercase'>Sent</p>
                      <p className='text-sm font-bold text-green-600'>{fmt(b.totalSent)}</p>
                    </div>
                    {hasOutstanding && (
                      <div>
                        <p className='text-[10px] text-muted-foreground uppercase'>Outstanding</p>
                        <p className='text-sm font-bold text-red-600'>{fmt(b.outstanding)}</p>
                      </div>
                    )}
                  </div>
                  {b.phone && (
                    <a href={'tel:' + b.phone} onClick={e => e.stopPropagation()}
                      className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ' + (hasOutstanding ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                      <Phone className='w-3 h-3' /> Call
                    </a>
                  )}
                  {isExpanded ? <ChevronUp className='w-4 h-4 text-muted-foreground flex-shrink-0' /> : <ChevronDown className='w-4 h-4 text-muted-foreground flex-shrink-0' />}
                </div>

                {/* Expanded: daily cards + summary */}
                {isExpanded && (
                  <div className='border-t border-border p-4 space-y-2'>
                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3'>Daily Cash Collected</p>
                    {b.entries
                      .sort((a: any, x: any) => x.date.localeCompare(a.date))
                      .map((r: any) => (
                        <div key={r._id} className='flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border text-sm'>
                          <div>
                            <p className='font-semibold text-foreground'>{r.date}</p>
                            <p className='text-xs text-muted-foreground'>{r.orderCount || 0} cash order{r.orderCount !== 1 ? 's' : ''}</p>
                          </div>
                          <div className='text-right'>
                            <p className='font-bold text-foreground'>{fmt(r.totalCashOrders || 0)}</p>
                            <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (statusCls[r.status] || 'bg-muted text-muted-foreground')}>
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ))}

                    {/* Totals footer */}
                    <div className='mt-3 pt-3 border-t border-border space-y-1.5'>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Total Collected (all days above)</span>
                        <span className='font-bold text-foreground'>{fmt(b.totalCollected)}</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Total Sent to Admin</span>
                        <span className='font-bold text-green-600'>{fmt(b.totalSent)}</span>
                      </div>
                      <div className='flex justify-between text-sm pt-1.5 border-t border-border'>
                        <span className='font-semibold text-foreground'>Outstanding</span>
                        <span className={'font-bold ' + (b.outstanding > 0 ? 'text-red-600' : 'text-green-600')}>
                          {b.outstanding > 0 ? fmt(b.outstanding) : '✓ Fully settled'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReconciliation;