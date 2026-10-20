
import "server-only"

import ExcelJS from "exceljs"
import { parse } from "csv-parse/sync"

export type ExtractedMetricRow = {
  sourceLabel: string
  rawValue: string
  normalizedValue: number | null
  sourceLocation: string
}

const MAX_ROWS = 2000

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
}

function findColumns(headers: string[]) {
  const metricNames = [
    "metric",
    "metric name",
    "kpi",
    "kpi name",
    "sla",
    "sla name",
  ]

  const valueNames = [
    "actual",
    "actual value",
    "value",
    "result",
    "performance",
    "reported value",
  ]

  const metricIndex = headers.findIndex((header) =>
    metricNames.includes(normalizeHeader(header))
  )

  const valueIndex = headers.findIndex((header) =>
    valueNames.includes(normalizeHeader(header))
  )

  if (
    metricIndex === -1 ||
    valueIndex === -1 ||
    metricIndex === valueIndex
  ) {
    throw new Error(
      "Report must contain Metric and Actual Value columns."
    )
  }

  return { metricIndex, valueIndex }
}

export function normalizeMetricValue(
  value: string
): number | null {
  const cleaned = value.trim().replace(/,/g, "")

  // Accept plain numeric values with optional %.
  // Reject units we cannot safely convert.
  if (
    !/^[+-]?(?:\d+\.?\d*|\.\d+)%?$/.test(cleaned)
  ) {
    return null
  }

  const numeric = Number(cleaned.replace("%", ""))

  return Number.isFinite(numeric) ? numeric : null
}

function parseTable(
  rows: string[][],
  locationPrefix: string,
  firstRowNumber = 1
): ExtractedMetricRow[] {
  if (rows.length < 2) {
    throw new Error("Report contains no metric rows.")
  }

  if (rows.length - 1 > MAX_ROWS) {
    throw new Error(
      `Report exceeds the ${MAX_ROWS} row limit.`
    )
  }

  const { metricIndex, valueIndex } = findColumns(rows[0])

  const results: ExtractedMetricRow[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]

    const sourceLabel = (row[metricIndex] ?? "").trim()
    const rawValue = (row[valueIndex] ?? "").trim()

    if (!sourceLabel && !rawValue) continue

    // Skip completely unnamed rows rather than
    // incorrectly associating them with a metric.
    if (!sourceLabel) continue

    results.push({
      sourceLabel,
      rawValue,
      normalizedValue: normalizeMetricValue(rawValue),
      sourceLocation: `${locationPrefix}${firstRowNumber + i}`,
    })
  }

  return results
}

export function extractCsvMetrics(
  buffer: Buffer
): ExtractedMetricRow[] {
  const rows = parse(buffer.toString("utf8"), {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: false,
    relax_column_count: false,
    to_line: MAX_ROWS + 2,
  }) as string[][]

  return parseTable(rows, "CSV row ")
}

function cellToString(
  cell: ExcelJS.Cell
): string {
  const value = cell.value

  if (value == null) return ""

  // For formula cells, read the cached result.
  // ExcelJS does not calculate formulas.
  if (typeof value === "object" && "formula" in value) {
    const result = value.result

    if (typeof result !== "number" &&
        typeof result !== "string") {
      return ""
    }

    if (
      typeof result === "number" &&
      cell.numFmt.includes("%")
    ) {
      return String(result * 100) + "%"
    }

    return String(result)
  }

  if (typeof value === "number") {
    // Excel stores percentages as decimals.
    if (cell.numFmt.includes("%")) {
      return `${value * 100}%`
    }

    return String(value)
  }

  if (typeof value === "string") return value

  return cell.text ?? ""
}

export async function extractExcelMetrics(
  buffer: Buffer
): Promise<ExtractedMetricRow[]> {
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]

  if (!sheet) {
    throw new Error("Excel workbook has no worksheets.")
  }

  if (sheet.rowCount > MAX_ROWS + 1) {
    throw new Error(
      `Report exceeds the ${MAX_ROWS} row limit.`
    )
  }

  const rows: string[][] = []

  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = []

    for (let column = 1; column <= row.cellCount; column++) {
      cells.push(cellToString(row.getCell(column)))
    }

    rows.push(cells)
  })

  return parseTable(
    rows,
    `${sheet.name} row `
  )
}
