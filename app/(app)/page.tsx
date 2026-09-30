"use client"

import {
  useEffect,
  useState,
} from "react"
import CountUp from "react-countup"
import Link from "next/link"
import {
  useRouter,
} from "next/navigation"

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { useAuth } from "@/hooks/useAuth"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"

import { DashboardBudgetStatusChart } from "@/components/dashboard/dashboard-budget-allocation-chart"
import { DashboardVendorHealthChart } from "@/components/dashboard/dashboard-vendor-health-chart"
import { DashboardUpcomingMeetings } from "@/components/dashboard/dashboard-upcoming-meetings"
import { DashboardUpcomingActions } from "@/components/dashboard/dashboard-upcoming-actions"
import { DashboardUpcomingRenewals } from "@/components/dashboard/dashboard-upcoming-renewals"
import { DashboardKpiSlaPerformance } from "@/components/dashboard/dashboard-kpi-sla-performance"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type GradeDistribution = {
  A: number
  B: number
  C: number
  D: number
  F: number
  noData: number
}

type DashboardData = {
  totals: {
    vendors: number
    activeVendors: number
    currentYearBudget: number
    forecastSpend: number
    budgetVariance: number
    expiringVendors: number
  }

  budgetStatus: {
    withinBudget: number
    overBudget: number
    noData: number
  }

  budgetByVendor: {
    vendorId: string
    vendorName: string
    budgetAmount: number
  }[]

  health: {
    averageScore: number | null
    gradeDistribution: GradeDistribution
  }

  performance: {
    totalMetrics: number
    measuredMetrics: number
    met: number
    missed: number
    complianceRate: number | null
    lookbackMonths: number
  }

  renewals: {
    vendorId: string
    vendorName: string
    contractId: string
    contractName: string
    renewalDate: string
  }[]

  upcomingMeetings: {
    meetingId: string
    vendorId: string
    vendorName: string
    title: string
    meetingType: string | null
    scheduledAt: string
    durationMinutes: number | null
    location: string | null
    meetingLink: string | null
  }[]

  upcomingActions: {
    id: string
    vendorId: string
    vendorName: string
    meetingId: string
    title: string
    ownerName: string | null
    dueDate: string | null
    status:
      | "open"
      | "in_progress"
    meetingTitle: string
  }[]
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const {
    user,
    loading: authLoading,
    error: authError,
    initialized,
  } = useAuth()

  const router =
    useRouter()

  const [
    dashboard,
    setDashboard,
  ] =
    useState<DashboardData | null>(
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

  /* ------------------------------------------------------------------------ */
  /* Authentication                                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (
      initialized &&
      !authLoading &&
      !user
    ) {
      router.replace(
        "/auth/login"
      )
    }
  }, [
    initialized,
    authLoading,
    user,
    router,
  ])

  /* ------------------------------------------------------------------------ */
  /* Dashboard Data                                                           */
  /* ------------------------------------------------------------------------ */

  const fetchDashboardData =
    async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response =
          await fetch(
            "/api/dashboard",
            {
              cache:
                "no-store",
            }
          )

        const payload =
          await response.json()

        if (!response.ok) {
          throw new Error(
            payload.error ||
              "Unable to load dashboard data"
          )
        }

        setDashboard(
          payload
        )
      } catch (error) {
        console.error(
          "Error fetching dashboard data:",
          error
        )

        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        )
      } finally {
        setIsLoading(
          false
        )
      }
    }

  useEffect(() => {
    if (
      !initialized ||
      authLoading ||
      !user
    ) {
      return
    }

    fetchDashboardData()
  }, [
    initialized,
    authLoading,
    user,
  ])

  /* ------------------------------------------------------------------------ */
  /* Helpers                                                                  */
  /* ------------------------------------------------------------------------ */

  const formatCurrency = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",
        currency:
          "USD",
        maximumFractionDigits:
          0,
      }
    ).format(value)
  }

  /* ------------------------------------------------------------------------ */
  /* Authentication Loading                                                   */
  /* ------------------------------------------------------------------------ */

  if (
    !initialized ||
    authLoading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />

          <p className="text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Authentication Error                                                     */
  /* ------------------------------------------------------------------------ */

  if (
    authError &&
    !user
  ) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />

          <AlertDescription className="flex items-center justify-between">
            <span>
              {authError}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.location.href =
                  "/auth/login"
              }
              className="ml-4"
            >
              Go to Login
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Redirecting                                                              */
  /* ------------------------------------------------------------------------ */

  if (
    initialized &&
    !authLoading &&
    !user
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />

          <p className="text-muted-foreground">
            Redirecting to
            login...
          </p>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Dashboard Error                                                          */
  /* ------------------------------------------------------------------------ */

  if (
    error &&
    !isLoading
  ) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />

          <AlertDescription className="flex items-center justify-between">
            <span>
              {error}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={
                fetchDashboardData
              }
              className="ml-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />

              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Dashboard Values                                                         */
  /* ------------------------------------------------------------------------ */

  const totals =
    dashboard?.totals

  const budgetByVendor =
    dashboard?.budgetByVendor ||
    []

  const health =
    dashboard?.health

  const performance =
    dashboard?.performance

  const renewals =
    dashboard?.renewals ||
    []

  const currentYearBudget =
    Number(
      totals?.currentYearBudget
    ) || 0

  const forecastSpend =
    Number(
      totals?.forecastSpend
    ) || 0

  const remainingBudget =
    currentYearBudget -
    forecastSpend

  const forecastUtilization =
    currentYearBudget > 0
      ? (
          forecastSpend /
          currentYearBudget
        ) *
        100
      : 0

  const displayForecastUtilization =
    Math.max(
      0,
      forecastUtilization
    )

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="app-page space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Top KPI Cards                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Vendors */}

        <Link
          href="/vendors"
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="app-surface h-full transition-all group-hover:border-primary/30 group-hover:bg-muted/20 group-hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vendors
              </CardTitle>

              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />

                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    <CountUp
                      end={
                        totals?.vendors ||
                        0
                      }
                      duration={
                        1.2
                      }
                    />
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {totals?.activeVendors ||
                      0}{" "}
                    active vendors
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Current-Year Budget */}

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Current-Year Budget
            </CardTitle>

            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    currentYearBudget
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Forecast:{" "}
                  {formatCurrency(
                    forecastSpend
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Budget Variance */}

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Budget Variance
            </CardTitle>

            {(totals?.budgetVariance ||
              0) >= 0 ? (
              <TrendingDown className="h-4 w-4 text-primary" />
            ) : (
              <TrendingUp className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${
                    (totals?.budgetVariance ||
                      0) >= 0
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {formatCurrency(
                    Math.abs(
                      totals?.budgetVariance ||
                        0
                    )
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {(totals?.budgetVariance ||
                    0) >= 0
                    ? "Under forecasted budget"
                    : "Over forecasted budget"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contracts Renewing */}

        <Link
          href="/vendors?renewal=90"
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="app-surface h-full transition-all group-hover:border-primary/30 group-hover:bg-muted/20 group-hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Contracts Renewing
              </CardTitle>

              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />

                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    <CountUp
                      end={
                        totals?.expiringVendors ||
                        0
                      }
                      duration={
                        1.2
                      }
                    />
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Within 90 days
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Vendor Health + Budget Allocation                                  */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 lg:grid-cols-7">
        {/* Vendor Health */}

        <Card className="app-surface lg:col-span-4">
          <CardHeader>
            <CardTitle>
              Vendor Health
            </CardTitle>

            <CardDescription>
              Overall vendor health
              based on KPI / SLA
              performance and budget
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="space-y-5">
                {/* Average Score */}

                <div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Average Health
                        Score
                      </p>

                      <p className="mt-1 text-4xl font-bold">
                        {health?.averageScore !=
                        null
                          ? health.averageScore.toFixed(
                              1
                            )
                          : "—"}

                        {health?.averageScore !=
                          null && (
                          <span className="ml-1 text-base font-normal text-muted-foreground">
                            / 100
                          </span>
                        )}
                      </p>
                    </div>

                    <Gauge className="h-8 w-8 text-muted-foreground" />
                  </div>

                  <Progress
                    className="mt-4"
                    value={
                      health?.averageScore ||
                      0
                    }
                  />
                </div>

                {/* Grade Distribution */}

                <DashboardVendorHealthChart
                  distribution={
                    health?.gradeDistribution || {
                      A: 0,
                      B: 0,
                      C: 0,
                      D: 0,
                      F: 0,
                      noData: 0,
                    }
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Allocation */}

        <Card className="app-surface lg:col-span-3">
          <CardHeader>
            <CardTitle>
              Budget Allocation
            </CardTitle>

            <CardDescription>
              Current-year budget
              distribution by vendor
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-5">
                <DashboardBudgetStatusChart
                  vendors={
                    budgetByVendor
                  }
                />

                {/* Budget Summary */}

                <div className="space-y-2.5 border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Forecast Spend
                    </span>

                    <span className="font-medium">
                      {formatCurrency(
                        forecastSpend
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Approved Budget
                    </span>

                    <span className="font-medium">
                      {formatCurrency(
                        currentYearBudget
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Remaining
                    </span>

                    <span
                      className={
                        remainingBudget >=
                        0
                          ? "font-medium text-primary"
                          : "font-medium text-destructive"
                      }
                    >
                      {remainingBudget <
                      0
                        ? "-"
                        : ""}
                      {formatCurrency(
                        Math.abs(
                          remainingBudget
                        )
                      )}
                    </span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Forecast
                        Utilization
                      </span>

                      <span className="font-medium">
                        {forecastUtilization.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>

                    <Progress
                      className="mt-2 h-1.5"
                      value={
                        Math.min(
                          displayForecastUtilization,
                          100
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Meetings + Actions                                                 */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Meetings */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              Upcoming Meetings
            </CardTitle>

            <CardDescription>
              Scheduled vendor
              meetings coming up next
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DashboardUpcomingMeetings
                meetings={
                  dashboard?.upcomingMeetings ||
                  []
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Open Actions */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              Open Actions
            </CardTitle>

            <CardDescription>
              Follow-up work requiring
              attention
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DashboardUpcomingActions
                actions={
                  dashboard?.upcomingActions ||
                  []
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Renewals + KPI / SLA Performance                                   */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Renewals */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              Upcoming Renewals
            </CardTitle>

            <CardDescription>
              Active vendor contracts
              approaching renewal
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DashboardUpcomingRenewals
                renewals={
                  renewals
                }
              />
            )}
          </CardContent>
        </Card>

        {/* KPI / SLA Performance */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              KPI / SLA Performance
            </CardTitle>

            <CardDescription>
              Latest results across
              active vendor metrics
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <DashboardKpiSlaPerformance
                performance={
                  performance
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}