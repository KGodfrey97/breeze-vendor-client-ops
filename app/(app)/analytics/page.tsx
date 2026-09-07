"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  ShieldAlert,
  TrendingUp,
} from "lucide-react"

import type { Database } from "@/lib/db-types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type AnalyticsClaim = Database["public"]["Views"]["claims_with_patients"]["Row"]

type DatePreset = "30d" | "90d" | "180d" | "365d" | "custom" | "all"

type DrilldownState = {
  title: string
  description: string
  claimIds: string[]
} | null

type InsightCard = {
  title: string
  detail: string
  tone: "positive" | "warning" | "neutral"
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--destructive))",
]

const statusLabelMap: Record<string, string> = {
  overturned: "Approved",
  denied: "Denied",
  processing: "Processing",
  under_review: "Under Review",
}

const getRootHsl = (variableName: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
  return value ? `hsl(${value})` : ""
}

const formatDateInput = (date: Date) => {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 10)
}

const startOfPreset = (preset: DatePreset) => {
  const today = new Date()
  const start = new Date(today)

  switch (preset) {
    case "30d":
      start.setDate(today.getDate() - 30)
      return start
    case "90d":
      start.setDate(today.getDate() - 90)
      return start
    case "180d":
      start.setDate(today.getDate() - 180)
      return start
    case "365d":
      start.setDate(today.getDate() - 365)
      return start
    default:
      return null
  }
}

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value)
const formatPercent = (value: number) => `${value.toFixed(1)}%`

const formatDays = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "-"
  return `${value.toFixed(1)} days`
}

const formatDisplayDate = (value: string | null | undefined) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const truncateReason = (reason: string | null | undefined) => {
  const normalized = reason?.trim() || "Unknown"
  return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized
}

const escapeCsvValue = (value: string | number | null | undefined) => {
  const normalized = value == null ? "" : String(value)
  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, "\"\"")}"`
  }
  return normalized
}

