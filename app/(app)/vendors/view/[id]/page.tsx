"use client"

import { useParams } from "next/navigation"
import Link from "next/link"

import { useEffect } from "react"

import { Check, X, ArrowLeft, Building2, Edit, FileText, Gauge, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InfoCard } from "@/components/ui/info-card"
import { InfoField } from "@/components/ui/info-field"
import { InfoGrid } from "@/components/ui/info-grid"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { useVendor } from "@/hooks/use-vendors"

import { VendorContacts } from "@/components/vendor-contacts"
import { VendorContracts } from "@/components/vendor-contracts"

export default function VendorDetailsPage() {
  const params = useParams()

  const [editingVendorInfo, setEditingVendorInfo] = useState(false)

  const [vendorForm, setVendorForm] = useState({
    name: "",
    vendorCode: "",
    lineOfBusinessId: "",
    vendorTier: "",
    status: "",
    grade: "",
  })

  const [editingDescription, setEditingDescription] = useState(false)

  const [descriptionForm, setDescriptionForm] = useState({
    description: "",
    notes: "",
  })

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

  const [linesOfBusiness, setLinesOfBusiness] = useState<
    { id: string; name: string }[]
  >([])

  useEffect(() => {
    const loadLinesOfBusiness = async () => {
      const response = await fetch("/api/lines-of-business", {
        cache: "no-store",
      })

      const data = await response.json()

      if (response.ok) {
        setLinesOfBusiness(data.linesOfBusiness || [])
      }
    }

    loadLinesOfBusiness()
  }, [])

  useEffect(() => {
    if (!vendor) return

    setVendorForm({
      name: vendor.name || "",
      vendorCode: vendor.vendor_code || "",
      lineOfBusinessId: vendor.line_of_business_id || "",
      vendorTier: vendor.vendor_tier || "",
      status: vendor.status || "",
      grade: vendor.grade || "",
    })
  }, [vendor])

  const saveVendorInfo = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: vendorForm.name,
          vendorCode: vendorForm.vendorCode || null,
          lineOfBusinessId: vendorForm.lineOfBusinessId || null,
          vendorTier: vendorForm.vendorTier || null,
          status: vendorForm.status,
          grade: vendorForm.grade || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update vendor")
      }

      await refetch()
      setEditingVendorInfo(false)
    } catch (error) {
      console.error("UPDATE VENDOR ERROR:", error)
    }
  }

  useEffect(() => {
    if (!vendor) return

    setDescriptionForm({
      description: vendor.description || "",
      notes: vendor.notes || "",
    })
  }, [vendor])

  const saveVendorDescription = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: descriptionForm.description || null,
          notes: descriptionForm.notes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update vendor description"
        )
      }

      await refetch()
      setEditingDescription(false)
    } catch (error) {
      console.error("UPDATE VENDOR DESCRIPTION ERROR:", error)
    }
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
              action={
                editingVendorInfo ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingVendorInfo(false)

                        setVendorForm({
                          name: vendor.name || "",
                          vendorCode: vendor.vendor_code || "",
                          lineOfBusinessId: vendor.line_of_business_id || "",
                          vendorTier: vendor.vendor_tier || "",
                          status: vendor.status || "",
                          grade: vendor.grade || "",
                        })
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>

                    <Button
                      size="sm"
                      onClick={saveVendorInfo}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingVendorInfo(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )
              }
            >
              {editingVendorInfo ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vendor Name</Label>
                    <Input
                      value={vendorForm.name}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Vendor Code</Label>
                    <Input
                      value={vendorForm.vendorCode}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          vendorCode: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Line of Business</Label>
                    <Select
                      value={vendorForm.lineOfBusinessId}
                      onValueChange={(value) =>
                        setVendorForm({
                          ...vendorForm,
                          lineOfBusinessId: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select line of business" />
                      </SelectTrigger>

                      <SelectContent>
                        {linesOfBusiness.map((lob) => (
                          <SelectItem key={lob.id} value={lob.id}>
                            {lob.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Vendor Tier</Label>
                    <Select
                      value={vendorForm.vendorTier}
                      onValueChange={(value) =>
                        setVendorForm({
                          ...vendorForm,
                          vendorTier: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="Tier 1">Tier 1</SelectItem>
                        <SelectItem value="Tier 2">Tier 2</SelectItem>
                        <SelectItem value="Tier 3">Tier 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={vendorForm.status}
                      onValueChange={(value) =>
                        setVendorForm({
                          ...vendorForm,
                          status: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select
                      value={vendorForm.grade || "none"}
                      onValueChange={(value) =>
                        setVendorForm({
                          ...vendorForm,
                          grade: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">Not Graded</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <InfoGrid>
                  <InfoField label="Vendor Name" value={vendor.name} />
                  <InfoField label="Vendor Code" value={vendor.vendor_code} />
                  <InfoField label="Line of Business" value={vendor.line_of_business} />
                  <InfoField label="Vendor Tier" value={vendor.vendor_tier} />
                  <InfoField label="Status" value={formatStatus(vendor.status)} />
                  <InfoField label="Grade" value={vendor.grade || "Not Graded"} />
                </InfoGrid>
              )}
            </InfoCard>

            {/* Vendor Description */}
            <InfoCard
              title="Vendor Description"
              icon={FileText}
              action={
                editingDescription ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingDescription(false)

                        setDescriptionForm({
                          description: vendor.description || "",
                          notes: vendor.notes || "",
                        })
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>

                    <Button
                      size="sm"
                      onClick={saveVendorDescription}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingDescription(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )
              }
            >
              {editingDescription ? (
                <div className="space-y-4">

                  <div className="space-y-2">
                    <Label htmlFor="vendorDescription">
                      Description
                    </Label>

                    <Textarea
                      id="vendorDescription"
                      placeholder="Add a description of the vendor, their services, or relationship..."
                      value={descriptionForm.description}
                      onChange={(e) =>
                        setDescriptionForm({
                          ...descriptionForm,
                          description: e.target.value,
                        })
                      }
                      className="min-h-28 resize-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorNotes">
                      Internal Notes
                    </Label>

                    <Textarea
                      id="vendorNotes"
                      placeholder="Add internal notes about this vendor..."
                      value={descriptionForm.notes}
                      onChange={(e) =>
                        setDescriptionForm({
                          ...descriptionForm,
                          notes: e.target.value,
                        })
                      }
                      className="min-h-28 resize-y"
                    />
                  </div>

                </div>
              ) : (
                <InfoGrid>
                  <InfoField
                    label="Description"
                    value={vendor.description}
                    colSpan={2}
                  />

                  <InfoField
                    label="Internal Notes"
                    value={vendor.notes}
                    colSpan={2}
                  />
                </InfoGrid>
              )}
            </InfoCard>

            <VendorContacts vendorId={vendor.id} />

            <VendorContracts
              vendorId={vendor.id}
              onUpdated={refetch}
            />

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