
"use client"

import {
  use,
  useCallback,
  useEffect,
  useState,
} from "react"

import Link from "next/link"

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react"

type Metric = {
  id: string
  name: string
  metric_type: string
  unit: string
  comparison_operator: string
  target_value: string | number
}

type DetailColumnsResponse = {
  report: {
    id: string
    vendorId: string
    vendorName: string
    filename: string
    periodStart: string
    periodEnd: string
    status: string
  }
  source: {
    sheetName: string | null
    columns: string[]
    totalRows: number
  }
  metrics: Metric[]
}

type CalculationResult = {
  status: "calculated" | "needs_review"
  actualValue: number | null
  eligibleCount: number
  compliantCount: number
  noncompliantCount: number
  excludedCount: number
  missingDateCount: number
  errorCount: number
  intervalDays: number
  referenceDate: string
  warnings: string[]
}

type PreviewResponse = {
  success: boolean
  calculation: CalculationResult
}

type MissingDatePolicy =
  | "needs_review"
  | "noncompliant"
  | "exclude"

function displayDate(value: string) {
  if (!value) return "—"

  const date = new Date(`${value}T00:00:00Z`)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  })
}

function compareTarget(
  actual: number,
  target: number,
  operator: string
): boolean | null {
  if (!Number.isFinite(target)) return null

  switch (operator) {
    case ">=":
      return actual >= target
    case ">":
      return actual > target
    case "<=":
      return actual <= target
    case "<":
      return actual < target
    case "=":
      return actual === target
    default:
      return null
  }
}

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"

