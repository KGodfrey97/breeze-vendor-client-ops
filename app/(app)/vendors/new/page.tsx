import type { Metadata } from "next"

import { NewVendorForm } from "@/components/new-vendor-form"

export const metadata: Metadata = {
  title: "New Vendor | Breeze",
  description:
    "Add a new vendor to Breeze Vendor Client Ops",
}

export default function NewVendorPage() {
  return (
    <div className="app-page">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Add New Vendor
        </h1>

        <p className="text-sm text-muted-foreground">
          Add a vendor and capture the basic information needed to begin managing the relationship.
        </p>
      </div>

      <NewVendorForm />
    </div>
  )
}