"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import Link from "next/link"

import {
  useRouter,
  useSearchParams,
} from "next/navigation"

import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react"

import { useActions } from "@/hooks/use-actions"
import { cn } from "@/lib/utils"

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Input } from "@/components/ui/input"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ActionStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"

type VendorOption = {
  id: string
  name: string
}

type DueMeta = {
  label: string
  className: string
  isOverdue: boolean
  isDueToday: boolean
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STATUS_LABELS: Record<
  ActionStatus,
  string
> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

const STATUS_TONES: Record<
  ActionStatus,
  string
> = {
  open:
    "bg-secondary/10 text-secondary",

  in_progress:
    "bg-warning/10 text-warning",

  completed:
    "bg-primary/10 text-primary",

  cancelled:
    "bg-muted text-muted-foreground",
}

/* -------------------------------------------------------------------------- */
/* Date Helpers                                                               */
/* -------------------------------------------------------------------------- */

function parseDate(
  value: string | null
) {
  if (!value) {
    return null
  }

  const normalized =
    value.slice(0, 10)

  const [
    year,
    month,
    day,
  ] = normalized
    .split("-")
    .map(Number)

  if (
    !year ||
    !month ||
    !day
  ) {
    return null
  }

  return new Date(
    year,
    month - 1,
    day
  )
}

function formatDate(
  value: string | null
) {
  const date =
    parseDate(value)

  if (!date) {
    return "No due date"
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )
}

function getDueMeta(
  value: string | null,
  actionStatus: ActionStatus
): DueMeta {
  if (!value) {
    return {
      label:
        "No due date",

      className:
        "text-muted-foreground",

      isOverdue:
        false,

      isDueToday:
        false,
    }
  }

  const date =
    parseDate(value)

  if (!date) {
    return {
      label:
        "No due date",

      className:
        "text-muted-foreground",

      isOverdue:
        false,

      isDueToday:
        false,
    }
  }

  /*
   * Completed and cancelled items should
   * show their date normally instead of
   * appearing overdue.
   */

  if (
    actionStatus ===
      "completed" ||
    actionStatus ===
      "cancelled"
  ) {
    return {
      label:
        formatDate(value),

      className:
        "text-muted-foreground",

      isOverdue:
        false,

      isDueToday:
        false,
    }
  }

  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  const diff =
    Math.round(
      (
        date.getTime() -
        today.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    )

  if (diff < 0) {
    const overdue =
      Math.abs(diff)

    return {
      label:
        `${overdue} day${
          overdue === 1
            ? ""
            : "s"
        } overdue`,

      className:
        "text-destructive",

      isOverdue:
        true,

      isDueToday:
        false,
    }
  }

  if (diff === 0) {
    return {
      label:
        "Due today",

      className:
        "text-warning",

      isOverdue:
        false,

      isDueToday:
        true,
    }
  }

  if (diff <= 7) {
    return {
      label:
        `Due in ${diff} day${
          diff === 1
            ? ""
            : "s"
        }`,

      className:
        "text-warning",

      isOverdue:
        false,

      isDueToday:
        false,
    }
  }

  return {
    label:
      formatDate(value),

    className:
      "text-muted-foreground",

    isOverdue:
      false,

    isDueToday:
      false,
  }
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ActionsPage() {
  const router =
    useRouter()

  const searchParams =
    useSearchParams()

  /* ------------------------------------------------------------------------ */
  /* URL State                                                                */
  /* ------------------------------------------------------------------------ */

  const status =
    searchParams.get(
      "status"
    ) || "active"

  const due =
    searchParams.get(
      "due"
    ) || "all"

  const vendorId =
    searchParams.get(
      "vendorId"
    ) || "all"

  const urlSearch =
    searchParams.get(
      "search"
    ) || ""

  /* ------------------------------------------------------------------------ */
  /* Local State                                                              */
  /* ------------------------------------------------------------------------ */

  const [
    search,
    setSearch,
  ] =
    useState(
      urlSearch
    )

  const [
    vendors,
    setVendors,
  ] =
    useState<
      VendorOption[]
    >([])

  const [
    updatingActionId,
    setUpdatingActionId,
  ] =
    useState<
      string | null
    >(null)

  const [
    localError,
    setLocalError,
  ] =
    useState<
      string | null
    >(null)

  /* ------------------------------------------------------------------------ */
  /* Actions                                                                  */
  /* ------------------------------------------------------------------------ */

  const {
    actions,
    count,
    summary,
    pagination,
    isLoading,
    error,
    refetch,
  } = useActions({
    status:
      status === "all"
        ? undefined
        : status,

    due:
      due === "all"
        ? undefined
        : due,

    vendorId:
      vendorId === "all"
        ? undefined
        : vendorId,

    search:
      urlSearch ||
      undefined,

    page: 1,
    pageSize: 100,
  })

  /* ------------------------------------------------------------------------ */
  /* Load Vendor Options                                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const loadVendors =
      async () => {
        try {
          const response =
            await fetch(
              "/api/vendors?page=1&pageSize=100&sortBy=name&sortOrder=asc",
              {
                cache:
                  "no-store",
              }
            )

          const data =
            await response.json()

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ||
                "Failed to load vendors"
            )
          }

          setVendors(
            (
              data.vendors ||
              []
            ).map(
              (
                vendor: {
                  id: string
                  name: string
                }
              ) => ({
                id:
                  vendor.id,

                name:
                  vendor.name,
              })
            )
          )
        } catch (
          error
        ) {
          console.error(
            "LOAD ACTION VENDORS ERROR:",
            error
          )
        }
      }

    loadVendors()
  }, [])

  /* ------------------------------------------------------------------------ */
  /* Sync Search Input                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setSearch(
      urlSearch
    )
  }, [urlSearch])

  /* ------------------------------------------------------------------------ */
  /* URL Helper                                                               */
  /* ------------------------------------------------------------------------ */

  const updateParams = (
    updates: Record<
      string,
      string | null
    >
  ) => {
    const params =
      new URLSearchParams(
        searchParams.toString()
      )

    Object.entries(
      updates
    ).forEach(
      ([key, value]) => {
        /*
         * "open" is the default status,
         * so we don't need it in the URL.
         */

        if (
          key ===
          "status"
        ) {
          if (
            value ===
              "active" ||
            !value
          ) {
            params.delete(
              "status"
            )
          } else {
            params.set(
              "status",
              value
            )
          }

          return
        }

        if (
          !value ||
          value ===
            "all"
        ) {
          params.delete(
            key
          )
        } else {
          params.set(
            key,
            value
          )
        }
      }
    )

    const query =
      params.toString()

    router.push(
      query
        ? `/actions?${query}`
        : "/actions"
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Filters                                                                  */
  /* ------------------------------------------------------------------------ */

  const hasActiveFilters =
    status !== "active" ||
    due !== "all" ||
    vendorId !== "all" ||
    Boolean(urlSearch)

  const clearFilters =
    () => {
      setSearch("")
      router.push(
        "/actions"
      )
    }

  const handleSearch =
    () => {
      updateParams({
        search:
          search.trim() ||
          null,
      })
    }

  const handleSearchKeyDown =
    (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (
        event.key ===
        "Enter"
      ) {
        handleSearch()
      }
    }

  /* ------------------------------------------------------------------------ */
  /* Status Update                                                            */
  /* ------------------------------------------------------------------------ */

  const updateActionStatus =
    async (
      actionId: string,
      meetingId: string,
      actionVendorId: string,
      nextStatus: ActionStatus
    ) => {
      try {
        setUpdatingActionId(
          actionId
        )

        setLocalError(
          null
        )

        const response =
          await fetch(
            `/api/vendors/${actionVendorId}/meetings/${meetingId}/actions/${actionId}`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    status:
                      nextStatus,
                  }
                ),
            }
          )

        const data =
          await response.json()

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Failed to update action item"
          )
        }

        await refetch()
      } catch (
        error
      ) {
        setLocalError(
          error instanceof
            Error
            ? error.message
            : "Failed to update action item"
        )
      } finally {
        setUpdatingActionId(
          null
        )
      }
    }

  /* ------------------------------------------------------------------------ */
  /* Summary                                                                  */
  /* ------------------------------------------------------------------------ */

  /*
   * IMPORTANT:
   *
   * These counts are based on the currently
   * loaded result set.
   *
   * Eventually I recommend returning summary
   * counts directly from /api/actions so these
   * become organization-wide counts independent
   * of the selected filters.
   */

  const activeError =
    localError ||
    error

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="app-page space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Page Controls                                                      */}
      {/* ------------------------------------------------------------------ */}

  

      {/* ------------------------------------------------------------------ */}
      {/* Error                                                              */}
      {/* ------------------------------------------------------------------ */}

      {activeError ? (
        <Alert variant="destructive">

          <AlertCircle className="h-4 w-4" />

          <AlertDescription>
            {activeError}
          </AlertDescription>

        </Alert>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Summary Cards                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Results */}

        <button
          type="button"
          className="text-left"
          onClick={() =>
            updateParams({
              status:
                "active",
              due: null,
            })
          }
        >
          <Card
            className={cn(
              "app-surface h-full transition-all",
              "hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm",
              status ===
                "active" &&
                due ===
                  "all" &&
                "ring-2 ring-primary/10"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">

              <CardTitle className="text-sm font-medium">
                Open Actions
              </CardTitle>

              <Circle className="h-4 w-4 text-muted-foreground" />

            </CardHeader>

            <CardContent>

              <div className="text-2xl font-bold">
                {summary.active}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Open and in-progress work
              </p>

            </CardContent>
          </Card>
        </button>

        {/* Overdue */}

        <button
          type="button"
          className="text-left"
          onClick={() =>
            updateParams({
              due:
                due ===
                "overdue"
                  ? null
                  : "overdue",
            })
          }
        >
          <Card
            className={cn(
              "app-surface h-full transition-all",
              "hover:border-destructive/30 hover:bg-destructive/[0.02] hover:shadow-sm",
              due ===
                "overdue" &&
                "ring-2 ring-destructive/20"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">

              <CardTitle className="text-sm font-medium">
                Overdue
              </CardTitle>

              <AlertCircle className="h-4 w-4 text-destructive" />

            </CardHeader>

            <CardContent>

              <div className="text-2xl font-bold text-destructive">
                {summary.overdue}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Past due and still open
              </p>

            </CardContent>
          </Card>
        </button>

        {/* Due Today */}

        <button
          type="button"
          className="text-left"
          onClick={() =>
            updateParams({
              due:
                due ===
                "today"
                  ? null
                  : "today",
            })
          }
        >
          <Card
            className={cn(
              "app-surface h-full transition-all",
              "hover:border-warning/30 hover:bg-warning/[0.02] hover:shadow-sm",
              due ===
                "today" &&
                "ring-2 ring-warning/20"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">

              <CardTitle className="text-sm font-medium">
                Due Today
              </CardTitle>

              <Clock3 className="h-4 w-4 text-warning" />

            </CardHeader>

            <CardContent>

              <div className="text-2xl font-bold text-warning">
                {summary.dueToday}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Needs attention today
              </p>

            </CardContent>
          </Card>
        </button>

        {/* No Due Date */}

        <button
          type="button"
          className="text-left"
          onClick={() =>
            updateParams({
              due:
                due ===
                "no_due_date"
                  ? null
                  : "no_due_date",
            })
          }
        >
          <Card
            className={cn(
              "app-surface h-full transition-all",
              "hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm",
              due ===
                "no_due_date" &&
                "ring-2 ring-primary/10"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">

              <CardTitle className="text-sm font-medium">
                No Due Date
              </CardTitle>

              <CalendarDays className="h-4 w-4 text-muted-foreground" />

            </CardHeader>

            <CardContent>

              <div className="text-2xl font-bold">
                {summary.noDueDate}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Open work without a deadline
              </p>

            </CardContent>
          </Card>
        </button>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Work Queue                                                         */}
      {/* ------------------------------------------------------------------ */}

      <Card className="app-surface">

        <CardHeader className="pb-4">

          <CardTitle>
            Action Work Queue
          </CardTitle>

          <CardDescription>
            Review, prioritize, and complete action items across vendor relationships.
          </CardDescription>

        </CardHeader>

        <CardContent className="space-y-4">

          {/* -------------------------------------------------------------- */}
          {/* Status Tabs                                                    */}
          {/* -------------------------------------------------------------- */}

          <Tabs
            value={
              status
            }
            onValueChange={(
              value
            ) =>
              updateParams({
                status:
                  value,
              })
            }
          >
            <TabsList className="flex h-auto w-fit max-w-full flex-wrap">

              <TabsTrigger value="all">
                All
              </TabsTrigger>

              <TabsTrigger value="open">
                Open
              </TabsTrigger>

              <TabsTrigger value="in_progress">
                In Progress
              </TabsTrigger>

              <TabsTrigger value="completed">
                Completed
              </TabsTrigger>

              <TabsTrigger value="cancelled">
                Cancelled
              </TabsTrigger>

            </TabsList>
          </Tabs>

          {/* -------------------------------------------------------------- */}
          {/* Filter Toolbar                                                 */}
          {/* -------------------------------------------------------------- */}

          <div className="flex flex-col gap-3 border-y border-border py-4 lg:flex-row lg:items-center">

            {/* Search */}

            <div className="flex min-w-0 flex-1 gap-2">

              <div className="relative min-w-0 flex-1">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event
                        .target
                        .value
                    )
                  }
                  onKeyDown={
                    handleSearchKeyDown
                  }
                  placeholder="Search action, owner, vendor, or meeting..."
                  className="pl-9"
                />

              </div>

              <Button
                variant="outline"
                onClick={
                  handleSearch
                }
              >
                Search
              </Button>

            </div>

            {/* Vendor */}

            <Select
              value={
                vendorId
              }
              onValueChange={(
                value
              ) =>
                updateParams({
                  vendorId:
                    value,
                })
              }
            >
              <SelectTrigger className="w-full lg:w-[210px]">
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">
                  All Vendors
                </SelectItem>

                {vendors.map(
                  (
                    vendor
                  ) => (
                    <SelectItem
                      key={
                        vendor.id
                      }
                      value={
                        vendor.id
                      }
                    >
                      {
                        vendor.name
                      }
                    </SelectItem>
                  )
                )}

              </SelectContent>
            </Select>

            {/* Due */}

            <Select
              value={
                due
              }
              onValueChange={(
                value
              ) =>
                updateParams({
                  due:
                    value,
                })
              }
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">
                  All Due Dates
                </SelectItem>

                <SelectItem value="overdue">
                  Overdue
                </SelectItem>

                <SelectItem value="today">
                  Due Today
                </SelectItem>

                <SelectItem value="upcoming">
                  Upcoming
                </SelectItem>

                <SelectItem value="no_due_date">
                  No Due Date
                </SelectItem>

              </SelectContent>
            </Select>

            {/* Clear */}

            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={
                  clearFilters
                }
                className="shrink-0"
              >
                <RotateCcw className="mr-2 h-4 w-4" />

                Clear
              </Button>
            ) : null}

          </div>

          {/* -------------------------------------------------------------- */}
          {/* Active Filter Context                                          */}
          {/* -------------------------------------------------------------- */}

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">

              <span>
                Showing filtered results
              </span>

              {due !==
              "all" ? (
                <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">
                  Due:{" "}
                  {due ===
                  "no_due_date"
                    ? "No due date"
                    : due ===
                        "today"
                      ? "Today"
                      : due
                          .charAt(
                            0
                          )
                          .toUpperCase() +
                        due.slice(
                          1
                        )}
                </span>
              ) : null}

              {vendorId !==
              "all" ? (
                <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">
                  Vendor:{" "}
                  {
                    vendors.find(
                      (
                        vendor
                      ) =>
                        vendor.id ===
                        vendorId
                    )?.name
                  }
                </span>
              ) : null}

              {urlSearch ? (
                <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">
                  Search:{" "}
                  {urlSearch}
                </span>
              ) : null}

            </div>
          ) : null}

          {/* -------------------------------------------------------------- */}
          {/* Loading                                                        */}
          {/* -------------------------------------------------------------- */}

          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">

              <div className="text-center">

                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Loading action items...
                </p>

              </div>

            </div>
          ) : actions.length ===
            0 ? (

            /* ------------------------------------------------------------ */
            /* Empty State                                                  */
            /* ------------------------------------------------------------ */

            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">

              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                No action items found
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                There are no action items matching the current filters.
              </p>

              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={
                    clearFilters
                  }
                >
                  <RotateCcw className="mr-2 h-4 w-4" />

                  Clear Filters
                </Button>
              ) : null}

            </div>
          ) : (

            /* ------------------------------------------------------------ */
            /* Action Rows                                                  */
            /* ------------------------------------------------------------ */

            <div className="space-y-3">

              {actions.map(
                (
                  action
                ) => {
                  const dueMeta =
                    getDueMeta(
                      action.dueDate,
                      action.status
                    )

                  const isUpdating =
                    updatingActionId ===
                    action.id

                  const canComplete =
                    action.status ===
                      "open" ||
                    action.status ===
                      "in_progress"

                  return (
                    <div
                      key={
                        action.id
                      }
                      className={cn(
                        "rounded-xl border bg-card p-4 transition-all",
                        "hover:bg-muted/20 hover:shadow-sm",

                        dueMeta.isOverdue &&
                          "border-destructive/30 bg-destructive/[0.015]"
                      )}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                        {/* ------------------------------------------------ */}
                        {/* Main Content                                     */}
                        {/* ------------------------------------------------ */}

                        <div className="flex min-w-0 flex-1 gap-3">

                          {/* Status Icon */}

                          <div className="pt-0.5">

                            {action.status ===
                            "completed" ? (

                              <CheckCircle2 className="h-5 w-5 text-primary" />

                            ) : action.status ===
                              "in_progress" ? (

                              <Clock3 className="h-5 w-5 text-warning" />

                            ) : action.status ===
                              "cancelled" ? (

                              <Circle className="h-5 w-5 text-muted-foreground opacity-50" />

                            ) : dueMeta.isOverdue ? (

                              <AlertCircle className="h-5 w-5 text-destructive" />

                            ) : (

                              <Circle className="h-5 w-5 text-muted-foreground" />

                            )}

                          </div>

                          <div className="min-w-0 flex-1">

                            {/* Title + Badges */}

                            <div className="flex flex-wrap items-center gap-2">

                              <h3
                                className={cn(
                                  "font-semibold text-foreground",

                                  action.status ===
                                    "completed" &&
                                    "text-muted-foreground line-through",

                                  action.status ===
                                    "cancelled" &&
                                    "text-muted-foreground"
                                )}
                              >
                                {
                                  action.title
                                }
                              </h3>

                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",

                                  STATUS_TONES[
                                    action.status
                                  ]
                                )}
                              >
                                {
                                  STATUS_LABELS[
                                    action.status
                                  ]
                                }
                              </span>

                              {action.isVendorVisible ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">

                                  <Eye className="h-3 w-3" />

                                  Vendor visible

                                </span>
                              ) : null}

                              {dueMeta.isOverdue ? (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                  Overdue
                                </span>
                              ) : null}

                            </div>

                            {/* Description */}

                            {action.description ? (
                              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                {
                                  action.description
                                }
                              </p>
                            ) : null}

                            {/* Metadata */}

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">

                              {/* Vendor */}

                              <Link
                                href={`/vendors/view/${action.vendorId}`}
                                className="inline-flex items-center gap-2 font-medium text-foreground hover:underline"
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      action.vendorColor ||
                                      "hsl(var(--muted-foreground))",
                                  }}
                                />

                                {
                                  action.vendorName
                                }
                              </Link>

                              {/* Meeting */}

                              <span className="inline-flex items-center gap-1">

                                <CalendarDays className="h-3.5 w-3.5" />

                                {
                                  action.meetingTitle
                                }

                              </span>

                              {/* Owner */}

                              {action.ownerName ? (
                                <span className="inline-flex items-center gap-1">

                                  <UserRound className="h-3.5 w-3.5" />

                                  {
                                    action.ownerName
                                  }

                                </span>
                              ) : null}

                              {/* Due */}

                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 font-medium",

                                  dueMeta.className
                                )}
                              >
                                {dueMeta.isOverdue ? (
                                  <AlertCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <Clock3 className="h-3.5 w-3.5" />
                                )}

                                {
                                  dueMeta.label
                                }
                              </span>

                            </div>

                            {/* Agenda */}

                            {action.agendaItemTitle ? (
                              <div className="mt-3 text-xs text-muted-foreground">

                                <span className="font-medium text-foreground">
                                  Agenda:
                                </span>{" "}

                                {
                                  action.agendaItemTitle
                                }

                              </div>
                            ) : null}

                          </div>

                        </div>

                        {/* ------------------------------------------------ */}
                        {/* Row Controls                                     */}
                        {/* ------------------------------------------------ */}

                        <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">

                          {/* Quick Complete */}

                          {canComplete ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                updateActionStatus(
                                  action.id,
                                  action.meetingId,
                                  action.vendorId,
                                  "completed"
                                )
                              }
                            >
                              {isUpdating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="mr-2 h-4 w-4" />
                              )}

                              Complete
                            </Button>
                          ) : null}

                          {/* Status */}

                          <Select
                            value={
                              action.status
                            }
                            disabled={
                              isUpdating
                            }
                            onValueChange={(
                              value:
                                ActionStatus
                            ) =>
                              updateActionStatus(
                                action.id,
                                action.meetingId,
                                action.vendorId,
                                value
                              )
                            }
                          >
                            <SelectTrigger className="w-[150px]">

                              {isUpdating ? (
                                <div className="flex items-center gap-2">

                                  <Loader2 className="h-4 w-4 animate-spin" />

                                  Updating

                                </div>
                              ) : (
                                <SelectValue />
                              )}

                            </SelectTrigger>

                            <SelectContent>

                              <SelectItem value="open">
                                Open
                              </SelectItem>

                              <SelectItem value="in_progress">
                                In Progress
                              </SelectItem>

                              <SelectItem value="completed">
                                Completed
                              </SelectItem>

                              <SelectItem value="cancelled">
                                Cancelled
                              </SelectItem>

                            </SelectContent>
                          </Select>

                          {/* Vendor */}

                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link
                              href={`/vendors/view/${action.vendorId}`}
                            >
                              View Vendor
                            </Link>
                          </Button>

                        </div>

                      </div>
                    </div>
                  )
                }
              )}

            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Result Count                                                   */}
          {/* -------------------------------------------------------------- */}

          {!isLoading &&
          actions.length >
            0 ? (

            <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">

              <span>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {
                    actions.length
                  }
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {count}
                </span>{" "}
                action item
                {count === 1
                  ? ""
                  : "s"}
              </span>

              {count > 100 ? (
                <span className="text-xs">
                  Additional results are available
                </span>
              ) : null}

            </div>
          ) : null}

        </CardContent>
      </Card>

    </div>
  )
}