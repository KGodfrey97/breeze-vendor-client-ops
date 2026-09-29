"use client"

import {
  useEffect,
  useState,
} from "react"

export type ActionItem = {
  id: string
  meetingId: string
  agendaItemId: string | null

  title: string
  description: string | null
  ownerName: string | null
  dueDate: string | null
  status:
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled"

  isVendorVisible: boolean

  vendorId: string
  vendorName: string
  vendorColor: string | null

  meetingTitle: string
  meetingScheduledAt: string

  agendaItemTitle: string | null

  createdAt: string
  updatedAt: string
}

type UseActionsOptions = {
  status?: string
  due?: string
  vendorId?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useActions({
  status,
  due,
  vendorId,
  search,
  page = 1,
  pageSize = 25,
}: UseActionsOptions = {}) {
  const [
    actions,
    setActions,
  ] =
    useState<ActionItem[]>(
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

  const fetchActions =
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
          due &&
          due !== "all"
        ) {
          params.set(
            "due",
            due
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
            `/api/actions?${params.toString()}`,
            {
              cache: "no-store",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load action items"
          )
        }

        setActions(
          data.actions || []
        )

        setCount(
          data.count || 0
        )
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load action items"
        )

        setActions([])
        setCount(0)
      } finally {
        setIsLoading(false)
      }
    }

  useEffect(() => {
    fetchActions()
  }, [
    status,
    due,
    vendorId,
    search,
    page,
    pageSize,
  ])

  return {
    actions,
    count,
    isLoading,
    error,
    refetch:
      fetchActions,
  }
}