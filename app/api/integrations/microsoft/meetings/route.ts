import { NextRequest, NextResponse } from "next/server"

import { requireAuthenticatedProfile } from "@/lib/auth-server"
import { getMicrosoftAccessToken } from "@/lib/microsoft"

type MicrosoftEmailAddress = {
  name?: string | null
  address?: string | null
}

type MicrosoftAttendee = {
  type?: "required" | "optional" | "resource" | string
  status?: {
    response?: string
    time?: string
  }
  emailAddress?: MicrosoftEmailAddress
}

type MicrosoftDateTime = {
  dateTime: string
  timeZone: string
}

type MicrosoftLocation = {
  displayName?: string | null
  locationType?: string | null
  uniqueId?: string | null
  uniqueIdType?: string | null
}

type MicrosoftOnlineMeeting = {
  joinUrl?: string | null
}

type MicrosoftEvent = {
  id: string
  subject?: string | null
  bodyPreview?: string | null

  start?: MicrosoftDateTime
  end?: MicrosoftDateTime

  organizer?: {
    emailAddress?: MicrosoftEmailAddress
  }

  attendees?: MicrosoftAttendee[]

  location?: MicrosoftLocation

  webLink?: string | null

  isOnlineMeeting?: boolean

  onlineMeeting?: MicrosoftOnlineMeeting | null

  onlineMeetingProvider?: string | null

  isCancelled?: boolean

  isAllDay?: boolean

  seriesMasterId?: string | null

  type?: string | null

  showAs?: string | null

  sensitivity?: string | null

  responseStatus?: {
    response?: string
    time?: string
  }
}

type MicrosoftCalendarViewResponse = {
  value: MicrosoftEvent[]
  "@odata.nextLink"?: string
}

