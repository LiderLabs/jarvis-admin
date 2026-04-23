"use client"

import { useMemo, useState } from "react"
import { usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import {
  ShoppingBag, ArrowUpRight, ArrowDownRight, Zap, Target,
  BarChart2, X, CheckCircle2, Minus, TrendingUp, Calendar,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { DashboardSkeleton } from "@/components/loaders/DashboardSkeleton"
import {
  format, subDays, getYear,
  startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek,
} from "date-fns"
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts"

// ─────────────────────────────────────────────────────────────────────────────
// Sunday-start week helpers
// ─────────────────────────────────────────────────────────────────────────────

const WEEK_OPTS = { weekStartsOn: 0 } as const // 0 = Sunday

function getSundayWeekNumber(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1)
  const startOfJan1Week = startOfWeek(jan1, WEEK_OPTS)
  const diff = startOfWeek(date, WEEK_OPTS).getTime() - startOfJan1Week.getTime()
  return Math.round(diff / (7 * 24 * 60 * 60 * 1000)) + 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Week Picker — Sunday-start
// ─────────────────────────────────────────────────────────────────────────────

function WeekPicker({
  value,
  onChange,
}: {
  value: Date
  onChange: (weekStart: Date) => void
}) {
  const now        = new Date()
  const isThisWeek = isSameWeek(value, now, WEEK_OPTS)
  const weekNum    = getSundayWeekNumber(value)
  const weekYear   = startOfWeek(value, WEEK_OPTS).getFullYear()
  const weekStart  = startOfWeek(value, WEEK_OPTS)
  const weekEnd    = endOfWeek(value, WEEK_OPTS)

  const prev = () => onChange(startOfWeek(subWeeks(value, 1), WEEK_OPTS))
  const next = () => {
    if (isThisWeek) return
    onChange(startOfWeek(addWeeks(value, 1), WEEK_OPTS))
  }

  return (
    <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg px-1 py-1">
      <button
        onClick={prev}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1.5 px-2 min-w-[180px] justify-center">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          W{weekNum} {weekYear}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          · {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
        </span>
        {isThisWeek && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            Now
          </span>
        )}
      </div>

      <button
        onClick={next}
        disabled={isThisWeek}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  title, value, change, sub, color,
}: {
  title: string
  value: string | number
  change?: number
  sub?: string
  color: string
}) {
  const isPos = (change ?? 0) >= 0
  return (
    <div className={`bg-card border-l-4 ${color} border border-border rounded-xl p-4`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPos ? "text-green-600" : "text-red-500"}`}>
          {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isPos ? "+" : ""}{change.toFixed(1)}% vs avg
        </div>
      )}
      {sub && change === undefined && (
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart Tooltip
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: ₵{p.value.toFixed(2)}
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: sort branches by completion % descending, no-target branches last
// ─────────────────────────────────────────────────────────────────────────────

function sortByLeaderboard(branches: any[]) {
  return [...branches].sort((a, b) => {
    const pctA = a.weeklyTarget > 0 ? (a.weeklyOrders / a.weeklyTarget) * 100 : -1
    const pctB = b.weeklyTarget > 0 ? (b.weeklyOrders / b.weeklyTarget) * 100 : -1
    return pctB - pctA
  })
}

const MEDALS = ["🥇", "🥈", "🥉"]

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Reports Modal
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyReportsModal({
  weeklyStats,
  onClose,
}: {
  weeklyStats: any[]
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current")
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date())

  const trends = useQuery((api as any).analytics.getRevenueTrends, {
    period: "weekly",
    days: 84,
  }) ?? []

  const weekNum  = getSundayWeekNumber(selectedWeek)
  const weekYear = startOfWeek(selectedWeek, WEEK_OPTS).getFullYear()

  const sortedStats = useMemo(() => sortByLeaderboard(weeklyStats), [weeklyStats])

  const branchRows = sortedStats.map((s: any, idx: number) => {
    const pct   = s.weeklyTarget > 0 ? (s.weeklyOrders / s.weeklyTarget) * 100 : null
    const hit   = pct !== null && pct >= 100
    const close = pct !== null && pct >= 75 && !hit
    const medal = s.weeklyTarget > 0 && idx < 3 ? MEDALS[idx] : null
    return { ...s, pct, hit, close, medal }
  })

  const hitCount      = branchRows.filter(r => r.hit).length
  const progressCount = branchRows.filter(r => !r.hit && (r.weeklyTarget ?? 0) > 0).length
  const noTargetCount = branchRows.filter(r => !r.weeklyTarget || r.weeklyTarget === 0).length

  const historyRows = useMemo(() =>
    [...(trends as any[])].reverse().slice(0, 12),
    [trends]
  )

  const completedWeeks = historyRows.slice(1)
  const avgOrders = completedWeeks.length > 0
    ? Math.round(completedWeeks.reduce((s: number, r: any) => s + r.orders, 0) / completedWeeks.length)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl z-10 flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Weekly Reports</h2>
              <p className="text-xs text-muted-foreground">Order targets &amp; performance history · Sun – Sat</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0 px-6 gap-1 pt-1">
          {(["current", "history"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px
                ${activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab === "current" ? "This Week" : "Week History"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* ── This Week ── */}
          {activeTab === "current" && (
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <WeekPicker value={selectedWeek} onChange={setSelectedWeek} />
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    {hitCount} {hitCount === 1 ? "branch" : "branches"} hit target
                  </span>
                  {progressCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                      <TrendingUp className="w-3 h-3" />
                      {progressCount} in progress
                    </span>
                  )}
                  {noTargetCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
                      <Minus className="w-3 h-3" />
                      {noTargetCount} no target set
                    </span>
                  )}
                </div>
              </div>

              {branchRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Target className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No branch data available</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 text-left w-8">#</th>
                        {["Branch", "Orders", "Target", "Progress", "Status"].map(h => (
                          <th
                            key={h}
                            className={`text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3
                              ${h === "Branch" ? "text-left" : h === "Progress" ? "text-left w-36" : "text-right"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {branchRows.map((r, idx) => (
                        <tr
                          key={r.branchId}
                          className={`border-b border-border last:border-0 transition-colors hover:bg-muted/20
                            ${r.hit ? "bg-green-50/40 dark:bg-green-950/10" : ""}
                            ${idx === 0 && r.weeklyTarget > 0 ? "bg-yellow-50/30 dark:bg-yellow-950/10" : ""}`}
                        >
                          <td className="px-4 py-3 text-sm text-center">
                            {r.medal ?? (
                              <span className="text-xs text-muted-foreground">{r.weeklyTarget > 0 ? idx + 1 : "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-foreground">{r.branchName}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-foreground">{r.weeklyOrders}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r.weeklyTarget > 0
                              ? <span className="text-sm text-muted-foreground">{r.weeklyTarget}</span>
                              : <span className="text-xs italic text-muted-foreground">None</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {r.weeklyTarget > 0 && r.pct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700
                                      ${r.hit ? "bg-green-500" : r.close ? "bg-yellow-400" : "bg-blue-500"}`}
                                    style={{ width: `${Math.min(r.pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground w-8 text-right shrink-0">
                                  {r.pct.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!r.weeklyTarget || r.weeklyTarget === 0 ? (
                              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">No Target</Badge>
                            ) : r.hit ? (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">🎯 Hit</Badge>
                            ) : r.close ? (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">Almost</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">In Progress</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Ranked by completion % — highest to lowest. Week runs Sunday – Saturday.
              </p>
            </div>
          )}

          {/* ── Week History ── */}
          {activeTab === "history" && (
            <div className="p-6 space-y-5">
              <div className="bg-muted/40 border border-border rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-foreground mb-0.5">How to read this</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each row is one complete week (Sun – Sat), sorted newest first.
                  <strong className="text-foreground"> vs Avg</strong> compares that week against the average of all
                  completed weeks shown. The current week is marked "In Progress" since it isn't finished yet.
                </p>
              </div>

              {avgOrders > 0 && (
                <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3">
                  <TrendingUp className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {avgOrders.toLocaleString()} orders{" "}
                      <span className="font-normal text-muted-foreground">per week on average</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on {completedWeeks.length} completed weeks · all branches combined
                    </p>
                  </div>
                </div>
              )}

              {historyRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No history data available yet</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Week</th>
                        <th className="text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Sun – Sat</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Orders</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Revenue</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">vs Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((r: any, i: number) => {
                        const isCurrentWeek = i === 0
                        const vsAvg  = avgOrders > 0 && !isCurrentWeek
                          ? ((r.orders - avgOrders) / avgOrders) * 100
                          : null
                        const above  = vsAvg !== null && vsAvg >= 0

                        let weekRangeLabel = ""
                        try {
                          const [wPart, yPart] = (r.period as string).split(" ")
                          const wn = parseInt(wPart.replace("W", ""))
                          const yr = parseInt(yPart)
                          const jan1   = new Date(yr, 0, 1)
                          const wStart = startOfWeek(new Date(jan1.getTime() + (wn - 1) * 7 * 86400000), WEEK_OPTS)
                          const wEnd   = endOfWeek(wStart, WEEK_OPTS)
                          weekRangeLabel = `${format(wStart, "MMM d")} – ${format(wEnd, "MMM d")}`
                        } catch {}

                        return (
                          <tr
                            key={r.period}
                            className={`border-b border-border last:border-0 transition-colors hover:bg-muted/20
                              ${isCurrentWeek ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">{r.period}</span>
                                {isCurrentWeek && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                    This week
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{weekRangeLabel}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-bold text-foreground">{r.orders.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-foreground">
                                ₵{r.revenue.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {vsAvg !== null ? (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold
                                  ${above ? "text-green-600" : "text-red-500"}`}>
                                  {above ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {above ? "+" : ""}{vsAvg.toFixed(1)}%
                                </span>
                              ) : isCurrentWeek ? (
                                <span className="text-xs italic text-muted-foreground">In progress</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Showing up to 12 weeks of history across all branches combined.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">W{weekNum} · {weekYear}</p>
          <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Target Card — leaderboard display with rank
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyTargetCard({
  branchName,
  weeklyOrders,
  weeklyTarget,
  rank,
}: {
  branchName: string
  weeklyOrders: number
  weeklyTarget: number
  rank: number
}) {
  const pct        = weeklyTarget > 0 ? Math.min((weeklyOrders / weeklyTarget) * 100, 100) : 0
  const isComplete = pct >= 100
  const isClose    = pct >= 75

  const barColor  = isComplete ? "bg-green-500" : isClose ? "bg-yellow-400" : "bg-blue-500"
  const textColor = isComplete ? "text-green-600" : isClose ? "text-yellow-600" : "text-blue-600"
  const wrapColor = isComplete
    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
    : isClose
    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
    : "bg-card border-border"

  const medal = weeklyTarget > 0 && rank <= 3 ? MEDALS[rank - 1] : null

  return (
    <div className={`border rounded-xl px-4 py-3 ${wrapColor} w-full`}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-7 text-center">
          {medal ? (
            <span className="text-base leading-none">{medal}</span>
          ) : weeklyTarget > 0 ? (
            <span className="text-xs font-semibold text-muted-foreground">{rank}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{branchName}</p>
          <p className="text-xs text-muted-foreground">
            {weeklyTarget > 0
              ? `${weeklyOrders} / ${weeklyTarget} orders`
              : "No target set"}
          </p>
        </div>

        {weeklyTarget > 0 ? (
          <div className="flex-1 hidden sm:block">
            <div className="h-3 bg-muted rounded-full overflow-hidden border border-border relative">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
                style={{ width: `${pct}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
              {[25, 50, 75].map(s => (
                <div key={s} className="absolute top-0 bottom-0 w-px bg-background/40" style={{ left: `${s}%` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden sm:block h-3 bg-muted rounded-full opacity-40" />
        )}

        <div className={`text-right shrink-0 flex items-center gap-1 ${textColor}`}>
          <p className="text-sm font-bold">{pct.toFixed(0)}%</p>
          {isComplete && <span className="text-xs">🎯</span>}
        </div>
      </div>

      {weeklyTarget > 0 && (
        <div className="mt-2 sm:hidden">
          <div className="h-2 bg-muted rounded-full overflow-hidden border border-border">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const AdminOverview = () => {
  const [selectedBranch, setSelectedBranch]       = useState("all")
  const [dateFrom, setDateFrom]                   = useState<Date>(new Date())
  const [dateTo, setDateTo]                       = useState<Date>(new Date())
  const [showWeeklyReports, setShowWeeklyReports] = useState(false)

  const startDateStr = format(dateFrom, "yyyy-MM-dd")
  const endDateStr   = format(dateTo,   "yyyy-MM-dd")

  const { results: ordersPages, status } = usePaginatedQuery(
    api.admin.getOrders,
    selectedBranch === "all" ? {} : { branchId: selectedBranch as any },
    { initialNumItems: 200 }
  )
  const orders    = ordersPages?.flat() || []
  const isLoading = status === "LoadingFirstPage"

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any)
  const branches: any[] = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? []

  const selectedStats = useQuery(api.admin.getPaymentStats, {
    startDate: startDateStr,
    endDate:   endDateStr,
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
  }) ?? { totalRevenue: 0, cashAmount: 0, mobileMoneylAmount: 0, cardAmount: 0, byDay: {}, byDayByMethod: {} }

  const last30Stats = useQuery(api.admin.getPaymentStats, {
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate:   format(new Date(), "yyyy-MM-dd"),
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
  }) ?? { totalRevenue: 0 }

  const weeklyStats = useQuery((api as any).admin.getWeeklyOrderStats) ?? []

  const stats = useMemo(() => {
    const startTs = new Date(dateFrom).setHours(0, 0, 0, 0)
    const endTs   = new Date(dateTo).setHours(23, 59, 59, 999)

    const selectedOrders   = orders.filter((o: any) => o._creationTime >= startTs && o._creationTime <= endTs)
    const totalRevenue30   = (last30Stats as any)?.totalRevenue ?? 0
    const pendingOrders    = orders.filter((o: any) =>
      ["pending","pending_dropoff","in_progress","washing","drying","folding","sorting","checked_in"].includes(o.status)
    ).length
    const completedInRange = selectedOrders.filter((o: any) =>
      o.status === "completed" || o.status === "delivered"
    ).length

    const dDiff = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1)

    const totalMobileMoney = (selectedStats as any)?.mobileMoneylAmount ?? 0
    const totalCard        = (selectedStats as any)?.cardAmount ?? 0
    const totalCash        = (selectedStats as any)?.cashAmount ?? 0
    const selectedRevenue  = (selectedStats as any)?.totalRevenue ?? 0

    const byDayByMethod = (selectedStats as any)?.byDayByMethod ?? {}

    const step = dDiff <= 7 ? 1 : dDiff <= 30 ? 5 : 10

    const chartData = []
    for (let i = dDiff - 1; i >= 0; i--) {
      const date      = subDays(dateTo, i)
      const dateStr   = format(date, "yyyy-MM-dd")
      const key       = format(date, "MMM d")
      const showLabel = (dDiff - 1 - i) % step === 0

      const dayMethods = byDayByMethod[dateStr] ?? { cash: 0, mobile_money: 0, card: 0 }

      chartData.push({
        date:        key,
        displayDate: showLabel ? key : "",
        mobileMoney: Math.round((dayMethods.mobile_money ?? 0) * 100) / 100,
        card:        Math.round((dayMethods.card ?? 0) * 100) / 100,
        cash:        Math.round((dayMethods.cash ?? 0) * 100) / 100,
      })
    }

    const avgDailyRevenue = totalRevenue30 / 30
    const expectedRevenue = avgDailyRevenue * dDiff
    const revenueChange   = expectedRevenue > 0 ? ((selectedRevenue - expectedRevenue) / expectedRevenue) * 100 : 0

    const avgDailyOrders = orders.length / 30
    const expectedOrders = avgDailyOrders * dDiff
    const ordersChange   = expectedOrders > 0 ? ((selectedOrders.length - expectedOrders) / expectedOrders) * 100 : 0

    return {
      selectedOrders:  selectedOrders.length,
      selectedRevenue,
      totalMobileMoney,
      totalCard,
      totalCash,
      pendingOrders,
      completedInRange,
      revenueChange,
      ordersChange,
      chartData,
    }
  }, [orders, last30Stats, selectedStats, dateFrom, dateTo])

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders])

  const filteredWeeklyStats = useMemo(() => {
    const base = selectedBranch === "all"
      ? (weeklyStats as any[])
      : (weeklyStats as any[]).filter((s: any) => s.branchId === selectedBranch)
    return sortByLeaderboard(base)
  }, [weeklyStats, selectedBranch])

  const statusColors: Record<string, string> = {
    completed:       "bg-green-100 text-green-700",
    delivered:       "bg-green-100 text-green-700",
    ready:           "bg-blue-100 text-blue-700",
    in_progress:     "bg-yellow-100 text-yellow-700",
    pending:         "bg-yellow-100 text-yellow-700",
    pending_dropoff: "bg-yellow-100 text-yellow-700",
    checked_in:      "bg-cyan-100 text-cyan-700",
    sorting:         "bg-purple-100 text-purple-700",
    washing:         "bg-indigo-100 text-indigo-700",
    drying:          "bg-sky-100 text-sky-700",
    folding:         "bg-violet-100 text-violet-700",
    cancelled:       "bg-gray-100 text-gray-700",
  }
  const formatStatus = (s: string) =>
    s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-4 pb-8">

      {/* Modal */}
      {showWeeklyReports && (
        <WeeklyReportsModal
          weeklyStats={filteredWeeklyStats.length > 0 ? filteredWeeklyStats : weeklyStats as any[]}
          onClose={() => setShowWeeklyReports(false)}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome to WashLab Admin</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
          />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-36 text-sm h-9">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Revenue"     value={`₵${stats.selectedRevenue.toFixed(2)}`} change={stats.revenueChange} color="border-l-green-500" />
        <StatCard title="Orders"      value={stats.selectedOrders}                    change={stats.ordersChange}  color="border-l-blue-500" />
        <StatCard title="In Progress" value={stats.pendingOrders}                     sub="Require attention"      color="border-l-yellow-500" />
        <StatCard title="Completed"   value={stats.completedInRange}                  sub="In selected period"     color="border-l-emerald-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Weekly Target Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" /> Weekly Order Target
                </CardTitle>
                <CardDescription className="text-xs">Ranked by completion % — Sun to Sat</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs">
                    {filteredWeeklyStats.length}{" "}
                    {filteredWeeklyStats.length === 1 ? "branch" : "branches"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowWeeklyReports(true)}
                >
                  <BarChart2 className="w-3 h-3 mr-1" /> Details
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-4">
            {filteredWeeklyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Target className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No branch data available</p>
              </div>
            ) : (
              <div
                className="flex flex-col gap-2 overflow-y-auto pr-1"
                style={{ maxHeight: "260px", scrollbarWidth: "thin" }}
              >
                {filteredWeeklyStats.map((b: any, idx: number) => (
                  <WeeklyTargetCard
                    key={b.branchId}
                    branchName={b.branchName}
                    weeklyOrders={b.weeklyOrders}
                    weeklyTarget={b.weeklyTarget}
                    rank={idx + 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Payment Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Mobile Money · Card · Cash — {format(dateFrom, "MMM d")} – {format(dateTo, "MMM d")}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">₵{stats.selectedRevenue.toFixed(2)}</p>
                {stats.selectedRevenue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(((stats.totalMobileMoney + stats.totalCard) / stats.selectedRevenue) * 100)}% digital
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="mobileMoney" name="Mobile Money" fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="card"        name="Card"         fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="cash"        name="Cash"         fill="#10b981" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Recent Orders
            </CardTitle>
            <Badge variant="secondary">{recentOrders.length}</Badge>
          </div>
          <CardDescription className="text-xs">Latest customer orders</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Order", "Customer", "Branch", "Status", "Amount"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? recentOrders.map((order: any) => (
                  <tr key={order._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order._creationTime), "MMM d, h:mm a")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {order.customerName || order.customerPhoneNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {branches.find((b: any) => b._id === order.branchId)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-xs ${statusColors[order.status] || "bg-yellow-100 text-yellow-700"}`}>
                        {formatStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-bold ${order.paymentStatus !== "paid" ? "text-muted-foreground" : ""}`}>
                        ₵{(order.finalPrice || 0).toFixed(2)}
                      </p>
                      {order.paymentStatus !== "paid" && (
                        <p className="text-xs text-orange-500">Unpaid</p>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminOverview