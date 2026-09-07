"use client"
import React from "react"

import type { ReactNode } from "react"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { GripVertical, ArrowUp, ArrowDown, Loader2, CalendarClock, CircleAlert, Clock3, ArrowRight } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AttributeBadge } from "@/components/ui/attributesBadge"
import type { AttributeValue } from "@/components/ui/attributesBadge"
import type { ClaimWithPatientAndProfile } from "@/hooks/use-claims"
import { cn } from "@/lib/utils"

interface ClaimsTableProps {
  claims: ClaimWithPatientAndProfile[]
  totalCount: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  sortBy?: string
  sortOrder: "asc" | "desc"
  onSortChange: (sortBy: string) => void
  columns: Column[]
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>
}

interface Column {
  id: string
  label: string
  visible: boolean
  sortKey?: string
}

const CLAIMS_TABLE_COLUMNS_STORAGE_KEY = "claims-table-columns"

const DEFAULT_COLUMNS: Column[] = [
  { id: "claim_id", label: "Claim ID", visible: true, sortKey: "claim_id" },
  { id: "patient", label: "Patient", visible: true, sortKey: "patient_name" },
  { id: "type", label: "Type", visible: false, sortKey: "appeal_type" },
  { id: "amount", label: "Amount", visible: true, sortKey: "original_claim_amount" },
  { id: "service_date", label: "Service Date", visible: false, sortKey: "service_date" },
  { id: "follow_up_date", label: "Follow-Up", visible: true, sortKey: "follow_up_date" },
  { id: "priority", label: "Priority", visible: true, sortKey: "priority" },
  { id: "letter_status", label: "Letter Status", visible: false, sortKey: "letter_status" },
  { id: "status", label: "Status", visible: true, sortKey: "status" },
  { id: "actions", label: "Actions", visible: true },
]

const getInitialColumns = (): Column[] => {
  if (typeof window === "undefined") {
    return DEFAULT_COLUMNS
  }

  try {
    const stored = window.localStorage.getItem(CLAIMS_TABLE_COLUMNS_STORAGE_KEY)
    if (!stored) {
      return DEFAULT_COLUMNS
    }

    const parsed = JSON.parse(stored) as Array<Pick<Column, "id" | "visible">>
    const parsedMap = new Map(parsed.map((column) => [column.id, column.visible]))

    const orderedColumns = parsed
      .map((column) => DEFAULT_COLUMNS.find((defaultColumn) => defaultColumn.id === column.id))
      .filter((column): column is Column => Boolean(column))
      .map((column) => ({
        ...column,
        visible: parsedMap.get(column.id) ?? column.visible,
      }))

    const missingColumns = DEFAULT_COLUMNS.filter(
      (column) => !orderedColumns.some((orderedColumn) => orderedColumn.id === column.id),
    )

    return [...orderedColumns, ...missingColumns]
  } catch {
    return DEFAULT_COLUMNS
  }
}

interface SortableHeaderProps {
  column: Column
  children: ReactNode
  sortBy?: string
  sortOrder: "asc" | "desc"
  onSortChange: (sortBy: string) => void
}

function SortableHeader({ column, children, sortBy, sortOrder, onSortChange }: SortableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    disabled: !column.visible,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!column.visible) return null

  const isSorted = column.sortKey === sortBy
  const SortIcon = !column.sortKey ? null : isSorted ? (sortOrder === "asc" ? ArrowUp : ArrowDown) : null//Leave null

  return (
    <TableHead ref={setNodeRef} style={style} className="relative group" {...attributes}>
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
            onClick={() => onSortChange(column.sortKey!)}
            className="inline-flex items-center gap-1 select-none text-left transition-colors hover:text-foreground"
          >
            <span>{children}</span>
            {SortIcon ? <SortIcon className="h-4 w-4 text-muted-foreground" /> : null}
          </button>
        ) : (
          <span className="select-none">{children}</span>
        )}
      </div>
    </TableHead>
  )
}

