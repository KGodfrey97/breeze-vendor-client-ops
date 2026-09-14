export const attributeColors = {
  status: {
    processing: "border-warning/30 bg-warning/15 text-warning",
    overturned: "border-primary/30 bg-primary/15 text-primary",
    denied: "border-destructive/30 bg-destructive/15 text-destructive",
    under_review: "border-secondary-light/30 bg-secondary-light/15 text-secondary-light",
  },
  priority: {
    low: "border-muted-foreground/30 bg-muted text-muted-foreground",
    normal: "border-secondary-light/30 bg-secondary-light/15 text-secondary-light",
    high: "border-warning/30 bg-warning/15 text-warning",
    urgent: "border-destructive/30 bg-destructive/15 text-destructive",
  },
  letterStatus: {
    draft: "border-warning/30 bg-warning/15 text-warning",
    not_generated: "border-muted-foreground/30 bg-muted text-muted-foreground",
    generated: "border-secondary-light/30 bg-secondary-light/15 text-secondary-light",
    approved: "border-approved/30 bg-approved/15 text-approved",
    sent: "border-primary/30 bg-primary/15 text-primary",
  },
} as const;