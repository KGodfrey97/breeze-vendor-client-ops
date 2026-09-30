"use client"

import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Target,
  XCircle,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"

type PerformanceData = {
  complianceRate: number | null
  met: number
  missed: number
  measuredMetrics: number
  totalMetrics: number
  lookbackMonths: number
}

type DashboardKpiSlaPerformanceProps = {
  performance:
    | PerformanceData
    | null
    | undefined
}

export function DashboardKpiSlaPerformance({
  performance,
}: DashboardKpiSlaPerformanceProps) {
  const router =
    useRouter()

  const met =
    Number(
      performance?.met
    ) || 0

  const missed =
    Number(
      performance?.missed
    ) || 0

  const measuredMetrics =
    Number(
      performance?.measuredMetrics
    ) || 0

  const totalMetrics =
    Number(
      performance?.totalMetrics
    ) || 0

  const complianceRate =
    performance?.complianceRate != null
      ? Number(
          performance.complianceRate
        )
      : null

  const lookbackMonths =
    Number(
      performance?.lookbackMonths
    ) || 0

  /*
   * Active metrics that do not
   * currently have a result in
   * the reporting window.
   */
  const awaitingResults =
    Math.max(
      totalMetrics -
        measuredMetrics,
      0
    )

  const hasMetrics =
    totalMetrics > 0

  const displayComplianceRate =
    complianceRate != null
      ? Math.max(
          0,
          Math.min(
            100,
            complianceRate
          )
        )
      : 0

  const coverageRate =
    totalMetrics > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (
              measuredMetrics /
              totalMetrics
            ) *
              100
          )
        )
      : 0

  /*
   * Your Analytics page supports
   * 3, 6, and 12 month windows.
   *
   * If the dashboard somehow
   * returns another value, fall
   * back to the Analytics default
   * of 6 months.
   */
  const analyticsMonths =
    lookbackMonths === 3 ||
    lookbackMonths === 6 ||
    lookbackMonths === 12
      ? lookbackMonths
      : 6

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  const openAnalytics = (
    params?: {
      status?:
        | "met"
        | "missed"
        | "awaiting"

      view?:
        | "coverage"
    }
  ) => {
    const searchParams =
      new URLSearchParams()

    /*
     * The Analytics page treats
     * 6 months as its default,
     * but including it explicitly
     * guarantees the drill-down
     * uses the same dashboard
     * reporting window.
     */
    searchParams.set(
      "months",
      String(
        analyticsMonths
      )
    )

    if (params?.status) {
      searchParams.set(
        "status",
        params.status
      )
    }

    if (params?.view) {
      searchParams.set(
        "view",
        params.view
      )
    }

    router.push(
      `/analytics?${searchParams.toString()}`
    )
  }

  /* ---------------------------------------------------------------------- */
  /* Empty State                                                            */
  /* ---------------------------------------------------------------------- */

  if (!hasMetrics) {
    return (
      <div className="flex min-h-[260px] items-center justify-center">
        <div className="rounded-lg border border-dashed px-8 py-7 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="mt-3 font-medium">
            No active metrics
          </p>

          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            KPI and SLA
            performance will
            appear once metrics
            are configured for
            your vendors.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* -------------------------------------------------------------- */}
      {/* Compliance Rate                                                */}
      {/* -------------------------------------------------------------- */}

      <button
        type="button"
        onClick={() =>
          openAnalytics()
        }
        className="group block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="rounded-lg transition-colors group-hover:bg-muted/30">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Compliance Rate
                </p>

                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>

              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-4xl font-bold tracking-tight">
                  {complianceRate !=
                  null
                    ? `${complianceRate.toFixed(
                        1
                      )}%`
                    : "—"}
                </p>

                {measuredMetrics >
                  0 && (
                  <span className="text-xs text-muted-foreground">
                    {met} of{" "}
                    {
                      measuredMetrics
                    }{" "}
                    met
                  </span>
                )}
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-muted/80">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <Progress
            className="mt-4 h-2"
            value={
              displayComplianceRate
            }
          />

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Based on measured
              metrics
            </span>

            <span>
              {measuredMetrics}{" "}
              measured
            </span>
          </div>
        </div>
      </button>

      {/* -------------------------------------------------------------- */}
      {/* Performance Breakdown                                          */}
      {/* -------------------------------------------------------------- */}

      <div className="grid grid-cols-3 gap-3">
        {/* Met */}

        <button
          type="button"
          onClick={() =>
            openAnalytics({
              status: "met",
            })
          }
          className="group rounded-lg border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />

              <p className="text-xs text-muted-foreground">
                Met
              </p>
            </div>

            <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </div>

          <p className="mt-2 text-2xl font-semibold">
            {met}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Meeting target
          </p>
        </button>

        {/* Missed */}

        <button
          type="button"
          onClick={() =>
            openAnalytics({
              status:
                "missed",
            })
          }
          className="group rounded-lg border p-3 text-left transition-all hover:border-destructive/40 hover:bg-muted/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />

              <p className="text-xs text-muted-foreground">
                Missed
              </p>
            </div>

            <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </div>

          <p className="mt-2 text-2xl font-semibold">
            {missed}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Below target
          </p>
        </button>

        {/* Awaiting */}

        <button
          type="button"
          onClick={() =>
            openAnalytics({
              status:
                "awaiting",
            })
          }
          className="group rounded-lg border p-3 text-left transition-all hover:border-foreground/20 hover:bg-muted/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CircleDashed className="h-4 w-4 text-muted-foreground" />

              <p className="text-xs text-muted-foreground">
                Awaiting
              </p>
            </div>

            <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </div>

          <p className="mt-2 text-2xl font-semibold">
            {
              awaitingResults
            }
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            No result yet
          </p>
        </button>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Measurement Coverage                                           */}
      {/* -------------------------------------------------------------- */}

      <button
        type="button"
        onClick={() =>
          openAnalytics({
            view:
              "coverage",
          })
        }
        className="group block w-full rounded-lg bg-muted/40 p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                Measurement
                Coverage
              </p>

              <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Metrics with a
              result in the
              reporting window
            </p>
          </div>

          <p className="text-sm font-semibold">
            {measuredMetrics} /{" "}
            {totalMetrics}
          </p>
        </div>

        <Progress
          className="mt-3 h-1.5"
          value={
            coverageRate
          }
        />
      </button>

      {/* -------------------------------------------------------------- */}
      {/* Footer Details                                                  */}
      {/* -------------------------------------------------------------- */}

      <div className="flex items-center justify-between border-t pt-4 text-sm">
        <div>
          <p className="text-muted-foreground">
            Active Metrics
          </p>

          <p className="mt-0.5 font-medium">
            {totalMetrics}
          </p>
        </div>

        <div className="text-right">
          <p className="text-muted-foreground">
            Result Window
          </p>

          <p className="mt-0.5 font-medium">
            {lookbackMonths > 0
              ? `Last ${lookbackMonths} ${
                  lookbackMonths ===
                  1
                    ? "month"
                    : "months"
                }`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  )
}