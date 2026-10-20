
"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  ClipboardCheck,
  Calculator,
} from "lucide-react"

type Vendor = {
  id: string
  name: string
}

type Report = {
  id: string
  vendor_id: string
  vendor_name: string
  original_filename: string
  content_type: string | null
  file_size_bytes: number | null
  period_start: string | null
  period_end: string | null
  status: string
  created_at: string
  uploaded_at: string | null
  error_message: string | null
}

type Counts = {
  total: number
  imported: number
  pending: number
  failed: number
}

type ReportsResponse = {
  reports: Report[]
  templates: ReportTemplate[]
  vendors: Vendor[]
  counts: Counts
}


type ReportTemplate = {
  id: string
  vendor_id: string
  name: string
  file_type: string
  created_at: string
}


const MAX_FILE_SIZE = 20 * 1024 * 1024

const allowedExtensions = [".xlsx", ".csv", ".pdf"]

function formatSize(bytes: number | null) {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPeriod(value: string | null) {
  if (!value) return "—"

  const [year, month, day] = value.split("-").map(Number)

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

function statusClasses(status: string) {
  switch (status) {
    case "imported":
      return "bg-primary/10 text-primary border-primary/20"

    case "ready":
      return "bg-secondary-light/10 text-secondary-light border-secondary-light/20"

    case "needs_review":
      return "bg-warning/10 text-warning border-warning/20"

    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/20"

    case "processing":
      return "bg-approved/10 text-approved border-approved/20"

    case "uploaded":
      return "bg-primary/10 text-primary border-primary/20"

    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDefaultPeriod() {
  const now = new Date()

  const first = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  )

  const last = new Date(
    now.getFullYear(),
    now.getMonth(),
    0
  )

  const localDate = (date: Date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-")

  return {
    start: localDate(first),
    end: localDate(last),
  }
}

export default function VendorReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(
    null
  )

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [progress, setProgress] = useState("")

  const [vendorId, setVendorId] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const [periodStart, setPeriodStart] = useState(
    () => getDefaultPeriod().start
  )

  const [periodEnd, setPeriodEnd] = useState(
    () => getDefaultPeriod().end
  )

  const [vendorFilter, setVendorFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [downloadingId, setDownloadingId] = useState<
    string | null
  >(null)


  const [processingId, setProcessingId] = useState<string | null>(null)


  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({})


  const loadReports = useCallback(async () => {
    try {
      const response = await fetch("/api/vendor-reports", {
        cache: "no-store",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to load reports"
        )
      }

      setData(result)
      setError("")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reports"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  function selectFile(selected: File | null) {
    setMessage("")
    setFile(null)

    if (!selected) return

    const extension = selected.name
      .toLowerCase()
      .match(/\.[^.]+$/)?.[0]

    if (
      !extension ||
      !allowedExtensions.includes(extension)
    ) {
      setError("Only XLSX, CSV and PDF files are supported.")
      return
    }

    if (selected.size === 0 || selected.size > MAX_FILE_SIZE) {
      setError("File must be between 1 byte and 20 MB.")
      return
    }

    setError("")
    setFile(selected)
  }

  async function uploadReport() {
    if (!vendorId || !file) {
      setError("Please select a vendor and report file.")
      return
    }

    if (
      !periodStart ||
      !periodEnd ||
      periodEnd < periodStart
    ) {
      setError("Please enter a valid reporting period.")
      return
    }

    setUploading(true)
    setError("")
    setMessage("")

    try {
      setProgress("Preparing secure upload...")

      const prepareResponse = await fetch(
        "/api/vendor-reports/upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vendorId,
            filename: file.name,
            fileSize: file.size,
            periodStart,
            periodEnd,
          }),
        }
      )

      const prepared = await prepareResponse.json()

      if (!prepareResponse.ok) {
        throw new Error(
          prepared.error ?? "Unable to prepare upload"
        )
      }

      setProgress("Uploading report to AWS S3...")

      const s3Response = await fetch(
        prepared.uploadUrl,
        {
          method: "PUT",
          headers: {
            "Content-Type": prepared.contentType,
          },
          body: file,
        }
      )

      if (!s3Response.ok) {
        throw new Error("Report upload to S3 failed.")
      }

      setProgress("Confirming report upload...")

      const confirmResponse = await fetch(
        `/api/vendor-reports/${prepared.reportId}/confirm-upload`,
        {
          method: "POST",
        }
      )

      const confirmed = await confirmResponse.json()

      if (!confirmResponse.ok) {
        throw new Error(
          confirmed.error ?? "Unable to confirm upload"
        )
      }

      setFile(null)
      setMessage("Vendor report uploaded successfully.")

      await loadReports()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Report upload failed."
      )
    } finally {
      setUploading(false)
      setProgress("")
    }
  }

  async function downloadReport(report: Report) {
    setDownloadingId(report.id)
    setError("")

    try {
      const response = await fetch(
        `/api/vendor-reports/${report.id}/download-url`
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to download report"
        )
      }

      window.location.assign(result.downloadUrl)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Download failed"
      )
    } finally {
      setDownloadingId(null)
    }
  }


  async function processReport(report: Report) {
    setProcessingId(report.id)
    setError("")
    setMessage("")

    try {
      
    const response = await fetch(
      `/api/vendor-reports/${report.id}/process`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplates[report.id] || null,
        }),
      }
    )


      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to process report"
        )
      }

      setMessage(
        `Processed ${result.extractedCount} metrics. ` +
        `${result.matchedCount} matched, ` +
        `${result.needsReviewCount} need review.`
      )

      await loadReports()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Report processing failed"
      )
      await loadReports()
    } finally {
      setProcessingId(null)
    }
  }


  const reports = data?.reports ?? []
  const vendors = data?.vendors ?? []
  const templates = data?.templates ?? []

  const filteredReports = reports.filter((report) => {
    const vendorMatches =
      vendorFilter === "all" ||
      report.vendor_id === vendorFilter

    const statusMatches =
      statusFilter === "all" ||
      report.status === statusFilter

    return vendorMatches && statusMatches
  })

  const counts = data?.counts ?? {
    total: 0,
    imported: 0,
    pending: 0,
    failed: 0,
  }

  return (
    <div className="app-page mx-auto max-w-7xl p-6">

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Reports",
            value: counts.total,
            icon: FileText,
            color: "text-secondary-light",
            background: "bg-secondary-light/10",
          },
          {
            label: "Imported",
            value: counts.imported,
            icon: CheckCircle2,
            color: "text-primary",
            background: "bg-primary/10",
          },
          {
            label: "Awaiting Processing",
            value: counts.pending,
            icon: Clock3,
            color: "text-warning",
            background: "bg-warning/10",
          },
          {
            label: "Failed",
            value: counts.failed,
            icon: AlertCircle,
            color: "text-destructive",
            background: "bg-destructive/10",
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.label}
              className="app-surface p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </span>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.background}`}
                >
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>

              <p className="mt-3 text-3xl font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Upload form */}
      <section className="app-surface p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CloudUpload className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Upload Vendor Report
            </h2>

            <p className="text-sm text-muted-foreground">
              Reports are stored securely in AWS S3.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Vendor
            </span>

            <select
              value={vendorId}
              disabled={uploading}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            >
              <option value="">Select a vendor</option>

              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Period Start
            </span>

            <input
              type="date"
              value={periodStart}
              disabled={uploading}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Period End
            </span>

            <input
              type="date"
              value={periodEnd}
              disabled={uploading}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            />
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
          <FileSpreadsheet className="mb-3 h-8 w-8 text-primary" />

          <span className="text-sm font-medium text-foreground">
            {file ? file.name : "Choose a vendor report"}
          </span>

          <span className="mt-1 text-xs text-muted-foreground">
            XLSX, CSV or PDF — maximum 20 MB
          </span>

          <input
            type="file"
            accept=".xlsx,.csv,.pdf"
            disabled={uploading}
            className="sr-only"
            onChange={(e) =>
              selectFile(e.target.files?.[0] ?? null)
            }
          />
        </label>

        {file && (
          <p className="mt-2 text-xs text-muted-foreground">
            Selected: {formatSize(file.size)}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {progress || "Ready to upload"}
          </p>

          <button
            type="button"
            disabled={uploading || !file || !vendorId}
            onClick={() => void uploadReport()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}

            {uploading ? "Uploading..." : "Upload Report"}
          </button>
        </div>
      </section>

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

      {/* Report history */}
      <section className="app-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Report History
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              View and download previously uploaded reports.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            >
              <option value="all">All vendors</option>

              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            >
              <option value="all">All statuses</option>

              {[
                "pending_upload",
                "uploaded",
                "processing",
                "needs_review",
                "ready",
                "imported",
                "failed",
              ].map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">
                  Report
                </th>
                <th className="px-5 py-3 font-medium">
                  Vendor
                </th>
                <th className="px-5 py-3 font-medium">
                  Reporting Period
                </th>
                <th className="px-5 py-3 font-medium">
                  Uploaded
                </th>
                <th className="px-5 py-3 font-medium">
                  Status
                </th>
                <th className="px-5 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
                    Loading reports...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    No vendor reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-medium text-foreground">
                            {report.original_filename}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {formatSize(report.file_size_bytes)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-foreground">
                      {report.vendor_name}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {formatPeriod(report.period_start)}
                      {" – "}
                      {formatPeriod(report.period_end)}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {formatDate(report.uploaded_at)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                          report.status
                        )}`}
                      >
                        {statusLabel(report.status)}
                      </span>
                    </td>

                    
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex flex-nowrap items-center justify-end gap-2">

                        {/* Template selection and processing */}
                        {report.status === "uploaded" &&
                          /\.(xlsx|csv)$/i.test(report.original_filename) && (
                            <>
                              <select
                                aria-label={`Template for ${report.original_filename}`}
                                value={selectedTemplates[report.id] ?? ""}
                                disabled={processingId !== null}
                                onChange={(event) =>
                                  setSelectedTemplates((previous) => ({
                                    ...previous,
                                    [report.id]: event.target.value,
                                  }))
                                }
                                className="h-9 w-[170px] shrink-0 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                              >
                                <option value="">Auto-match metrics</option>

                                {templates
                                  .filter(
                                    (template) =>
                                      template.vendor_id === report.vendor_id &&
                                      template.file_type ===
                                        report.original_filename
                                          .toLowerCase()
                                          .match(/\.[^.]+$/)?.[0]
                                  )
                                  .map((template) => (
                                    <option
                                      key={template.id}
                                      value={template.id}
                                    >
                                      {template.name}
                                    </option>
                                  ))}
                              </select>

                              <button
                                type="button"
                                disabled={processingId !== null}
                                onClick={() => void processReport(report)}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processingId === report.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FileSpreadsheet className="h-3.5 w-3.5" />
                                )}

                                {processingId === report.id
                                  ? "Processing..."
                                  : "Process"}
                              </button>
                            </>
                          )}


                        {["uploaded", "ready", "needs_review"].includes(
                          report.status
                        ) &&
                          /\.(csv|xlsx)$/i.test(report.original_filename) && (
                            <Link
                              href={`/reports/${report.id}/configure`}
                              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                            >
                              <Calculator className="h-3.5 w-3.5" />
                              Configure
                            </Link>
                          )}

                        {/* Review results */}
                        {["ready", "needs_review", "imported"].includes(
                          report.status
                        ) && (
                          <Link
                            href={`/reports/${report.id}/review`}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />

                            {report.status === "imported"
                              ? "View Results"
                              : "Review"}
                          </Link>
                        )}

                        {/* Download report */}
                        <button
                          type="button"
                          title="Download report"
                          aria-label={`Download ${report.original_filename}`}
                          disabled={
                            downloadingId === report.id ||
                            ["pending_upload", "failed"].includes(
                              report.status
                            )
                          }
                          onClick={() => void downloadReport(report)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {downloadingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
