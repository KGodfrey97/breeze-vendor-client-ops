"use client"

import React from "react"
import type { ReactNode } from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  CalendarClock,
  CircleAlert,
  Clock3,
  ArrowRight,
} from "lucide-react"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { VendorListItem } from "@/hooks/use-vendors"
import { cn } from "@/lib/utils"

import type { Column } from "@/hooks/use-vendors-table-columns"

interface VendorsTableProps {
  vendors: VendorListItem[]
  totalCount: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  sortBy?: string
  sortOrder: "asc" | "desc"
  onSortChange: (sortBy: string) => void
  columns: Column[]
  setColumns: React.Dispatch<
    React.SetStateAction<Column[]>
  >
}


const VENDORS_TABLE_COLUMNS_STORAGE_KEY =
  "vendors-table-columns"

export const DEFAULT_VENDOR_COLUMNS: Column[] = [
  {
    id: "name",
    label: "Vendor",
    visible: true,
    sortKey: "name",
  },
  {
    id: "line_of_business",
    label: "Line of Business",
    visible: true,
    sortKey: "line_of_business",
  },
  {
    id: "vendor_tier",
    label: "Tier",
    visible: true,
    sortKey: "vendor_tier",
  },
  {
    id: "grade",
    label: "Grade",
    visible: true,
    sortKey: "grade",
  },
  {
    id: "status",
    label: "Status",
    visible: true,
    sortKey: "status",
  },
  {
    id: "renewal_date",
    label: "Renewal",
    visible: true,
    sortKey: "renewal_date",
  },
  {
    id: "vendor_code",
    label: "Vendor Code",
    visible: false,
    sortKey: "vendor_code",
  },
  {
    id: "actions",
    label: "Actions",
    visible: true,
  },
]

export const getInitialVendorColumns =
  (): Column[] => {
    if (typeof window === "undefined") {
      return DEFAULT_VENDOR_COLUMNS
    }

    try {
      const stored =
        window.localStorage.getItem(
          VENDORS_TABLE_COLUMNS_STORAGE_KEY
        )

      if (!stored) {
        return DEFAULT_VENDOR_COLUMNS
      }

      const parsed = JSON.parse(
        stored
      ) as Array<
        Pick<Column, "id" | "visible">
      >

      const parsedMap = new Map(
        parsed.map((column) => [
          column.id,
          column.visible,
        ])
      )

      const orderedColumns = parsed
        .map((column) =>
          DEFAULT_VENDOR_COLUMNS.find(
            (defaultColumn) =>
              defaultColumn.id === column.id
          )
        )
        .filter(
          (column): column is Column =>
            Boolean(column)
        )
        .map((column) => ({
          ...column,
          visible:
            parsedMap.get(column.id) ??
            column.visible,
        }))

      const missingColumns =
        DEFAULT_VENDOR_COLUMNS.filter(
          (column) =>
            !orderedColumns.some(
              (orderedColumn) =>
                orderedColumn.id ===
                column.id
            )
        )

      return [
        ...orderedColumns,
        ...missingColumns,
      ]
    } catch {
      return DEFAULT_VENDOR_COLUMNS
    }
  }

interface SortableHeaderProps {
  column: Column
  children: ReactNode
  sortBy?: string
  sortOrder: "asc" | "desc"
  onSortChange: (
    sortBy: string
  ) => void
}

function SortableHeader({
  column,
  children,
  sortBy,
  sortOrder,
  onSortChange,
}: SortableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: !column.visible,
  })

  const style = {
    transform:
      CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!column.visible) {
    return null
  }

  const isSorted =
    column.sortKey === sortBy

  const SortIcon = !column.sortKey
    ? null
    : isSorted
    ? sortOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : null

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className="relative group"
      {...attributes}
    >
      <div className="flex items-center gap-2">
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {column.sortKey ? (
          <button
            type="button"
            onClick={() =>
              onSortChange(
                column.sortKey!
              )
            }
            className="inline-flex items-center gap-1 select-none text-left transition-colors hover:text-foreground"
          >
            <span>{children}</span>

            {SortIcon ? (
              <SortIcon className="h-4 w-4 text-muted-foreground" />
            ) : null}
          </button>
        ) : (
          <span className="select-none">
            {children}
          </span>
        )}
      </div>
    </TableHead>
  )
}

