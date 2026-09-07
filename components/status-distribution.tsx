"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

interface StatusCount {
  status: string
  count: number
}

interface StatusDistributionProps {
  statusCounts: StatusCount[]
}

export function StatusDistribution({ statusCounts = [] }: StatusDistributionProps) {
  // Transform data for the chart
  const data = statusCounts.map((item) => {
    let color = "hsl(var(--destructive))" // Default for unknown status

    switch (item.status) {
      case "overturned":
        color = "hsl(var(--primary))"
        break
      case "processing":
        color = "hsl(var(--warning))"
        break
      case "denied":
        color = "hsl(var(--destructive))"
        break
      case "under_review":
        color = "hsl(var(--chart-3))"
        break
    }

    return {
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace("_", " "),
      value: item.count,
      color,
    }
  })

  // If no data, show placeholder
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-muted-foreground">No data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} claims`, ""]}
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: "var(--radius)",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
