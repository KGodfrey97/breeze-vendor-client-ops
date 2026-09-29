"use client"

import Link from "next/link"

import {
  AlertCircle,
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

function getDueMeta(
  value: string | null
) {
  if (!value) {
    return {
      label:
        "No due date",

      tone:
        "text-muted-foreground",

      icon:
        Clock3,
    }
  }

  const date =
    parseDate(value)

  if (!date) {
    return {
      label:
        "No due date",

      tone:
        "text-muted-foreground",

      icon:
        Clock3,
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

      tone:
        "text-warning",

      icon:
        Clock3,
    }
  }

  return {
    label:
      formatDate(value),

    tone:
      "text-muted-foreground",

    icon:
      Clock3,
  }
}

export function DashboardUpcomingActions({
  actions,
}: DashboardUpcomingActionsProps) {
  if (
    actions.length === 0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-primary" />

        <p className="font-medium">
          No open actions
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          There are no open or in-progress action items.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {actions.map(
        (action) => {
          const dueMeta =
            getDueMeta(
              action.dueDate
            )

          const DueIcon =
            dueMeta.icon

          return (
            <div
              key={action.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">

                <div className="mt-0.5 shrink-0">
                  {action.status ===
                  "in_progress" ? (
                    <Circle className="h-5 w-5 text-warning" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">

                  <p className="font-semibold text-foreground">
                    {
                      action.title
                    }
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">

                    <Link
                      href={`/vendors/view/${action.vendorId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {
                        action.vendorName
                      }
                    </Link>

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
                        dueMeta.tone
                      )}
                    >
                      <DueIcon className="h-3.5 w-3.5" />

                      {
                        dueMeta.label
                      }
                    </span>
                  </div>

                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    Meeting:{" "}
                    {
                      action.meetingTitle
                    }
                  </p>
                </div>

              </div>
            </div>
          )
        }
      )}

      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href="/actions">
            View All Actions
          </Link>
        </Button>
      </div>
    </div>
  )
}