export function VendorsTable({
  vendors,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  sortBy,
  sortOrder,
  onSortChange,
  columns,
  setColumns,
}: VendorsTableProps) {
  const router = useRouter()

  const [
    isNavigating,
    startTransition,
  ] = useTransition()

  const [
    loadingVendorId,
    setLoadingVendorId,
  ] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter:
        sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (
    event: DragEndEvent
  ) => {
    const { active, over } = event

    if (
      active.id !== over?.id
    ) {
      setColumns((items) => {
        const oldIndex =
          items.findIndex(
            (item) =>
              item.id === active.id
          )

        const newIndex =
          items.findIndex(
            (item) =>
              item.id === over?.id
          )

        return arrayMove(
          items,
          oldIndex,
          newIndex
        )
      })
    }
  }

  const parseDateString = (
    dateString: string | null
  ) => {
    if (!dateString) return null

    const normalized =
      dateString.slice(0, 10)

    const [year, month, day] =
      normalized
        .split("-")
        .map(Number)

    if (!year || !month || !day) {
      return null
    }

    return new Date(
      year,
      month - 1,
      day
    )
  }

  const formatDate = (
    dateString: string | null
  ) => {
    const date =
      parseDateString(dateString)

    if (!date) return "—"

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    )
  }

  const getRenewalUrgency = (
    renewalDate: string | null
  ) => {
    const date =
      parseDateString(renewalDate)

    if (!date) return "none"

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffInMs =
      date.getTime() -
      today.getTime()

    const diffInDays =
      Math.ceil(
        diffInMs /
          (1000 * 60 * 60 * 24)
      )

    if (diffInDays < 0) {
      return "expired"
    }

    if (diffInDays <= 30) {
      return "approaching"
    }

    return "none"
  }

  const getDaysUntilRenewal = (
    renewalDate: string | null
  ) => {
    const date =
      parseDateString(renewalDate)

    if (!date) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffInMs =
      date.getTime() -
      today.getTime()

    return Math.ceil(
      diffInMs /
        (1000 * 60 * 60 * 24)
    )
  }

  const getRenewalMeta = (
    renewalDate: string | null
  ) => {
    const urgency =
      getRenewalUrgency(
        renewalDate
      )

    const daysUntil =
      getDaysUntilRenewal(
        renewalDate
      )

    if (
      !renewalDate ||
      daysUntil === null
    ) {
      return {
        urgency,
        label: "No renewal set",
        helper:
          "Add a contract renewal date",
        icon: CalendarClock,
        tone:
          "text-muted-foreground border-border bg-muted",
      }
    }

    if (urgency === "expired") {
      const overdueBy =
        Math.abs(daysUntil)

      return {
        urgency,
        label:
          overdueBy === 0
            ? "Renews today"
            : `${overdueBy} day${
                overdueBy === 1
                  ? ""
                  : "s"
              } past renewal`,
        helper: `Renewal date was ${formatDate(
          renewalDate
        )}`,
        icon: CircleAlert,
        tone:
          "text-destructive border-destructive/20 bg-destructive/10",
      }
    }

    if (
      urgency ===
      "approaching"
    ) {
      return {
        urgency,
        label:
          daysUntil === 0
            ? "Renews today"
            : `Renews in ${daysUntil} day${
                daysUntil === 1
                  ? ""
                  : "s"
              }`,
        helper: `Renewal on ${formatDate(
          renewalDate
        )}`,
        icon: Clock3,
        tone:
          "text-warning border-warning/20 bg-warning/10",
      }
    }

    return {
      urgency,
      label: "On track",
      helper: `Renews ${formatDate(
        renewalDate
      )}`,
      icon: CalendarClock,
      tone:
        "text-primary border-primary/20 bg-primary/10",
    }
  }

  const formatStatus = (
    value: string
  ) =>
    value
      .split("_")
      .map(
        (word) =>
          word
            .charAt(0)
            .toUpperCase() +
          word.slice(1)
      )
      .join(" ")

  const getStatusTone = (
    status: string
  ) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"

      case "onboarding":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"

      case "under_review":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400"

      case "inactive":
        return "bg-muted text-muted-foreground"

      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const renderCell = (
    vendor: VendorListItem,
    columnId: string
  ) => {
    const renewalMeta =
      getRenewalMeta(
        vendor.renewal_date
      )

    const isLoadingVendor =
      isNavigating &&
      loadingVendorId ===
        vendor.id

    switch (columnId) {
      case "name":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    vendor.color ||
                    "#64748b",
                }}
              />

              <div>
                <div className="font-semibold text-foreground">
                  {vendor.name}
                </div>

                {vendor.vendor_code ? (
                  <div className="text-xs text-muted-foreground">
                    {
                      vendor.vendor_code
                    }
                  </div>
                ) : null}
              </div>
            </div>
          </TableCell>
        )

      case "line_of_business":
        return (
          <TableCell className="whitespace-nowrap text-sm text-foreground">
            {vendor.line_of_business ??
              "—"}
          </TableCell>
        )

      case "vendor_tier":
        return (
          <TableCell className="whitespace-nowrap text-sm text-foreground">
            {vendor.vendor_tier ??
              "—"}
          </TableCell>
        )

      case "grade":
        return (
          <TableCell className="whitespace-nowrap">
            {vendor.grade ? (
              <div className="flex justify-center">
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-border bg-card px-2 font-bold text-foreground">
                  {vendor.grade}
                </span>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                —
              </div>
            )}
          </TableCell>
        )

      case "status":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex justify-center">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                  getStatusTone(
                    vendor.status
                  )
                )}
              >
                {formatStatus(
                  vendor.status
                )}
              </span>
            </div>
          </TableCell>
        )

      case "renewal_date": {
        const RenewalIcon =
          renewalMeta.icon

        return (
          <TableCell className="min-w-[220px]">
            <div
              className={cn(
                "inline-flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5",
                renewalMeta.tone
              )}
            >
              <div className="mt-0.5 shrink-0">
                <RenewalIcon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {
                    renewalMeta.label
                  }
                </div>

                <div className="text-xs opacity-80">
                  {
                    renewalMeta.helper
                  }
                </div>
              </div>
            </div>
          </TableCell>
        )
      }

      case "vendor_code":
        return (
          <TableCell className="whitespace-nowrap font-mono text-sm text-foreground">
            {vendor.vendor_code ??
              "—"}
          </TableCell>
        )

      case "actions":
        return (
          <TableCell className="text-right">
            <Button
              variant={
                isLoadingVendor
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              className="rounded-xl border-border bg-card/80 hover:bg-muted"
              disabled={
                isNavigating
              }
              onClick={() => {
                setLoadingVendorId(
                  vendor.id
                )

                startTransition(() => {
                  router.push(
                    `/vendors/${vendor.id}`
                  )
                })
              }}
            >
              {isLoadingVendor ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {isLoadingVendor
                ? "Opening..."
                : "Open"}

              {!isLoadingVendor ? (
                <ArrowRight className="ml-2 h-4 w-4" />
              ) : null}
            </Button>
          </TableCell>
        )

      default:
        return <TableCell />
    }
  }

  const visibleColumns =
    columns.filter(
      (column) =>
        column.visible
    )

  return (
    <div className="space-y-4">
      <div className="app-surface relative overflow-hidden">

        <DndContext
          sensors={sensors}
          collisionDetection={
            closestCenter
          }
          onDragEnd={
            handleDragEnd
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/80">

                <SortableContext
                  items={columns.map(
                    (column) =>
                      column.id
                  )}
                  strategy={
                    horizontalListSortingStrategy
                  }
                >
                  {columns.map(
                    (column) => (
                      <SortableHeader
                        key={
                          column.id
                        }
                        column={
                          column
                        }
                        sortBy={
                          sortBy
                        }
                        sortOrder={
                          sortOrder
                        }
                        onSortChange={
                          onSortChange
                        }
                      >
                        {
                          column.label
                        }
                      </SortableHeader>
                    )
                  )}
                </SortableContext>

              </TableRow>
            </TableHeader>

            <TableBody>
              {vendors.length > 0 ? (
                vendors.map(
                  (vendor) => (
                    <TableRow
                      key={
                        vendor.id
                      }
                      className={cn(
                        "border-border transition-colors hover:bg-muted/70",

                        getRenewalUrgency(
                          vendor.renewal_date
                        ) ===
                          "approaching" &&
                          "bg-warning/10",

                        getRenewalUrgency(
                          vendor.renewal_date
                        ) ===
                          "expired" &&
                          "bg-destructive/10"
                      )}
                    >
                      {columns.map(
                        (column) =>
                          column.visible ? (
                            <React.Fragment
                              key={`${vendor.id}-${column.id}`}
                            >
                              {renderCell(
                                vendor,
                                column.id
                              )}
                            </React.Fragment>
                          ) : null
                      )}
                    </TableRow>
                  )
                )
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={
                      visibleColumns.length
                    }
                    className="h-24 text-center"
                  >
                    No vendors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={
              onLoadMore
            }
            disabled={
              isLoadingMore
            }
          >
            {isLoadingMore
              ? "Loading more vendors..."
              : "View More"}
          </Button>
        </div>
      ) : null}

      <div className="text-center text-sm text-muted-foreground">
        Showing {vendors.length} vendor
        {vendors.length === 1
          ? ""
          : "s"}{" "}
        out of {totalCount} total vendor
        {totalCount === 1
          ? ""
          : "s"}.
      </div>
    </div>
  )
}