"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

  const [activeIndex, setActiveIndex] =
    useState<number | null>(null)

  const data = vendors
    .map((vendor) => ({
      id: vendor.vendorId,
      name: vendor.vendorName,
      value: Number(vendor.budgetAmount) || 0,
    }))
    .filter((vendor) => vendor.value > 0)
    .sort((a, b) => b.value - a.value)

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
    if (totalBudget === 0) {
      return 0
    }

    return (value / totalBudget) * 100
  }

  const handleVendorClick = (
    vendorId: string
  ) => {
    router.push(`/vendors/view/${vendorId}`)
  }

  return (
    <div className="space-y-4">

      {/* Chart */}
      <div className="relative h-[260px] w-full">
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
                onMouseEnter={(_, index) => {
                  setActiveIndex(index)
                }}
                onMouseLeave={() => {
                  setActiveIndex(null)
                }}
                onClick={(entry) => {
                  if (entry?.id) {
                    handleVendorClick(entry.id)
                  }
                }}
              >
                {data.map((vendor, index) => (
                  <Cell
                    key={vendor.id}
                    fill={`hsl(var(--chart-${
                      (index % 5) + 1
                    }))`}
                    opacity={
                      activeIndex === null ||
                      activeIndex === index
                        ? 1
                        : 0.55
                    }
                    className="cursor-pointer transition-opacity duration-150"
                  />
                ))}
              </Pie>

              <Tooltip
                cursor={false}
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

                  const vendor =
                    payload[0]
                      .payload as (typeof data)[number]

                  const percent =
                    getPercent(vendor.value)

                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-semibold">
                        {vendor.name}
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {formatCurrency(
                          vendor.value
                        )}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {percent.toFixed(1)}% of
                        total vendor budget
                      </p>

                      <p className="mt-2 text-xs font-medium text-primary">
                        Click to view vendor →
                      </p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="h-[190px] w-[190px] rounded-full border-[28px] border-muted" />
          </div>
        )}

        {/* Center */}
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">
            {formatCurrency(totalBudget)}
          </span>

          <span className="text-xs text-muted-foreground">
            Total Vendor Budget
          </span>
        </div>
      </div>

      {/* Vendor Budget List */}
      {data.length > 0 ? (
        <div className="space-y-2">
          {data.map((vendor, index) => {
            const percent =
              getPercent(vendor.value)

            const isActive =
              activeIndex === index

            return (
              <button
                key={vendor.id}
                type="button"
                onClick={() =>
                  handleVendorClick(
                    vendor.id
                  )
                }
                onMouseEnter={() =>
                  setActiveIndex(index)
                }
                onMouseLeave={() =>
                  setActiveIndex(null)
                }
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  isActive
                    ? "bg-muted/70"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: `hsl(var(--chart-${
                        (index % 5) + 1
                      }))`,
                    }}
                  />

                  <span className="truncate text-sm font-medium">
                    {vendor.name}
                  </span>
                </div>

                <div className="ml-4 shrink-0 text-right">
                  <p className="text-sm font-semibold">
                    {percent.toFixed(1)}%
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(
                      vendor.value
                    )}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">
            No vendor budgets
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Vendor budget allocations will
            appear here once budgets are added.
          </p>
        </div>
      )}
    </div>
  )
}