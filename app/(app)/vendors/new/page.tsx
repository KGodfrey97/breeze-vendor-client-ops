import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "New Vendor | Breeze",
  description: "Add a new vendor to Breeze",
}

export default function NewVendorPage() {
  return (
    <div className="app-page">
      <div className="app-surface rounded-lg border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">
            Add New Vendor
          </h1>

          <p className="text-sm text-muted-foreground">
            Add a vendor to your organization and
            capture its basic operational information.
          </p>
        </div>

        <p className="text-muted-foreground">
          Vendor onboarding form coming next.
        </p>
      </div>
    </div>
  )
}