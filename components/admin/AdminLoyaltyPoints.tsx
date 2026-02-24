"use client"

import { useState } from "react"
import { usePaginatedQuery, useQuery, useConvexAuth } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Doc } from "@jordan6699/washlab-backend/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoyaltyPointsTable } from "./LoyaltyPointsTable"
import { LoyaltyTransactionsTable } from "./LoyaltyTransactionsTable"
import { AdjustPointsDialog } from "./AdjustPointsDialog"
import { TransactionDetailsDialog } from "./TransactionDetailsDialog"
import { Award, TrendingUp, Users, Gift, Search, Filter, Loader2, History } from "lucide-react"
import { Id } from "@jordan6699/washlab-backend/dataModel"

type ViewMode = "points" | "transactions"

export default function AdminLoyaltyPoints() {
  const { isAuthenticated } = useConvexAuth()
  const [viewMode, setViewMode] = useState<ViewMode>("points")
  const [searchQuery, setSearchQuery] = useState("")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"all" | "earned" | "redeemed" | "adjusted">("all")
  const [transactionCustomerFilter, setTransactionCustomerFilter] = useState<string>("all")
  const [selectedLoyaltyPoints, setSelectedLoyaltyPoints] = useState<
    (Doc<"loyaltyPoints"> & {
      customer?: {
        _id: string
        name?: string
        phoneNumber?: string
        email?: string
      } | null
    }) | null
  >(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Doc<"loyaltyTransactions"> | null>(null)
  const [transactionsViewCustomerId, setTransactionsViewCustomerId] = useState<string | null>(null)

  // Fetch loyalty points (paginated)
  // Note: Type assertion needed until Convex types are regenerated after backend fix
  const {
    results: loyaltyPointsPages,
    status: loyaltyPointsStatus,
    loadMore: loadMorePoints,
  } = usePaginatedQuery(
    api.loyalty.getAllLoyaltyPoints as any,
    isAuthenticated ? { searchQuery: searchQuery || undefined } : "skip",
    { initialNumItems: 20 }
  )
  const allLoyaltyPoints = loyaltyPointsPages?.flat() ?? []
  const hasMorePoints = loyaltyPointsStatus === "CanLoadMore"
  const isLoadingMorePoints = loyaltyPointsStatus === "LoadingMore"

  // Filter loyalty points by search query (already filtered on backend, but we can add more filtering here if needed)
  const filteredLoyaltyPoints = allLoyaltyPoints

  // Calculate stats from loyalty points
  const stats = {
    totalCustomers: allLoyaltyPoints.length,
    totalPoints: allLoyaltyPoints.reduce((sum, lp) => sum + lp.points, 0),
    totalEarned: allLoyaltyPoints.reduce((sum, lp) => sum + lp.totalEarned, 0),
    totalRedeemed: allLoyaltyPoints.reduce((sum, lp) => sum + lp.totalRedeemed, 0),
    freeWashesEarned: allLoyaltyPoints.reduce((sum, lp) => sum + Math.floor(lp.totalEarned / 10), 0),
  }

  // Fetch transactions (paginated)
  const {
    results: transactionsPages,
    status: transactionsStatus,
    loadMore: loadMoreTransactions,
  } = usePaginatedQuery(
    api.loyalty.getAllTransactions,
    isAuthenticated
      ? {
          customerId: transactionsViewCustomerId ? (transactionsViewCustomerId as Id<"users">) : undefined,
          type: transactionTypeFilter !== "all" ? transactionTypeFilter : undefined,
        }
      : "skip",
    { initialNumItems: 20 }
  )
  const allTransactions = transactionsPages?.flat() ?? []
  const hasMoreTransactions = transactionsStatus === "CanLoadMore"
  const isLoadingMoreTransactions = transactionsStatus === "LoadingMore"

  // Check if any transactions are adjusted (for showing adjuster column)
  const hasAdjustedTransactions = allTransactions.some((t) => t.type === "adjusted")

  const isLoadingPoints = loyaltyPointsStatus === "LoadingFirstPage" && allLoyaltyPoints.length === 0
  const isLoadingTransactions = transactionsStatus === "LoadingFirstPage" && allTransactions.length === 0

  const handleAdjustPoints = (loyaltyPoints: Doc<"loyaltyPoints"> & {
    customer?: {
      _id: string
      name?: string
      phoneNumber?: string
      email?: string
    } | null
  }) => {
    setSelectedLoyaltyPoints(loyaltyPoints)
  }

  const handleViewTransactions = (customerId: string) => {
    setTransactionsViewCustomerId(customerId)
    setViewMode("transactions")
    setTransactionCustomerFilter(customerId)
  }

  const handleClearCustomerFilter = () => {
    setTransactionsViewCustomerId(null)
    setTransactionCustomerFilter("all")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Loyalty Points</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer loyalty points and track transactions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              With loyalty points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEarned} earned, {stats.totalRedeemed} redeemed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Washes Earned</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.freeWashesEarned}</div>
            <p className="text-xs text-muted-foreground">
              Total rewards earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Points</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPoints - stats.totalRedeemed}</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "points" ? "default" : "outline"}
            onClick={() => setViewMode("points")}
          >
            <Award className="h-4 w-4 mr-2" />
            Points
          </Button>
          <Button
            variant={viewMode === "transactions" ? "default" : "outline"}
            onClick={() => setViewMode("transactions")}
          >
            <History className="h-4 w-4 mr-2" />
            Transactions
          </Button>
        </div>

        {viewMode === "transactions" && transactionsViewCustomerId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCustomerFilter}
          >
            Clear Customer Filter
          </Button>
        )}
      </div>

      {/* Points View */}
      {viewMode === "points" && (
        <div className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Loyalty Points</CardTitle>
              <CardDescription>
                View and manage customer loyalty point balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Customers</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name, phone, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <LoyaltyPointsTable
                loyaltyPoints={filteredLoyaltyPoints}
                isLoading={isLoadingPoints}
                onAdjustPoints={handleAdjustPoints}
                onViewTransactions={handleViewTransactions}
              />

              {hasMorePoints && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadMorePoints(20)}
                    disabled={isLoadingMorePoints}
                  >
                    {isLoadingMorePoints ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions View */}
      {viewMode === "transactions" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Point Transactions</CardTitle>
              <CardDescription>
                View all loyalty point transactions and history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select
                    value={transactionTypeFilter}
                    onValueChange={(value: "all" | "earned" | "redeemed" | "adjusted") =>
                      setTransactionTypeFilter(value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="earned">Earned</SelectItem>
                      <SelectItem value="redeemed">Redeemed</SelectItem>
                      <SelectItem value="adjusted">Adjusted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LoyaltyTransactionsTable
                transactions={allTransactions}
                isLoading={isLoadingTransactions}
                showAdjuster={hasAdjustedTransactions}
                onViewDetails={setSelectedTransaction}
              />

              {hasMoreTransactions && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadMoreTransactions(20)}
                    disabled={isLoadingMoreTransactions}
                  >
                    {isLoadingMoreTransactions ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      {selectedLoyaltyPoints && (
        <AdjustPointsDialog
          open={!!selectedLoyaltyPoints}
          onOpenChange={(open) => !open && setSelectedLoyaltyPoints(null)}
          loyaltyPoints={selectedLoyaltyPoints}
        />
      )}

      {selectedTransaction && (
        <TransactionDetailsDialog
          open={!!selectedTransaction}
          onOpenChange={(open) => !open && setSelectedTransaction(null)}
          transaction={selectedTransaction}
        />
      )}
    </div>
  )
}

