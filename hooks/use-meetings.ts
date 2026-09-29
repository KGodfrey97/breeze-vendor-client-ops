"use client"

import {
  useEffect,
  useState,
} from "react"

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

type UseMeetingsOptions = {
  status?: string
  date?: string
  vendorId?: string
  meetingType?: string
  search?: string

  page?: number
  pageSize?: number
}

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
  ] =
    useState<MeetingListItem[]>(
      []
    )

  const [
    count,
    setCount,
  ] = useState(0)

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  const fetchMeetings =
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

        const response =
          await fetch(
            `/api/meetings?${params.toString()}`,
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
              "Failed to load meetings"
          )
        }

        setMeetings(
          data.meetings ||
            []
        )

        setCount(
          data.count || 0
        )
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load meetings"
        )

        setMeetings([])
        setCount(0)
      } finally {
        setIsLoading(false)
      }
    }

  useEffect(() => {
    fetchMeetings()
  }, [
    status,
    date,
    vendorId,
    meetingType,
    search,
    page,
    pageSize,
  ])

  return {
    meetings,
    count,
    isLoading,
    error,

    refetch:
      fetchMeetings,
  }
}