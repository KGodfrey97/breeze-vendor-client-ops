"use client"

import Link from "next/link"

import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
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

function formatDateTime(
  value: string
) {
  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      date: "—",
      time: "—",
    }
  }

  return {
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
  }
}

export function DashboardUpcomingMeetings({
  meetings,
}: DashboardUpcomingMeetingsProps) {
  if (
    meetings.length === 0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

        <p className="font-medium">
          No upcoming meetings
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Scheduled vendor meetings will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {meetings.map(
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
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">

                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <span className="text-xs font-medium uppercase">
                    {
                      formatted.date.split(
                        " "
                      )[0]
                    }
                  </span>

                  <span className="text-lg font-bold leading-none">
                    {
                      formatted.date.split(
                        " "
                      )[1]
                    }
                  </span>
                </div>

                <div className="min-w-0 flex-1">

                  <Link
                    href={`/vendors/view/${meeting.vendorId}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {
                      meeting.title
                    }
                  </Link>

                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {
                      meeting.vendorName
                    }
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">

                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />

                      {
                        formatted.date
                      }

                      {" • "}

                      {
                        formatted.time
                      }
                    </span>

                    {meeting.durationMinutes ? (
                      <span>
                        {
                          meeting.durationMinutes
                        }{" "}
                        min
                      </span>
                    ) : null}

                    {meeting.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />

                        {
                          meeting.location
                        }
                      </span>
                    ) : null}

                  </div>

                  {meeting.meetingType ? (
                    <div className="mt-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {
                          meeting.meetingType
                        }
                      </span>
                    </div>
                  ) : null}
                </div>

                {meeting.meetingLink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={
                        meeting.meetingLink
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Join
                    </a>
                  </Button>
                ) : null}

              </div>
            </div>
          )
        }
      )}
    </div>
  )
}