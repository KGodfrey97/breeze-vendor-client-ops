
import type {
  DetailedReport,
  DetailCellValue,
} from "@/lib/vendor-report-detail-parser"

export type MissingDatePolicy =
  | "needs_review"
  | "noncompliant"
  | "exclude"

export type ServicingFrequencyConfig = {
  calculationType: "servicing_frequency"
  statusColumn: string
  eligibleStatuses: string[]
  lastTouchedColumn: string
  intervalDays: number
  referenceDate: string
  missingDatePolicy: MissingDatePolicy
}

export type RowEvaluation = {
  rowNumber: number
  included: boolean
  compliant: boolean | null
  daysSinceLastTouched: number | null
  lastTouchedDate: string | null
  reason: string
}

export type ServicingFrequencyResult = {
  calculationType: "servicing_frequency"
  status: "calculated" | "needs_review"
  actualValue: number | null
  eligibleCount: number
  compliantCount: number
  noncompliantCount: number
  excludedCount: number
  missingDateCount: number
  errorCount: number
  referenceDate: string
  intervalDays: number
  rowEvaluations: RowEvaluation[]
  warnings: string[]
}

const MS_PER_DAY = 86_400_000

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function parseDateOnly(value: string): Date | null {
  const text = value.trim()

  let year: number
  let month: number
  let day: number

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)

  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (us) {
    month = Number(us[1])
    day = Number(us[2])
    year = Number(us[3])
  } else {
    return null
  }

  if (
    year < 1900 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const result = new Date(0)
  result.setUTCFullYear(year, month - 1, day)
  result.setUTCHours(0, 0, 0, 0)

  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) {
    return null
  }

  return result
}

function parseCellDate(value: DetailCellValue): Date | null {
  if (typeof value !== "string") return null
  return parseDateOnly(value)
}

function formatDate(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-")
}

function validateConfig(
  report: DetailedReport,
  config: ServicingFrequencyConfig
): Date {
  if (
    !Number.isSafeInteger(config.intervalDays) ||
    config.intervalDays < 1 ||
    config.intervalDays > 3650
  ) {
    throw new Error(
      "Servicing interval must be between 1 and 3650 days."
    )
  }

  if (
    !Array.isArray(config.eligibleStatuses) ||
    config.eligibleStatuses.length === 0 ||
    config.eligibleStatuses.some(
      (value) => typeof value !== "string" || !value.trim()
    )
  ) {
    throw new Error("At least one eligible status is required.")
  }

  if (
    !["needs_review", "noncompliant", "exclude"].includes(
      config.missingDatePolicy
    )
  ) {
    throw new Error("Invalid missing-date policy.")
  }

  if (
    !report.columnKeys.includes(normalize(config.statusColumn))
  ) {
    throw new Error("Status column not found in report.")
  }

  if (
    !report.columnKeys.includes(
      normalize(config.lastTouchedColumn)
    )
  ) {
    throw new Error("Last touched column not found in report.")
  }

  const referenceDate = parseDateOnly(config.referenceDate)

  if (!referenceDate) {
    throw new Error("Invalid reporting cutoff date.")
  }

  return referenceDate
}

export function calculateServicingFrequency(
  report: DetailedReport,
  config: ServicingFrequencyConfig
): ServicingFrequencyResult {
  const referenceDate = validateConfig(report, config)

  const eligibleStatuses = new Set(
    config.eligibleStatuses.map(normalize)
  )

  const statusKey = normalize(config.statusColumn)
  const touchedKey = normalize(config.lastTouchedColumn)

  const rowEvaluations: RowEvaluation[] = []
  const warnings: string[] = []

  let eligibleCount = 0
  let compliantCount = 0
  let noncompliantCount = 0
  let excludedCount = 0
  let missingDateCount = 0
  let errorCount = 0

  const addEvaluation = (evaluation: RowEvaluation) => {
    rowEvaluations.push(evaluation)
  }

  for (const row of report.rows) {
    const statusValue = row.values[statusKey]

    const status = normalize(
      statusValue === null ? "" : String(statusValue)
    )

    if (!eligibleStatuses.has(status)) {
      excludedCount++

      addEvaluation({
        rowNumber: row.rowNumber,
        included: false,
        compliant: null,
        daysSinceLastTouched: null,
        lastTouchedDate: null,
        reason: "Not an eligible status",
      })

      continue
    }

    const touchedValue = row.values[touchedKey]
    const touchedDate = parseCellDate(touchedValue)

    if (!touchedDate) {
      missingDateCount++

      // Unknown activity dates can either block approval,
      // count as failures, or be explicitly excluded.
      if (config.missingDatePolicy === "exclude") {
        excludedCount++

        addEvaluation({
          rowNumber: row.rowNumber,
          included: false,
          compliant: null,
          daysSinceLastTouched: null,
          lastTouchedDate: null,
          reason: "Missing/invalid date — excluded",
        })

        continue
      }

      eligibleCount++

      if (config.missingDatePolicy === "noncompliant") {
        noncompliantCount++

        addEvaluation({
          rowNumber: row.rowNumber,
          included: true,
          compliant: false,
          daysSinceLastTouched: null,
          lastTouchedDate: null,
          reason: "Missing/invalid date — noncompliant",
        })
      } else {
        errorCount++

        addEvaluation({
          rowNumber: row.rowNumber,
          included: true,
          compliant: null,
          daysSinceLastTouched: null,
          lastTouchedDate: null,
          reason: "Missing/invalid date — needs review",
        })
      }

      continue
    }

    const daysSince = Math.round(
      (referenceDate.getTime() - touchedDate.getTime()) /
        MS_PER_DAY
    )

    // A future activity date may indicate incorrect source
    // data or an inappropriate reporting cutoff.
    if (daysSince < 0) {
      eligibleCount++
      errorCount++

      addEvaluation({
        rowNumber: row.rowNumber,
        included: true,
        compliant: null,
        daysSinceLastTouched: daysSince,
        lastTouchedDate: formatDate(touchedDate),
        reason: "Activity date is after reporting cutoff",
      })

      continue
    }

    const compliant = daysSince <= config.intervalDays

    eligibleCount++

    if (compliant) {
      compliantCount++
    } else {
      noncompliantCount++
    }

    addEvaluation({
      rowNumber: row.rowNumber,
      included: true,
      compliant,
      daysSinceLastTouched: daysSince,
      lastTouchedDate: formatDate(touchedDate),
      reason: compliant
        ? "Within servicing interval"
        : "Exceeded servicing interval",
    })
  }

  if (eligibleCount === 0) {
    warnings.push("No eligible records were found.")
  }

  if (missingDateCount > 0) {
    warnings.push(
      `${missingDateCount} eligible records have missing or invalid dates.`
    )
  }

  if (errorCount > 0) {
    warnings.push(
      `${errorCount} records require review before this metric can be imported.`
    )
  }

  const canCalculate =
    eligibleCount > 0 && errorCount === 0

  const actualValue = canCalculate
    ? (compliantCount / eligibleCount) * 100
    : null

  return {
    calculationType: "servicing_frequency",
    status: canCalculate ? "calculated" : "needs_review",
    actualValue,
    eligibleCount,
    compliantCount,
    noncompliantCount,
    excludedCount,
    missingDateCount,
    errorCount,
    referenceDate: formatDate(referenceDate),
    intervalDays: config.intervalDays,
    rowEvaluations,
    warnings,
  }
}
