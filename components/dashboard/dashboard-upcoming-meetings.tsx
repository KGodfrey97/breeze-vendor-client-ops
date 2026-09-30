"use client"

import Link from "next/link"

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  Video,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type UpcomingMeeting = {
  meetingId: string
  vendorId: string
  vendorName: string
  title: string
  meetingType: string | null
  scheduledAt: string
  durationMinutes: number | null
  location: string | null
  meetingLink: string | null
}

type DashboardUpcomingMeetingsProps = {
  meetings: UpcomingMeeting[]
}

/* -------------------------------------------------------------------------- */
/* Date Helpers                                                               */
/* -------------------------------------------------------------------------- */

function formatDateTime(
  value: string
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      month: "—",
      day: "—",
      date: "—",
      time: "—",
      relativeDate: null,
    }
  }

  const now =
    new Date()

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )

  const startOfMeetingDay =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )

  const dayDifference =
    Math.round(
      (
        startOfMeetingDay.getTime() -
        startOfToday.getTime()
      ) /
        86_400_000
    )

  let relativeDate:
    | string
    | null = null

  if (dayDifference === 0) {
    relativeDate =
      "Today"
  } else if (
    dayDifference === 1
  ) {
    relativeDate =
      "Tomorrow"
  } else if (
    dayDifference > 1 &&
    dayDifference <= 7
  ) {
    relativeDate =
      date.toLocaleDateString(
        "en-US",
        {
          weekday: "long",
        }
      )
  }

  return {
    month:
      date
        .toLocaleDateString(
          "en-US",
          {
            month: "short",
          }
        )
        .toUpperCase(),

    day:
      date.toLocaleDateString(
        "en-US",
        {
          day: "numeric",
        }
      ),

    date:
      date.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      ),

    time:
      date.toLocaleTimeString(
        "en-US",
        {
          hour: "numeric",
          minute: "2-digit",
        }
      ),

    relativeDate,
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function DashboardUpcomingMeetings({
  meetings,
}: DashboardUpcomingMeetingsProps) {
  /*
   * Sort defensively even if the
   * API already returns meetings
   * chronologically.
   */
  const sortedMeetings =
    [...meetings].sort(
      (a, b) =>
        new Date(
          a.scheduledAt
        ).getTime() -
        new Date(
          b.scheduledAt
        ).getTime()
    )

  /* ------------------------------------------------------------------------ */
  /* Empty State                                                              */
  /* ------------------------------------------------------------------------ */

  if (
    sortedMeetings.length ===
    0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </div>

        <p className="mt-3 font-medium">
          No upcoming meetings
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Scheduled vendor
          meetings will appear
          here.
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          asChild
        >
          <Link href="/meetings">
            View meetings
          </Link>
        </Button>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Meetings                                                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-3">
      {sortedMeetings.map(
        (meeting) => {
          const formatted =
            formatDateTime(
              meeting.scheduledAt
            )

          return (
            <div
              key={
                meeting.meetingId
              }
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:bg-muted/20 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                {/* ------------------------------------------------------ */}
                {/* Date                                                   */}
                {/* ------------------------------------------------------ */}

                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {
                      formatted.month
                    }
                  </span>

                  <span className="text-lg font-bold leading-none">
                    {
                      formatted.day
                    }
                  </span>
                </div>

                {/* ------------------------------------------------------ */}
                {/* Meeting Information                                    */}
                {/* ------------------------------------------------------ */}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">
                      {
                        meeting.title
                      }
                    </p>

                    {formatted.relativeDate && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {
                          formatted.relativeDate
                        }
                      </span>
                    )}
                  </div>

                  {/* Vendor */}

                  <Link
                    href={`/vendors/view/${meeting.vendorId}`}
                    className="mt-0.5 inline-block truncate text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {
                      meeting.vendorName
                    }
                  </Link>

                  {/* Meeting Details */}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" />

                      <span>
                        {
                          formatted.date
                        }
                        {" • "}
                        {
                          formatted.time
                        }
                      </span>
                    </span>

                    {meeting.durationMinutes ? (
                      <span className="whitespace-nowrap">
                        {
                          meeting.durationMinutes
                        }{" "}
                        min
                      </span>
                    ) : null}

                    {meeting.location ? (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />

                        <span className="max-w-[180px] truncate">
                          {
                            meeting.location
                          }
                        </span>
                      </span>
                    ) : null}
                  </div>

                  {/* Meeting Type */}

                  {meeting.meetingType ? (
                    <div className="mt-2">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {
                          meeting.meetingType
                        }
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* ------------------------------------------------------ */}
                {/* Join Meeting                                           */}
                {/* ------------------------------------------------------ */}

                {meeting.meetingLink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    asChild
                  >
                    <a
                      href={
                        meeting.meetingLink
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video className="mr-2 h-4 w-4" />

                      Join

                      <ExternalLink className="ml-2 h-3 w-3 text-muted-foreground" />
                    </a>
                  </Button>
                ) : null}
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
          <Link href="/meetings">
            View all meetings

            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}