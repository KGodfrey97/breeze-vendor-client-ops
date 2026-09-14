"use client"

import { APP_COLORS } from "@/lib/constants/colors"

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

type BudgetStatusChartProps = {
  withinBudget: number
  overBudget: number
  noData: number
}

export function DashboardBudgetStatusChart({
  withinBudget,
  overBudget,
  noData,
}: BudgetStatusChartProps) {
  const data = [
    {
      name: "Within Budget",
      value: withinBudget,
      color: "hsl(var(--primary))",
    },
    {
      name: "Over Budget",
      value: overBudget,
      color: "hsl(var(--destructive))",
    },
    {
      name: "No Data",
      value: noData,
      color: "hsl(var(--muted-foreground))",
    },
  ]

  const total =
    withinBudget +
    overBudget +
    noData

  return (
    <div className="space-y-4">
      <div className="relative h-[220px] w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                />
              ))}
            </Pie>

            <Tooltip
                formatter={(value, name) => [
                    Number(value ?? 0),
                    String(name ?? ""),
                ]}
                />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">
            {total}
          </span>

          <span className="text-xs text-muted-foreground">
            Vendors
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.map((item) => (
          <div
            key={item.name}
            className="rounded-lg border p-3"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    item.color,
                }}
              />

              <p className="text-xs text-muted-foreground">
                {item.name}
              </p>
            </div>

            <p className="mt-2 text-xl font-semibold">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}