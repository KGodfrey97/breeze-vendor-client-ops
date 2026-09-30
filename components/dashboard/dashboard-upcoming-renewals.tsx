"use client"

import Link from "next/link"

import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Clock3,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type UpcomingRenewal = {
  vendorId: string
  vendorName: string
  contractId: string
  contractName: string
  renewalDate: string
}

type DashboardUpcomingRenewalsProps = {
  renewals: UpcomingRenewal[]
}

/* -------------------------------------------------------------------------- */
/* Date Helpers                                                               */
/* -------------------------------------------------------------------------- */

function parseDate(
  value: string
) {
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
  value: string
) {
  const date =
    parseDate(value)

  if (!date) {
    return "—"
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

function getDaysUntil(
  value: string
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

/* -------------------------------------------------------------------------- */
/* Renewal Metadata                                                           */
/* -------------------------------------------------------------------------- */

function getRenewalMeta(
  renewalDate: string
) {
  const daysUntil =
    getDaysUntil(
      renewalDate
    )

  if (daysUntil == null) {
    return {
      label: "Date unavailable",
      tone:
        "text-muted-foreground",
      borderTone:
        "border-border",
      badgeTone:
        "bg-muted text-muted-foreground",
      icon: CalendarClock,
      urgency:
        Number.MAX_SAFE_INTEGER,
    }
  }

  /*
   * This normally shouldn't happen
   * because the dashboard API should
   * only return upcoming renewals,
   * but handling it makes the
   * component safer.
   */
  if (daysUntil < 0) {
    const daysOverdue =
      Math.abs(daysUntil)

    return {
      label:
        `${daysOverdue} day${
          daysOverdue === 1
            ? ""
            : "s"
        } overdue`,
      tone:
        "text-destructive",
      borderTone:
        "border-destructive/30",
      badgeTone:
        "bg-destructive/10 text-destructive",
      icon: AlertCircle,
      urgency: daysUntil,
    }
  }

  if (daysUntil === 0) {
    return {
      label:
        "Renews today",
      tone:
        "text-destructive",
      borderTone:
        "border-destructive/30",
      badgeTone:
        "bg-destructive/10 text-destructive",
      icon: AlertCircle,
      urgency: 0,
    }
  }

  if (daysUntil === 1) {
    return {
      label:
        "Renews tomorrow",
      tone:
        "text-destructive",
      borderTone:
        "border-destructive/30",
      badgeTone:
        "bg-destructive/10 text-destructive",
      icon: AlertCircle,
      urgency: 1,
    }
  }

  if (daysUntil <= 30) {
    return {
      label:
        `${daysUntil} days`,
      tone:
        "text-destructive",
      borderTone:
        "border-destructive/30",
      badgeTone:
        "bg-destructive/10 text-destructive",
      icon: AlertCircle,
      urgency: daysUntil,
    }
  }

  if (daysUntil <= 60) {
    return {
      label:
        `${daysUntil} days`,
      tone:
        "text-warning",
      borderTone:
        "border-warning/30",
      badgeTone:
        "bg-warning/10 text-warning",
      icon: Clock3,
      urgency: daysUntil,
    }
  }

  return {
    label:
      `${daysUntil} days`,
    tone:
      "text-muted-foreground",
    borderTone:
      "border-border",
    badgeTone:
      "bg-muted text-muted-foreground",
    icon: CalendarClock,
    urgency: daysUntil,
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function DashboardUpcomingRenewals({
  renewals,
}: DashboardUpcomingRenewalsProps) {
  /*
   * Defensively sort the renewals
   * nearest-to-farthest.
   *
   * Ideally the API also sorts
   * before applying its LIMIT.
   */
  const sortedRenewals =
    [...renewals].sort(
      (a, b) => {
        const aDays =
          getDaysUntil(
            a.renewalDate
          )

        const bDays =
          getDaysUntil(
            b.renewalDate
          )

        if (
          aDays == null &&
          bDays == null
        ) {
          return 0
        }

        if (aDays == null) {
          return 1
        }

        if (bDays == null) {
          return -1
        }

        return (
          aDays - bDays
        )
      }
    )

  /* ------------------------------------------------------------------------ */
  /* Empty State                                                              */
  /* ------------------------------------------------------------------------ */

  if (
    sortedRenewals.length ===
    0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>

        <p className="mt-3 font-medium">
          No upcoming renewals
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          No active vendor
          contracts renew within
          the next 90 days.
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          asChild
        >
          <Link href="/vendors">
            View vendors
          </Link>
        </Button>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Renewal List                                                             */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-3">
      {sortedRenewals.map(
        (renewal) => {
          const meta =
            getRenewalMeta(
              renewal.renewalDate
            )

          const RenewalIcon =
            meta.icon

          return (
            <Link
              key={
                renewal.contractId
              }
              href={`/vendors/view/${renewal.vendorId}`}
              className={cn(
                "group block rounded-xl border bg-card p-4 transition-all",
                "hover:bg-muted/20 hover:shadow-sm",
                meta.borderTone
              )}
            >
              <div className="flex items-center gap-3">
                {/* ------------------------------------------------------ */}
                {/* Icon                                                   */}
                {/* ------------------------------------------------------ */}

                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    meta.badgeTone
                  )}
                >
                  <RenewalIcon className="h-4 w-4" />
                </div>

                {/* ------------------------------------------------------ */}
                {/* Vendor + Contract                                      */}
                {/* ------------------------------------------------------ */}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {
                      renewal.vendorName
                    }
                  </p>

                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {
                      renewal.contractName
                    }
                  </p>
                </div>

                {/* ------------------------------------------------------ */}
                {/* Renewal Date                                           */}
                {/* ------------------------------------------------------ */}

                <div className="ml-3 shrink-0 text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(
                      renewal.renewalDate
                    )}
                  </p>

                  <div
                    className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-xs font-medium",
                      meta.tone
                    )}
                  >
                    <RenewalIcon className="h-3.5 w-3.5" />

                    <span>
                      {meta.label}
                    </span>
                  </div>
                </div>

                {/* ------------------------------------------------------ */}
                {/* Drill Down                                             */}
                {/* ------------------------------------------------------ */}

                <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </Link>
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
          <Link href="/vendors">
            View all vendors

            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}