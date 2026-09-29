"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  CircleDollarSign,
  Gauge,
  Target,
} from "lucide-react"

import { InfoCard } from "@/components/ui/info-card"

type VendorHealthResponse = {
  health: {
    score: number | null
    calculatedGrade: string | null
    calculatedAt: string | null

    components: {
      performance: {
        score: number | null
        weight: number
        measuredMetrics: number
        totalMetrics: number
        lookbackMonths: number
      }

      budget: {
        score: number | null
        weight: number
        budgetAmount: number | null
        forecastAmount: number | null
      }
    }
  }
}

type VendorHealthProps = {
  vendorId: string
  refreshKey?: number
}

export function VendorHealth({
  vendorId,
  refreshKey,
}: VendorHealthProps) {
  const [health, setHealth] =
    useState<VendorHealthResponse["health"] | null>(
      null
    )

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const fetchHealth = async () => {
    try {
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/health`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load vendor health"
        )
      }

      setHealth(data.health)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load vendor health"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [vendorId, refreshKey])

  const formatCurrency = (
    value: number | null
  ) => {
    if (value === null) {
      return "—"
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }
    ).format(value)
  }

  const getScoreClasses = (
    score: number | null
  ) => {
    if (score === null) {
      return {
        text: "text-muted-foreground",
        background: "bg-muted",
        bar: "bg-muted-foreground/30",
      }
    }

    if (score >= 90) {
      return {
        text: "text-primary",
        background: "bg-primary/10",
        bar: "bg-primary",
      }
    }

    if (score >= 75) {
      return {
        text: "text-warning",
        background: "bg-warning/10",
        bar: "bg-warning",
      }
    }

    return {
      text: "text-destructive",
      background: "bg-destructive/10",
      bar: "bg-destructive",
    }
  }

  const renderScoreBar = (
    score: number | null
  ) => {
    const classes =
      getScoreClasses(score)

    const width =
      score !== null
        ? Math.max(
            0,
            Math.min(score, 100)
          )
        : 0

    return (
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${classes.bar}`}
          style={{
            width: `${width}%`,
          }}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <InfoCard
        title="Vendor Health"
        icon={Gauge}
      >
        <p className="text-sm text-muted-foreground">
          Loading vendor health...
        </p>
      </InfoCard>
    )
  }

  if (error || !health) {
    return (
      <InfoCard
        title="Vendor Health"
        icon={Gauge}
      >
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error ||
            "Unable to load vendor health."}
        </div>
      </InfoCard>
    )
  }

  const overallClasses =
    getScoreClasses(
      health.score
    )

  const performanceClasses =
    getScoreClasses(
      health.components
        .performance.score
    )

  const budgetClasses =
    getScoreClasses(
      health.components
        .budget.score
    )

  return (
    <InfoCard
      title="Vendor Health"
      icon={Gauge}
    >
      <div className="space-y-5">

        {/* Overall Health */}

        <div
          className={`rounded-lg p-4 ${overallClasses.background}`}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Overall Health
              </p>

              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-3xl font-bold ${overallClasses.text}`}
                >
                  {health.score !== null
                    ? health.score.toFixed(
                        1
                      )
                    : "—"}
                </span>

                {health.score !==
                  null && (
                  <span className="text-sm text-muted-foreground">
                    / 100
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Health Grade
              </p>

              <p
                className={`text-2xl font-bold ${overallClasses.text}`}
              >
                {health.calculatedGrade ||
                  "—"}
              </p>
            </div>
          </div>

          {renderScoreBar(
            health.score
          )}
        </div>

        {/* Performance */}

        <div className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-md p-2 ${performanceClasses.background}`}
            >
              <Target
                className={`h-4 w-4 ${performanceClasses.text}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    Performance
                  </p>

                  <p className="text-xs text-muted-foreground">
                    KPI / SLA performance,
                    last{" "}
                    {
                      health.components
                        .performance
                        .lookbackMonths
                    }{" "}
                    months
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`font-semibold ${performanceClasses.text}`}
                  >
                    {health.components
                      .performance
                      .score !== null
                      ? `${health.components.performance.score.toFixed(
                          1
                        )}%`
                      : "No Data"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {
                      health
                        .components
                        .performance
                        .weight
                    }
                    % weight
                  </p>
                </div>
              </div>

              {renderScoreBar(
                health.components
                  .performance.score
              )}

              <div className="mt-3 text-xs text-muted-foreground">
                {
                  health.components
                    .performance
                    .measuredMetrics
                }{" "}
                measured results across{" "}
                {
                  health.components
                    .performance
                    .totalMetrics
                }{" "}
                active metrics
              </div>
            </div>
          </div>
        </div>

        {/* Budget */}

        <div className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-md p-2 ${budgetClasses.background}`}
            >
              <CircleDollarSign
                className={`h-4 w-4 ${budgetClasses.text}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    Budget
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Forecast vs approved budget
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`font-semibold ${budgetClasses.text}`}
                  >
                    {health.components
                      .budget.score !==
                    null
                      ? `${health.components.budget.score.toFixed(
                          0
                        )}%`
                      : "No Data"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {
                      health
                        .components
                        .budget
                        .weight
                    }
                    % weight
                  </p>
                </div>
              </div>

              {renderScoreBar(
                health.components
                  .budget.score
              )}

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">
                    Budget
                  </p>

                  <p className="mt-1 font-medium">
                    {formatCurrency(
                      health.components
                        .budget
                        .budgetAmount
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Forecast
                  </p>

                  <p className="mt-1 font-medium">
                    {formatCurrency(
                      health.components
                        .budget
                        .forecastAmount
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data availability */}

        {health.score === null && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <Activity className="mt-0.5 h-4 w-4 shrink-0" />

            <p>
              Add KPI/SLA results or a current-year budget forecast to calculate vendor health.
            </p>
          </div>
        )}
      </div>
    </InfoCard>
  )
}
