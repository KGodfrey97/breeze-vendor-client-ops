
"use client"

import {
  use,
  useCallback,
  useEffect,
  useState,
} from "react"
import Link from "next/link"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react"

type MetricOption = {
  id: string
  name: string
  metric_type: string
  unit: string
  comparison_operator: string
  target_value: string | number
}

type Extraction = {
  id: string
  metric_id: string | null
  source_label: string
  source_location: string | null
  raw_value: string | null
  normalized_value: string | number | null
  validation_status: string
  validation_message: string | null
  period_start: string
  period_end: string
  metric_name: string | null
  metric_type: string | null
  metric_is_active: boolean | null
  unit: string | null
  target_value: string | number | null
  comparison_operator: string | null
  calculated_status: string | null
  existing_result_id: string | null
  existing_actual_value: string | number | null
  imported_from_this_report: boolean
}

type ReviewData = {
  report: {
    id: string
    vendor_name: string
    original_filename: string
    status: string
    period_start: string
    period_end: string
  }
  extractions: Extraction[]
  availableMetrics: MetricOption[]
  summary: {
    total: number
    matched: number
    ignored: number
    met: number
    missed: number
    conflicts: number
    needsReview: number
    duplicateMappings: number
    canImport: boolean
  }
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

function formatDate(value: string) {
  if (!value) return "—"

  const [year, month, day] = value
    .split("-")
    .map(Number)

  if (!year || !month || !day) return "—"

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function statusClasses(status: string | null) {
  switch (status) {
    case "met":
      return "border-primary/20 bg-primary/10 text-primary"
    case "missed":
      return "border-destructive/20 bg-destructive/10 text-destructive"
    case "ignored":
      return "border-border bg-muted text-muted-foreground"
    default:
      return "border-warning/20 bg-warning/10 text-warning"
  }
}

export default function ReportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

    const [templateName, setTemplateName] = useState("")
    const [savingTemplate, setSavingTemplate] = useState(false)

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [selectedMappings, setSelectedMappings] =
    useState<Record<string, string>>({})

  const loadReview = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/vendor-reports/${id}/import`,
        { cache: "no-store" }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to load report"
        )
      }

      const review = result as ReviewData

      setData(review)

      setSelectedMappings(
        Object.fromEntries(
          review.extractions.map((row) => [
            row.id,
            row.metric_id ?? "",
          ])
        )
      )

      setError("")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load report"
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadReview()
  }, [loadReview])

  async function updateMapping(
    row: Extraction,
    action: "map" | "ignore" | "restore"
  ) {
    const metricId =
      action === "map"
        ? selectedMappings[row.id]
        : null

    if (action === "map" && !metricId) {
      setError("Select a KPI/SLA before saving.")
      return
    }

    setSavingId(row.id)
    setError("")
    setMessage("")
    setConfirmed(false)

    try {
      const response = await fetch(
        `/api/vendor-reports/${id}/extractions/${row.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            metricId,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to update mapping"
        )
      }

      await loadReview()

      const actionMessages = {
        map: "Metric mapping saved successfully.",
        ignore: "Metric excluded from this import.",
        restore: "Metric restored for review.",
      }

      setMessage(actionMessages[action])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Mapping update failed"
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleImport() {
    if (!data?.summary.canImport || !confirmed) {
      return
    }

    setImporting(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(
        `/api/vendor-reports/${id}/import`,
        { method: "POST" }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to import results"
        )
      }

      setConfirmed(false)

      await loadReview()

      setMessage(
        `Successfully imported ${result.importedCount} KPI/SLA results.`
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Import failed"
      )

      await loadReview()
    } finally {
      setImporting(false)
    }
  }


    async function saveTemplate() {
    const name = templateName.trim()

    if (!name) {
        setError("Please enter a template name.")
        return
    }

    setSavingTemplate(true)
    setError("")
    setMessage("")

    try {
        const response = await fetch(
        `/api/vendor-reports/${id}/save-template`,
        {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
        }
        )

        const result = await response.json()

        if (!response.ok) {
        throw new Error(
            result.error ?? "Unable to save template"
        )
        }

        setMessage(
        `Template "${result.name}" saved successfully.`
        )
        setTemplateName("")
    } catch (err) {
        setError(
        err instanceof Error
            ? err.message
            : "Unable to save template"
        )
    } finally {
        setSavingTemplate(false)
    }
    }


  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Loading report review...
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
        <p className="mt-4 text-destructive">
          {error || "Report not found"}
        </p>
      </div>
    )
  }

  const { report, extractions, availableMetrics, summary } =
    data

  const imported = report.status === "imported"
  const canEdit =
    ["ready", "needs_review"].includes(report.status) &&
    !importing

  const mappingInProgress = savingId !== null

  const summaryCards = [
    {
      label: "Extracted",
      value: summary.total,
      icon: ClipboardCheck,
      color: "text-secondary-light",
      background: "bg-secondary-light/10",
    },
    {
      label: "Matched",
      value: summary.matched,
      icon: CheckCircle2,
      color: "text-primary",
      background: "bg-primary/10",
    },
    {
      label: "Needs Review",
      value: summary.needsReview,
      icon: AlertTriangle,
      color: "text-warning",
      background: "bg-warning/10",
    },
    {
      label: "Ignored",
      value: summary.ignored,
      icon: XCircle,
      color: "text-muted-foreground",
      background: "bg-muted",
    },
    {
      label: "Targets Met",
      value: summary.met,
      icon: CheckCircle2,
      color: "text-primary",
      background: "bg-primary/10",
    },
    {
      label: "Targets Missed",
      value: summary.missed,
      icon: CircleAlert,
      color: "text-destructive",
      background: "bg-destructive/10",
    },
  ]

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

          <h1 className="app-title">Review Report</h1>

          <p className="app-subtitle">
            Match, ignore, and validate extracted metrics
            before importing KPI/SLA results.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadReview()}
          disabled={importing || mappingInProgress}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Report details */}
      <section className="app-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>

            <div>
              <h2 className="font-semibold text-foreground">
                {report.original_filename}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {report.vendor_name}
                {" · "}
                {formatDate(report.period_start)}
                {" – "}
                {formatDate(report.period_end)}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              imported
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-warning/20 bg-warning/10 text-warning"
            }`}
          >
            {formatStatus(report.status)}
          </span>
        </div>
      </section>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon

          return (
            <div key={card.label} className="app-surface p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {card.label}
                </span>

                <div
                  className={`rounded-xl p-2 ${card.background}`}
                >
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>

              <p className="mt-3 text-3xl font-semibold text-foreground">
                {card.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Import warnings */}
      {summary.needsReview > 0 && !imported && (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">
              {summary.needsReview} metrics need review
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Map these metrics to existing KPIs/SLAs or
              ignore them if they should not be imported.
            </p>
          </div>
        </div>
      )}

      {summary.conflicts > 0 && !imported && (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">
              {summary.conflicts} existing results detected
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              One or more mapped metrics already have results
              for this reporting period. Change the mappings
              if they are incorrect; existing results will
              not be overwritten.
            </p>
          </div>
        </div>
      )}

      {imported && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
          <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
          This report has been imported into the vendor's
          KPI/SLA performance history.
        </div>
      )}

      {/* Extractions */}
      <section className="app-surface overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Extracted Performance Metrics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the correct KPI/SLA mapping for each
            reported metric, or ignore irrelevant rows.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Report Metric</th>
                <th className="px-4 py-3">Reported Value</th>
                <th className="px-4 py-3">KPI/SLA Mapping</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {extractions.map((row) => {
                const isIgnored =
                  row.validation_status === "ignored"

                const isMatched = [
                  "matched",
                  "approved",
                ].includes(row.validation_status)

                const saving = savingId === row.id

                const selectedMetric =
                  selectedMappings[row.id] ?? ""

                const mappingChanged =
                  selectedMetric !== (row.metric_id ?? "")

                // Avoid mapping a second row to the same
                // metric already used by another row.
                const usedMetricIds = new Set(
                  extractions
                    .filter(
                      (other) =>
                        other.id !== row.id &&
                        ["matched", "approved"].includes(
                          other.validation_status
                        ) &&
                        other.metric_id
                    )
                    .map((other) => other.metric_id)
                )

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-muted/30 ${
                      isIgnored ? "opacity-70" : ""
                    }`}
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-foreground">
                        {row.source_label}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.source_location ?? "—"}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatStatus(row.validation_status)}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-foreground">
                        {row.normalized_value ?? "—"}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Raw: {row.raw_value ?? "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      {isIgnored ? (
                        <span className="text-xs text-muted-foreground">
                          Excluded from import
                        </span>
                      ) : (
                        <div className="min-w-[220px] space-y-2">
                          <select
                            value={selectedMetric}
                            disabled={
                              !canEdit ||
                              saving ||
                              mappingInProgress
                            }
                            onChange={(event) =>
                              setSelectedMappings((prev) => ({
                                ...prev,
                                [row.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                          >
                            <option value="">
                              Select KPI/SLA
                            </option>

                            {availableMetrics.map((metric) => (
                              <option
                                key={metric.id}
                                value={metric.id}
                                disabled={usedMetricIds.has(
                                  metric.id
                                )}
                              >
                                {metric.name} ({metric.metric_type})
                              </option>
                            ))}
                          </select>

                          {row.metric_name && (
                            <p className="text-xs text-muted-foreground">
                              Current: {row.metric_name}
                            </p>
                          )}

                          {row.validation_message &&
                            !isMatched &&
                            !isIgnored && (
                                <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-warning">
                                {row.validation_message}
                                </p>
                            )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {isMatched && !isIgnored ? (
                        <>
                          {row.comparison_operator}{" "}
                          {row.target_value}
                          {row.unit ? ` ${row.unit}` : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                          isIgnored
                            ? "ignored"
                            : row.calculated_status
                        )}`}
                      >
                        {isIgnored
                          ? "Ignored"
                          : row.calculated_status
                            ? formatStatus(
                                row.calculated_status
                              )
                            : "Needs Review"}
                      </span>

                      {row.imported_from_this_report ? (
                        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Successfully imported
                        </p>
                        ) : row.existing_result_id && !isIgnored ? (
                        <p className="mt-2 text-xs font-medium text-warning">
                            Existing result conflict
                        </p>
                        ) : null}
                    </td>

                    <td className="px-4 py-4 align-top">
                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          {isIgnored ? (
                            <button
                              type="button"
                              disabled={mappingInProgress}
                              onClick={() =>
                                void updateMapping(
                                  row,
                                  "restore"
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Restore
                            </button>
                          ) : (
                            <>
                              {selectedMetric &&
                                (mappingChanged ||
                                  !isMatched) && (
                                  <button
                                    type="button"
                                    disabled={
                                      mappingInProgress ||
                                      row.normalized_value === null
                                    }
                                    onClick={() =>
                                      void updateMapping(
                                        row,
                                        "map"
                                      )
                                    }
                                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
                                  >
                                    {saving
                                      ? "Saving..."
                                      : "Save Mapping"}
                                  </button>
                                )}

                              <button
                                type="button"
                                disabled={mappingInProgress}
                                onClick={() =>
                                  void updateMapping(
                                    row,
                                    "ignore"
                                  )
                                }
                                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                              >
                                Ignore
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {imported ? "Finalized" : "Read only"}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {extractions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No extracted metrics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>


        {["ready", "imported"].includes(report.status) &&
        summary.needsReview === 0 &&
        summary.matched > 0 && (
            <section className="app-surface p-6">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                Save as Report Template
                </h2>

                <p className="text-sm text-muted-foreground">
                Save the current KPI/SLA mappings and ignored
                metrics so they can be reused when processing
                future reports from this vendor.
                </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                type="text"
                maxLength={100}
                value={templateName}
                onChange={(event) =>
                    setTemplateName(event.target.value)
                }
                disabled={savingTemplate || mappingInProgress}
                placeholder="e.g. Monthly Performance Report"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                />

                <button
                type="button"
                disabled={
                    !templateName.trim() ||
                    savingTemplate ||
                    mappingInProgress ||
                    importing
                }
                onClick={() => void saveTemplate()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
                >
                {savingTemplate ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                )}

                {savingTemplate
                    ? "Saving Template..."
                    : "Save Template"}
                </button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
                Includes {summary.matched} metric mappings and{" "}
                {summary.ignored} ignored labels. This does not
                import or modify performance results.
            </p>
            </section>
        )}


      {/* Feedback */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary"
        >
          {message}
        </div>
      )}

      {/* Approval */}
      {!imported && (
        <section className="app-surface p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Approve & Import Results
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {summary.matched} matched metrics will be
                imported. {summary.ignored} ignored metrics
                will be excluded.
              </p>
            </div>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={
                !summary.canImport ||
                importing ||
                mappingInProgress
              }
              onChange={(event) =>
                setConfirmed(event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-primary"
            />

            <span className="text-sm text-foreground">
              I have reviewed the extracted values,
              reporting period, KPI/SLA mappings and
              units, and confirm that ignored rows
              should not be imported.
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {summary.canImport
                ? `${summary.matched} metrics ready for import`
                : "Resolve unmatched metrics and conflicts before importing"}
            </p>

            <button
              type="button"
              disabled={
                !summary.canImport ||
                !confirmed ||
                importing ||
                mappingInProgress
              }
              onClick={() => void handleImport()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}

              {importing
                ? "Importing..."
                : "Approve & Import"}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
