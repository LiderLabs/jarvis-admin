'use client'

import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@jordan6699/washlab-backend/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Building2,
  History,
  AlertCircle,
  Search,
  Download,
  ArrowLeft,
} from 'lucide-react'
import { format, subDays } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnsettledOrder {
  _id: string
  orderNumber: string
  customerName: string | null
  customerPhoneNumber: string | null
  finalPrice: number
  serviceType: string | null
  createdAt: number
}

interface BranchSummary {
  branchId: string
  branchName: string
  totalCollected: number
  totalCollectedAllTime: number
  totalSent: number
  totalDeducted: number
  outstanding: number
  unsettledOrders: UnsettledOrder[]
  inProgressRecons: InProgressRecon[]
  allDeductions: Deduction[]
  lastActivityTs: number | null
}

interface InProgressRecon {
  _id: string
  date: string
  amountSent: number
  senderMomoNumber: string
  orderCount: number
  status: 'pending' | 'processing'
  createdAt: number
  paystackReference?: string
}

interface Reconciliation {
  _id: string
  branchId: string
  date: string
  amountSent: number
  senderMomoNumber: string
  orderCount: number
  totalCashOrders: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number
  completedAt?: number
  paystackReference?: string
}

interface Deduction {
  _id: string
  branchId?: string
  amount: number
  reason: string
  createdAt: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    pending:    { label: 'Pending',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    failed:     { label: 'Failed',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function fmt(n: number) { return `₵${Math.abs(n).toFixed(2)}` }
function fmtDate(ts: number) { return format(new Date(ts), 'd MMM yyyy, h:mm a') }

function formatPeriodLabel(from: Date, to: Date): string {
  const sameDay =
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth() &&
    from.getDate() === to.getDate()
  if (sameDay) return format(from, 'd MMM yyyy')
  return `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`
}

// ─── Excel export ─────────────────────────────────────────────────────────────

async function exportBranchesExcel(
  summaries: BranchSummary[],
  allRecons: Reconciliation[],
  allDeductions: Deduction[],
  sinceTs: number,
  untilTs: number,
  filename: string
) {
  const XLSX = (await import('xlsx'))
  const wb = XLSX.utils.book_new()

  for (const summary of summaries) {
    const sheetName = summary.branchName.replace(/[\/:*?[\]]/g, '_').slice(0, 31)

    const recons = allRecons
      .filter(r => String(r.branchId) === String(summary.branchId))
      .filter(r => r.createdAt >= sinceTs && r.createdAt <= untilTs)
      .sort((a, z) => z.createdAt - a.createdAt)

    const deductions = allDeductions
      .filter(d => String((d as any).branchId) === String(summary.branchId))
      .filter(d => d.createdAt >= sinceTs && d.createdAt <= untilTs)
      .sort((a, z) => z.createdAt - a.createdAt)

    const rows: any[][] = [
      [`${summary.branchName} — Cash Reconciliation`],
      ['Total Collected', `GHS ${summary.totalCollected.toFixed(2)}`, 'Total Sent', `GHS ${summary.totalSent.toFixed(2)}`, 'Cash Used', `GHS ${summary.totalDeducted.toFixed(2)}`, 'Outstanding', `GHS ${summary.outstanding.toFixed(2)}`],
      [],
      ['Date', 'Type', 'Detail', 'MoMo Number', 'Amount (GHS)', 'Status'],
    ]

    for (const r of recons) {
      rows.push([
        fmtDate(r.createdAt),
        'Sent',
        `${r.orderCount} cash order${r.orderCount !== 1 ? 's' : ''}`,
        r.senderMomoNumber,
        Math.abs(r.amountSent),
        r.status.charAt(0).toUpperCase() + r.status.slice(1),
      ])
    }

    for (const d of deductions) {
      rows.push([fmtDate(d.createdAt), 'Cash Used', d.reason, '—', Math.abs(d.amount), 'Applied'])
    }

    if (recons.length === 0 && deductions.length === 0) {
      rows.push(['No transactions in this period.'])
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.xls$/, '.xlsx')
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Branch History Drawer ────────────────────────────────────────────────────

interface BranchHistoryDrawerProps {
  summary: BranchSummary
  allRecons: Reconciliation[]
  allDeductions: Deduction[]
  onClose: () => void
}

function BranchHistoryDrawer({ summary, allRecons, allDeductions, onClose }: BranchHistoryDrawerProps) {
  // Drawer has its own independent date state — defaults to last 30 days
  const [from, setFrom] = useState<Date>(subDays(new Date(), 30))
  const [to, setTo]     = useState<Date>(new Date())

  const fromTs = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).getTime()
  const toTs   = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime()

  const branchRecons = allRecons
    .filter(r => String(r.branchId) === String(summary.branchId))
    .filter(r => r.createdAt >= fromTs && r.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const branchDeductions = allDeductions
    .filter(d => String((d as any).branchId) === String(summary.branchId))
    .filter(d => d.createdAt >= fromTs && d.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const historySentTotal = branchRecons
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + r.amountSent, 0)

  const historyCashUsedTotal = branchDeductions.reduce((s, d) => s + d.amount, 0)

  // All-time outstanding — never filtered by date, always shows true balance
  const allTimeOutstanding = summary.unsettledOrders.reduce((s, o) => s + o.finalPrice, 0)
  const allTimeOrderCount  = summary.unsettledOrders.length

  // Period outstanding — only orders created within the selected date range
  const periodUnsettledOrders = summary.unsettledOrders.filter(
    o => o.createdAt >= fromTs && o.createdAt <= toTs
  )
  const periodOutstanding = periodUnsettledOrders.reduce((s, o) => s + o.finalPrice, 0)

  type HistoryEvent =
    | { type: 'sent'; data: Reconciliation }
    | { type: 'deduction'; data: Deduction }

  const allEvents: HistoryEvent[] = [
    ...branchRecons.map(r => ({ type: 'sent' as const, data: r })),
    ...branchDeductions.map(d => ({ type: 'deduction' as const, data: d })),
  ].sort((a, b) => b.data.createdAt - a.data.createdAt)

  async function handleExport() {
    await exportBranchesExcel(
      [summary],
      allRecons,
      allDeductions,
      fromTs,
      toTs,
      `reconciliation-${summary.branchName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background px-4 sm:px-6 pt-4 pb-4 space-y-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">{summary.branchName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Transaction history</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <DateRangePicker
                from={from}
                to={to}
                onChange={(f, t) => { setFrom(f); setTo(t) }}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 w-full sm:w-auto" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ── All-time outstanding banner — always visible, ignores date filter ── */}
        {allTimeOutstanding > 0 ? (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  All-Time Outstanding Balance
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
                  {allTimeOrderCount} unsettled cash order{allTimeOrderCount !== 1 ? 's' : ''} 
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 shrink-0">
              {fmt(allTimeOutstanding)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Fully Settled
              </p>
              <p className="text-xs text-green-600/80 dark:text-green-400/70 mt-0.5">
                No outstanding cash orders for this branch
              </p>
            </div>
          </div>
        )}

        {/* ── Period summary cards ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {formatPeriodLabel(from, to)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Sent</p>
              <p className="text-2xl font-bold text-green-600">{fmt(historySentTotal)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Cash Used</p>
              <p className="text-2xl font-bold text-orange-600">{fmt(historyCashUsedTotal)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Transactions</p>
              <p className="text-2xl font-bold text-foreground">{allEvents.length}</p>
            </Card>
            <Card className={`p-4 ${
              periodOutstanding > 0
                ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                : 'border-green-200 bg-green-50 dark:bg-green-950/20'
            }`}>
              <p className="text-xs font-medium text-muted-foreground mb-1">Outstanding (period)</p>
              <p className={`text-2xl font-bold ${periodOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(periodOutstanding)}
              </p>
            </Card>
          </div>
        </div>

        {/* ── Transaction history table ── */}
        {allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <History className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No transactions in this period.</p>
            <p className="text-xs mt-1 opacity-70">Try expanding the date range above.</p>
          </div>
        ) : (
          <Card className="overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Date</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Type</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Detail</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground text-xs">Amount</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.map((event, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(event.data.createdAt)}
                      </td>
                      {event.type === 'sent' ? (
                        <>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                              Sent
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {(event.data as Reconciliation).orderCount} order{(event.data as Reconciliation).orderCount !== 1 ? 's' : ''}&nbsp;
                            <span className="font-mono">{(event.data as Reconciliation).senderMomoNumber}</span>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-green-600 text-sm">
                            {fmt((event.data as Reconciliation).amountSent)}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={(event.data as Reconciliation).status} />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full">
                              Cash Used
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {(event.data as Deduction).reason}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-orange-600 text-sm">
                            {fmt((event.data as Deduction).amount)}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                              Applied
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCashReconciliationPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'settled'>('all')
 const [from, setFrom] = useState<Date>(new Date('2020-01-01'))
const [to, setTo]     = useState<Date>(new Date())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [historyBranchId, setHistoryBranchId] = useState<string | null>(null)

  const sinceTs = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).getTime()
  const untilTs = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime()

  const summaries: BranchSummary[] | undefined = useQuery(
    (api as any).cashReconciliation.getBranchCashSummariesForAdmin,
    { sinceTs, untilTs }
  )
  const allRecons: Reconciliation[] | undefined = useQuery(
    (api as any).cashReconciliation.getAllReconciliationsForAdmin
  )
  const allDeductions: Deduction[] | undefined = useQuery(
    (api as any).cashReconciliation.getAllDeductionsForAdmin
  )

  const filteredSummaries = useMemo(() => {
    if (!summaries) return []
    return summaries
      .map(s => {
  const periodOrders = s.unsettledOrders.filter(
    o => o.createdAt >= sinceTs && o.createdAt <= untilTs
  )
  return { ...s, unsettledOrders: periodOrders, outstanding: s.outstanding }
})
      .filter(s => s.outstanding > 0)
  }, [summaries, sinceTs, untilTs])

  const filtered = useMemo(() => {
    return filteredSummaries
      .filter(s => {
        if (search && !s.branchName.toLowerCase().includes(search.toLowerCase())) return false
        if (filter === 'outstanding') return s.outstanding > 0
        if (filter === 'settled') return s.outstanding === 0
        return true
      })
      .sort((a, b) => b.outstanding - a.outstanding)
  }, [filteredSummaries, search, filter])

  const totals = useMemo(() => {
    if (!summaries) return null
    return {
      collected: summaries.reduce((s, b) => s + b.totalCollected, 0),
      outstanding: filteredSummaries.reduce((s, b) => s + b.outstanding, 0),
    }
  }, [summaries, filteredSummaries])

  // Resolve history branch from live data — fall back to full summaries so settled branches still open
  const historyBranch = useMemo(() => {
    if (!historyBranchId || !summaries) return null
    return (
      filteredSummaries.find(s => s.branchId === historyBranchId) ??
      summaries.find(s => s.branchId === historyBranchId) ??
      null
    )
  }, [historyBranchId, filteredSummaries, summaries])

  if (historyBranch) {
    return (
      <BranchHistoryDrawer
        summary={historyBranch}
        allRecons={allRecons ?? []}
        allDeductions={allDeductions ?? []}
        onClose={() => setHistoryBranchId(null)}
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cash Reconciliation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Outstanding cash per branch for the selected period</p>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Period:</span>
        <DateRangePicker
          from={from}
          to={to}
          onChange={(f, t) => { setFrom(f); setTo(t) }}
        />
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Collected</p>
            <p className="text-2xl font-bold">{fmt(totals.collected)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPeriodLabel(from, to)}</p>
          </Card>
          <Card className={`p-4 ${totals.outstanding > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-green-200 bg-green-50 dark:bg-green-950/20'}`}>
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Outstanding</p>
            <p className={`text-2xl font-bold ${totals.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {fmt(totals.outstanding)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatPeriodLabel(from, to)}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search branches…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            <SelectItem value="outstanding">Outstanding only</SelectItem>
            <SelectItem value="settled">Settled only</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 shrink-0"
          onClick={async () => {
            await exportBranchesExcel(
              filtered,
              allRecons ?? [],
              allDeductions ?? [],
              sinceTs,
              untilTs,
              `cash-reconciliation-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
            )
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      {/* Branch list */}
      {!summaries ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">No branches found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(branch => {
            const isOpen = expanded === branch.branchId
            return (
              <Card key={branch.branchId} className="overflow-hidden">
                <div
                  className="w-full text-left px-4 sm:px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : branch.branchId)}
                >
                  <div className="shrink-0 text-muted-foreground">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{branch.branchName}</span>
                      {branch.outstanding > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          {fmt(branch.outstanding)} outstanding
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Settled
                        </span>
                      )}
                      {branch.inProgressRecons.length > 0 && (
                        <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {branch.inProgressRecons.length} in progress
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs h-8"
                    onClick={e => { e.stopPropagation(); setHistoryBranchId(branch.branchId) }}
                  >
                    <History className="w-3.5 h-3.5" />
                    History
                  </Button>
                </div>

                {isOpen && (
                  <div className="border-t border-border px-4 sm:px-5 py-4 space-y-4 bg-muted/10">
                    {branch.unsettledOrders.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Unsettled Cash Orders
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm min-w-[480px]">
                            <thead>
                              <tr className="bg-muted/50 border-b border-border">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Order</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Customer</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Service</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Amount</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {branch.unsettledOrders.map(o => (
                                <tr key={o._id} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{o.orderNumber}</td>
                                  <td className="px-3 py-2">
                                    <p className="text-xs font-medium">{o.customerName || '—'}</p>
                                    <p className="text-xs text-muted-foreground">{o.customerPhoneNumber || ''}</p>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">{o.serviceType || '—'}</td>
                                  <td className="px-3 py-2 text-right text-xs font-bold">{fmt(o.finalPrice)}</td>
                                  <td className="px-3 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-muted/40 border-t border-border">
                                <td colSpan={3} className="px-3 py-2 text-xs font-semibold">Total ({branch.unsettledOrders.length} orders)</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-red-600">{fmt(branch.outstanding)}</td>
                                <td />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {branch.inProgressRecons.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">In Progress</p>
                        <div className="space-y-1.5">
                          {branch.inProgressRecons.map(r => (
                            <div key={r._id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/10 border border-blue-200">
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">{r.senderMomoNumber}</p>
                                <p className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-blue-600">{fmt(r.amountSent)}</p>
                                <StatusBadge status={r.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {branch.unsettledOrders.length === 0 && branch.inProgressRecons.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 py-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        All cash has been reconciled for this branch.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}