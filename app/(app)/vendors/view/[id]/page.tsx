"use client"

import { useParams } from "next/navigation"
import Link from "next/link"

import { ArrowLeft, Building2, Edit, FileText, Gauge, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InfoCard } from "@/components/ui/info-card"
import { InfoField } from "@/components/ui/info-field"
import { InfoGrid } from "@/components/ui/info-grid"

import {
  useVendor,
} from "@/hooks/use-vendors"

export default function VendorDetailsPage() {
  const params = useParams()

  const vendorId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id

  const {
    vendor,
    isLoading,
    error,
    refetch,
  } = useVendor(vendorId)

  const formatStatus = (
    value: string | null
  ) => {
    if (!value) return "—"

    return value
      .split("_")
      .map(
        (word) =>
          word
            .charAt(0)
            .toUpperCase() +
          word.slice(1)
      )
      .join(" ")
  }

  const formatDate = (
    dateString: string | null
  ) => {
    if (!dateString) return "—"

    return new Date(
      dateString
    ).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />

            <p className="text-muted-foreground">
              Loading vendor details...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

            <h2 className="mb-2 text-xl font-semibold">
              Vendor Not Found
            </h2>

            <p className="mb-4 text-muted-foreground">
              {error ||
                "The vendor you're looking for doesn't exist or you don't have permission to view it."}
            </p>

            <Button asChild>
              <Link href="/vendors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          background: `
            radial-gradient(
              ellipse at top center,
              ${vendor.color || "#64748b"}33 0%,
              ${vendor.color || "#64748b"}1a 35%,
              transparent 75%
            )
          `,
        }}
      />

      <div className="relative container mx-auto p-3">
        <div className="mb-6">
          <div className="flex items-center justify-between">

            {/* Left side */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                asChild
              >
                <Link href="/vendors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  All Vendors
                </Link>
              </Button>

              <div className="flex items-center gap-3">

                <div>
                  <h1 className="text-3xl font-bold">
                    {vendor.name}
                  </h1>

                  <p className="text-muted-foreground">
                    {vendor.line_of_business ||
                      "No Line of Business"}

                    {vendor.vendor_tier
                      ? ` • ${vendor.vendor_tier}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Edit modal comes next
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>

              <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Status:
                </span>{" "}
                <span className="font-medium">
                  {formatStatus(
                    vendor.status
                  )}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Grade:
                </span>{" "}
                <span className="font-semibold">
                  {vendor.grade ||
                    "Not Graded"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">

            {/* Vendor Information */}
            <InfoCard
              title="Vendor Information"
              icon={Building2}
            >
              <InfoGrid>
                <InfoField
                  label="Vendor Name"
                  value={vendor.name}
                />

                <InfoField
                  label="Vendor Code"
                  value={
                    vendor.vendor_code
                  }
                />

                <InfoField
                  label="Line of Business"
                  value={
                    vendor.line_of_business
                  }
                />

                <InfoField
                  label="Vendor Tier"
                  value={
                    vendor.vendor_tier
                  }
                />

                <InfoField
                  label="Status"
                  value={formatStatus(
                    vendor.status
                  )}
                />

                <InfoField
                  label="Grade"
                  value={
                    vendor.grade ||
                    "Not Graded"
                  }
                />
              </InfoGrid>
            </InfoCard>

            {/* Vendor Description */}
            <InfoCard
              title="Vendor Description"
              icon={FileText}
            >
              <InfoGrid>
                <InfoField
                  label="Description"
                  value={
                    vendor.description
                  }
                  colSpan={2}
                />

                <InfoField
                  label="Internal Notes"
                  value={
                    vendor.notes
                  }
                  colSpan={2}
                />
              </InfoGrid>
            </InfoCard>

            {/* Relationship */}
            <InfoCard
              title="Relationship"
              icon={Tag}
            >
              <InfoGrid>
                <InfoField
                  label="Created"
                  value={formatDate(
                    vendor.created_at
                  )}
                />

                <InfoField
                  label="Last Updated"
                  value={formatDate(
                    vendor.updated_at
                  )}
                />

                <InfoField
                  label="Next Renewal"
                  value={formatDate(
                    vendor.renewal_date
                  )}
                />
              </InfoGrid>
            </InfoCard>

          </div>

          {/* Right sidebar */}
          <div className="space-y-6">

            {/* Status / Health */}
            <InfoCard
              title="Vendor Health"
              icon={Gauge}
            >
              <InfoGrid>
                <InfoField
                  label="Status"
                  value={formatStatus(
                    vendor.status
                  )}
                />

                <InfoField
                  label="Grade"
                  value={
                    vendor.grade ||
                    "Not Graded"
                  }
                />

                <InfoField
                  label="Renewal"
                  value={formatDate(
                    vendor.renewal_date
                  )}
                />
              </InfoGrid>
            </InfoCard>

            {/* Future modules */}
            <InfoCard
              title="Coming Next"
              icon={FileText}
            >
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Contracts
                </p>

                <p>
                  Budget
                </p>

                <p>
                  KPI / SLA performance
                </p>

                <p>
                  Meetings
                </p>

                <p>
                  Vendor notes
                </p>
              </div>
            </InfoCard>

          </div>
        </div>
      </div>
    </div>
  )
}