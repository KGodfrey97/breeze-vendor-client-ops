// components/ui/info-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface InfoCardProps {
  title: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function InfoCard({ title, icon: Icon, children, className, action }: InfoCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
        {action}
      </CardHeader>

      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}
