
import { readFileSync } from "node:fs"

import { parseDetailedVendorReport } from
  "../lib/vendor-report-detail-parser"

import {
  calculateServicingFrequency,
  type ServicingFrequencyConfig,
} from "../lib/vendor-report-calculations"

async function main() {
  const buffer = readFileSync("test-active-accounts.csv")

  const report = await parseDetailedVendorReport(
    buffer,
    "test-active-accounts.csv"
  )

  const config: ServicingFrequencyConfig = {
    calculationType: "servicing_frequency",
    statusColumn: "Status",
    eligibleStatuses: ["Active"],
    lastTouchedColumn: "Last Time Touched",
    intervalDays: 7,
    referenceDate: "2026-10-17",
    missingDatePolicy: "needs_review",
  }

  const result = calculateServicingFrequency(
    report,
    config
  )

  console.log("Calculation summary:")
  console.log({
    status: result.status,
    actualValue: result.actualValue,
    eligibleCount: result.eligibleCount,
    compliantCount: result.compliantCount,
    noncompliantCount: result.noncompliantCount,
    excludedCount: result.excludedCount,
    errorCount: result.errorCount,
  })

  console.table(result.rowEvaluations)

  if (
    result.status !== "calculated" ||
    result.actualValue !== 75 ||
    result.eligibleCount !== 4 ||
    result.compliantCount !== 3 ||
    result.noncompliantCount !== 1 ||
    result.excludedCount !== 1
  ) {
    throw new Error("Servicing frequency test failed.")
  }

  console.log("All test assertions passed.")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