export default function ConfigureDetailedReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [data, setData] =
    useState<DetailColumnsResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState(false)

  const [error, setError] = useState("")
  const [preview, setPreview] =
    useState<CalculationResult | null>(null)

  const [metricId, setMetricId] = useState("")
  const [statusColumn, setStatusColumn] = useState("")
  const [lastTouchedColumn, setLastTouchedColumn] =
    useState("")

  const [eligibleStatuses, setEligibleStatuses] =
    useState("Active")

  const [intervalDays, setIntervalDays] = useState("7")

  const [missingDatePolicy, setMissingDatePolicy] =
    useState<MissingDatePolicy>("needs_review")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        `/api/vendor-reports/${id}/detail-columns`,
        { cache: "no-store" }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to load report configuration"
        )
      }

      const loaded = result as DetailColumnsResponse

      setData(loaded)

      setMetricId((previous) =>
        loaded.metrics.some((m) => m.id === previous)
          ? previous
          : ""
      )

      const findColumn = (terms: string[]) =>
        loaded.source.columns.find((column) =>
          terms.some((term) =>
            column.toLowerCase().includes(term)
          )
        ) ?? ""

      setStatusColumn((previous) =>
        loaded.source.columns.includes(previous)
          ? previous
          : findColumn(["status"])
      )

      setLastTouchedColumn((previous) =>
        loaded.source.columns.includes(previous)
          ? previous
          : findColumn([
              "last time touched",
              "last touched",
              "last activity",
            ])
      )

      setPreview(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load report"
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function invalidatePreview() {
    setPreview(null)
    setError("")
  }

  const selectedMetric =
    data?.metrics.find((metric) => metric.id === metricId)

  const parsedStatuses = Array.from(
    new Set(
      eligibleStatuses
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )

  const interval = Number(intervalDays)

  const validInterval =
    Number.isSafeInteger(interval) &&
    interval >= 1 &&
    interval <= 3650

  const canPreview =
    !!data &&
    !!metricId &&
    !!statusColumn &&
    !!lastTouchedColumn &&
    parsedStatuses.length > 0 &&
    parsedStatuses.length <= 50 &&
    validInterval &&
    !previewing

  async function runPreview() {
    if (!canPreview) return

    setPreviewing(true)
    setPreview(null)
    setError("")

    try {
      const response = await fetch(
        `/api/vendor-reports/${id}/preview-calculation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            statusColumn,
            eligibleStatuses: parsedStatuses,
            lastTouchedColumn,
            intervalDays: interval,
            missingDatePolicy,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Calculation preview failed"
        )
      }

      setPreview(
        (result as PreviewResponse).calculation
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Calculation preview failed"
      )
    } finally {
      setPreviewing(false)
    }
  }

  const targetValue = selectedMetric
    ? Number(selectedMetric.target_value)
    : null

  const targetMet =
    preview?.status === "calculated" &&
    preview.actualValue !== null &&
    selectedMetric &&
    targetValue !== null
      ? compareTarget(
          preview.actualValue,
          targetValue,
          selectedMetric.comparison_operator
        )
      : null

  const percent =
    preview?.actualValue !== null &&
    preview?.actualValue !== undefined
      ? Math.min(100, Math.max(0, preview.actualValue))
      : 0

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Loading detailed report...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="app-page p-6">
        <Link
          href="/reports"
          className="text-sm text-primary hover:underline"
        >
          Back to Reports
        </Link>

        <p className="mt-4 text-sm text-destructive">
          {error || "Report not found"}
        </p>
      </div>
    )
  }

  return (
    <div className="app-page mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>

          <h1 className="app-title">
            Configure Detailed Report
          </h1>

          <p className="app-subtitle">
            Calculate KPI/SLA performance from individual
            vendor records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={previewing}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* File summary */}
      <section className="app-surface p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <FileSpreadsheet className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="break-all font-semibold text-foreground">
              {data.report.filename}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {data.report.vendorName}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span>
                {formatNumber(data.source.totalRows, 0)} records
              </span>

              <span>
                {data.source.columns.length} columns
              </span>

              {data.source.sheetName && (
                <span>Sheet: {data.source.sheetName}</span>
              )}

              <span>
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                Cutoff: {displayDate(data.report.periodEnd)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        {/* Configuration */}
        <section className="app-surface p-5">
          <div className="mb-5 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold text-foreground">
              Calculation Configuration
            </h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="metric"
                className="text-sm font-medium text-foreground"
              >
                Performance Metric
              </label>

              <select
                id="metric"
                value={metricId}
                onChange={(event) => {
                  setMetricId(event.target.value)
                  invalidatePreview()
                }}
                className={fieldClass}
              >
                <option value="">Select KPI or SLA</option>

                {data.metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.name} ({metric.metric_type})
                  </option>
                ))}
              </select>

              {selectedMetric && (
                <p className="text-xs text-muted-foreground">
                  Target:{" "}
                  {selectedMetric.comparison_operator}{" "}
                  {selectedMetric.target_value}{" "}
                  {selectedMetric.unit}
                </p>
              )}

              {data.metrics.length === 0 && (
                <p className="text-xs text-warning">
                  This vendor has no active KPI/SLA definitions.
                  Create one on the vendor page first.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-5">
              <p className="mb-4 text-sm font-semibold text-foreground">
                Source Columns
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="status-column"
                    className="text-sm font-medium text-foreground"
                  >
                    Status Column
                  </label>

                  <select
                    id="status-column"
                    value={statusColumn}
                    onChange={(event) => {
                      setStatusColumn(event.target.value)
                      invalidatePreview()
                    }}
                    className={fieldClass}
                  >
                    <option value="">Select column</option>

                    {data.source.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="touched-column"
                    className="text-sm font-medium text-foreground"
                  >
                    Last Activity Column
                  </label>

                  <select
                    id="touched-column"
                    value={lastTouchedColumn}
                    onChange={(event) => {
                      setLastTouchedColumn(event.target.value)
                      invalidatePreview()
                    }}
                    className={fieldClass}
                  >
                    <option value="">Select column</option>

                    {data.source.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <p className="mb-4 text-sm font-semibold text-foreground">
                Servicing Requirements
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="eligible-statuses"
                    className="text-sm font-medium text-foreground"
                  >
                    Eligible Statuses
                  </label>

                  <input
                    id="eligible-statuses"
                    type="text"
                    value={eligibleStatuses}
                    onChange={(event) => {
                      setEligibleStatuses(event.target.value)
                      invalidatePreview()
                    }}
                    placeholder="Active, Open, Pending"
                    className={fieldClass}
                  />

                  <p className="text-xs text-muted-foreground">
                    Separate multiple statuses with commas.
                    Only records matching these values will
                    be included in the calculation.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="interval-days"
                    className="text-sm font-medium text-foreground"
                  >
                    Maximum Days Since Last Activity
                  </label>

                  <div className="relative max-w-[220px]">
                    <input
                      id="interval-days"
                      type="number"
                      min={1}
                      max={3650}
                      step={1}
                      value={intervalDays}
                      onChange={(event) => {
                        setIntervalDays(event.target.value)
                        invalidatePreview()
                      }}
                      className={`${fieldClass} pr-16`}
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      days
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Uses calendar days and the report's
                    period-end date as the cutoff.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="missing-policy"
                    className="text-sm font-medium text-foreground"
                  >
                    Missing or Invalid Activity Dates
                  </label>

                  <select
                    id="missing-policy"
                    value={missingDatePolicy}
                    onChange={(event) => {
                      setMissingDatePolicy(
                        event.target.value as MissingDatePolicy
                      )
                      invalidatePreview()
                    }}
                    className={fieldClass}
                  >
                    <option value="needs_review">
                      Require manual review
                    </option>

                    <option value="noncompliant">
                      Count as noncompliant
                    </option>

                    <option value="exclude">
                      Exclude from calculation
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canPreview}
              onClick={() => void runPreview()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}

              {previewing
                ? "Calculating..."
                : "Preview Calculation"}
            </button>
          </div>
        </section>

        {/* Results */}
        <div className="space-y-5">
          <section className="app-surface p-5">
            <div className="mb-5 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />

              <h2 className="text-lg font-semibold text-foreground">
                Calculation Results
              </h2>
            </div>

            {!preview ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
                <Calculator className="mx-auto h-9 w-9 text-muted-foreground/50" />

                <p className="mt-3 text-sm font-medium text-foreground">
                  No preview yet
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Configure the calculation and click
                  Preview Calculation.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Account Servicing Compliance
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-4xl font-semibold tracking-tight text-foreground">
                      {preview.actualValue === null
                        ? "—"
                        : `${formatNumber(preview.actualValue)}%`}
                    </span>

                    {preview.status === "needs_review" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Needs Review
                      </span>
                    ) : targetMet === true ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Target Met
                      </span>
                    ) : targetMet === false ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                        <CircleAlert className="h-3.5 w-3.5" />
                        Target Missed
                      </span>
                    ) : null}
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {selectedMetric && (
                    <p className="text-xs text-muted-foreground">
                      KPI/SLA target:{" "}
                      {selectedMetric.comparison_operator}{" "}
                      {selectedMetric.target_value}{" "}
                      {selectedMetric.unit}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Eligible Records",
                      value: preview.eligibleCount,
                    },
                    {
                      label: "Compliant",
                      value: preview.compliantCount,
                    },
                    {
                      label: "Noncompliant",
                      value: preview.noncompliantCount,
                    },
                    {
                      label: "Excluded",
                      value: preview.excludedCount,
                    },
                    {
                      label: "Missing Dates",
                      value: preview.missingDateCount,
                    },
                    {
                      label: "Data Errors",
                      value: preview.errorCount,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>

                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {formatNumber(item.value, 0)}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Evaluated as of{" "}
                  {displayDate(preview.referenceDate)},
                  using a {preview.intervalDays}-day
                  servicing interval.
                </p>
              </div>
            )}
          </section>

          {preview && preview.warnings.length > 0 && (
            <section className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Data Quality Warnings
              </div>

              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {preview.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <p className="text-xs leading-relaxed text-muted-foreground">
                This is a calculation preview only.
                No KPI/SLA results will be imported or
                changed. Calculation configurations
                cannot be saved until we add the
                reusable calculation-rule functionality.
              </p>
            </div>
          </section>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  )
}
