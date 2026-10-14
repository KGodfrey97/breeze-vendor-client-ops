"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ActionStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"

export type ActionStatusFilter =
  | ActionStatus
  | "active"
  | "all"

export type ActionDueFilter =
  | "overdue"
  | "today"
  | "upcoming"
  | "no_due_date"
  | "all"

export type ActionItem = {
  id: string
  meetingId: string
  agendaItemId: string | null

  title: string
  description: string | null
  ownerName: string | null
  dueDate: string | null

  status:
    ActionStatus

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

export type ActionSummary = {
  active: number
  open: number
  inProgress: number
  completed: number
  cancelled: number
  overdue: number
  dueToday: number
  noDueDate: number
}

export type ActionPagination = {
  page: number
  pageSize: number
  totalPages: number
}

type UseActionsOptions = {
  status?:
    ActionStatusFilter

  due?:
    ActionDueFilter

  vendorId?: string
  search?: string
  page?: number
  pageSize?: number
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_SUMMARY: ActionSummary = {
  active: 0,
  open: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
  overdue: 0,
  dueToday: 0,
  noDueDate: 0,
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

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
  ] =
    useState(0)

  const [
    summary,
    setSummary,
  ] =
    useState<ActionSummary>(
      EMPTY_SUMMARY
    )

  const [
    pagination,
    setPagination,
  ] =
    useState<ActionPagination>({
      page,
      pageSize,
      totalPages: 1,
    })

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  /* ------------------------------------------------------------------------ */
  /* Fetch                                                                    */
  /* ------------------------------------------------------------------------ */

  const fetchActions =
    useCallback(
      async () => {
        try {
          setIsLoading(
            true
          )

          setError(
            null
          )

          const params =
            new URLSearchParams()

          if (
            status &&
            status !==
              "all"
          ) {
            params.set(
              "status",
              status
            )
          }

          if (
            due &&
            due !==
              "all"
          ) {
            params.set(
              "due",
              due
            )
          }

          if (
            vendorId &&
            vendorId !==
              "all"
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
                cache:
                  "no-store",
              }
            )

          const data =
            await response.json()

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ||
                "Failed to load action items"
            )
          }

          setActions(
            data.actions ||
              []
          )

          setCount(
            Number(
              data.count
            ) || 0
          )

          setSummary({
            active:
              Number(
                data.summary
                  ?.active
              ) || 0,

            open:
              Number(
                data.summary
                  ?.open
              ) || 0,

            inProgress:
              Number(
                data.summary
                  ?.inProgress
              ) || 0,

            completed:
              Number(
                data.summary
                  ?.completed
              ) || 0,

            cancelled:
              Number(
                data.summary
                  ?.cancelled
              ) || 0,

            overdue:
              Number(
                data.summary
                  ?.overdue
              ) || 0,

            dueToday:
              Number(
                data.summary
                  ?.dueToday
              ) || 0,

            noDueDate:
              Number(
                data.summary
                  ?.noDueDate
              ) || 0,
          })

          setPagination({
            page:
              Number(
                data.pagination
                  ?.page
              ) || page,

            pageSize:
              Number(
                data.pagination
                  ?.pageSize
              ) ||
              pageSize,

            totalPages:
              Math.max(
                Number(
                  data.pagination
                    ?.totalPages
                ) || 1,
                1
              ),
          })
        } catch (
          error
        ) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Failed to load action items"
          )

          setActions(
            []
          )

          setCount(0)

          setSummary(
            EMPTY_SUMMARY
          )

          setPagination({
            page,
            pageSize,
            totalPages: 1,
          })
        } finally {
          setIsLoading(
            false
          )
        }
      },
      [
        status,
        due,
        vendorId,
        search,
        page,
        pageSize,
      ]
    )

  /* ------------------------------------------------------------------------ */
  /* Load                                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  /* ------------------------------------------------------------------------ */
  /* Return                                                                   */
  /* ------------------------------------------------------------------------ */

  return {
    actions,
    count,
    summary,
    pagination,
    isLoading,
    error,
    refetch:
      fetchActions,
  }
}