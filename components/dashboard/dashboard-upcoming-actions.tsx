"use client"

import Link from "next/link"

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DashboardAction = {
  id: string
  vendorId: string
  vendorName: string
  meetingId: string
  title: string
  ownerName: string | null
  dueDate: string | null
  status:
    | "open"
    | "in_progress"
  meetingTitle: string
}

type DashboardUpcomingActionsProps = {
  actions: DashboardAction[]
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

  const [
    year,
    month,
    day,
  ] = value
    .slice(0, 10)
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
    }
  )
}

function getDaysUntilDue(
  value: string | null
) {
  const date =
    parseDate(value)

  if (!date) {
    return null
  }

  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  return Math.round(
    (
      date.getTime() -
      today.getTime()
    ) /
      86_400_000
  )
}

function getDueMeta(
  value: string | null
) {
  const diff =
    getDaysUntilDue(
      value
    )

  if (diff == null) {
    return {
      label:
        "No due date",

      tone:
        "text-muted-foreground",

      icon:
        Clock3,

      isOverdue:
        false,
    }
  }

  if (diff < 0) {
    const days =
      Math.abs(diff)

    return {
      label:
        `${days} day${
          days === 1
            ? ""
            : "s"
        } overdue`,

      tone:
        "text-destructive",

      icon:
        AlertCircle,

      isOverdue:
        true,
    }
  }

  if (diff === 0) {
    return {
      label:
        "Due today",

      tone:
        "text-warning",

      icon:
        Clock3,

      isOverdue:
        false,
    }
  }

  if (diff === 1) {
    return {
      label:
        "Due tomorrow",

      tone:
        "text-warning",

      icon:
        Clock3,

      isOverdue:
        false,
    }
  }

  if (diff <= 7) {
    return {
      label:
        `Due in ${diff} days`,

      tone:
        "text-warning",

      icon:
        Clock3,

      isOverdue:
        false,
    }
  }

  return {
    label:
      formatDate(value),

    tone:
      "text-muted-foreground",

    icon:
      Clock3,

    isOverdue:
      false,
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function DashboardUpcomingActions({
  actions,
}: DashboardUpcomingActionsProps) {
  /*
   * Sort by urgency:
   *
   * 1. Overdue
   * 2. Due today
   * 3. Upcoming
   * 4. No due date
   */
  const sortedActions =
    [...actions].sort(
      (a, b) => {
        const aDiff =
          getDaysUntilDue(
            a.dueDate
          )

        const bDiff =
          getDaysUntilDue(
            b.dueDate
          )

        if (
          aDiff == null &&
          bDiff == null
        ) {
          return 0
        }

        if (aDiff == null) {
          return 1
        }

        if (bDiff == null) {
          return -1
        }

        return (
          aDiff - bDiff
        )
      }
    )

  /* ------------------------------------------------------------------------ */
  /* Empty State                                                              */
  /* ------------------------------------------------------------------------ */

  if (
    sortedActions.length ===
    0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>

        <p className="mt-3 font-medium">
          No open actions
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          There are no open or
          in-progress action
          items.
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          asChild
        >
          <Link href="/actions">
            View actions
          </Link>
        </Button>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Actions                                                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-3">
      {sortedActions.map(
        (action) => {
          const dueMeta =
            getDueMeta(
              action.dueDate
            )

          const DueIcon =
            dueMeta.icon

          const isInProgress =
            action.status ===
            "in_progress"

          return (
            <div
              key={action.id}
              className={cn(
                "group rounded-xl border bg-card p-4 transition-all",
                "hover:bg-muted/20 hover:shadow-sm",
                dueMeta.isOverdue
                  ? "border-destructive/30 hover:border-destructive/50"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="flex items-start gap-3">
                {/* ------------------------------------------------------ */}
                {/* Status Indicator                                       */}
                {/* ------------------------------------------------------ */}

                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isInProgress
                      ? "bg-warning/10"
                      : "bg-muted"
                  )}
                >
                  <Circle
                    className={cn(
                      "h-4 w-4",
                      isInProgress
                        ? "fill-warning/20 text-warning"
                        : "text-muted-foreground"
                    )}
                  />
                </div>

                {/* ------------------------------------------------------ */}
                {/* Action Content                                         */}
                {/* ------------------------------------------------------ */}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {
                        action.title
                      }
                    </p>

                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        isInProgress
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isInProgress
                        ? "In Progress"
                        : "Open"}
                    </span>
                  </div>

                  {/* Vendor / Owner / Due */}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <Link
                      href={`/vendors/view/${action.vendorId}`}
                      className="font-medium text-foreground transition-colors hover:underline"
                    >
                      {
                        action.vendorName
                      }
                    </Link>

                    {action.ownerName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 shrink-0" />

                        {
                          action.ownerName
                        }
                      </span>
                    ) : null}

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-medium",
                        dueMeta.tone
                      )}
                    >
                      <DueIcon className="h-3.5 w-3.5 shrink-0" />

                      {
                        dueMeta.label
                      }
                    </span>
                  </div>

                  {/* Meeting Context */}

                  <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="shrink-0">
                      From:
                    </span>

                    <span className="truncate">
                      {
                        action.meetingTitle
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      )}

      {/* ---------------------------------------------------------------- */}
      {/* View All                                                         */}
      {/* ---------------------------------------------------------------- */}

      <div className="flex justify-end border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href="/actions">
            View all actions

            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}