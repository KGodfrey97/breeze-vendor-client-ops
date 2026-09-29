"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  const data = [
    {
      grade: "A",
      vendors: distribution.A,
      color: "hsl(var(--primary))",
    },
    {
      grade: "B",
      vendors: distribution.B,
      color: "hsl(var(--primary))",
    },
    {
      grade: "C",
      vendors: distribution.C,
      color: "hsl(var(--warning))",
    },
    {
      grade: "D",
      vendors: distribution.D,
      color: "hsl(var(--destructive))",
    },
    {
      grade: "F",
      vendors: distribution.F,
      color: "hsl(var(--destructive))",
    },
  ]

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: -15,
            bottom: 0,
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
          />

          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />

          <Tooltip />

          <Bar
            dataKey="vendors"
            radius={[6, 6, 0, 0]}
          >
            {data.map((entry) => (
              <Cell
                key={entry.grade}
                fill={entry.color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}