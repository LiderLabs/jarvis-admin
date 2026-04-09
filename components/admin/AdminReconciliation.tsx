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

interface Branch {
  _id: string
  name: string
  code: string
  momoNumber?: string
}

interface Reconciliation {
  _id: string
  branchId: string
  branchName?: string
  date: string
  amountSent: number
  senderMomoNumber: string
  orderCount: number
  totalCashOrders: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number
  completedAt?: number
  notes?: string
  paystackReference?: string
}

interface Deduction {
  _id: string
  branchId: string
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

// Always show positive amounts — no minus signs
function fmt(n: number) {
  return `₵${Math.abs(n).toFixed(2)}`
}

function fmtDate(ts: number) {
  return format(new Date(ts), 'd MMM yyyy, h:mm a')
}

// ─── Excel export ─────────────────────────────────────────────────────────────
// Builds one sheet per branch. Pass a single branch for single-branch export,
// or all branches for the "all" export.

function exportBranchesExcel(
  branches: Branch[],
  allRecons: Reconciliation[],
  allDeductions: Deduction[],
  filename: string
) {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>`

  for (const b of branches) {
    const safeName = b.name.replace(/[<>:"/\\|?*[\]]/g, '_').slice(0, 31)
    html += `<x:ExcelWorksheet><x:Name>${safeName}</x:Name><x:WorksheetOptions><x:Selected/></x:WorksheetOptions></x:ExcelWorksheet>`
  }

  html += `</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`

  for (const b of branches) {
    const recons     = allRecons.filter(r => r.branchId === b._id).sort((a, z) => z.createdAt - a.createdAt)
    const deductions = allDeductions.filter(d => d.branchId === b._id).sort((a, z) => z.createdAt - a.createdAt)

    const totalSent      = recons.filter(r => r.status === 'completed' || r.status === 'processing').reduce((s, r) => s + r.amountSent, 0)
    const totalDeducted  = deductions.reduce((s, d) => s + d.amount, 0)
    const totalCollected = recons.reduce((s, r) => s + (r.totalCashOrders || 0), 0)
    const outstanding    = Math.max(0, Math.round((totalCollected - totalSent - totalDeducted) * 100) / 100)
    const safeName       = b.name.replace(/[<>:"/\\|?*[\]]/g, '_').slice(0, 31)

    html += `<table x:Name="${safeName}">
    <tr><td colspan="6" style="font-size:14px;font-weight:bold;background:#e8f0fe;padding:8px">${b.name} — Cash Reconciliation</td></tr>
    <tr>
      <td style="font-weight:bold">Total Collected</td><td>₵${totalCollected.toFixed(2)}</td>
      <td style="font-weight:bold">Total Sent</td><td>₵${totalSent.toFixed(2)}</td>
      <td style="font-weight:bold">Outstanding</td><td>₵${outstanding.toFixed(2)}</td>
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
    for (const d of deductions) {
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
  branch: Branch
  allRecons: Reconciliation[]
  allDeductions: Deduction[]
  historyFrom: Date
  historyTo: Date
}

function BranchRow({ branch, allRecons, allDeductions, historyFrom, historyTo }: BranchRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab]           = useState<'outstanding' | 'history'>('outstanding')

  const branchRecons     = allRecons.filter(r => r.branchId === branch._id)
  const branchDeductions = allDeductions.filter(d => d.branchId === branch._id)

  const totalCollected = useMemo(() => branchRecons.reduce((s, r) => s + (r.totalCashOrders || 0), 0), [branchRecons])
  const totalSent      = useMemo(() => branchRecons.filter(r => r.status === 'completed' || r.status === 'processing').reduce((s, r) => s + r.amountSent, 0), [branchRecons])
  const totalDeducted  = useMemo(() => branchDeductions.reduce((s, d) => s + d.amount, 0), [branchDeductions])
  const outstanding    = Math.max(0, Math.round((totalCollected - totalSent - totalDeducted) * 100) / 100)

  const inProgressRecons = branchRecons.filter(r => r.status === 'pending' || r.status === 'processing')

  const fromTs = startOfDay(historyFrom).getTime()
  const toTs   = endOfDay(historyTo).getTime()

  const historyRecons = branchRecons
    .filter(r => r.status === 'completed' || r.status === 'failed')
    .filter(r => r.createdAt >= fromTs && r.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const historyDeductions = branchDeductions
    .filter(d => d.createdAt >= fromTs && d.createdAt <= toTs)
    .sort((a, b) => b.createdAt - a.createdAt)

  const lastActivity     = branchRecons.length > 0 ? Math.max(...branchRecons.map(r => r.createdAt)) : null
  const hasActivity      = branchRecons.length > 0 || branchDeductions.length > 0
  const historySentTotal = historyRecons.filter(r => r.status === 'completed').reduce((s, r) => s + r.amountSent, 0)

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
          <p className="font-semibold text-foreground text-sm">{branch.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastActivity ? `Last activity ${fmtDate(lastActivity)}` : 'No activity yet'}
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
              {branchDeductions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Cash Used 
                  </p>
                  <div className="space-y-2">
                    {branchDeductions.map(d => (
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
                  {/* History summary cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Total Sent (period)</p>
                      <p className="text-lg font-bold text-green-600">{fmt(historySentTotal)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Total Sent (all time)</p>
                      <p className="text-lg font-bold text-foreground">{fmt(totalSent)}</p>
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

  const branches      = useQuery((api as any).branches.getActive) as Branch[] | undefined
  const allRecons     = useQuery((api as any).cashReconciliation.getAllReconciliationsForAdmin) as Reconciliation[] | undefined
  const allDeductions = useQuery((api as any).cashReconciliation.getAllDeductionsForAdmin) as Deduction[] | undefined

  const isLoading = branches === undefined || allRecons === undefined || allDeductions === undefined

  const outstandingByBranch = useMemo(() => {
    if (!branches || !allRecons || !allDeductions) return {}
    const map: Record<string, number> = {}
    for (const b of branches) {
      const recons     = allRecons.filter(r => r.branchId === b._id)
      const deductions = allDeductions.filter(d => d.branchId === b._id)
      const collected  = recons.reduce((s, r) => s + (r.totalCashOrders || 0), 0)
      const sent       = recons.filter(r => r.status === 'completed' || r.status === 'processing').reduce((s, r) => s + r.amountSent, 0)
      const deducted   = deductions.reduce((s, d) => s + d.amount, 0)
      map[b._id] = Math.max(0, Math.round((collected - sent - deducted) * 100) / 100)
    }
    return map
  }, [branches, allRecons, allDeductions])

  const totalOutstanding        = Object.values(outstandingByBranch).reduce((s, v) => s + v, 0)
  const branchesWithOutstanding = Object.values(outstandingByBranch).filter(v => v > 0).length

  const filteredBranches = useMemo(() => {
    if (!branches) return []
    return branches
      .filter(b => branchFilter === 'all' || b._id === branchFilter)
      .filter(b => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [branches, branchFilter, searchQuery])

  // ── Context-aware export ──────────────────────────────────────────────────
  // If a specific branch is selected, export only that branch (still multi-sheet
  // in case we later add more sheets like "Summary"). If "all", export all.
  function handleExport() {
    if (!branches || !allRecons || !allDeductions) return

    if (branchFilter !== 'all') {
      // Single branch selected
      const branch = branches.find(b => b._id === branchFilter)
      if (!branch) return
      const safeName = branch.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      exportBranchesExcel(
        [branch],
        allRecons,
        allDeductions,
        `reconciliation-${safeName}-${format(new Date(), 'yyyy-MM-dd')}.xls`
      )
    } else {
      // All branches
      exportBranchesExcel(
        branches,
        allRecons,
        allDeductions,
        `reconciliation-all-branches-${format(new Date(), 'yyyy-MM-dd')}.xls`
      )
    }
  }

  // Export button label reflects current view
  const exportLabel = useMemo(() => {
    if (branchFilter !== 'all' && branches) {
      const branch = branches.find(b => b._id === branchFilter)
      return branch ? `Export ${branch.name}` : 'Export'
    }
    return 'Export All Branches'
  }, [branchFilter, branches])

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
          <p className="text-3xl font-bold">{branches?.length ?? '—'}</p>
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
            {branches?.map(b => (
              <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
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
      ) : filteredBranches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">No branches found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBranches.map(branch => (
            <BranchRow
              key={branch._id}
              branch={branch}
              allRecons={allRecons ?? []}
              allDeductions={allDeductions ?? []}
              historyFrom={historyFrom}
              historyTo={historyTo}
            />
          ))}
        </div>
      )}
    </div>
  )
}