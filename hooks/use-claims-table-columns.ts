"use client"

import { useEffect, useState } from "react"

export interface Column {
  id: string
  label: string
  visible: boolean
  sortKey?: string
}

const STORAGE_KEY = "claims-table-columns"

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
  if (typeof window === "undefined") return DEFAULT_COLUMNS
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_COLUMNS

    const parsed = JSON.parse(stored) as Array<Pick<Column, "id" | "visible">>
    const parsedMap = new Map(parsed.map((c) => [c.id, c.visible]))

    const ordered = parsed
      .map((c) => DEFAULT_COLUMNS.find((d) => d.id === c.id))
      .filter((c): c is Column => Boolean(c))
      .map((c) => ({ ...c, visible: parsedMap.get(c.id) ?? c.visible }))

    const missing = DEFAULT_COLUMNS.filter((c) => !ordered.some((o) => o.id === c.id))
    return [...ordered, ...missing]
  } catch {
    return DEFAULT_COLUMNS
  }
}

export function useClaimsTableColumns() {
  const [columns, setColumns] = useState<Column[]>(getInitialColumns)

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(columns.map(({ id, visible }) => ({ id, visible }))),
    )
  }, [columns])

  const toggleColumnVisibility = (columnId: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, visible: !c.visible } : c)))
  }

  return { columns, setColumns, toggleColumnVisibility }
}