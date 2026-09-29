"use client"

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

type VendorBudget = {
  vendorId: string
  vendorName: string
  budgetAmount: number
}

type BudgetStatusChartProps = {
  vendors: VendorBudget[]
}

export function DashboardBudgetStatusChart({
  vendors,
}: BudgetStatusChartProps) {
  const data = vendors
    .map((vendor) => ({
      id: vendor.vendorId,
      name: vendor.vendorName,
      value: Number(vendor.budgetAmount) || 0,
    }))
    .filter((vendor) => vendor.value > 0)

  const totalBudget = data.reduce(
    (sum, vendor) => sum + vendor.value,
    0
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getPercent = (value: number) => {
    if (totalBudget === 0) return 0

    return (value / totalBudget) * 100
  }

  return (
    <div className="space-y-4">
      <div className="relative h-[240px] w-full">
        {data.length > 0 ? (
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
                outerRadius={95}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((vendor, index) => (
                  <Cell
                    key={vendor.id}
                    fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value, name) => {
                  const amount = Number(value ?? 0)
                  const percent = getPercent(amount)

                  return [
                    `${formatCurrency(amount)} (${percent.toFixed(1)}%)`,
                    String(name ?? ""),
                  ]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="h-[190px] w-[190px] rounded-full border-[28px] border-muted" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">
            {formatCurrency(totalBudget)}
          </span>

          <span className="text-xs text-muted-foreground">
            Total Budget
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((vendor, index) => {
          const percent = getPercent(vendor.value)

          return (
            <div
              key={vendor.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                  }}
                />

                <span className="truncate text-sm font-medium">
                  {vendor.name}
                </span>
              </div>

              <div className="ml-4 text-right">
                <p className="text-sm font-semibold">
                  {percent.toFixed(1)}%
                </p>

                <p className="text-xs text-muted-foreground">
                  {formatCurrency(vendor.value)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}