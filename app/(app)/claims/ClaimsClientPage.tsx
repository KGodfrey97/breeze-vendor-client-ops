"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClaimsTable } from "@/components/claims-table"
import { ClaimsFilter } from "@/components/claims-filter"
import { useClaims, type ClaimWithPatientAndProfile } from "@/hooks/use-claims"
import { useClaimsTableColumns } from "@/hooks/use-claims-table-columns"
import { Settings2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ClaimsClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Read filters from URL
  const status = searchParams.get("status") || "all"
  const priority = searchParams.get("priority") || undefined
  const letterStatus = searchParams.get("letterStatus") || undefined
  const claimStatus = searchParams.get("claimStatus") || undefined
  const search = searchParams.get("search") || undefined
  const appealtype = searchParams.get("appealtype") || undefined
  const dateFrom = searchParams.get("dateFrom") || undefined
  const dateTo = searchParams.get("dateTo") || undefined
  const [currentPage, setCurrentPage] = useState(1)
  const [allClaims, setAllClaims] = useState<ClaimWithPatientAndProfile[]>([])
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [pendingNavigationLabel, setPendingNavigationLabel] = useState<string | null>(null)

  const filterKey = useMemo(
    () => JSON.stringify({ status, priority, letterStatus, claimStatus, search, appealtype, dateFrom, dateTo }),
    [status, priority, letterStatus, claimStatus, search, appealtype, dateFrom, dateTo],
  )

  const { claims, count, types, isLoading, error } = useClaims({
    status,
    search,
    appealtype,
    dateFrom,
    dateTo,
    priority,
    letterStatus,
    claimStatus,
    page: currentPage,
    pageSize: 20,
    sortBy,
    sortOrder,
  })

  const { columns, setColumns, toggleColumnVisibility } = useClaimsTableColumns()
  const visibleColumns = columns.filter((c) => c.visible)

  useEffect(() => {
    setCurrentPage(1)
    setAllClaims([])
  }, [filterKey])

  useEffect(() => {
    if (!isPending) {
      setPendingNavigationLabel(null)
    }
  }, [isPending])

  useEffect(() => {
    if (currentPage === 1) {
      setAllClaims(claims)
      return
    }

    setAllClaims((prev) => {
      const existingIds = new Set(prev.map((claim) => claim.id))
      const nextClaims = claims.filter((claim) => !existingIds.has(claim.id))
      return [...prev, ...nextClaims]
    })
  }, [claims, currentPage])

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") params.delete("status")
    else params.set("status", value)
    params.delete("page")
    setPendingNavigationLabel("Loading claims...")
    startTransition(() => {
      router.push(`/claims?${params.toString()}`)
    })
  }

  const handleLoadMore = () => {
    if (!isLoading && allClaims.length < count) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const handleSortChange = (nextSortBy: string) => {
    setCurrentPage(1)

    if (sortBy === nextSortBy) {
      // Cycle through: asc -> desc -> none
      if (sortOrder === "asc") {
        setSortOrder("desc")
      } else if (sortOrder === "desc") {
        setSortBy(undefined)
        setSortOrder("asc") // reset for next first click
      }
      return
    }

    // New column clicked: start with ascending
    setSortBy(nextSortBy)
    setSortOrder("asc")
  }

  const handleNavigateToNewClaim = () => {
    setPendingNavigationLabel("Opening new claim form...")
    startTransition(() => {
      router.push("/claims/new")
    })
  }

  return (
    <div className="app-page">

      {isPending && pendingNavigationLabel ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{pendingNavigationLabel}</span>
        </div>
      ) : null}

      <Card className="app-surface">
        <CardContent className="pt-6">

          <div className="flex flex-col gap-4">

          
          {/* Top Row */}
          <div className="flex items-center gap-4">
            <ClaimsFilter types={types} className="flex-1 min-w-0" />

            <Button onClick={handleNavigateToNewClaim} disabled={isPending}>
              {isPending &&
              pendingNavigationLabel === "Opening new claim form..." ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              New Claim
            </Button>
          </div>

          <Tabs value={status} onValueChange={handleTabChange} className="space-y-4">
            <div className="flex w-full items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All Claims</TabsTrigger>
                <TabsTrigger value="under_review">Under Review</TabsTrigger>
                <TabsTrigger value="processing">Processing</TabsTrigger>
                <TabsTrigger value="overturned">Overturned</TabsTrigger>
                <TabsTrigger value="denied">Denied</TabsTrigger>
              </TabsList>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl border-border bg-card">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Columns ({visibleColumns.length}/{columns.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {columns
                    .filter((column) => column.id !== "actions")
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.visible}
                        onCheckedChange={() => toggleColumnVisibility(column.id)}
                      >
                        {column.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <TabsContent value={status}>
              {isLoading && allClaims.length === 0 ? (
                <div className="animate-pulse space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-4 text-destructive">
                  <p>Error loading claims: {error}</p>
                  <Button variant="outline" className="mt-2" onClick={() => router.refresh()}>
                    Retry
                  </Button>
                </div>
              ) : allClaims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg mb-2">No claims found</p>
                  <p className="text-sm mb-4">Try adjusting your filters or creating a new claim</p>
                  <Button onClick={handleNavigateToNewClaim} disabled={isPending}>
                    {isPending && pendingNavigationLabel === "Opening new claim form..." ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create New Claim
                  </Button>
                </div>
              ) : (
                <ClaimsTable
                  claims={allClaims}
                  totalCount={count}
                  hasMore={allClaims.length < count}
                  isLoadingMore={isLoading && currentPage > 1}
                  onLoadMore={handleLoadMore}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  columns={columns}
                  setColumns={setColumns}
                />
              )}  
            </TabsContent>
          </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
