"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type MeetingStatus =
  | "scheduled"
  | "completed"
  | "cancelled"

export type MeetingListItem = {
  id: string

  vendorId: string
  vendorName: string
  vendorColor: string | null

  title: string
  meetingType: string | null
  status: MeetingStatus

  scheduledAt: string
  durationMinutes: number | null

  location: string | null
  meetingLink: string | null

  summary: string | null
  internalNotes: string | null

  agendaItemCount: number
  actionItemCount: number
  openActionItemCount: number

  createdAt: string
  updatedAt: string
}

export type MeetingSummary = {
  total: number
  upcoming: number
  today: number
  thisWeek: number
  next7Days: number
  completed: number
  cancelled: number
  openActions: number
  agendaItems: number
  vendors: number
}

export type MeetingPagination = {
  page: number
  pageSize: number
  totalPages: number
}

type UseMeetingsOptions = {
  status?: string
  date?: string
  vendorId?: string
  meetingType?: string
  search?: string

  page?: number
  pageSize?: number
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_SUMMARY: MeetingSummary = {
  total: 0,
  upcoming: 0,
  today: 0,
  thisWeek: 0,
  next7Days: 0,
  completed: 0,
  cancelled: 0,
  openActions: 0,
  agendaItems: 0,
  vendors: 0,
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useMeetings({
  status,
  date,
  vendorId,
  meetingType,
  search,
  page = 1,
  pageSize = 25,
}: UseMeetingsOptions = {}) {
  const [
    meetings,
    setMeetings,
  ] = useState<MeetingListItem[]>([])

  const [
    count,
    setCount,
  ] = useState(0)

  const [
    summary,
    setSummary,
  ] = useState<MeetingSummary>(
    EMPTY_SUMMARY
  )

  const [
    pagination,
    setPagination,
  ] = useState<MeetingPagination>({
    page,
    pageSize,
    totalPages: 1,
  })

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  /* ------------------------------------------------------------------------ */
  /* Fetch                                                                    */
  /* ------------------------------------------------------------------------ */

  const fetchMeetings = useCallback(
    async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params =
          new URLSearchParams()

        if (
          status &&
          status !== "all"
        ) {
          params.set(
            "status",
            status
          )
        }

        if (
          date &&
          date !== "all"
        ) {
          params.set(
            "date",
            date
          )
        }

        if (
          vendorId &&
          vendorId !== "all"
        ) {
          params.set(
            "vendorId",
            vendorId
          )
        }

        if (
          meetingType?.trim()
        ) {
          params.set(
            "meetingType",
            meetingType.trim()
          )
        }

        if (
          search?.trim()
        ) {
          params.set(
            "search",
            search.trim()
          )
        }

        params.set(
          "page",
          String(page)
        )

        params.set(
          "pageSize",
          String(pageSize)
        )

        const response = await fetch(
          `/api/meetings?${params.toString()}`,
          {
            cache: "no-store",
          }
        )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load meetings"
          )
        }

        /* ------------------------------------------------------------------ */
        /* Meetings                                                           */
        /* ------------------------------------------------------------------ */

        setMeetings(
          Array.isArray(data.meetings)
            ? data.meetings
            : []
        )

        /* ------------------------------------------------------------------ */
        /* Count                                                              */
        /* ------------------------------------------------------------------ */

        const totalCount =
          Number(data.count) || 0

        setCount(totalCount)

        /* ------------------------------------------------------------------ */
        /* Summary                                                            */
        /* ------------------------------------------------------------------ */

        const apiSummary =
          data.summary

        setSummary({
          total:
            Number(apiSummary?.total) || 0,

          upcoming:
            Number(apiSummary?.upcoming) || 0,

          today:
            Number(apiSummary?.today) || 0,

          thisWeek:
            Number(apiSummary?.thisWeek) || 0,

          next7Days:
            Number(apiSummary?.next7Days) || 0,

          completed:
            Number(apiSummary?.completed) || 0,

          cancelled:
            Number(apiSummary?.cancelled) || 0,

          openActions:
            Number(apiSummary?.openActions) || 0,

          agendaItems:
            Number(apiSummary?.agendaItems) || 0,

          vendors:
            Number(apiSummary?.vendors) || 0,
        })

        /* ------------------------------------------------------------------ */
        /* Pagination                                                         */
        /* ------------------------------------------------------------------ */

        setPagination({
          page:
            Number(data.pagination?.page) ||
            page,

          pageSize:
            Number(data.pagination?.pageSize) ||
            pageSize,

          totalPages:
            Math.max(
              Number(
                data.pagination?.totalPages
              ) ||
                Math.ceil(
                  totalCount / pageSize
                ),
              1
            ),
        })
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load meetings"
        )

        setMeetings([])
        setCount(0)
        setSummary(EMPTY_SUMMARY)

        setPagination({
          page,
          pageSize,
          totalPages: 1,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [
      status,
      date,
      vendorId,
      meetingType,
      search,
      page,
      pageSize,
    ]
  )

  /* ------------------------------------------------------------------------ */
  /* Initial Load / Filter Changes                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  /* ------------------------------------------------------------------------ */
  /* Return                                                                   */
  /* ------------------------------------------------------------------------ */

  return {
    meetings,
    count,
    summary,
    pagination,
    isLoading,
    error,
    refetch: fetchMeetings,
  }
}