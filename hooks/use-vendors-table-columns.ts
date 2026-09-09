"use client"

import { useEffect, useState } from "react"

export interface Column {
  id: string
  label: string
  visible: boolean
  sortKey?: string
}

const STORAGE_KEY = "vendors-table-columns"

const DEFAULT_COLUMNS: Column[] = [
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
    id: "status",
    label: "Status",
    visible: true,
    sortKey: "status",
  },
  {
    id: "actions",
    label: "Actions",
    visible: true,
  },
]

const getInitialColumns = (): Column[] => {
  if (typeof window === "undefined") {
    return DEFAULT_COLUMNS
  }

  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return DEFAULT_COLUMNS
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

    const ordered = parsed
      .map((column) =>
        DEFAULT_COLUMNS.find(
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

    const missing =
      DEFAULT_COLUMNS.filter(
        (column) =>
          !ordered.some(
            (orderedColumn) =>
              orderedColumn.id ===
              column.id
          )
      )

    return [
      ...ordered,
      ...missing,
    ]
  } catch {
    return DEFAULT_COLUMNS
  }
}

export function useVendorsTableColumns() {
  const [columns, setColumns] =
    useState<Column[]>(
      getInitialColumns
    )

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        columns.map(
          ({ id, visible }) => ({
            id,
            visible,
          })
        )
      )
    )
  }, [columns])

  const toggleColumnVisibility = (
    columnId: string
  ) => {
    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              visible:
                !column.visible,
            }
          : column
      )
    )
  }

  return {
    columns,
    setColumns,
    toggleColumnVisibility,
  }
}