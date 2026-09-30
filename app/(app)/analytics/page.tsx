"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  useRouter,
  useSearchParams,
} from "next/navigation"
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Filter,
  Gauge,
  RefreshCw,
  Target,
  XCircle,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MetricStatus =
  | "met"
  | "missed"
  | "awaiting"

type MetricType =
  | "KPI"
  | "SLA"

type StatusFilter =
  | "all"
  | MetricStatus

type TypeFilter =
  | "all"
  | MetricType

type DateRange =
  | "3"
  | "6"
  | "12"

type AnalyticsMetric = {
  id: string

  vendorId: string
  vendorName: string

  lineOfBusinessId:
    | string
    | null

  lineOfBusinessName:
    | string
    | null

  metricName: string
  metricType: MetricType

  target:
    | string
    | null

  actual:
    | string
    | null

  status: MetricStatus

  period:
    | string
    | null
}

type AnalyticsVendor = {
  id: string
  name: string
}

type AnalyticsLineOfBusiness = {
  id: string
  name: string
}

type AnalyticsTrendPoint = {
  period: string

  complianceRate:
    | number
    | null
}

type VendorPerformance = {
  vendorId: string
  vendorName: string

  complianceRate:
    | number
    | null

  met: number
  missed: number
  awaiting: number
}

type AnalyticsData = {
  summary: {
    complianceRate:
      | number
      | null

    met: number
    missed: number
    awaiting: number

    measuredMetrics: number
    totalMetrics: number
  }

  filters: {
    vendors: AnalyticsVendor[]

    linesOfBusiness:
      AnalyticsLineOfBusiness[]
  }

  trend:
    AnalyticsTrendPoint[]

  vendorPerformance:
    VendorPerformance[]

  metrics:
    AnalyticsMetric[]
}

type IconComponent =
  React.ComponentType<{
    className?: string
  }>

