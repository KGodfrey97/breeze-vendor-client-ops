export const VENDOR_STATUSES = [
  "active",
  "onboarding",
  "under_review",
  "inactive",
] as const

export type VendorStatus =
  (typeof VENDOR_STATUSES)[number]

export const VENDOR_STATUS_LABELS: Record<
  VendorStatus,
  string
> = {
  active: "Active",
  onboarding: "Onboarding",
  under_review: "Under Review",
  inactive: "Inactive",
}

export const VENDOR_STATUS_TONES: Record<
  VendorStatus,
  string
> = {
  active: "bg-primary/10 text-primary",
  onboarding:
    "bg-secondary/10 text-secondary",
  under_review:
    "bg-warning/10 text-warning",
  inactive:
    "bg-muted text-muted-foreground",
}