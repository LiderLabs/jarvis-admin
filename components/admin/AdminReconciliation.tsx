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
  Banknote,
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

// ─── Excel export ─────────────────────────────────────────────────────────────

function exportBranchesExcel(
  summaries: BranchSummary[],
  allRecons: Reconciliation[],
  filename: string
) {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>`
  for (const s of summaries) {
    const safeName = s.branchName.replace(/[<>:"/\\|?*[\]]/g, '_').slice(0, 31)
    html += `<x:ExcelWorksheet><x:Name>${safeName}</x:Name><x:WorksheetOptions><x:Selected/></x:WorksheetOptions></x:ExcelWorksheet>`
  }
  html += `</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`
  for (const summary of summaries) {
    const safeName = summary.branchName.replace(/[<>:"/\\|?*[\]]/g, '_').slice(0, 31)
    const recons = allRecons
      .filter(r => String(r.branchId) === String(summary.branchId))
      .sort((a, z) => z.createdAt - a.createdAt)
    html += `<table x:Name="${safeName}">
    <tr><td colspan="6" style="font-size:14px;font-weight:bold;background:#e8f0fe;padding:8px">${summary.branchName} — Cash Reconciliation</td></tr>
    <tr>
      <td style="font-weight:bold">Total Collected</td><td>₵${summary.totalCollectedAllTime.toFixed(2)}</td>
      <td style="font-weight:bold">Total Sent</td><td>₵${summary.totalSent.toFixed(2)}</td>
      <td style="font-weight:bold">Cash Used</td><td>₵${summary.totalDeducted.toFixed(2)}</td>
      <td style="font-weight:bold">Outstanding</td><td>₵${summary.outstanding.toFixed(2)}</td>
    </tr>
    <tr></tr>
    <tr style="background:#dbeafe;font-weight:bold">
      <td>Date</td><td>Type</td><td>Detail</td><td>MoMo Number</td><td>Amount (₵)</td><td>Status</td>
    </tr>`
    for (const r of recons) {
      html += `<tr>
        <td>${fmtDate(r.createdAt)}</td><td>Sent</td>
        <td>${r.orderCount} cash order${r.orderCount !== 1 ? 's' : ''}</td>
        <td>${r.senderMomoNumber}</td>
        <td>${Math.abs(r.amountSent).toFixed(2)}</td>
        <td>${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</td>
      </tr>`
    }
    for (const d of summary.allDeductions) {
      html += `<tr>
        <td>${fmtDate(d.createdAt)}</td><td>Cash Used</td>
        <td>${d.reason}</td><td>—</td>
        <td>${Math.abs(d.amount).toFixed(2)}</td><td>Applied</td>
      </tr>`
    }
    html += `</table>`
  }
  html += `</body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Branch History Drawer ────────────────────────────────────────────────────

interface BranchHistoryDrawerProps {
  summary: BranchSummary
  allRecons: Reconciliation[]
  allDeductions: Deduction[]
  initialFrom: Date
  initialTo: Date
  onClose: () => void
}

function BranchHistoryDrawer({ summary, allRecons, allDeductions, initialFrom, initialTo, onClose }: BranchHistoryDrawerProps) {
  const [from, setFrom] = useState<Date>(initialFrom)
  const [to, setTo]     = useState<Date>(initialTo)

  const fromTs = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toTs   = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) + 24 * 60 * 60 * 1000 - 1

  // ALL recons for this branch (not just completed) — so pending/processing show too
  const branchRecons = allRecons
    .filter(r => String(r.branchId) === String(summary.branchId))
    .filter(r => r.createdAt >= fromTs && r.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const branchDeductions = allDeductions
    .filter(d => String((d as any).branchId) === String(summary.branchId))
    .filter(d => d.createdAt >= fromTs && d.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  // Sent total = only completed recons in the period
  const historySentTotal = branchRecons
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + r.amountSent, 0)

  // Cash used total in the period
  const historyCashUsedTotal = branchDeductions.reduce((s, d) => s + d.amount, 0)

  type HistoryEvent =
    | { type: 'sent'; data: Reconciliation }
    | { type: 'deduction'; data: Deduction }

  const allEvents: HistoryEvent[] = [
    ...branchRecons.map(r => ({ type: 'sent' as const, data: r })),
    ...branchDeductions.map(d => ({ type: 'deduction' as const, data: d })),
  ].sort((a, b) => b.data.createdAt - a.data.createdAt)

  function handleExport() {
    exportBranchesExcel(
      [summary],
      allRecons,
      `reconciliation-${summary.branchName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.xls`
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
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Sent </p>
            <p className="text-2xl font-bold text-green-600">{fmt(historySentTotal)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Cash Used </p>
            <p className="text-2xl font-bold text-orange-600">{fmt(historyCashUsedTotal)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Transactions</p>
            <p className="text-2xl font-bold text-foreground">{allEvents.length}</p>
          </Card>
          <Card className={`p-4 ${
            summary.outstanding > 0
              ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
              : 'border-green-200 bg-green-50 dark:bg-green-950/20'
          }`}>
            <p className="text-xs font-medium text-muted-foreground mb-1">Outstanding </p>
            <p className={`text-2xl font-bold ${summary.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {fmt(summary.outstanding)}
            </p>
          </Card>
        </div>

        {allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <History className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No transactions in this period.</p>
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
  const [from, setFrom] = useState<Date>(subDays(new Date(), 30))
  const [to, setTo]     = useState<Date>(new Date())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [historyBranch, setHistoryBranch] = useState<BranchSummary | null>(null)

  const sinceTs = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const untilTs = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) + 24 * 60 * 60 * 1000 - 1

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

  const filtered = useMemo(() => {
    if (!summaries) return []
    return summaries
      .filter(s => {
        if (search && !s.branchName.toLowerCase().includes(search.toLowerCase())) return false
        if (filter === 'outstanding') return s.outstanding > 0
        if (filter === 'settled') return s.outstanding === 0
        return true
      })
      .sort((a, b) => b.outstanding - a.outstanding)
  }, [summaries, search, filter])

  const totals = useMemo(() => {
    if (!summaries) return null
    return {
      collected: summaries.reduce((s, b) => s + b.totalCollectedAllTime, 0),
      sent: summaries.reduce((s, b) => s + b.totalSent, 0),
      deducted: summaries.reduce((s, b) => s + b.totalDeducted, 0),
      outstanding: summaries.reduce((s, b) => s + b.outstanding, 0),
    }
  }, [summaries])

  if (historyBranch) {
    return (
      <BranchHistoryDrawer
        summary={historyBranch}
        allRecons={allRecons ?? []}
        allDeductions={allDeductions ?? []}
        initialFrom={from}
        initialTo={to}
        onClose={() => setHistoryBranch(null)}
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cash Reconciliation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All-time outstanding per branch</p>
      </div>

      {/* Totals — only the 2 key numbers: Collected and Outstanding */}
    {/* Date picker for period */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Period:</span>
        <DateRangePicker
          from={from}
          to={to}
          onChange={(f, t) => { setFrom(f); setTo(t) }}
        />
        <span className="text-xs text-muted-foreground">
          {format(from, 'd MMM yyyy')} – {format(to, 'd MMM yyyy')}
        </span>
      </div>

      {/* Totals — only the 2 key numbers: Collected and Outstanding */}
      {totals && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Collected</p>
            <p className="text-2xl font-bold">{fmt(totals.collected)}</p>
            <p className="text-xs text-muted-foreground mt-1">{format(from, 'd MMM yyyy')} – {format(to, 'd MMM yyyy')}</p>
          </Card>
         <Card className={`p-4 ${totals.outstanding > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-green-200 bg-green-50 dark:bg-green-950/20'}`}>
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Outstanding</p>
            <p className={`text-2xl font-bold ${totals.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(totals.outstanding)}</p>
            <p className="text-xs text-muted-foreground mt-1">{format(from, 'd MMM yyyy')} – {format(to, 'd MMM yyyy')}</p>
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
          onClick={() => exportBranchesExcel(
            filtered,
            allRecons ?? [],
            `cash-reconciliation-${format(new Date(), 'yyyy-MM-dd')}.xls`
          )}
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
                {/* Branch row — only shows name + outstanding status + History button */}
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
                    {/* REMOVED: the Collected / Sent / Deducted line from the branch row */}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs h-8"
                    onClick={e => { e.stopPropagation(); setHistoryBranch(branch) }}
                  >
                    <History className="w-3.5 h-3.5" />
                    History
                  </Button>
                </div>

                {/* Expanded detail — only Unsettled Cash Orders + In Progress */}
                {isOpen && (
                  <div className="border-t border-border px-4 sm:px-5 py-4 space-y-4 bg-muted/10">

                    {/* Unsettled orders */}
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

                    {/* In-progress recons */}
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

                    {/* Nothing to show */}
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