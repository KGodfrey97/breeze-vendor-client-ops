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
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
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
import { Label } from "@/components/ui/label"

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

type ActionStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"

type VendorOption = {
  id: string
  name: string
}

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

export default function ActionsPage() {
  const router = useRouter()

  const searchParams =
    useSearchParams()

  // --------------------------------------------------
  // URL filters
  // --------------------------------------------------

  const status =
    searchParams.get("status") ||
    "open"

  const due =
    searchParams.get("due") ||
    "all"

  const vendorId =
    searchParams.get("vendorId") ||
    "all"

  const urlSearch =
    searchParams.get("search") ||
    ""

  // --------------------------------------------------
  // Local state
  // --------------------------------------------------

  const [
    search,
    setSearch,
  ] =
    useState(urlSearch)

  const [
    vendors,
    setVendors,
  ] =
    useState<VendorOption[]>([])

  const [
    updatingActionId,
    setUpdatingActionId,
  ] =
    useState<string | null>(
      null
    )

  const [
    localError,
    setLocalError,
  ] =
    useState<string | null>(
      null
    )

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------

  const {
    actions,
    count,
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

  // --------------------------------------------------
  // Vendor options
  // --------------------------------------------------

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

          if (!response.ok) {
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

  useEffect(() => {
    setSearch(
      urlSearch
    )
  }, [urlSearch])

  // --------------------------------------------------
  // URL helper
  // --------------------------------------------------

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
        // Status needs special handling because
        // no status param means "open" by default.
        if (
            key === "status"
        ) {
            if (
            value === "open" ||
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

        // Other filters can remove "all" from the URL.
        if (
            !value ||
            value === "all"
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

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Quick status update
  // --------------------------------------------------

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

        setLocalError(null)

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
                JSON.stringify({
                  status:
                    nextStatus,
                }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
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

  // --------------------------------------------------
  // Dates
  // --------------------------------------------------

  const parseDate =
    (
      value:
        | string
        | null
    ) => {
      if (!value) {
        return null
      }

      const normalized =
        value.slice(
          0,
          10
        )

      const [
        year,
        month,
        day,
      ] =
        normalized
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

  const formatDate =
    (
      value:
        | string
        | null
    ) => {
      const date =
        parseDate(
          value
        )

      if (!date) {
        return "No due date"
      }

      return date.toLocaleDateString(
        "en-US",
        {
          month:
            "short",
          day:
            "numeric",
          year:
            "numeric",
        }
      )
    }

  const getDueMeta =
    (
      value:
        | string
        | null,
      actionStatus:
        ActionStatus
    ) => {
      if (!value) {
        return {
          label:
            "No due date",

          className:
            "text-muted-foreground",
        }
      }

      const date =
        parseDate(
          value
        )

      if (!date) {
        return {
          label:
            "No due date",

          className:
            "text-muted-foreground",
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
        Math.ceil(
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

      if (
        actionStatus ===
          "completed" ||
        actionStatus ===
          "cancelled"
      ) {
        return {
          label:
            formatDate(
              value
            ),

          className:
            "text-muted-foreground",
        }
      }

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
        }
      }

      if (diff === 0) {
        return {
          label:
            "Due today",

          className:
            "text-warning",
        }
      }

      if (
        diff <= 7
      ) {
        return {
          label:
            `Due in ${diff} day${
              diff === 1
                ? ""
                : "s"
            }`,

          className:
            "text-warning",
        }
      }

      return {
        label:
          formatDate(
            value
          ),

        className:
          "text-muted-foreground",
      }
    }

  // --------------------------------------------------
  // Summary counts for currently loaded result
  // --------------------------------------------------

  const summary =
    useMemo(() => {
      let overdue = 0
      let dueToday = 0
      let noDueDate = 0

      const today =
        new Date()

      today.setHours(
        0,
        0,
        0,
        0
      )

      for (
        const action of
        actions
      ) {
        if (
          action.status !==
            "open" &&
          action.status !==
            "in_progress"
        ) {
          continue
        }

        if (
          !action.dueDate
        ) {
          noDueDate += 1
          continue
        }

        const date =
          parseDate(
            action.dueDate
          )

        if (!date) {
          continue
        }

        if (
          date.getTime() <
          today.getTime()
        ) {
          overdue += 1
        } else if (
          date.getTime() ===
          today.getTime()
        ) {
          dueToday += 1
        }
      }

      return {
        overdue,
        dueToday,
        noDueDate,
      }
    }, [actions])

  const activeError =
    localError ||
    error

  return (
    <div className="app-page space-y-6">

      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Actions
          </h1>

          <p className="text-muted-foreground">
            Manage follow-up work across all vendors and meetings.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={
            refetch
          }
          disabled={
            isLoading
          }
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              isLoading &&
                "animate-spin"
            )}
          />

          Refresh
        </Button>
      </div>

      {/* Error */}

      {activeError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />

          <AlertDescription>
            {
              activeError
            }
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Summary */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Results
            </CardTitle>

            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {count}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Matching current filters
            </p>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue
            </CardTitle>

            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {
                summary.overdue
              }
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Past due and still open
            </p>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Due Today
            </CardTitle>

            <Clock3 className="h-4 w-4 text-warning" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {
                summary.dueToday
              }
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Needs attention today
            </p>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              No Due Date
            </CardTitle>

            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {
                summary.noDueDate
              }
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Open work without a deadline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Work Queue */}

      <Card className="app-surface">

        <CardHeader>
          <CardTitle>
            Action Work Queue
          </CardTitle>

          <CardDescription>
            Review, prioritize, and complete action items across vendor relationships.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* Status tabs */}

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
            <TabsList className="flex h-auto flex-wrap">
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

              <TabsTrigger value="all">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}

          <div className="grid gap-4 border-y border-border py-4 md:grid-cols-2 xl:grid-cols-4">

            {/* Search */}

            <div className="space-y-2 xl:col-span-2">
              <Label>
                Search
              </Label>

              <div className="flex gap-2">
                <div className="relative flex-1">
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
            </div>

            {/* Vendor */}

            <div className="space-y-2">
              <Label>
                Vendor
              </Label>

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
                <SelectTrigger>
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
            </div>

            {/* Due */}

            <div className="space-y-2">
              <Label>
                Due
              </Label>

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
                <SelectTrigger>
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
            </div>
          </div>

          {/* Results */}

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
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                No action items found
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                There are no action items matching the current filters.
              </p>
            </div>
          ) : (
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

                  return (
                    <div
                      key={
                        action.id
                      }
                      className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/20"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                        {/* Main */}

                        <div className="flex min-w-0 flex-1 gap-3">

                          <div className="pt-1">
                            {action.status ===
                            "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3
                                className={cn(
                                  "font-semibold",
                                  action.status ===
                                    "completed" &&
                                    "text-muted-foreground line-through"
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
                            </div>

                            {action.description ? (
                              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                                {
                                  action.description
                                }
                              </p>
                            ) : null}

                            {/* Metadata */}

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">

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

                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />

                                {
                                  action.meetingTitle
                                }
                              </span>

                              {action.ownerName ? (
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="h-3.5 w-3.5" />

                                  {
                                    action.ownerName
                                  }
                                </span>
                              ) : null}

                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 font-medium",
                                  dueMeta.className
                                )}
                              >
                                <Clock3 className="h-3.5 w-3.5" />

                                {
                                  dueMeta.label
                                }
                              </span>

                              {action.agendaItemTitle ? (
                                <span>
                                  Agenda:{" "}
                                  {
                                    action.agendaItemTitle
                                  }
                                </span>
                              ) : null}

                            </div>
                          </div>
                        </div>

                        {/* Actions */}

                        <div className="flex shrink-0 flex-wrap items-center gap-2">

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

          {/* Count */}

          {!isLoading &&
          actions.length > 0 ? (
            <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
              Showing{" "}
              {
                actions.length
              }{" "}
              of{" "}
              {count}{" "}
              action item
              {count === 1
                ? ""
                : "s"}
            </div>
          ) : null}

        </CardContent>
      </Card>
    </div>
  )
}