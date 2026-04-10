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
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchSummary {
  branchId: string
  branchName: string
  totalCollected: number
  totalSent: number
  totalDeducted: number
  outstanding: number
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function fmt(n: number) {
  return `₵${Math.abs(n).toFixed(2)}`
}

function fmtDate(ts: number) {
  return format(new Date(ts), 'd MMM yyyy, h:mm a')
}

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
      .filter(r => r.branchId === summary.branchId)
      .sort((a, z) => z.createdAt - a.createdAt)

    html += `<table x:Name="${safeName}">
    <tr><td colspan="6" style="font-size:14px;font-weight:bold;background:#e8f0fe;padding:8px">${summary.branchName} — Cash Reconciliation</td></tr>
    <tr>
      <td style="font-weight:bold">Total Collected</td><td>₵${summary.totalCollected.toFixed(2)}</td>
      <td style="font-weight:bold">Total Sent</td><td>₵${summary.totalSent.toFixed(2)}</td>
      <td style="font-weight:bold">Total Deducted</td><td>₵${summary.totalDeducted.toFixed(2)}</td>
      <td style="font-weight:bold">Outstanding</td><td>₵${summary.outstanding.toFixed(2)}</td>
    </tr>
    <tr></tr>
    <tr style="background:#dbeafe;font-weight:bold">
      <td>Date</td><td>Type</td><td>Detail</td><td>MoMo Number</td><td>Amount (₵)</td><td>Status</td>
    </tr>`

    for (const r of recons) {
      html += `<tr>
        <td>${fmtDate(r.createdAt)}</td>
        <td>Sent</td>
        <td>${r.orderCount} cash order${r.orderCount !== 1 ? 's' : ''}</td>
        <td>${r.senderMomoNumber}</td>
        <td>${Math.abs(r.amountSent).toFixed(2)}</td>
        <td>${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</td>
      </tr>`
    }
    for (const d of summary.allDeductions) {
      html += `<tr>
        <td>${fmtDate(d.createdAt)}</td>
        <td>Cash Used</td>
        <td>${d.reason}</td>
        <td>—</td>
        <td>${Math.abs(d.amount).toFixed(2)}</td>
        <td>Applied</td>
      </tr>`
    }

    html += `</table>`
  }

  html += `</body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Branch Row ───────────────────────────────────────────────────────────────

interface BranchRowProps {
  summary: BranchSummary
  allRecons: Reconciliation[]
  historyFrom: Date
  historyTo: Date
}

function BranchRow({ summary, allRecons, historyFrom, historyTo }: BranchRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab]           = useState<'outstanding' | 'history'>('outstanding')

  const { outstanding, totalCollected, totalDeducted, inProgressRecons, allDeductions } = summary

  const fromTs = startOfDay(historyFrom).getTime()
  const toTs   = endOfDay(historyTo).getTime()

  // History: completed/failed recons in the selected date range
  const historyRecons = allRecons
    .filter(r => r.branchId === summary.branchId)
    .filter(r => r.status === 'completed' || r.status === 'failed')
    .filter(r => r.createdAt >= fromTs && r.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const historyDeductions = allDeductions
    .filter(d => d.createdAt >= fromTs && d.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const historySentTotal = historyRecons
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + r.amountSent, 0)

  const hasActivity = allRecons.some(r => r.branchId === summary.branchId) || allDeductions.length > 0

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* ── Header row ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{summary.branchName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.lastActivityTs ? `Last activity ${fmtDate(summary.lastActivityTs)}` : 'No activity yet'}
          </p>
        </div>

        <div className="shrink-0">
          {outstanding > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <AlertCircle className="w-3 h-3" />
              {fmt(outstanding)} outstanding
            </span>
          ) : hasActivity ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              <CheckCircle2 className="w-3 h-3" />
              Settled
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No records</span>
          )}
        </div>

        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* ── Expanded ── */}
      {expanded && (
        <div className="border-t border-border bg-background">
          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/20">
            <button
              onClick={() => setTab('outstanding')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === 'outstanding'
                  ? 'border-b-2 border-primary text-primary bg-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Outstanding
              {inProgressRecons.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  {inProgressRecons.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                tab === 'history'
                  ? 'border-b-2 border-primary text-primary bg-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          </div>

          {/* ── Outstanding tab ── */}
          {tab === 'outstanding' && (
            <div className="p-5 space-y-5 bg-background">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total Collected</p>
                  <p className="text-2xl font-bold text-foreground">{fmt(totalCollected)}</p>
                </div>
                <div className={`rounded-lg border p-4 ${
                  outstanding > 0
                    ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                    : 'border-green-200 bg-green-50 dark:bg-green-950/20'
                }`}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Outstanding</p>
                  <p className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(outstanding)}
                  </p>
                </div>
              </div>

              {/* Deductions */}
              {allDeductions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Cash Used
                  </p>
                  <div className="space-y-2">
                    {allDeductions.map(d => (
                      <div
                        key={d._id}
                        className="flex items-center justify-between text-sm px-4 py-3 rounded-lg bg-orange-50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800"
                      >
                        <span className="font-semibold text-foreground">{d.reason}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-orange-600">{fmt(d.amount)}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-1 px-1">
                      <span className="text-muted-foreground">Total deducted</span>
                      <span className="text-orange-600">{fmt(totalDeducted)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* In-progress recons */}
              {inProgressRecons.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">In Progress</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Detail</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">MoMo Number</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Amount Sent</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inProgressRecons.map(r => (
                          <tr key={r._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">{r.orderCount} cash order{r.orderCount !== 1 ? 's' : ''}</td>
                            <td className="px-4 py-3 font-mono text-xs text-foreground">{r.senderMomoNumber}</td>
                            <td className="px-4 py-3 text-base font-bold text-foreground">{fmt(r.amountSent)}</td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {inProgressRecons.length === 0 && outstanding === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-green-500 opacity-60" />
                  <p className="text-sm">All cash is settled for this branch.</p>
                </div>
              )}
              {inProgressRecons.length === 0 && outstanding > 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="w-8 h-8 mb-2 text-red-400 opacity-70" />
                  <p className="text-sm font-bold text-red-600">{fmt(outstanding)} outstanding — no payment in progress</p>
                  <p className="text-xs mt-1 text-muted-foreground">The attendant at this branch needs to send the cash.</p>
                </div>
              )}
            </div>
          )}

          {/* ── History tab ── */}
          {tab === 'history' && (
            <div className="p-5 space-y-4 bg-background">
              {historyRecons.length === 0 && historyDeductions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <History className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No history for the selected period.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Sent (period)</p>
                      <p className="text-lg font-bold text-green-600">{fmt(historySentTotal)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Sent (all time)</p>
                      <p className="text-lg font-bold text-foreground">{fmt(summary.totalSent)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Transactions</p>
                      <p className="text-lg font-bold text-foreground">{historyRecons.length + historyDeductions.length}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Type</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Detail</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">MoMo Number</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Amount</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRecons.map(r => (
                          <tr key={r._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full">
                                <Banknote className="w-3 h-3" /> Sent
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{r.orderCount} cash order{r.orderCount !== 1 ? 's' : ''}</td>
                            <td className="px-4 py-3 font-mono text-xs text-foreground">{r.senderMomoNumber}</td>
                            <td className="px-4 py-3 text-base font-bold text-green-600">{fmt(r.amountSent)}</td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                        {historyDeductions.map(d => (
                          <tr key={d._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(d.createdAt)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full">
                                Cash Used
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{d.reason}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">—</td>
                            <td className="px-4 py-3 text-base font-bold text-orange-600">{fmt(d.amount)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                                Applied
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/40 border-t-2 border-border">
                          <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-muted-foreground">
                            Period total sent
                          </td>
                          <td className="px-4 py-2.5 text-sm font-bold text-green-600">{fmt(historySentTotal)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminReconciliation() {
  const today = new Date()
  const [searchQuery, setSearchQuery]   = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [historyFrom, setHistoryFrom]   = useState<Date>(subDays(today, 30))
  const [historyTo, setHistoryTo]       = useState<Date>(today)

  // Single query — correct numbers come from actual orders, not recon records
  const summaries  = useQuery((api as any).cashReconciliation.getBranchCashSummariesForAdmin) as BranchSummary[] | undefined
  // Still need allRecons for the history tab table rows
  const allRecons  = useQuery((api as any).cashReconciliation.getAllReconciliationsForAdmin) as Reconciliation[] | undefined

  const isLoading = summaries === undefined || allRecons === undefined

  const totalOutstanding        = summaries?.reduce((s, b) => s + b.outstanding, 0) ?? 0
  const branchesWithOutstanding = summaries?.filter(b => b.outstanding > 0).length ?? 0

  const filteredSummaries = useMemo(() => {
    if (!summaries) return []
    return summaries
      .filter(b => branchFilter === 'all' || b.branchId === branchFilter)
      .filter(b => !searchQuery || b.branchName.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [summaries, branchFilter, searchQuery])

  function handleExport() {
    if (!summaries || !allRecons) return
    const toExport = branchFilter !== 'all'
      ? summaries.filter(b => b.branchId === branchFilter)
      : summaries
    const label = branchFilter !== 'all'
      ? toExport[0]?.branchName.replace(/[^a-z0-9]/gi, '-').toLowerCase() ?? 'branch'
      : 'all-branches'
    exportBranchesExcel(toExport, allRecons, `reconciliation-${label}-${format(new Date(), 'yyyy-MM-dd')}.xls`)
  }

  const exportLabel = useMemo(() => {
    if (branchFilter !== 'all' && summaries) {
      const branch = summaries.find(b => b.branchId === branchFilter)
      return branch ? `Export ${branch.branchName}` : 'Export'
    }
    return 'Export All Branches'
  }, [branchFilter, summaries])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Reconciliation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and review cash collected and sent across all branches.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 self-start sm:self-auto"
          disabled={isLoading}
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5" />
          {exportLabel}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Branches</p>
          <p className="text-3xl font-bold">{summaries?.length ?? '—'}</p>
        </Card>
        <Card className={`p-5 ${branchesWithOutstanding > 0 ? 'border-red-200 bg-red-50/40 dark:bg-red-950/10' : ''}`}>
          <p className="text-xs text-muted-foreground mb-1">Branches w/ Outstanding</p>
          <p className={`text-3xl font-bold ${branchesWithOutstanding > 0 ? 'text-red-600' : 'text-foreground'}`}>
            {isLoading ? '—' : branchesWithOutstanding}
          </p>
        </Card>
        <Card className={`p-5 ${totalOutstanding > 0 ? 'border-red-200 bg-red-50/40 dark:bg-red-950/10' : 'border-green-200 bg-green-50/40 dark:bg-green-950/10'}`}>
          <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
          <p className={`text-3xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {isLoading ? '—' : fmt(totalOutstanding)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search branch..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {summaries?.map(b => (
              <SelectItem key={b.branchId} value={b.branchId}>{b.branchName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker
          from={historyFrom}
          to={historyTo}
          onChange={(f, t) => { setHistoryFrom(f); setHistoryTo(t) }}
        />
      </div>

      {/* Branch list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">No branches found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSummaries.map(summary => (
            <BranchRow
              key={summary.branchId}
              summary={summary}
              allRecons={allRecons ?? []}
              historyFrom={historyFrom}
              historyTo={historyTo}
            />
          ))}
        </div>
      )}
    </div>
  )
}