export async function GET(request: NextRequest) {
  try {
    /*
     * -----------------------------------------------------
     * 1. Require authenticated Breeze profile
     * -----------------------------------------------------
     */

    const { profile } =
      await requireAuthenticatedProfile()

    /*
     * -----------------------------------------------------
     * 2. Get valid Microsoft access token
     *
     * getMicrosoftAccessToken() will automatically refresh
     * the token if it is expired or close to expiring.
     * -----------------------------------------------------
     */

    const accessToken =
      await getMicrosoftAccessToken(profile.id)

    /*
     * -----------------------------------------------------
     * 3. Determine date range
     *
     * Defaults:
     *   30 days in the past
     *   90 days in the future
     *
     * We also allow optional start/end query parameters.
     *
     * Example:
     *
     * /api/integrations/microsoft/meetings
     *   ?start=2026-09-01T00:00:00Z
     *   &end=2026-12-31T23:59:59Z
     * -----------------------------------------------------
     */

    const searchParams =
      request.nextUrl.searchParams

    const requestedStart =
      searchParams.get("start")

    const requestedEnd =
      searchParams.get("end")

    const now = new Date()

    const defaultStart = new Date(now)
    defaultStart.setDate(
      defaultStart.getDate() - 30
    )

    const defaultEnd = new Date(now)
    defaultEnd.setDate(
      defaultEnd.getDate() + 90
    )

    const startDate = requestedStart
      ? new Date(requestedStart)
      : defaultStart

    const endDate = requestedEnd
      ? new Date(requestedEnd)
      : defaultEnd

    /*
     * Validate supplied dates.
     */
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid start or end date",
        },
        {
          status: 400,
        }
      )
    }

    if (
      startDate.getTime() >=
      endDate.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "The start date must be before the end date",
        },
        {
          status: 400,
        }
      )
    }

    /*
     * -----------------------------------------------------
     * 4. Build Microsoft Graph calendarView request
     * -----------------------------------------------------
     *
     * calendarView is better than /me/events here because
     * it expands recurring meetings into their individual
     * occurrences inside this date range.
     * -----------------------------------------------------
     */

    const graphUrl = new URL(
      "https://graph.microsoft.com/v1.0/me/calendar/calendarView"
    )

    graphUrl.searchParams.set(
      "startDateTime",
      startDate.toISOString()
    )

    graphUrl.searchParams.set(
      "endDateTime",
      endDate.toISOString()
    )

    /*
     * Only request the fields Breeze needs right now.
     */
    graphUrl.searchParams.set(
      "$select",
      [
        "id",
        "subject",
        "bodyPreview",
        "start",
        "end",
        "organizer",
        "attendees",
        "location",
        "webLink",
        "isOnlineMeeting",
        "onlineMeeting",
        "onlineMeetingProvider",
        "isCancelled",
        "isAllDay",
        "seriesMasterId",
        "type",
        "showAs",
        "sensitivity",
        "responseStatus",
      ].join(",")
    )

    graphUrl.searchParams.set(
      "$orderby",
      "start/dateTime"
    )

    /*
     * Microsoft can return pages of events.
     * $top reduces how many round trips we need.
     */
    graphUrl.searchParams.set(
      "$top",
      "100"
    )

    /*
     * -----------------------------------------------------
     * 5. Retrieve all calendar pages
     * -----------------------------------------------------
     */

    const events: MicrosoftEvent[] = []

    let nextUrl: string | null =
      graphUrl.toString()

    while (nextUrl) {
      const response = await fetch(
        nextUrl,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            /*
             * Return start/end values in Pacific time.
             *
             * Later we can store a per-user timezone
             * preference instead of hard-coding this.
             */
            Prefer:
              'outlook.timezone="Pacific Standard Time"',
          },
          cache: "no-store",
        }
      )

      if (!response.ok) {
        const errorText =
          await response.text()

        console.error(
          "Microsoft calendarView request failed:",
          response.status,
          errorText
        )

        /*
         * Microsoft account may have been disconnected,
         * consent revoked, etc.
         */
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          return NextResponse.json(
            {
              error:
                "Microsoft calendar access is unavailable. Please reconnect your Microsoft account.",
            },
            {
              status: response.status,
            }
          )
        }

        throw new Error(
          `Microsoft Graph calendar request failed with status ${response.status}`
        )
      }

      const data =
        (await response.json()) as MicrosoftCalendarViewResponse

      events.push(
        ...(data.value ?? [])
      )

      nextUrl =
        data["@odata.nextLink"] ??
        null
    }

    /*
     * -----------------------------------------------------
     * 6. Convert Graph response into a Breeze-friendly shape
     * -----------------------------------------------------
     */

    const meetings = events.map(
      (event) => ({
        outlookEventId: event.id,

        subject:
          event.subject ??
          "(No title)",

        bodyPreview:
          event.bodyPreview ?? null,

        start:
          event.start ?? null,

        end:
          event.end ?? null,

        organizer: {
          name:
            event.organizer
              ?.emailAddress
              ?.name ?? null,

          email:
            event.organizer
              ?.emailAddress
              ?.address ?? null,
        },

        attendees:
          event.attendees?.map(
            (attendee) => ({
              name:
                attendee.emailAddress
                  ?.name ?? null,

              email:
                attendee.emailAddress
                  ?.address ?? null,

              type:
                attendee.type ?? null,

              response:
                attendee.status
                  ?.response ?? null,
            })
          ) ?? [],

        location:
          event.location
            ?.displayName ?? null,

        webLink:
          event.webLink ?? null,

        isOnlineMeeting:
          event.isOnlineMeeting ??
          false,

        onlineMeetingProvider:
          event.onlineMeetingProvider ??
          null,

        joinUrl:
          event.onlineMeeting
            ?.joinUrl ?? null,

        isCancelled:
          event.isCancelled ??
          false,

        isAllDay:
          event.isAllDay ??
          false,

        seriesMasterId:
          event.seriesMasterId ??
          null,

        eventType:
          event.type ?? null,

        showAs:
          event.showAs ?? null,

        sensitivity:
          event.sensitivity ??
          null,

        responseStatus:
          event.responseStatus
            ?.response ?? null,
      })
    )

    /*
     * -----------------------------------------------------
     * 7. Return meetings
     * -----------------------------------------------------
     */

    return NextResponse.json({
      connected: true,

      range: {
        start:
          startDate.toISOString(),

        end:
          endDate.toISOString(),
      },

      count:
        meetings.length,

      meetings,
    })
  } catch (error) {
    console.error(
      "Failed to load Microsoft meetings:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error"

    /*
     * Makes an unconnected account easier to handle
     * from the frontend later.
     */
    if (
      message ===
      "Microsoft account is not connected"
    ) {
      return NextResponse.json(
        {
          connected: false,
          meetings: [],
          error:
            "Microsoft account is not connected",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json(
      {
        error:
          "Unable to load Microsoft meetings",
      },
      {
        status: 500,
      }
    )
  }
}