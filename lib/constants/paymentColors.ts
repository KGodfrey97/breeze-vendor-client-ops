import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react"

export const paymentStatuses = [
  { value: "processing", label: "Processing", icon: Clock, color: "bg-warning/15 text-warning" },
  {
    value: "processing_payment",
    label: "Processing Payment",
    icon: AlertTriangle,
    color: "bg-secondary-light/15 text-secondary-light",
  },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "bg-primary/15 text-primary" },
  { value: "failed", label: "Failed", icon: XCircle, color: "bg-destructive/15 text-destructive" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "bg-muted text-muted-foreground" },
] as const