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
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

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
function fmtTime(ts: number) { return format(new Date(ts), 'h:mm a') }
function fmtDay(ts: number)  { return format(new Date(ts), 'd MMM yyyy') }

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
      <td style="font-weight:bold">Total Collected</td><td>₵${summary.totalCollectedAllTime.toFixed(2)}</td>
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
  onClose: () => void
}

function BranchHistoryDrawer({ summary, allRecons, onClose }: BranchHistoryDrawerProps) {
  const today = new Date()
  const [from, setFrom] = useState<Date>(subDays(today, 30))
  const [to, setTo]     = useState<Date>(today)

  const fromTs = startOfDay(from).getTime()
  const toTs   = endOfDay(to).getTime()

  const historyRecons = allRecons
    .filter(r => r.branchId === summary.branchId)
    .filter(r => r.status === 'completed' || r.status === 'failed')
    .filter(r => r.createdAt >= fromTs && r.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const historyDeductions = summary.allDeductions
    .filter(d => d.createdAt >= fromTs && d.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const historySentTotal = historyRecons
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + r.amountSent, 0)

  type HistoryEvent =
    | { type: 'sent'; data: Reconciliation }
    | { type: 'deduction'; data: Deduction }

  const allEvents: HistoryEvent[] = [
    ...historyRecons.map(r => ({ type: 'sent' as const, data: r })),
    ...historyDeductions.map(d => ({ type: 'deduction' as const, data: d })),
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
          {/* Filters stack vertically on mobile */}
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
        {/* Summary cards — 3 col on sm, 1 col stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Sent (period)</p>
            <p className="text-2xl font-bold text-green-600">{fmt(historySentTotal)}</p>
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
            <p className="text-xs font-medium text-muted-foreground mb-1">Outstanding (all time)</p>
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
                  {allEvents.map((event) => {
                    if (event.type === 'sent') {
                      const r = event.data as Reconciliation
                      return (
                        <tr key={r._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full">
                              <Banknote className="w-3 h-3" /> Sent
                            </span>
                          </td>
                          <td className="px-3 py-3 font-semibold text-foreground text-xs">
                            {r.orderCount} order{r.orderCount !== 1 ? 's' : ''}
                            <p className="font-mono font-normal text-muted-foreground">{r.senderMomoNumber}</p>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-green-600 whitespace-nowrap">{fmt(r.amountSent)}</td>
                          <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                        </tr>
                      )
                    } else {
                      const d = event.data as Deduction
                      return (
                        <tr key={d._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(d.createdAt)}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full">
                              Cash used
                            </span>
                          </td>
                          <td className="px-3 py-3 font-semibold text-foreground text-xs">{d.reason}</td>
                          <td className="px-3 py-3 text-right font-bold text-orange-600 whitespace-nowrap">{fmt(d.amount)}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                              Applied
                            </span>
                          </td>
                        </tr>
                      )
                    }
                  })}
                </tbody>
                {historySentTotal > 0 && (
                  <tfoot>
                    <tr className="bg-muted/40 border-t-2 border-border">
                      <td colSpan={2} className="px-3 py-3 text-xs font-bold text-muted-foreground">Total sent</td>
                      <td />
                      <td className="px-3 py-3 text-right text-sm font-bold text-green-600">{fmt(historySentTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Branch Row ───────────────────────────────────────────────────────────────

interface BranchRowProps {
  summary: BranchSummary
  allRecons: Reconciliation[]
  onViewHistory: (summary: BranchSummary) => void
}

function BranchRow({ summary, allRecons, onViewHistory }: BranchRowProps) {
  const [expanded, setExpanded] = useState(false)

  const { outstanding, totalCollected, totalDeducted, inProgressRecons, allDeductions, unsettledOrders } = summary
  const hasActivity = allRecons.some(r => r.branchId === summary.branchId) || allDeductions.length > 0

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* ── Header row — mobile-first layout ── */}
      <div
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-4 hover:bg-muted/30 transition-colors text-left cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(v => !v)}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0 mt-0.5">
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight">{summary.branchName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.lastActivityTs ? `Last activity ${fmtDate(summary.lastActivityTs)}` : 'No activity yet'}
          </p>

          {/* Status pill on its own line on mobile */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {outstanding > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <AlertCircle className="w-3 h-3" />
                {fmt(outstanding)} outstanding
              </span>
            ) : hasActivity ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle2 className="w-3 h-3" />
                Settled
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No records</span>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onViewHistory(summary) }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-semibold text-muted-foreground"
            >
              <History className="w-3 h-3" />
              History
            </button>
          </div>
        </div>

        <div className="shrink-0 text-muted-foreground mt-1">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t border-border bg-background p-4 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Collected</p>
              <p className="text-xl font-bold text-foreground">{fmt(totalCollected)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">filtered period</p>
            </div>
            <div className={`rounded-lg border p-3 ${
              outstanding > 0
                ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                : 'border-green-200 bg-green-50 dark:bg-green-950/20'
            }`}>
              <p className="text-xs font-medium text-muted-foreground mb-1">Outstanding</p>
              <p className={`text-xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(outstanding)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">all time balance</p>
            </div>
          </div>

          {/* Unsettled orders — scrollable table on mobile */}
          {unsettledOrders && unsettledOrders.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Unsettled Cash Orders
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {unsettledOrders.length}
                </span>
              </p>
              <div className="rounded-lg border border-red-200 overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr className="bg-red-50/60 dark:bg-red-950/20 border-b border-red-200">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Order</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Customer</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Service</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Amount</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unsettledOrders.map((order) => (
                      <tr key={order._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono font-semibold text-primary whitespace-nowrap">{order.orderNumber}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{order.customerName || '—'}</p>
                          {order.customerPhoneNumber && (
                            <p className="text-muted-foreground">{order.customerPhoneNumber}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{order.serviceType || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold whitespace-nowrap">₵{(order.finalPrice ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                          <p>{fmtDay(order.createdAt)}</p>
                          <p>{fmtTime(order.createdAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 border-t border-border">
                      <td colSpan={3} className="px-3 py-2 font-semibold text-muted-foreground">
                        Total ({unsettledOrders.length} orders)
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-red-600 whitespace-nowrap">
                        ₵{unsettledOrders.reduce((s, o) => s + (o.finalPrice ?? 0), 0).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Deductions */}
          {allDeductions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Cash Used</p>
              <div className="space-y-2">
                {allDeductions.map(d => (
                  <div
                    key={d._id}
                    className="flex items-start justify-between gap-2 text-sm px-3 py-3 rounded-lg bg-orange-50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800"
                  >
                    <span className="font-semibold text-foreground">{d.reason}</span>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="font-bold text-orange-600">{fmt(d.amount)}</span>
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
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                In Progress
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  {inProgressRecons.length}
                </span>
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm min-w-[380px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs">MoMo</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inProgressRecons.map(r => (
                      <tr key={r._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{r.senderMomoNumber}</td>
                        <td className="px-3 py-2.5 font-bold text-xs whitespace-nowrap">{fmt(r.amountSent)}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(today))
  const [dateTo, setDateTo]     = useState<Date>(endOfDay(today))

  const [historyBranch, setHistoryBranch] = useState<BranchSummary | null>(null)

  const summaries = useQuery(
    (api as any).cashReconciliation.getBranchCashSummariesForAdmin,
    {
      sinceTs: startOfDay(dateFrom).getTime(),
      untilTs: endOfDay(dateTo).getTime(),
    }
  ) as BranchSummary[] | undefined

  const allRecons = useQuery(
    (api as any).cashReconciliation.getAllReconciliationsForAdmin
  ) as Reconciliation[] | undefined

  const isLoading = summaries === undefined || allRecons === undefined

  const totalOutstanding        = summaries?.reduce((s, b) => s + b.outstanding, 0) ?? 0
  const branchesWithOutstanding = summaries?.filter(b => b.outstanding > 0).length ?? 0

  const filteredSummaries = useMemo(() => {
    if (!summaries) return []
    return summaries
      .filter(b => branchFilter === 'all' || b.branchId === branchFilter)
      .filter(b => !searchQuery || b.branchName.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (a.outstanding > 0 && b.outstanding === 0) return -1
        if (a.outstanding === 0 && b.outstanding > 0) return 1
        return (b.lastActivityTs ?? 0) - (a.lastActivityTs ?? 0)
      })
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
    return 'Export All'
  }, [branchFilter, summaries])

  return (
    <>
      {historyBranch && allRecons && (
        <BranchHistoryDrawer
          summary={historyBranch}
          allRecons={allRecons}
          onClose={() => setHistoryBranch(null)}
        />
      )}

      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Cash Reconciliation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track cash collected and sent across all branches.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 w-full sm:w-auto"
            disabled={isLoading}
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            {exportLabel}
          </Button>
        </div>

        {/* Stat cards — 3 col on all sizes but compact on mobile */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 sm:p-5">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Branches</p>
            <p className="text-2xl sm:text-3xl font-bold">{summaries?.length ?? '—'}</p>
          </Card>
          <Card className={`p-3 sm:p-5 ${branchesWithOutstanding > 0 ? 'border-red-200 bg-red-50/40 dark:bg-red-950/10' : ''}`}>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">
              <span className="hidden sm:inline">Branches w/ </span>Outstanding
            </p>
            <p className={`text-2xl sm:text-3xl font-bold ${branchesWithOutstanding > 0 ? 'text-red-600' : 'text-foreground'}`}>
              {isLoading ? '—' : branchesWithOutstanding}
            </p>
          </Card>
          <Card className={`p-3 sm:p-5 ${totalOutstanding > 0 ? 'border-red-200 bg-red-50/40 dark:bg-red-950/10' : 'border-green-200 bg-green-50/40 dark:bg-green-950/10'}`}>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">
              <span className="hidden sm:inline">Total </span>Outstanding
            </p>
            <p className={`text-lg sm:text-3xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {isLoading ? '—' : fmt(totalOutstanding)}
            </p>
          </Card>
        </div>

        {/* Filters — stack on mobile */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search branch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {summaries?.map(b => (
                  <SelectItem key={b.branchId} value={b.branchId}>{b.branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1">
              <DateRangePicker
                from={dateFrom}
                to={dateTo}
                onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
              />
            </div>
          </div>
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
                onViewHistory={setHistoryBranch}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}