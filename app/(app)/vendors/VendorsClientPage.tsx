"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Plus, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { VendorsTable } from "@/components/vendors-table"
import { VendorsFilter } from "@/components/vendors-filter"
import { useVendors, type VendorListItem } from "@/hooks/use-vendors"
import { useVendorsTableColumns } from "@/hooks/use-vendors-table-columns"

export function VendorsClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isPending, startTransition] =
    useTransition()

  // ----------------------------------------------------
  // Read filters from URL
  // ----------------------------------------------------

  const status = searchParams.get("status") || "all"
  const search = searchParams.get("search") || undefined
  const lineOfBusinessId = searchParams.get("lob") || undefined
  const vendorTier = searchParams.get("tier") || undefined
  const grade = searchParams.get("grade") || undefined

  // ----------------------------------------------------
  // Table state
  // ----------------------------------------------------

  const [currentPage, setCurrentPage] = useState(1)
  const [allVendors, setAllVendors] = useState<VendorListItem[]>([])
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [
    pendingNavigationLabel,
    setPendingNavigationLabel,
  ] = useState<string | null>(null)

  // ----------------------------------------------------
  // Reset results when filters change
  // ----------------------------------------------------

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        status,
        search,
        lineOfBusinessId,
        vendorTier,
        grade,
      }),
    [
      status,
      search,
      lineOfBusinessId,
      vendorTier,
      grade,
    ]
  )

  // ----------------------------------------------------
  // Load vendors
  // ----------------------------------------------------

  const {
    vendors,
    count,
    linesOfBusiness,
    isLoading,
    error,
  } = useVendors({
    status,
    search,
    lineOfBusinessId,
    vendorTier,
    grade,
    page: currentPage,
    pageSize: 20,
    sortBy,
    sortOrder,
  })

  // ----------------------------------------------------
  // Column configuration
  // ----------------------------------------------------

  const {
    columns,
    setColumns,
    toggleColumnVisibility,
  } = useVendorsTableColumns()

  const visibleColumns = columns.filter(
    (column) => column.visible
  )

  // ----------------------------------------------------
  // Reset pagination when filters change
  // ----------------------------------------------------

  useEffect(() => {
    setCurrentPage(1)
    setAllVendors([])
  }, [filterKey])

  // ----------------------------------------------------
  // Clear navigation loading label
  // ----------------------------------------------------

  useEffect(() => {
    if (!isPending) {
      setPendingNavigationLabel(null)
    }
  }, [isPending])

  // ----------------------------------------------------
  // Combine pages when Load More is used
  // ----------------------------------------------------

  useEffect(() => {
    if (currentPage === 1) {
      setAllVendors(vendors)
      return
    }

    setAllVendors((previous) => {
      const existingIds = new Set(
        previous.map((vendor) => vendor.id)
      )

      const nextVendors = vendors.filter(
        (vendor) =>
          !existingIds.has(vendor.id)
      )

      return [
        ...previous,
        ...nextVendors,
      ]
    })
  }, [vendors, currentPage])

  // ----------------------------------------------------
  // Status tabs
  // ----------------------------------------------------

  const handleTabChange = (
    value: string
  ) => {
    const params = new URLSearchParams(
      searchParams.toString()
    )

    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }

    params.delete("page")

    setPendingNavigationLabel(
      "Loading vendors..."
    )

    startTransition(() => {
      const query = params.toString()

      router.push(
        query
          ? `/vendors?${query}`
          : "/vendors"
      )
    })
  }

  // ----------------------------------------------------
  // Pagination
  // ----------------------------------------------------

  const handleLoadMore = () => {
    if (
      !isLoading &&
      allVendors.length < count
    ) {
      setCurrentPage(
        (previous) => previous + 1
      )
    }
  }

  // ----------------------------------------------------
  // Sorting
  //
  // Cycle:
  // ASC -> DESC -> none
  // ----------------------------------------------------

  const handleSortChange = (
    nextSortBy: string
  ) => {
    setCurrentPage(1)
    setAllVendors([])

    if (sortBy === nextSortBy) {
      if (sortOrder === "asc") {
        setSortOrder("desc")
      } else {
        setSortBy(undefined)
        setSortOrder("asc")
      }

      return
    }

    setSortBy(nextSortBy)
    setSortOrder("asc")
  }

  // ----------------------------------------------------
  // New vendor navigation
  // ----------------------------------------------------

  const handleNavigateToNewVendor = () => {
    setPendingNavigationLabel(
      "Opening new vendor form..."
    )

    startTransition(() => {
      router.push("/vendors/new")
    })
  }

  return (
    <div className="app-page">

      {/* Navigation Loading */}

      {isPending &&
      pendingNavigationLabel ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />

          <span>
            {pendingNavigationLabel}
          </span>
        </div>
      ) : null}

      <Card className="app-surface">
        <CardContent className="pt-6">

          <div className="flex flex-col gap-4">

            {/* ----------------------------------------
                Top Row
            ----------------------------------------- */}

            <div className="flex items-center gap-4">

              <VendorsFilter
                linesOfBusiness={
                  linesOfBusiness
                }
                className="min-w-0 flex-1"
              />

              <Button
                onClick={
                  handleNavigateToNewVendor
                }
                disabled={isPending}
              >
                {isPending &&
                pendingNavigationLabel ===
                  "Opening new vendor form..." ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}

                New Vendor
              </Button>

            </div>

            {/* ----------------------------------------
                Tabs
            ----------------------------------------- */}

            <Tabs
              value={status}
              onValueChange={
                handleTabChange
              }
              className="space-y-4"
            >

              <div className="flex w-full items-center justify-between">

                <TabsList>
                  <TabsTrigger value="all">
                    All Vendors
                  </TabsTrigger>

                  <TabsTrigger value="active">
                    Active
                  </TabsTrigger>

                  <TabsTrigger value="onboarding">
                    Onboarding
                  </TabsTrigger>

                  <TabsTrigger value="under_review">
                    Under Review
                  </TabsTrigger>

                  <TabsTrigger value="inactive">
                    Inactive
                  </TabsTrigger>
                </TabsList>

                {/* ----------------------------------
                    Column Visibility
                ----------------------------------- */}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-border bg-card"
                    >
                      <Settings2 className="mr-2 h-4 w-4" />

                      Columns (
                        {visibleColumns.length}/
                        {columns.length}
                      )
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-48"
                  >
                    {columns
                      .filter(
                        (column) =>
                          column.id !==
                          "actions"
                      )
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={
                            column.id
                          }
                          checked={
                            column.visible
                          }
                          onCheckedChange={() =>
                            toggleColumnVisibility(
                              column.id
                            )
                          }
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>

              {/* --------------------------------------
                  Table Content
              --------------------------------------- */}

              <TabsContent value={status}>

                {isLoading &&
                allVendors.length === 0 ? (

                  <div className="animate-pulse space-y-2">
                    {[...Array(5)].map(
                      (_, index) => (
                        <div
                          key={index}
                          className="h-10 rounded bg-muted"
                        />
                      )
                    )}
                  </div>

                ) : error ? (

                  <div className="py-4 text-center text-destructive">

                    <p>
                      Error loading vendors:{" "}
                      {error}
                    </p>

                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() =>
                        router.refresh()
                      }
                    >
                      Retry
                    </Button>

                  </div>

                ) : allVendors.length === 0 ? (

                  <div className="py-8 text-center text-muted-foreground">

                    <p className="mb-2 text-lg">
                      No vendors found
                    </p>

                    <p className="mb-4 text-sm">
                      Try adjusting your filters
                      or creating a new vendor.
                    </p>

                    <Button
                      onClick={
                        handleNavigateToNewVendor
                      }
                      disabled={isPending}
                    >
                      {isPending &&
                      pendingNavigationLabel ===
                        "Opening new vendor form..." ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}

                      Create New Vendor
                    </Button>

                  </div>

                ) : (

                  <VendorsTable
                    vendors={
                      allVendors
                    }
                    totalCount={
                      count
                    }
                    hasMore={
                      allVendors.length <
                      count
                    }
                    isLoadingMore={
                      isLoading &&
                      currentPage > 1
                    }
                    onLoadMore={
                      handleLoadMore
                    }
                    sortBy={
                      sortBy
                    }
                    sortOrder={
                      sortOrder
                    }
                    onSortChange={
                      handleSortChange
                    }
                    columns={
                      columns
                    }
                    setColumns={
                      setColumns
                    }
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