const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
  const csvContent = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export default function AnalyticsPage() {

  const [claims, setClaims] = useState<AnalyticsClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>("180d")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [insuranceProviderFilter, setInsuranceProviderFilter] = useState("all")
  const [claimTypeFilter, setClaimTypeFilter] = useState("all")
  const [drilldown, setDrilldown] = useState<DrilldownState>(null)
  const [drilldownSort, setDrilldownSort] = useState("latest")

  useEffect(() => {
    if (datePreset === "custom") return
    const rangeStart = startOfPreset(datePreset)
    setCustomDateFrom(rangeStart ? formatDateInput(rangeStart) : "")
    setCustomDateTo(formatDateInput(new Date()))
  }, [datePreset])

  useEffect(() => {
    const fetchClaims = async () => {
      setIsLoading(true)
      setError(null)

      try {
        
        const response = await fetch("/api/analytics", {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load analytics.")
        }

        setClaims(payload.claims ?? [])
      } catch (fetchError) {
        console.error("Error loading analytics:", fetchError)
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load analytics.",
        )
      } finally {
        setIsLoading(false)
      }
    }
    fetchClaims()
  }, [])

  const insuranceProviders = useMemo(() => {
    return Array.from(
      new Set(claims.map((claim) => claim.insurance_provider).filter((value): value is string => Boolean(value))),
    ).sort((a, b) => a.localeCompare(b))
  }, [claims])

  const claimTypes = useMemo(() => {
    return Array.from(new Set(claims.map((claim) => claim.appeal_type).filter((value): value is string => Boolean(value)))).sort(
      (a, b) => a.localeCompare(b),
    )
  }, [claims])

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const createdAt = claim.created_at ? new Date(claim.created_at) : null
      if (datePreset !== "all") {
        const fromDate = customDateFrom ? new Date(`${customDateFrom}T00:00:00`) : null
        const toDate = customDateTo ? new Date(`${customDateTo}T23:59:59`) : null

        if (fromDate && createdAt && createdAt < fromDate) return false
        if (toDate && createdAt && createdAt > toDate) return false
      }

      if (insuranceProviderFilter !== "all" && claim.insurance_provider !== insuranceProviderFilter) return false
      if (claimTypeFilter !== "all" && claim.appeal_type !== claimTypeFilter) return false

      return true
    })
  }, [claims, claimTypeFilter, customDateFrom, customDateTo, datePreset, insuranceProviderFilter])

  const analytics = useMemo(() => {
    const approvedClaims = filteredClaims.filter((claim) => claim.status === "overturned")
    const deniedClaims = filteredClaims.filter((claim) => claim.status === "denied")
    const resolvedClaims = filteredClaims.filter((claim) => claim.status === "overturned" || claim.status === "denied")

    const successRate = resolvedClaims.length > 0 ? (approvedClaims.length / resolvedClaims.length) * 100 : 0

    const averageResolutionDays =
      resolvedClaims.length > 0
        ? resolvedClaims.reduce((sum, claim) => {
            const createdAt = claim.created_at ? new Date(claim.created_at) : null
            const resolvedAt = claim.updated_at ? new Date(claim.updated_at) : null
            if (!createdAt || !resolvedAt) return sum
            return sum + Math.max(0, (resolvedAt.getTime() - createdAt.getTime()) / 86_400_000)
          }, 0) / resolvedClaims.length
        : 0

    const trendsMap = new Map<string, { label: string; submitted: number; approved: number }>()
    filteredClaims.forEach((claim) => {
      const createdAt = claim.created_at ? new Date(claim.created_at) : null
      if (!createdAt) return
      const label = createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })

      if (!trendsMap.has(label)) {
        trendsMap.set(label, { label, submitted: 0, approved: 0 })
      }

      const bucket = trendsMap.get(label)
      if (!bucket) return
      bucket.submitted += 1
      if (claim.status === "overturned") bucket.approved += 1
    })

    const trendData = Array.from(trendsMap.values())

    const denialReasonMap = new Map<string, { reason: string; count: number; claimIds: string[] }>()
    deniedClaims.forEach((claim) => {
      const reason = truncateReason(claim.denial_reason)
      const current = denialReasonMap.get(reason) ?? { reason, count: 0, claimIds: [] }
      current.count += 1
      current.claimIds.push(claim.id)
      denialReasonMap.set(reason, current)
    })

    const denialReasons = Array.from(denialReasonMap.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({
        ...entry,
        percentage: deniedClaims.length > 0 ? (entry.count / deniedClaims.length) * 100 : 0,
      }))

    const insuranceProviderMap = new Map<
      string,
      { provider: string; total: number; denied: number; deniedClaimIds: string[]; allClaimIds: string[] }
    >()
    filteredClaims.forEach((claim) => {
      const provider = claim.insurance_provider || "Unknown"
      const current = insuranceProviderMap.get(provider) ?? {
        provider,
        total: 0,
        denied: 0,
        deniedClaimIds: [],
        allClaimIds: [],
      }

      current.total += 1
      current.allClaimIds.push(claim.id)
      if (claim.status === "denied") {
        current.denied += 1
        current.deniedClaimIds.push(claim.id)
      }

      insuranceProviderMap.set(provider, current)
    })

    const denialRateByInsurance = Array.from(insuranceProviderMap.values())
      .map((entry) => ({
        ...entry,
        denialRate: entry.total > 0 ? (entry.denied / entry.total) * 100 : 0,
      }))
      .sort((a, b) => b.denialRate - a.denialRate)

    const denialPattern = Array.from(
      deniedClaims.reduce((map, claim) => {
        const key = `${claim.insurance_provider || "Unknown"}::${truncateReason(claim.denial_reason)}`
        const entry = map.get(key) ?? {
          insuranceProvider: claim.insurance_provider || "Unknown",
          denialReason: truncateReason(claim.denial_reason),
          count: 0,
        }
        entry.count += 1
        map.set(key, entry)
        return map
      }, new Map<string, { insuranceProvider: string; denialReason: string; count: number }>())
        .values(),
    ).sort((a, b) => b.count - a.count)[0]

    const highestDenialProvider = denialRateByInsurance.filter((entry) => entry.total >= 2)[0]

    const insights: InsightCard[] = []

    if (highestDenialProvider) {
      insights.push({
        title: "Denial Pressure",
        detail: `${highestDenialProvider.provider} has the highest denial rate at ${formatPercent(highestDenialProvider.denialRate)} across ${highestDenialProvider.total} claims.`,
        tone: "warning",
      })
    }

    if (denialPattern) {
      insights.push({
        title: "Actionable Pattern",
        detail: `${denialPattern.insuranceProvider} is most often denying for “${denialPattern.denialReason}”. This pattern appears in ${denialPattern.count} claims.`,
        tone: "neutral",
      })
    }

    return {
      totalClaims: filteredClaims.length,
      approvedClaims: approvedClaims.length,
      deniedClaims: deniedClaims.length,
      pendingClaims: filteredClaims.filter((claim) => claim.status !== "overturned" && claim.status !== "denied").length,
      successRate,
      averageResolutionDays,
      trendData,
      denialReasons,
      denialRateByInsurance,
      insights,
    }
  }, [filteredClaims])

  const drilldownClaims = useMemo(() => {
    const sourceClaims = drilldown
      ? filteredClaims.filter((claim) => drilldown.claimIds.includes(claim.id))
      : filteredClaims

    const sortedClaims = [...sourceClaims]

    switch (drilldownSort) {
      case "oldest":
        sortedClaims.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        break
      case "amount_desc":
        sortedClaims.sort((a, b) => (b.original_claim_amount || 0) - (a.original_claim_amount || 0))
        break
      case "status":
        sortedClaims.sort((a, b) => (a.status || "").localeCompare(b.status || ""))
        break
      default:
        sortedClaims.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }

    return sortedClaims.slice(0, 25)
  }, [drilldown, drilldownSort, filteredClaims])

  const handleResetFilters = () => {
    setDatePreset("180d")
    setInsuranceProviderFilter("all")
    setClaimTypeFilter("all")
    setDrilldown(null)
  }

  const reportDateStamp = useMemo(() => formatDateInput(new Date()), [])

  const handleDownloadSummaryReport = () => {
    const rows: Array<Array<string | number | null | undefined>> = [
      ["Report", "Analytics Summary"],
      ["Generated On", new Date().toLocaleString()],
      ["Date Preset", datePreset],
      ["Date From", customDateFrom || "All"],
      ["Date To", customDateTo || "All"],
      ["Insurance Provider Filter", insuranceProviderFilter],
      ["Claim Type Filter", claimTypeFilter],
      [],
      ["Metric", "Value"],
      ["Total Claims Submitted", analytics.totalClaims],
      ["Approved Appeals", analytics.approvedClaims],
      ["Denied Appeals", analytics.deniedClaims],
      ["Pending Appeals", analytics.pendingClaims],
      ["Appeal Success Rate", formatPercent(analytics.successRate)],
      ["Average Time to Resolution", formatDays(analytics.averageResolutionDays)],
      [],
      ["Denial Rate by Insurance Provider"],
      ["Insurance Provider", "Total Claims", "Denied Claims", "Denial Rate"],
      ...analytics.denialRateByInsurance.map((entry) => [
        entry.provider,
        entry.total,
        entry.denied,
        formatPercent(entry.denialRate),
      ]),
      [],
      ["Most Common Denial Reasons"],
      ["Denial Reason", "Denied Claims", "Share of Denials"],
      ...analytics.denialReasons.map((reason) => [reason.reason, reason.count, formatPercent(reason.percentage)]),
      [],
      ["Actionable Insights"],
      ["Title", "Detail"],
      ...analytics.insights.map((insight) => [insight.title, insight.detail]),
    ]

    downloadCsv(`analytics-summary-${reportDateStamp}.csv`, rows)
  }

  const handleDownloadClaimsReport = () => {
    const sourceClaims = drilldown
      ? filteredClaims.filter((claim) => drilldown.claimIds.includes(claim.id))
      : filteredClaims

    const rows: Array<Array<string | number | null | undefined>> = [
      ["Report", drilldown ? drilldown.title : "Filtered Claims Report"],
      ["Generated On", new Date().toLocaleString()],
      ["Date Preset", datePreset],
      ["Date From", customDateFrom || "All"],
      ["Date To", customDateTo || "All"],
      ["Insurance Provider Filter", insuranceProviderFilter],
      ["Claim Type Filter", claimTypeFilter],
      [],
      [
        "Claim ID",
        "Patient Name",
        "Insurance Provider",
        "Claim Type",
        "Status",
        "Denial Reason",
        "Original Claim Amount",
        "Created At",
        "Updated At",
      ],
      ...sourceClaims.map((claim) => [
        claim.claim_id,
        [claim.first_name, claim.last_name].filter(Boolean).join(" "),
        claim.insurance_provider,
        claim.appeal_type,
        statusLabelMap[claim.status || ""] || claim.status || "Unknown",
        claim.denial_reason,
        claim.original_claim_amount,
        claim.created_at,
        claim.updated_at,
      ]),
    ]

    downloadCsv(`analytics-claims-${reportDateStamp}.csv`, rows)
  }

  const handleDownloadExecutivePdf = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900")

    if (!printWindow) {
      window.alert("Unable to open the executive report. Please allow pop-ups and try again.")
      return
    }

    const reportColors = {
      ink: getRootHsl("--foreground"),
      muted: getRootHsl("--muted-foreground"),
      line: getRootHsl("--border"),
      panel: getRootHsl("--muted"),
      teal: getRootHsl("--primary"),
      orange: getRootHsl("--warning"),
      red: getRootHsl("--destructive"),
      green: getRootHsl("--primary-dark"),
      secondary: getRootHsl("--secondary"),
    }

    const topDenialProviders = analytics.denialRateByInsurance.slice(0, 5)
    const topDenialReasons = analytics.denialReasons.slice(0, 5)

    const filterSummary = [
      `Date preset: ${datePreset}`,
      `Date from: ${customDateFrom || "All"}`,
      `Date to: ${customDateTo || "All"}`,
      `Insurance provider: ${insuranceProviderFilter}`,
      `Claim type: ${claimTypeFilter}`,
    ]

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Executive Appeals Report</title>
          <style>
            :root {
              --ink: ${reportColors.ink};
              --muted: ${reportColors.muted};
              --line: ${reportColors.line};
              --paper: #ffffff;
              --panel: ${reportColors.panel};
              --teal: ${reportColors.teal};
              --orange: ${reportColors.orange};
              --red: ${reportColors.red};
              --green: ${reportColors.green};
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #eef4f3;
              color: var(--ink);
              font-family: Arial, Helvetica, sans-serif;
            }
            .report {
              max-width: 960px;
              margin: 0 auto;
              padding: 32px;
              background: var(--paper);
            }
            .hero {
              padding: 28px;
              border-radius: 24px;
              background: linear-gradient(135deg, ${reportColors.teal} 0%, ${reportColors.secondary} 100%);
              color: white;
            }
            .hero h1 {
              margin: 0 0 10px;
              font-size: 32px;
              line-height: 1.1;
            }
            .hero p {
              margin: 0;
              font-size: 15px;
              line-height: 1.6;
              color: rgba(255,255,255,0.88);
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px 24px;
              margin-top: 20px;
              font-size: 13px;
              color: rgba(255,255,255,0.9);
            }
            .section {
              margin-top: 28px;
            }
            .section h2 {
              margin: 0 0 12px;
              font-size: 18px;
            }
            .section p.section-copy {
              margin: 0 0 16px;
              color: var(--muted);
              font-size: 14px;
              line-height: 1.6;
            }
            .kpis {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 14px;
            }
            .kpi {
              border: 1px solid var(--line);
              border-radius: 18px;
              padding: 18px;
              background: var(--panel);
            }
            .kpi .label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--muted);
            }
            .kpi .value {
              margin-top: 8px;
              font-size: 28px;
              font-weight: 700;
            }
            .kpi .detail {
              margin-top: 8px;
              font-size: 13px;
              color: var(--muted);
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px;
            }
            .panel {
              border: 1px solid var(--line);
              border-radius: 20px;
              padding: 20px;
              background: white;
            }
            .panel h3 {
              margin: 0 0 12px;
              font-size: 15px;
            }
            .list {
              margin: 0;
              padding: 0;
              list-style: none;
            }
            .list li {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 10px 0;
              border-bottom: 1px solid var(--line);
              font-size: 14px;
            }
            .list li:last-child { border-bottom: 0; }
            .insights {
              display: grid;
              gap: 12px;
            }
            .insight {
              border: 1px solid var(--line);
              border-left-width: 6px;
              border-radius: 16px;
              padding: 14px 16px;
              background: var(--panel);
            }
            .insight h4 {
              margin: 0 0 6px;
              font-size: 14px;
            }
            .insight p {
              margin: 0;
              font-size: 13px;
              line-height: 1.6;
              color: var(--muted);
            }
            .insight.positive { border-left-color: var(--green); }
            .insight.warning { border-left-color: var(--orange); }
            .insight.neutral { border-left-color: var(--teal); }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            th, td {
              text-align: left;
              padding: 10px 12px;
              border-bottom: 1px solid var(--line);
              vertical-align: top;
            }
            th {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--muted);
            }
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: var(--muted);
            }
            @media print {
              body { background: white; }
              .report { max-width: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="report">
            <section class="hero">
              <h1>Executive Appeals Report</h1>
              <p>Leadership-ready summary of appeal performance, denial patterns, and operational follow-through for the current analytics filters.</p>
              <div class="meta">
                <div><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</div>
                <div><strong>Total filtered claims:</strong> ${escapeHtml(formatNumber(analytics.totalClaims))}</div>
                ${filterSummary.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}
              </div>
            </section>

            <section class="section">
              <h2>Executive KPI Summary</h2>
              <div class="kpis">
                <div class="kpi">
                  <div class="label">Claims Submitted</div>
                  <div class="value">${escapeHtml(formatNumber(analytics.totalClaims))}</div>
                  <div class="detail">${escapeHtml(formatNumber(analytics.pendingClaims))} in progress</div>
                </div>
                <div class="kpi">
                  <div class="label">Approved Appeals</div>
                  <div class="value">${escapeHtml(formatNumber(analytics.approvedClaims))}</div>
                  <div class="detail">Resolved as approved</div>
                </div>
                <div class="kpi">
                  <div class="label">Denied Appeals</div>
                  <div class="value">${escapeHtml(formatNumber(analytics.deniedClaims))}</div>
                  <div class="detail">Final denials</div>
                </div>
                <div class="kpi">
                  <div class="label">Success Rate</div>
                  <div class="value">${escapeHtml(formatPercent(analytics.successRate))}</div>
                  <div class="detail">Avg resolution: ${escapeHtml(formatDays(analytics.averageResolutionDays))}</div>
                </div>
              </div>
            </section>

            <section class="section">
              <h2>Operational Highlights</h2>
              <p class="section-copy">This section focuses on the strongest current performance signals and where administrative teams may want to intervene next.</p>
              <div class="insights">
                ${
                  analytics.insights.length > 0
                    ? analytics.insights
                        .map(
                          (insight) => `
                            <div class="insight ${escapeHtml(insight.tone)}">
                              <h4>${escapeHtml(insight.title)}</h4>
                              <p>${escapeHtml(insight.detail)}</p>
                            </div>
                          `,
                        )
                        .join("")
                    : `<div class="insight neutral"><h4>No major insights yet</h4><p>There is not enough filtered data to generate executive insights for this view.</p></div>`
                }
              </div>
            </section>

            <section class="section">
              <div class="grid">
                <div class="panel">
                  <h3>Highest Denial Rate by Insurance Provider</h3>
                  <ul class="list">
                    ${
                      topDenialProviders.length > 0
                        ? topDenialProviders
                            .map(
                              (entry) => `
                                <li>
                                  <span>${escapeHtml(entry.provider)}</span>
                                  <strong>${escapeHtml(formatPercent(entry.denialRate))}</strong>
                                </li>
                              `,
                            )
                            .join("")
                        : `<li><span>No provider data available</span><strong>-</strong></li>`
                    }
                  </ul>
                </div>
                <div class="panel">
                  <h3>Most Common Denial Reasons</h3>
                  <ul class="list">
                    ${
                      topDenialReasons.length > 0
                        ? topDenialReasons
                            .map(
                              (reason) => `
                                <li>
                                  <span>${escapeHtml(reason.reason)}</span>
                                  <strong>${escapeHtml(formatPercent(reason.percentage))}</strong>
                                </li>
                              `,
                            )
                            .join("")
                        : `<li><span>No denial reasons available</span><strong>-</strong></li>`
                    }
                  </ul>
                </div>
              </div>
            </section>

            <p class="footer">This report reflects the currently applied analytics filters and is intended for executive review, planning, and operational follow-up.</p>
          </div>
          <script>
            setTimeout(() => {
              window.print();
            }, 300); // wait 300ms for rendering
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(reportHtml)
    printWindow.document.close()
  }

  if (isLoading) {
    return (
      <div className="app-page">
        <div className="space-y-5">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <Skeleton className="h-[360px] rounded-2xl xl:col-span-2" />
            <Skeleton className="h-[360px] rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-page">
        <div className="max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page">
      <div className="space-y-5">

        <Card className="app-surface bg-secondary text-secondary-foreground">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl">Filters & Drill Controls</CardTitle>
                <CardDescription className="text-secondary-foreground/70">
                  Slice your analytics by time period, insurance provider, and claim type.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="bg-background text-secondary hover:bg-muted" onClick={handleDownloadExecutivePdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Executive PDF
                </Button>
                <Button variant="secondary" className="bg-background text-secondary hover:bg-muted" onClick={handleDownloadSummaryReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Summary
                </Button>
                <Button variant="secondary" className="bg-background text-secondary hover:bg-muted" onClick={handleDownloadClaimsReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Claims
                </Button>
                <Button variant="secondary" className="bg-background text-secondary hover:bg-muted" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <LabelText>Time Range</LabelText>
                <Select value={datePreset} onValueChange={(value) => setDatePreset(value as DatePreset)}>
                  <SelectTrigger className="border-secondary-light/30 bg-secondary text-secondary-foreground">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="180d">Last 6 months</SelectItem>
                    <SelectItem value="365d">Last 12 months</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <LabelText>Insurance Provider</LabelText>
                <Select value={insuranceProviderFilter} onValueChange={setInsuranceProviderFilter}>
                  <SelectTrigger className="border-secondary-light/30 bg-secondary text-secondary-foreground">
                    <SelectValue placeholder="All insurance providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All insurance providers</SelectItem>
                    {insuranceProviders.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <LabelText>Claim Type</LabelText>
                <Select value={claimTypeFilter} onValueChange={setClaimTypeFilter}>
                  <SelectTrigger className="border-secondary-light/30 bg-secondary text-secondary-foreground">
                    <SelectValue placeholder="All claim types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All claim types</SelectItem>
                    {claimTypes.map((claimType) => (
                      <SelectItem key={claimType} value={claimType}>
                        {claimType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <LabelText>Date From</LabelText>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(event) => {
                      setDatePreset("custom")
                      setCustomDateFrom(event.target.value)
                    }}
                    className="border-secondary-light/30 bg-secondary text-secondary-foreground [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <LabelText>Date To</LabelText>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(event) => {
                      setDatePreset("custom")
                      setCustomDateTo(event.target.value)
                    }}
                    className="border-secondary-light/30 bg-secondary text-secondary-foreground [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Claims Submitted"
            value={formatNumber(analytics.totalClaims)}
            detail={`${formatNumber(analytics.pendingClaims)} still in progress`}
            icon={<Filter className="h-5 w-5" />}
            accent="teal"
          />
          <MetricCard
            title="Approved Appeals"
            value={formatNumber(analytics.approvedClaims)}
            detail="Overturned / approved outcomes"
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="green"
          />
          <MetricCard
            title="Denied Appeals"
            value={formatNumber(analytics.deniedClaims)}
            detail="Final denials in filtered set"
            icon={<ShieldAlert className="h-5 w-5" />}
            accent="red"
          />
          <MetricCard
            title="Average Time to Resolution"
            value={formatDays(analytics.averageResolutionDays)}
            detail={`Success rate: ${formatPercent(analytics.successRate)}`}
            icon={<Clock3 className="h-5 w-5" />}
            accent="orange"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Appeals Submitted vs Approved Over Time</CardTitle>
              <CardDescription>Use this trend to spot seasonal volume shifts and approval momentum.</CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Line type="monotone" dataKey="submitted" stroke="hsl(var(--chart-4))" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="approved" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Denial Reasons Distribution</CardTitle>
              <CardDescription>Click a slice to inspect the underlying denied claims.</CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              {analytics.denialReasons.length === 0 ? (
                <EmptyState message="No denied claims are available in the current filtered view." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.denialReasons}
                      dataKey="count"
                      nameKey="reason"
                      innerRadius={60}
                      outerRadius={105}
                      paddingAngle={3}
                      onClick={(entry) => {
                        if (!entry?.claimIds) return
                        setDrilldown({
                          title: `Denied claims for ${entry.reason}`,
                          description: `${entry.count} denied claims in this denial reason group.`,
                          claimIds: entry.claimIds,
                        })
                      }}
                    >
                      {analytics.denialReasons.map((entry, index) => (
                        <Cell key={entry.reason} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, _name, payload) => [`${value} claims`, payload.payload.reason]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Denial Rate by Insurance Provider</CardTitle>
              <CardDescription>Click a bar to see which claims are driving denial pressure for each payer.</CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              {analytics.denialRateByInsurance.length === 0 ? (
                <EmptyState message="No insurance provider data is available for the current filter set." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.denialRateByInsurance.slice(0, 8)} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="provider" type="category" tickLine={false} axisLine={false} width={120} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(value: number) => formatPercent(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Bar
                      dataKey="denialRate"
                      fill="hsl(var(--destructive))"
                      radius={[0, 12, 12, 0]}
                      onClick={(entry) => {
                        if (!entry?.allClaimIds) return
                        setDrilldown({
                          title: `${entry.provider} claims`,
                          description: `${entry.denied} denied out of ${entry.total} total claims for this insurance provider.`,
                          claimIds: entry.allClaimIds,
                        })
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Common Denial Reasons</CardTitle>
              <CardDescription>The most frequent denial categories in the active filter set.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.denialReasons.length === 0 ? (
                <EmptyState message="No denial reasons to summarize right now." compact />
              ) : (
                analytics.denialReasons.slice(0, 5).map((reason, index) => (
                  <button
                    key={reason.reason}
                    type="button"
                    onClick={() =>
                      setDrilldown({
                        title: `Claims denied for ${reason.reason}`,
                        description: `${reason.count} denied claims with this reason.`,
                        claimIds: reason.claimIds,
                      })
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5">
                    <div className="pr-4">
                      <p className="text-sm font-medium text-foreground">{index + 1}. {reason.reason}</p>
                      <p className="text-xs text-muted-foreground">{reason.count} denied claims</p>
                    </div>
                    <Badge variant="outline" className="border-border bg-card">
                      {formatPercent(reason.percentage)}
                    </Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="app-surface">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{drilldown ? drilldown.title : "Filtered Claims"}</CardTitle>
                <CardDescription>
                  {drilldown ? drilldown.description : "Review the individual claims behind your current analytics filters."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {drilldown && (
                  <Button variant="outline" onClick={() => setDrilldown(null)}>
                    Clear Drill Down
                  </Button>
                )}
                <Select value={drilldownSort} onValueChange={setDrilldownSort}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort claims" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="amount_desc">Highest amount</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {drilldownClaims.length === 0 ? (
              <EmptyState message="No claims match the current filter combination." compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Claim</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Patient</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Insurance</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Claim Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownClaims.map((claim) => (
                      <tr key={claim.id} className="rounded-2xl bg-muted/50">
                        <td className="rounded-l-2xl px-4 py-4 text-sm font-medium text-foreground">
                          <Link href={`/claims/view/${claim.id}`} className="inline-flex items-center gap-2 hover:text-primary">
                            {claim.claim_id}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{[claim.first_name, claim.last_name].filter(Boolean).join(" ") || "-"}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{claim.insurance_provider || "-"}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{claim.appeal_type || "-"}</td>
                        <td className="px-4 py-4 text-sm">
                          <Badge variant="outline" className="border-border bg-card">
                            {statusLabelMap[claim.status || ""] || claim.status || "Unknown"}
                          </Badge>
                        </td>
                        <td className="rounded-r-2xl px-4 py-4 text-sm text-foreground">{formatDisplayDate(claim.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  accent,
}: {
  title: string
  value: string
  detail: string
  icon: ReactNode
  accent: "teal" | "green" | "red" | "orange"
}) {
  const accentClasses = {
    teal: "border-secondary-light/20 bg-card text-secondary-light",
    green: "border-primary/20 bg-card text-primary",
    red: "border-destructive/20 bg-card text-destructive",
    orange: "border-warning/20 bg-card text-warning",
  }

  return (
    <Card className="app-surface">
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("rounded-lg border p-3", accentClasses[accent])}>{icon}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={cn("flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-center text-sm text-muted-foreground", compact ? "min-h-[120px] px-4 py-8" : "min-h-[280px] px-6 py-10")}>
      {message}
    </div>
  )
}

function LabelText({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground/60">{children}</p>
}