export function ClaimsTable({
  claims,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  sortBy,
  sortOrder,
  onSortChange,
  columns,
  setColumns,
}: ClaimsTableProps) {
  const router = useRouter()
  const [isNavigating, startTransition] = useTransition()
  const [loadingClaimId, setLoadingClaimId] = useState<string | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    setColumns((prev) => prev.map((col) => (col.id === columnId ? { ...col, visible: !col.visible } : col)))
  }

  // Format date
  const parseDateString = (dateString: string | null) => {
    if (!dateString) return null

    const normalized = dateString.slice(0, 10)
    const [year, month, day] = normalized.split("-").map(Number)

    if (!year || !month || !day) return null

    return new Date(year, month - 1, day)
  }

  const formatDate = (dateString: string | null) => {
    const date = parseDateString(dateString)
    if (!date) return "—"

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getFollowUpUrgency = (followUpDate: string | null) => {
    const date = parseDateString(followUpDate)
    if (!date) return "none"

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffInMs = date.getTime() - today.getTime()
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return "overdue"
    if (diffInDays <= 3) return "approaching"
    return "none"
  }

  const getDaysUntilFollowUp = (followUpDate: string | null) => {
    const date = parseDateString(followUpDate)
    if (!date) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffInMs = date.getTime() - today.getTime()
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
  }

  const getFollowUpMeta = (followUpDate: string | null) => {
    const urgency = getFollowUpUrgency(followUpDate)
    const daysUntil = getDaysUntilFollowUp(followUpDate)

    if (!followUpDate || daysUntil === null) {
      return {
        urgency,
        label: "No follow-up set",
        helper: "Add a date to track next action",
        icon: CalendarClock,
        tone: "text-muted-foreground border-border bg-muted",
      }
    }

    if (urgency === "overdue") {
      const overdueBy = Math.abs(daysUntil)
      return {
        urgency,
        label: overdueBy === 0 ? "Due today" : `${overdueBy} day${overdueBy === 1 ? "" : "s"} overdue`,
        helper: `Follow-up was due ${formatDate(followUpDate)}`,
        icon: CircleAlert,
        tone: "text-destructive border-destructive/20 bg-destructive/10",
      }
    }

    if (urgency === "approaching") {
      return {
        urgency,
        label: daysUntil === 0 ? "Due today" : `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        helper: `Upcoming on ${formatDate(followUpDate)}`,
        icon: Clock3,
        tone: "text-warning border-warning/20 bg-warning/10",
      }
    }

    return {
      urgency,
      label: "On track",
      helper: `Next follow-up ${formatDate(followUpDate)}`,
      icon: CalendarClock,
      tone: "text-primary border-primary/20 bg-primary/10",
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Render cell content based on column
  const renderCell = (claim: ClaimWithPatientAndProfile, columnId: string) => {
    const followUpMeta = getFollowUpMeta(claim.follow_up_date)
    const isLoadingClaim = isNavigating && loadingClaimId === claim.id

    switch (columnId) {
      case "claim_id":
        return (
          <TableCell className="whitespace-nowrap font-mono text-sm font-semibold text-foreground">
            {claim.claim_id ?? "—"}
          </TableCell>
        )
      case "patient":
        return (
          <TableCell className="whitespace-nowrap text-sm text-foreground">
            {claim.patient_name ? `${claim.patient_name}`.trim() : "—"}
          </TableCell>
        )
      case "type":
        return <TableCell className="whitespace-nowrap text-sm text-foreground">{claim.appeal_type}</TableCell>
      case "amount":
        return (
          <TableCell className="whitespace-nowrap font-semibold text-foreground">
            {claim.original_claim_amount !== null ? formatCurrency(claim.original_claim_amount) : "—"}
          </TableCell>
        )
      case "service_date":
        return <TableCell className="whitespace-nowrap text-sm text-foreground">{formatDate(claim.service_date)}</TableCell>
      case "follow_up_date": {
        const FollowUpIcon = followUpMeta.icon
        return (
          <TableCell className="min-w-[220px]">
            <div className={cn("inline-flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5", followUpMeta.tone)}>
              <div className="mt-0.5 shrink-0">
                <FollowUpIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{followUpMeta.label}</div>
                <div className="text-xs opacity-80">{followUpMeta.helper}</div>
              </div>
            </div>
          </TableCell>
        )
      }
      case "priority":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex justify-center">
              <AttributeBadge attribute="priority" value={claim.priority as AttributeValue<"priority">}/>
            </div>
          </TableCell>
        )
      case "letter_status":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex justify-center">
              <AttributeBadge attribute="letterStatus" value={claim.letter_status as AttributeValue<"letterStatus">} />
            </div>
          </TableCell>
        )
      case "status":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex justify-center">
              <AttributeBadge attribute="status" value={claim.status as AttributeValue<"status">}/>
            </div>
          </TableCell>
        )
      case "actions":
        return (
          <TableCell className="text-right">
            <Button
              variant={isLoadingClaim ? "secondary" : "outline"}
              size="sm"
              className="rounded-xl border-border bg-card/80 hover:bg-muted"
              disabled={isNavigating}
              onClick={() => {
                setLoadingClaimId(claim.id)
                startTransition(() => {
                  router.push(`/claims/view/${claim.id}`)
                })
              }}
            >
              {isLoadingClaim ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoadingClaim ? "Opening..." : "Open"}
              {!isLoadingClaim ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </TableCell>
        )
        
      default:
        return <TableCell></TableCell>
    }
  }

  const visibleColumns = columns.filter((col) => col.visible)
  return (
    <div className="space-y-4">
      <div className="app-surface overflow-hidden relative">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/80">
                <SortableContext items={columns.map((col) => col.id)} strategy={horizontalListSortingStrategy}>
                  {columns.map((column) => (
                    <SortableHeader
                      key={column.id}
                      column={column}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSortChange={onSortChange}
                    >
                      {column.label}
                    </SortableHeader>
                  ))}
                </SortableContext>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length > 0 ? (
                claims.map((claim) => (
                  <TableRow
                    key={claim.id}
                    className={cn(
                      "border-border transition-colors hover:bg-muted/70",
                      getFollowUpUrgency(claim.follow_up_date) === "approaching" && "bg-warning/10",
                      getFollowUpUrgency(claim.follow_up_date) === "overdue" && "bg-destructive/10",
                    )}
                  >
                    {columns.map((column) =>
                      column.visible ? (
                        <React.Fragment key={`${claim.id}-${column.id}`}>
                          {renderCell(claim, column.id)}
                        </React.Fragment>
                      ) : null,
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                    No claims found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading more claims..." : "View More"}
          </Button>
        </div>
      ) : null}

      <div className="text-sm text-center text-muted-foreground">
        Showing {claims.length} claim{claims.length === 1 ? "" : "s"} out of {totalCount} total claim{totalCount === 1 ? "" : "s"}.
      </div>
    </div>
  )
}
