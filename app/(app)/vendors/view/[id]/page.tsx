"use client"

import { useParams } from "next/navigation"
import Link from "next/link"

import { useEffect } from "react"

import { Check, X, ArrowLeft, Building2, Edit, FileText, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InfoCard } from "@/components/ui/info-card"
import { InfoField } from "@/components/ui/info-field"
import { InfoGrid } from "@/components/ui/info-grid"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useVendor } from "@/hooks/use-vendors"

import { VendorContacts } from "@/components/vendor-contacts"
import { VendorContracts } from "@/components/vendor-contracts"
import { VendorBudget } from "@/components/vendor-budget"
import { VendorPerformance } from "@/components/vendor-performance"
import { VendorHealth } from "@/components/vendor-health"
import { VendorMeetings } from "@/components/vendor-meetings"
import { VendorRelationshipRatings } from "@/components/vendor-relationship-ratings"

export default function VendorDetailsPage() {
  const params = useParams()

  const [editingVendorInfo, setEditingVendorInfo] = useState(false)

  const [vendorForm, setVendorForm] = useState({
    name: "",
    vendorCode: "",
    lineOfBusinessId: "",
    vendorTier: "",
    status: "",
  })

  const [editingDescription, setEditingDescription] = useState(false)

  const [descriptionForm, setDescriptionForm] = useState({
    description: "",
    notes: "",
  })

  const [healthRefreshKey, setHealthRefreshKey] = useState(0)

  const refreshVendorHealth = () => {
    setHealthRefreshKey((prev) => prev + 1)
  }

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
              ${vendor.color || "hsl(var(--muted-foreground))"}33 0%,
              ${vendor.color || "hsl(var(--muted-foreground))"}1a 35%,
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

            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-6 space-y-6">
          <TabsList className="h-auto flex-wrap justify-start rounded-lg border border-border bg-card p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="health">Health & Ratings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
              <div className="space-y-6">
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
                    </div>
                  ) : (
                    <InfoGrid>
                      <InfoField label="Vendor Name" value={vendor.name} />
                      <InfoField label="Vendor Code" value={vendor.vendor_code} />
                      <InfoField label="Line of Business" value={vendor.line_of_business} />
                      <InfoField label="Vendor Tier" value={vendor.vendor_tier} />
                      <InfoField label="Status" value={formatStatus(vendor.status)} />
                    </InfoGrid>
                  )}
                </InfoCard>

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
              </div>

              <div className="space-y-6">
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
            </div>
          </TabsContent>

          <TabsContent value="financials" className="mt-0">
            <VendorBudget
              vendorId={vendor.id}
              onUpdated={async () => {
                await refetch()
                refreshVendorHealth()
              }}
            />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <VendorContacts vendorId={vendor.id} />
          </TabsContent>

          <TabsContent value="contracts" className="mt-0">
            <VendorContracts
              vendorId={vendor.id}
              onUpdated={async () => {
                await refetch()
              }}
            />
          </TabsContent>

          <TabsContent value="meetings" className="mt-0">
            <VendorMeetings
              vendorId={vendor.id}
            />
          </TabsContent>

          <TabsContent value="performance" className="mt-0">
            <VendorPerformance
              vendorId={vendor.id}
              onUpdated={refreshVendorHealth}
            />
          </TabsContent>

          <TabsContent value="health" className="mt-0">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,0.6fr)_minmax(0,1fr)]">
              <VendorHealth
                vendorId={vendor.id}
                refreshKey={healthRefreshKey}
              />

              <VendorRelationshipRatings
                vendorId={vendor.id}
                onUpdated={
                  refreshVendorHealth
                }
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
