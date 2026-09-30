"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type GradeDistribution = {
  A: number
  B: number
  C: number
  D: number
  F: number
  noData: number
}

type VendorHealthChartProps = {
  distribution: GradeDistribution
}

export function DashboardVendorHealthChart({
  distribution,
}: VendorHealthChartProps) {
  const router = useRouter()

  const handleGradeClick = (grade: string) => {
    router.push(
      `/vendors?grade=${encodeURIComponent(grade)}`
    )
  }

  const [activeIndex, setActiveIndex] =
    useState<number | null>(null)

  const data = [
    {
      grade: "A",
      vendors: Number(distribution.A) || 0,
      color: "hsl(var(--primary))",
      description: "Excellent",
    },
    {
      grade: "B",
      vendors: Number(distribution.B) || 0,
      color: "hsl(var(--primary))",
      description: "Good",
    },
    {
      grade: "C",
      vendors: Number(distribution.C) || 0,
      color: "hsl(var(--warning))",
      description: "Needs Attention",
    },
    {
      grade: "D",
      vendors: Number(distribution.D) || 0,
      color: "hsl(var(--destructive))",
      description: "At Risk",
    },
    {
      grade: "F",
      vendors: Number(distribution.F) || 0,
      color: "hsl(var(--destructive))",
      description: "Critical",
    },
  ]

  const totalGraded = data.reduce(
    (sum, item) => sum + item.vendors,
    0
  )

  const getPercent = (vendors: number) => {
    if (totalGraded === 0) {
      return 0
    }

    return (vendors / totalGraded) * 100
  }

  const hasData = totalGraded > 0

  if (!hasData) {
    return (
      <div className="flex h-[260px] items-center justify-center">
        <div className="rounded-lg border border-dashed px-8 py-6 text-center">
          <p className="font-medium">
            No vendor health data
          </p>

          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Vendor health grades will appear
            once performance data is available.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-[260px] w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <BarChart
            data={data}
            margin={{
              top: 25,
              right: 10,
              left: -15,
              bottom: 0,
            }}
            onMouseLeave={() => {
              setActiveIndex(null)
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-muted"
            />

            <XAxis
              dataKey="grade"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tick={{
                fill: "hsl(var(--muted-foreground))",
              }}
            />

            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={30}
              tick={{
                fill: "hsl(var(--muted-foreground))",
              }}
            />

            <Tooltip
              cursor={{
                fill: "hsl(var(--muted) / 0.25)",
              }}
              isAnimationActive={false}
              allowEscapeViewBox={{
                x: true,
                y: true,
              }}
              wrapperStyle={{
                zIndex: 50,
                pointerEvents: "none",
              }}
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

                const item =
                  payload[0]
                    .payload as (typeof data)[number]

                const percent =
                  getPercent(item.vendors)

                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            item.color,
                        }}
                      />

                      <p className="font-semibold">
                        Grade {item.grade}
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>

                    <div className="mt-2 border-t pt-2">
                      <p className="text-sm font-medium">
                        {item.vendors}{" "}
                        {item.vendors === 1
                          ? "vendor"
                          : "vendors"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {percent.toFixed(1)}% of graded vendors
                      </p>

                      <p className="mt-2 text-xs font-medium text-primary">
                        Click to view Grade {item.grade} vendors →
                      </p>
                    </div>
                  </div>
                )
              }}
            />

            <Bar
              dataKey="vendors"
              radius={[6, 6, 0, 0]}
              maxBarSize={65}
              className="cursor-pointer"
              onMouseEnter={(_, index) => {
                setActiveIndex(index)
              }}
              onClick={(_, index) => {
                const item = data[index]

                if (item) {
                  handleGradeClick(item.grade)
                }
              }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.grade}
                  fill={entry.color}
                  opacity={
                    activeIndex === null ||
                    activeIndex === index
                      ? 1
                      : 0.4
                  }
                  className="cursor-pointer transition-opacity duration-150"
                />
              ))}

              <LabelList
                dataKey="vendors"
                position="top"
                className="fill-foreground"
                fontSize={12}
                fontWeight={600}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Health distribution
        </p>

        <p className="text-xs font-medium">
          {totalGraded}{" "}
          {totalGraded === 1
            ? "graded vendor"
            : "graded vendors"}
        </p>
      </div>
    </div>
  )
}