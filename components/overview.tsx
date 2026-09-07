"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Define the shape of a single data item
interface OverviewDataItem {
  name: string
  submitted: number
  overturned: number
  denied: number
}

// Define the props for the component
interface OverviewProps {
  data: OverviewDataItem[]
}

export function Overview({ data }: OverviewProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: "var(--radius)",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Bar dataKey="submitted" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="overturned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="denied" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}