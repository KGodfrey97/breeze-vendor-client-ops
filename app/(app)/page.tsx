"use client"

import { useEffect, useState } from "react"
import CountUp from "react-countup"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"

import { DashboardBudgetStatusChart } from "@/components/dashboard-budget-status-chart"
import { DashboardVendorHealthChart } from "@/components/dashboard-vendor-health-chart"
import { DashboardUpcomingMeetings } from "@/components/dashboard-upcoming-meetings"
import { DashboardUpcomingActions } from "@/components/dashboard-upcoming-actions"

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

  renewals: Array<{
    vendorId: string
    vendorName: string
    contractId: string
    contractName: string
    renewalDate: string
  }>

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

export default function DashboardPage() {
  const {
    user,
    loading: authLoading,
    error: authError,
    initialized,
  } = useAuth()

  const router = useRouter()

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    if (
      initialized &&
      !authLoading &&
      !user
    ) {
      router.replace("/auth/login")
    }
  }, [
    initialized,
    authLoading,
    user,
    router,
  ])

  const fetchDashboardData =
    async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response =
          await fetch(
            "/api/dashboard",
            {
              cache: "no-store",
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

        setDashboard(payload)
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
        setIsLoading(false)
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

  const formatCurrency = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }
    ).format(value)
  }

  const formatDate = (
    value: string
  ) => {
    return new Date(
      `${value.slice(0, 10)}T00:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    )
  }

  const getDaysUntil = (
    value: string
  ) => {
    const today = new Date()

    today.setHours(
      0,
      0,
      0,
      0
    )

    const date = new Date(
      `${value.slice(0, 10)}T00:00:00`
    )

    return Math.ceil(
      (date.getTime() -
        today.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  }

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
            Redirecting to login...
          </p>
        </div>
      </div>
    )
  }

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

  const totals =
    dashboard?.totals

  const budget =
    dashboard?.budgetStatus

  const budgetByVendor =
    dashboard?.budgetByVendor || []

  const health =
    dashboard?.health

  const performance =
    dashboard?.performance

  const renewals =
    dashboard?.renewals || []

  const totalBudgetVendors =
    (budget?.withinBudget || 0) +
    (budget?.overBudget || 0) +
    (budget?.noData || 0)

  const withinBudgetPercent =
    totalBudgetVendors > 0
      ? ((budget?.withinBudget || 0) /
          totalBudgetVendors) *
        100
      : 0

  const metPercent =
    performance?.measuredMetrics
      ? (performance.met /
          performance.measuredMetrics) *
        100
      : 0

  return (
    <div className="app-page space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Dashboard
          </h1>

          <p className="text-muted-foreground">
            Vendor operations overview
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={
            fetchDashboardData
          }
          disabled={isLoading}
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

      {/* Top KPI Cards */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* Total Vendors */}

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vendors
            </CardTitle>

            <Building2 className="h-4 w-4 text-muted-foreground" />
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
                    duration={1.2}
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

        {/* Budget */}

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
                    totals?.currentYearBudget ||
                      0
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Forecast:{" "}
                  {formatCurrency(
                    totals?.forecastSpend ||
                      0
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

        {/* Expiring Vendors */}

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Renewals
            </CardTitle>

            <CalendarClock className="h-4 w-4 text-muted-foreground" />
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
                    duration={1.2}
                  />
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Next 90 days
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health + Budget Status */}

      <div className="grid gap-4 lg:grid-cols-7">

        {/* Health */}

        <Card className="app-surface lg:col-span-4">
          <CardHeader>
            <CardTitle>
              Vendor Health
            </CardTitle>

            <CardDescription>
              Overall vendor health based on KPI / SLA performance and budget
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="space-y-6">

                <div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Average Health Score
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

        {/* Budget Status */}

        <Card className="app-surface lg:col-span-3">
          <CardHeader>
            <CardTitle>
              Budget Status
            </CardTitle>

            <CardDescription>
              Current-year budget allocation by vendor
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-6">

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Within Budget
                    </span>

                    <span className="text-sm font-semibold text-primary">
                      {budget?.withinBudget ||
                        0}
                    </span>
                  </div>

                  <Progress
                    value={
                      withinBudgetPercent
                    }
                    className="mt-2"
                  />
                </div>

                <DashboardBudgetStatusChart
                  vendors={budgetByVendor}
                />

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Forecast Spend
                    </span>

                    <span className="font-medium">
                      {formatCurrency(
                        totals?.forecastSpend ||
                          0
                      )}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Approved Budget
                    </span>

                    <span className="font-medium">
                      {formatCurrency(
                        totals?.currentYearBudget ||
                          0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">

        {/* Upcoming Meetings */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              Upcoming Meetings
            </CardTitle>

            <CardDescription>
              Scheduled vendor meetings coming up next
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
              Follow-up work requiring attention
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

      {/* Renewals + Performance */}

      <div className="grid gap-4 lg:grid-cols-2">

        {/* Renewals */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              Upcoming Renewals
            </CardTitle>

            <CardDescription>
              Active vendor contracts approaching renewal
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : renewals.length ===
              0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <CalendarClock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                <p className="font-medium">
                  No upcoming renewals
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  No active vendor contracts renew within the next 90 days.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {renewals.map(
                  (renewal) => {
                    const daysUntil =
                      getDaysUntil(
                        renewal.renewalDate
                      )

                    return (
                      <Link
                        key={
                          renewal.contractId
                        }
                        href={`/vendors/${renewal.vendorId}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {
                              renewal.vendorName
                            }
                          </p>

                          <p className="truncate text-sm text-muted-foreground">
                            {
                              renewal.contractName
                            }
                          </p>
                        </div>

                        <div className="ml-4 shrink-0 text-right">
                          <p className="text-sm font-medium">
                            {formatDate(
                              renewal.renewalDate
                            )}
                          </p>

                          <p
                            className={`text-xs ${
                              daysUntil <=
                              30
                                ? "text-destructive"
                                : daysUntil <=
                                  60
                                ? "text-warning"
                                : "text-muted-foreground"
                            }`}
                          >
                            {daysUntil}{" "}
                            days
                          </p>
                        </div>
                      </Link>
                    )
                  }
                )}
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Link
              href="/vendors"
              className="text-sm text-muted-foreground hover:underline"
            >
              View all vendors
            </Link>
          </CardFooter>
        </Card>

        {/* Performance */}

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>
              KPI / SLA Performance
            </CardTitle>

            <CardDescription>
              Latest results across active vendor metrics
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-5">

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Compliance Rate
                    </p>

                    <p className="mt-1 text-3xl font-bold">
                      {performance
                        ?.complianceRate !=
                      null
                        ? `${performance.complianceRate.toFixed(
                            1
                          )}%`
                        : "—"}
                    </p>
                  </div>

                  <BarChart3 className="h-7 w-7 text-muted-foreground" />
                </div>

                <Progress
                  value={metPercent}
                />

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Met
                    </p>

                    <p className="mt-1 text-xl font-semibold text-primary">
                      {performance?.met ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Missed
                    </p>

                    <p className="mt-1 text-xl font-semibold text-destructive">
                      {performance
                        ?.missed || 0}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Results
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {performance
                        ?.measuredMetrics ||
                        0}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Active Metrics
                    </span>

                    <span className="font-medium">
                      {performance
                        ?.totalMetrics ||
                        0}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Result Window
                    </span>

                    <span className="font-medium">
                      Last{" "}
                      {performance
                        ?.lookbackMonths ||
                        0}{" "}
                      months
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
