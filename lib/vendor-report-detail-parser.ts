import "server-only"

import ExcelJS from "exceljs"
import { parse } from "csv-parse/sync"

export type DetailCellValue =
  | string
  | number
  | boolean
  | null

export type DetailReportRow = {
  rowNumber: number
  values: Record<string, DetailCellValue>
}

export type DetailedReport = {
  filename: string
  sheetName: string | null
  columns: string[]
  columnKeys: string[]
  totalRows: number
  rows: DetailReportRow[]
}

const MAX_FILE_SIZE = 2 * 1024 * 1024
const MAX_ROWS = 5000
const MAX_COLUMNS = 60

export function normalizeColumnName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
}

function validateHeaders(headers: string[]) {
  if (
    headers.length === 0 ||
    headers.length > MAX_COLUMNS
  ) {
    throw new Error(
      `Report must contain 1 to ${MAX_COLUMNS} columns.`
    )
  }

  const keys = headers.map(normalizeColumnName)

  if (keys.some((key) => !key)) {
    throw new Error("Report contains an empty column header.")
  }

  if (new Set(keys).size !== keys.length) {
    throw new Error(
      "Report contains duplicate column headers."
    )
  }

  return keys
}

function buildReport(
  filename: string,
  sheetName: string | null,
  headers: string[],
  sourceRows: {
    rowNumber: number
    cells: DetailCellValue[]
  }[]
): DetailedReport {
  const columnKeys = validateHeaders(headers)

  if (sourceRows.length > MAX_ROWS) {
    throw new Error(
      `Detailed reports are limited to ${MAX_ROWS} rows.`
    )
  }

  const rows: DetailReportRow[] = sourceRows.map(
    ({ rowNumber, cells }) => {
      const values: Record<string, DetailCellValue> = {}

      columnKeys.forEach((key, index) => {
        values[key] = cells[index] ?? null
      })

      return { rowNumber, values }
    }
  )

  return {
    filename,
    sheetName,
    columns: headers,
    columnKeys,
    totalRows: rows.length,
    rows,
  }
}

function readCsv(
  buffer: Buffer,
  filename: string
): DetailedReport {
  const records = parse(buffer.toString("utf8"), {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as string[][]

  if (!records.length) {
    throw new Error("CSV report is empty.")
  }

  const headers = records[0]

  if (records.length - 1 > MAX_ROWS) {
    throw new Error("CSV report exceeds row limit.")
  }

  const sourceRows = records
    .slice(1)
    .map((cells, index) => ({
      rowNumber: index + 2,
      cells: cells.map((value) =>
        value === "" ? null : value
      ),
    }))

  return buildReport(
    filename,
    null,
    headers,
    sourceRows
  )
}

function excelCellValue(
  cell: ExcelJS.Cell
): DetailCellValue {
  const value = cell.value

  if (value == null) return null

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid Excel date.")
    }

    return value.toISOString().slice(0, 10)
  }

  // Never execute formulas or trust an unverified
  // formula result during metric calculations.
  if (
    typeof value === "object" &&
    ("formula" in value || "sharedFormula" in value)
  ) {
    throw new Error(
      `Formula cell ${cell.address} requires review.`
    )
  }

  return cell.text || null
}

async function readExcel(
  buffer: Buffer,
  filename: string
): Promise<DetailedReport> {
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(buffer)

  // First version reads the first worksheet.
  const sheet = workbook.worksheets[0]

  if (!sheet) {
    throw new Error("Workbook has no worksheets.")
  }

  if (sheet.rowCount > MAX_ROWS + 1) {
    throw new Error("Excel report exceeds row limit.")
  }

  const headerRow = sheet.getRow(1)
  const columnCount = headerRow.cellCount

  if (
    columnCount === 0 ||
    columnCount > MAX_COLUMNS
  ) {
    throw new Error("Invalid Excel column count.")
  }

  const headers: string[] = []

  for (let col = 1; col <= columnCount; col++) {
    headers.push(
      headerRow.getCell(col).text.trim()
    )
  }

  const sourceRows: {
    rowNumber: number
    cells: DetailCellValue[]
  }[] = []

  for (
    let rowNumber = 2;
    rowNumber <= sheet.rowCount;
    rowNumber++
  ) {
    const row = sheet.getRow(rowNumber)

    const cells: DetailCellValue[] = []

    for (let col = 1; col <= columnCount; col++) {
      cells.push(excelCellValue(row.getCell(col)))
    }

    // Skip fully empty rows.
    if (cells.every((value) => value === null)) {
      continue
    }

    sourceRows.push({ rowNumber, cells })
  }

  return buildReport(
    filename,
    sheet.name,
    headers,
    sourceRows
  )
}

export async function parseDetailedVendorReport(
  buffer: Buffer,
  filename: string
): Promise<DetailedReport> {
  if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      "Detailed report must be between 1 byte and 2 MB."
    )
  }

  const extension = filename
    .toLowerCase()
    .match(/\.[^.]+$/)?.[0]

  if (extension === ".csv") {
    return readCsv(buffer, filename)
  }

  if (extension === ".xlsx") {
    return readExcel(buffer, filename)
  }

  throw new Error(
    "Detailed report parsing supports CSV and XLSX only."
  )
}