type FilterOption = {
  value: string
  label: string
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AnalyticsPage() {
  const router =
    useRouter()

  const searchParams =
    useSearchParams()

  /* ------------------------------------------------------------------------ */
  /* Initial URL State                                                        */
  /* ------------------------------------------------------------------------ */

  const initialStatus =
    getValidStatus(
      searchParams.get(
        "status"
      )
    )

  const initialMetricType =
    getValidMetricType(
      searchParams.get(
        "type"
      )
    )

  const initialDateRange =
    getValidDateRange(
      searchParams.get(
        "months"
      )
    )

  const initialVendorId =
    searchParams.get(
      "vendorId"
    ) || "all"

  const initialLineOfBusinessId =
    searchParams.get(
      "lineOfBusinessId"
    ) || "all"

  const initialView =
    searchParams.get(
      "view"
    )

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [
    data,
    setData,
  ] =
    useState<AnalyticsData | null>(
      null
    )

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  const [
    status,
    setStatus,
  ] =
    useState<StatusFilter>(
      initialStatus
    )

  const [
    metricType,
    setMetricType,
  ] =
    useState<TypeFilter>(
      initialMetricType
    )

  const [
    vendorId,
    setVendorId,
  ] =
    useState(
      initialVendorId
    )

  const [
    lineOfBusinessId,
    setLineOfBusinessId,
  ] =
    useState(
      initialLineOfBusinessId
    )

  const [
    dateRange,
    setDateRange,
  ] =
    useState<DateRange>(
      initialDateRange
    )

  /* ------------------------------------------------------------------------ */
  /* Sync State When URL Changes                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setStatus(
      getValidStatus(
        searchParams.get(
          "status"
        )
      )
    )

    setMetricType(
      getValidMetricType(
        searchParams.get(
          "type"
        )
      )
    )

    setDateRange(
      getValidDateRange(
        searchParams.get(
          "months"
        )
      )
    )

    setVendorId(
      searchParams.get(
        "vendorId"
      ) || "all"
    )

    setLineOfBusinessId(
      searchParams.get(
        "lineOfBusinessId"
      ) || "all"
    )
  }, [searchParams])

  /* ------------------------------------------------------------------------ */
  /* Update URL                                                               */
  /* ------------------------------------------------------------------------ */

  const updateUrl =
    useCallback(
      (
        updates: Record<
          string,
          string | null
        >
      ) => {
        const params =
          new URLSearchParams(
            searchParams.toString()
          )

        Object.entries(
          updates
        ).forEach(
          ([
            key,
            value,
          ]) => {
            if (
              value === null ||
              value === "" ||
              value === "all"
            ) {
              params.delete(
                key
              )
            } else {
              params.set(
                key,
                value
              )
            }
          }
        )

        /*
         * Once the user manually
         * changes a filter, the
         * special dashboard view
         * marker is no longer
         * necessary.
         */

        if (
          Object.keys(
            updates
          ).some(
            (key) =>
              key !== "view"
          )
        ) {
          params.delete(
            "view"
          )
        }

        const query =
          params.toString()

        router.replace(
          query
            ? `/analytics?${query}`
            : "/analytics",
          {
            scroll: false,
          }
        )
      },
      [
        router,
        searchParams,
      ]
    )

  /* ------------------------------------------------------------------------ */
  /* API Query                                                                */
  /* ------------------------------------------------------------------------ */

  const buildApiQuery =
    useCallback(() => {
      const params =
        new URLSearchParams()

      params.set(
        "months",
        dateRange
      )

      if (
        status !== "all"
      ) {
        params.set(
          "status",
          status
        )
      }

      if (
        metricType !== "all"
      ) {
        params.set(
          "type",
          metricType
        )
      }

      if (
        vendorId !== "all"
      ) {
        params.set(
          "vendorId",
          vendorId
        )
      }

      if (
        lineOfBusinessId !==
        "all"
      ) {
        params.set(
          "lineOfBusinessId",
          lineOfBusinessId
        )
      }

      return params.toString()
    }, [
      dateRange,
      status,
      metricType,
      vendorId,
      lineOfBusinessId,
    ])

  /* ------------------------------------------------------------------------ */
  /* Load Analytics                                                           */
  /* ------------------------------------------------------------------------ */

  const loadAnalytics =
    useCallback(
      async () => {
        try {
          setIsLoading(
            true
          )

          setError(
            null
          )

          const query =
            buildApiQuery()

          const response =
            await fetch(
              `/api/analytics?${query}`,
              {
                cache:
                  "no-store",
              }
            )

          if (
            !response.ok
          ) {
            const body =
              await response
                .json()
                .catch(
                  () => null
                )

            throw new Error(
              body?.error ||
                "Unable to load analytics"
            )
          }

          const result =
            (await response.json()) as AnalyticsData

          setData(
            result
          )
        } catch (error) {
          console.error(
            error
          )

          setError(
            error instanceof Error
              ? error.message
              : "Analytics data could not be loaded."
          )
        } finally {
          setIsLoading(
            false
          )
        }
      },
      [
        buildApiQuery,
      ]
    )

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  /* ------------------------------------------------------------------------ */
  /* Derived Data                                                             */
  /* ------------------------------------------------------------------------ */

  const summary =
    data?.summary

  const coverageRate =
    summary &&
    summary.totalMetrics > 0
      ? (
          summary.measuredMetrics /
          summary.totalMetrics
        ) *
        100
      : 0

  const hasActiveFilters =
    status !== "all" ||
    metricType !== "all" ||
    vendorId !== "all" ||
    lineOfBusinessId !==
      "all" ||
    dateRange !== "6"

  /* ------------------------------------------------------------------------ */
  /* Filter Handlers                                                          */
  /* ------------------------------------------------------------------------ */

  const handleDateRangeChange = (
    value: string
  ) => {
    const next =
      getValidDateRange(
        value
      )

    setDateRange(
      next
    )

    updateUrl({
      months:
        next === "6"
          ? null
          : next,
    })
  }

  const handleMetricTypeChange = (
    value: string
  ) => {
    const next =
      getValidMetricType(
        value
      )

    setMetricType(
      next
    )

    updateUrl({
      type:
        next === "all"
          ? null
          : next,
    })
  }

  const handleStatusChange = (
    value: StatusFilter
  ) => {
    setStatus(
      value
    )

    updateUrl({
      status:
        value === "all"
          ? null
          : value,
    })
  }

  const handleVendorChange = (
    value: string
  ) => {
    setVendorId(
      value
    )

    updateUrl({
      vendorId:
        value === "all"
          ? null
          : value,
    })
  }

  /*
   * IMPORTANT:
   *
   * A vendor belongs to one LOB.
   * Therefore, changing LOB must
   * clear the currently selected
   * vendor.
   *
   * Otherwise we could end up with:
   *
   * LOB = Landscaping
   * Vendor = Vendor from Security
   *
   * which would produce an invalid
   * filter combination.
   */

  const handleLineOfBusinessChange = (
    value: string
  ) => {
    setLineOfBusinessId(
      value
    )

    setVendorId(
      "all"
    )

    updateUrl({
      lineOfBusinessId:
        value === "all"
          ? null
          : value,

      vendorId:
        null,
    })
  }

  const clearFilters =
    () => {
      setStatus(
        "all"
      )

      setMetricType(
        "all"
      )

      setVendorId(
        "all"
      )

      setLineOfBusinessId(
        "all"
      )

      setDateRange(
        "6"
      )

      router.replace(
        "/analytics",
        {
          scroll: false,
        }
      )
    }

  /* ------------------------------------------------------------------------ */
  /* Vendor Navigation                                                        */
  /* ------------------------------------------------------------------------ */

  const openVendor = (
    id: string
  ) => {
    router.push(
      `/vendors/view/${id}`
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6 p-6">
      {/* -------------------------------------------------------------- */}
      {/* Header                                                         */}
      {/* -------------------------------------------------------------- */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Analytics
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Analyze KPI and SLA
            performance across your
            vendors.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void loadAnalytics()
          }
          disabled={
            isLoading
          }
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              isLoading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Filters                                                        */}
      {/* -------------------------------------------------------------- */}

      <Card className="app-surface">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Date Range */}

              <FilterSelect
                label="Date Range"
                value={
                  dateRange
                }
                onValueChange={
                  handleDateRangeChange
                }
                options={[
                  {
                    value: "3",
                    label:
                      "Last 3 months",
                  },
                  {
                    value: "6",
                    label:
                      "Last 6 months",
                  },
                  {
                    value: "12",
                    label:
                      "Last 12 months",
                  },
                ]}
              />

              {/* Line of Business */}

              <FilterSelect
                label="Line of Business"
                value={
                  lineOfBusinessId
                }
                onValueChange={
                  handleLineOfBusinessChange
                }
                options={[
                  {
                    value: "all",
                    label:
                      "All lines",
                  },

                  ...(
                    data?.filters
                      .linesOfBusiness ||
                    []
                  ).map(
                    (lob) => ({
                      value:
                        lob.id,

                      label:
                        lob.name,
                    })
                  ),
                ]}
              />

              {/* Vendor */}

              <FilterSelect
                label="Vendor"
                value={
                  vendorId
                }
                onValueChange={
                  handleVendorChange
                }
                options={[
                  {
                    value: "all",
                    label:
                      "All vendors",
                  },

                  ...(
                    data?.filters
                      .vendors ||
                    []
                  ).map(
                    (vendor) => ({
                      value:
                        vendor.id,

                      label:
                        vendor.name,
                    })
                  ),
                ]}
              />

              {/* Metric Type */}

              <FilterSelect
                label="Metric Type"
                value={
                  metricType
                }
                onValueChange={
                  handleMetricTypeChange
                }
                options={[
                  {
                    value: "all",
                    label:
                      "KPI + SLA",
                  },
                  {
                    value: "KPI",
                    label:
                      "KPI",
                  },
                  {
                    value: "SLA",
                    label:
                      "SLA",
                  },
                ]}
              />

              {/* Status */}

              <FilterSelect
                label="Status"
                value={
                  status
                }
                onValueChange={(
                  value
                ) =>
                  handleStatusChange(
                    getValidStatus(
                      value
                    )
                  )
                }
                options={[
                  {
                    value: "all",
                    label:
                      "All statuses",
                  },
                  {
                    value: "met",
                    label:
                      "Met",
                  },
                  {
                    value:
                      "missed",
                    label:
                      "Missed",
                  },
                  {
                    value:
                      "awaiting",
                    label:
                      "Awaiting",
                  },
                ]}
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={
                  clearFilters
                }
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Dashboard Drill-down */}

          {(initialStatus !==
            "all" ||
            initialView ===
              "coverage") && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" />

              <span className="text-muted-foreground">
                Dashboard drill-down:
              </span>

              <span className="font-medium">
                {initialView ===
                "coverage"
                  ? "Measurement Coverage"
                  : formatStatus(
                      initialStatus
                    )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* Error                                                          */}
      {/* -------------------------------------------------------------- */}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Summary                                                        */}
      {/* -------------------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Compliance Rate"
          value={
            summary
              ?.complianceRate !=
            null
              ? `${summary.complianceRate.toFixed(
                  1
                )}%`
              : "—"
          }
          description="Measured metrics meeting target"
          icon={
            Gauge
          }
          loading={
            isLoading
          }
        />

        <SummaryCard
          title="Met"
          value={
            summary?.met ??
            0
          }
          description="Metrics meeting target"
          icon={
            CheckCircle2
          }
          loading={
            isLoading
          }
          active={
            status ===
            "met"
          }
          onClick={() =>
            handleStatusChange(
              status ===
                "met"
                ? "all"
                : "met"
            )
          }
        />

        <SummaryCard
          title="Missed"
          value={
            summary?.missed ??
            0
          }
          description="Metrics below target"
          icon={
            XCircle
          }
          loading={
            isLoading
          }
          active={
            status ===
            "missed"
          }
          onClick={() =>
            handleStatusChange(
              status ===
                "missed"
                ? "all"
                : "missed"
            )
          }
        />

        <SummaryCard
          title="Awaiting"
          value={
            summary?.awaiting ??
            0
          }
          description="Metrics without a result"
          icon={
            CircleDashed
          }
          loading={
            isLoading
          }
          active={
            status ===
            "awaiting"
          }
          onClick={() =>
            handleStatusChange(
              status ===
                "awaiting"
                ? "all"
                : "awaiting"
            )
          }
        />

        <SummaryCard
          title="Coverage"
          value={`${coverageRate.toFixed(
            0
          )}%`}
          description={`${
            summary
              ?.measuredMetrics ??
            0
          } of ${
            summary
              ?.totalMetrics ??
            0
          } metrics`}
          icon={
            Target
          }
          loading={
            isLoading
          }
        />
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Charts                                                         */}
      {/* -------------------------------------------------------------- */}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Compliance Trend */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              Compliance Trend
            </CardTitle>

            <CardDescription>
              KPI / SLA compliance
              over the selected
              reporting period
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ComplianceTrendChart
                data={
                  data?.trend ||
                  []
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Vendor Performance */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              Vendor Performance
            </CardTitle>

            <CardDescription>
              Current compliance rate
              by vendor
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <VendorPerformanceChart
                data={
                  data?.vendorPerformance ||
                  []
                }
                onVendorClick={
                  openVendor
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Metric Results                                                 */}
      {/* -------------------------------------------------------------- */}

      <Card className="app-surface">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>
                Metric Results
              </CardTitle>

              <CardDescription>
                Individual KPI and SLA
                results matching the
                selected filters
              </CardDescription>
            </div>

            {!isLoading && (
              <div className="whitespace-nowrap text-sm text-muted-foreground">
                {data?.metrics
                  .length ??
                  0}{" "}
                results
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <MetricTableSkeleton />
          ) : (
            <MetricResultsTable
              metrics={
                data?.metrics ||
                []
              }
              onVendorClick={
                openVendor
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Filter Select                                                              */
/* -------------------------------------------------------------------------- */

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string

  onValueChange: (
    value: string
  ) => void

  options:
    FilterOption[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>

      <Select
        value={
          value
        }
        onValueChange={
          onValueChange
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {options.map(
            (option) => (
              <SelectItem
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Summary Card                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
  active = false,
  onClick,
}: {
  title: string

  value:
    | string
    | number

  description: string

  icon:
    IconComponent

  loading: boolean

  active?: boolean

  onClick?:
    () => void
}) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">
          {title}
        </p>

        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2 text-2xl font-bold">
          {value}
        </p>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={
          onClick
        }
        className={`rounded-xl border bg-card p-5 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          active
            ? "ring-2 ring-primary/30"
            : ""
        }`}
      >
        {content}
      </button>
    )
  }

  return (
    <Card className="app-surface">
      <CardContent className="p-5">
        {content}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Compliance Trend Chart                                                     */
/* -------------------------------------------------------------------------- */

function ComplianceTrendChart({
  data,
}: {
  data:
    AnalyticsTrendPoint[]
}) {
  if (
    data.length === 0
  ) {
    return (
      <EmptyChart
        message="No trend data available for this period."
      />
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={
            data
          }
          margin={{
            top: 10,
            right: 10,
            left: -10,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={
              false
            }
            className="stroke-muted"
          />

          <XAxis
            dataKey="period"
            tickLine={
              false
            }
            axisLine={
              false
            }
            fontSize={
              12
            }
          />

          <YAxis
            domain={[
              0,
              100,
            ]}
            tickLine={
              false
            }
            axisLine={
              false
            }
            fontSize={
              12
            }
            tickFormatter={(
              value
            ) =>
              `${value}%`
            }
          />

          <Tooltip
            cursor={
              false
            }
            isAnimationActive={
              false
            }
            content={({
              active,
              payload,
              label,
            }) => {
              if (
                !active ||
                !payload?.length
              ) {
                return null
              }

              const value =
                payload[0]
                  .value

              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <p className="font-medium">
                    {label}
                  </p>

                  <p className="mt-1 text-sm">
                    Compliance:{" "}
                    <span className="font-semibold">
                      {typeof value ===
                      "number"
                        ? `${value.toFixed(
                            1
                          )}%`
                        : "—"}
                    </span>
                  </p>
                </div>
              )
            }}
          />

          <Line
            type="monotone"
            dataKey="complianceRate"
            stroke="hsl(var(--primary))"
            strokeWidth={
              2
            }
            dot={{
              r: 3,
              fill:
                "hsl(var(--primary))",
            }}
            activeDot={{
              r: 5,
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Vendor Performance Chart                                                   */
/* -------------------------------------------------------------------------- */

function VendorPerformanceChart({
  data,
  onVendorClick,
}: {
  data:
    VendorPerformance[]

  onVendorClick: (
    vendorId: string
  ) => void
}) {
  const chartData =
    useMemo(
      () =>
        [...data]
          .filter(
            (vendor) =>
              vendor.complianceRate !==
              null
          )
          .sort(
            (
              a,
              b
            ) =>
              (a.complianceRate ??
                0) -
              (b.complianceRate ??
                0)
          )
          .slice(
            0,
            10
          ),
      [
        data,
      ]
    )

  if (
    chartData.length ===
    0
  ) {
    return (
      <EmptyChart
        message="No vendor performance data is available."
      />
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <BarChart
          data={
            chartData
          }
          layout="vertical"
          margin={{
            top: 5,
            right: 20,
            left: 20,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={
              false
            }
            className="stroke-muted"
          />

          <XAxis
            type="number"
            domain={[
              0,
              100,
            ]}
            tickLine={
              false
            }
            axisLine={
              false
            }
            fontSize={
              12
            }
            tickFormatter={(
              value
            ) =>
              `${value}%`
            }
          />

          <YAxis
            type="category"
            dataKey="vendorName"
            tickLine={
              false
            }
            axisLine={
              false
            }
            width={
              100
            }
            fontSize={
              11
            }
          />

          <Tooltip
            cursor={{
              fill:
                "hsl(var(--muted) / 0.3)",
            }}
            isAnimationActive={
              false
            }
            content={({
              active,
              payload,
            }) => {
              if (
                !active ||
                !payload?.length
              ) {
                return null
              }

              const vendor =
                payload[0]
                  .payload as VendorPerformance

              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <p className="font-semibold">
                    {
                      vendor.vendorName
                    }
                  </p>

                  <p className="mt-1 text-sm">
                    Compliance:{" "}
                    <span className="font-medium">
                      {vendor.complianceRate !==
                      null
                        ? `${vendor.complianceRate.toFixed(
                            1
                          )}%`
                        : "—"}
                    </span>
                  </p>

                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <p>
                      {
                        vendor.met
                      }{" "}
                      met
                    </p>

                    <p>
                      {
                        vendor.missed
                      }{" "}
                      missed
                    </p>

                    <p>
                      {
                        vendor.awaiting
                      }{" "}
                      awaiting
                    </p>
                  </div>

                  <p className="mt-2 text-xs font-medium text-primary">
                    Click to view
                    vendor →
                  </p>
                </div>
              )
            }}
          />

          <Bar
            dataKey="complianceRate"
            radius={[
              0,
              6,
              6,
              0,
            ]}
            maxBarSize={
              28
            }
            className="cursor-pointer"
            onClick={(
              _,
              index
            ) => {
              const vendor =
                chartData[
                  index
                ]

              if (
                vendor
              ) {
                onVendorClick(
                  vendor.vendorId
                )
              }
            }}
          >
            {chartData.map(
              (vendor) => (
                <Cell
                  key={
                    vendor.vendorId
                  }
                  fill="hsl(var(--primary))"
                  className="cursor-pointer"
                />
              )
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Metric Results Table                                                       */
/* -------------------------------------------------------------------------- */

function MetricResultsTable({
  metrics,
  onVendorClick,
}: {
  metrics:
    AnalyticsMetric[]

  onVendorClick: (
    vendorId: string
  ) => void
}) {
  if (
    metrics.length ===
    0
  ) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Activity className="mx-auto h-8 w-8 text-muted-foreground" />

        <p className="mt-3 font-medium">
          No metric results
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          No KPI or SLA results
          match the selected filters.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <TableHeader>
                Vendor
              </TableHeader>

              <TableHeader>
                Metric
              </TableHeader>

              <TableHeader>
                Type
              </TableHeader>

              <TableHeader>
                Target
              </TableHeader>

              <TableHeader>
                Actual
              </TableHeader>

              <TableHeader>
                Status
              </TableHeader>

              <TableHeader>
                Period
              </TableHeader>

              <TableHeader>
                <span className="sr-only">
                  View
                </span>
              </TableHeader>
            </tr>
          </thead>

          <tbody>
            {metrics.map(
              (metric) => (
                <tr
                  key={
                    metric.id
                  }
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        onVendorClick(
                          metric.vendorId
                        )
                      }
                      className="font-medium hover:underline"
                    >
                      {
                        metric.vendorName
                      }
                    </button>

                    {metric.lineOfBusinessName && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {
                          metric.lineOfBusinessName
                        }
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {
                      metric.metricName
                    }
                  </td>

                  <td className="px-4 py-3">
                    <MetricTypeBadge
                      type={
                        metric.metricType
                      }
                    />
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {metric.target ||
                      "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {metric.actual ||
                      "—"}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        metric.status
                      }
                    />
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {metric.period ||
                      "—"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        onVendorClick(
                          metric.vendorId
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />

                      <span className="sr-only">
                        View vendor
                      </span>
                    </Button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Table Header                                                               */
/* -------------------------------------------------------------------------- */

function TableHeader({
  children,
}: {
  children:
    React.ReactNode
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">
      {children}
    </th>
  )
}

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status:
    MetricStatus
}) {
  const config = {
    met: {
      label:
        "Met",

      icon:
        CheckCircle2,

      className:
        "bg-primary/10 text-primary",
    },

    missed: {
      label:
        "Missed",

      icon:
        XCircle,

      className:
        "bg-destructive/10 text-destructive",
    },

    awaiting: {
      label:
        "Awaiting",

      icon:
        CircleDashed,

      className:
        "bg-muted text-muted-foreground",
    },
  }[status]

  const Icon =
    config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />

      {config.label}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Metric Type Badge                                                          */
/* -------------------------------------------------------------------------- */

function MetricTypeBadge({
  type,
}: {
  type:
    MetricType
}) {
  return (
    <span className="inline-flex rounded-md border bg-background px-2 py-0.5 text-xs font-medium">
      {type}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Empty Chart                                                                */
/* -------------------------------------------------------------------------- */

function EmptyChart({
  message,
}: {
  message: string
}) {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div className="text-center">
        <BarChart3 className="mx-auto h-7 w-7 text-muted-foreground" />

        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Table Skeleton                                                             */
/* -------------------------------------------------------------------------- */

function MetricTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({
        length: 5,
      }).map(
        (
          _,
          index
        ) => (
          <Skeleton
            key={
              index
            }
            className="h-12 w-full"
          />
        )
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* URL Helpers                                                                */
/* -------------------------------------------------------------------------- */

function getValidStatus(
  value:
    string | null
): StatusFilter {
  if (
    value === "met" ||
    value === "missed" ||
    value === "awaiting"
  ) {
    return value
  }

  return "all"
}

function getValidMetricType(
  value:
    string | null
): TypeFilter {
  if (
    value === "KPI" ||
    value === "SLA"
  ) {
    return value
  }

  return "all"
}

function getValidDateRange(
  value:
    string | null
): DateRange {
  if (
    value === "3" ||
    value === "6" ||
    value === "12"
  ) {
    return value
  }

  return "6"
}

function formatStatus(
  status:
    StatusFilter
) {
  switch (status) {
    case "met":
      return "Met Metrics"

    case "missed":
      return "Missed Metrics"

    case "awaiting":
      return "Awaiting Results"

    default:
      return "All Metrics"
  }
}