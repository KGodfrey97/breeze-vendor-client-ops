"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type LineOfBusiness = {
  id: string
  name: string
  description: string | null
}

type VendorStatus =
  | "onboarding"
  | "active"
  | "under_review"
  | "inactive"

type VendorGrade =
  | ""
  | "A"
  | "B"
  | "C"
  | "D"
  | "F"

type FormState = {
  name: string
  vendorCode: string
  lineOfBusinessId: string
  vendorTier: string
  status: VendorStatus
  grade: VendorGrade
  color: string
  description: string
  notes: string
}

const initialForm: FormState = {
  name: "",
  vendorCode: "",
  lineOfBusinessId: "",
  vendorTier: "",
  status: "onboarding",
  grade: "",
  color: "#3B82F6",
  description: "",
  notes: "",
}

export function NewVendorForm() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>(initialForm)

  const [linesOfBusiness, setLinesOfBusiness] =
    useState<LineOfBusiness[]>([])

  const [isLoadingLobs, setIsLoadingLobs] =
    useState(true)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    const loadLinesOfBusiness = async () => {
      try {
        setIsLoadingLobs(true)

        const response = await fetch(
          "/api/lines-of-business"
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load lines of business"
          )
        }

        setLinesOfBusiness(
          data.linesOfBusiness || []
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load lines of business"
        )
      } finally {
        setIsLoadingLobs(false)
      }
    }

    loadLinesOfBusiness()
  }, [])

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.lineOfBusinessId.length > 0 &&
      !isSubmitting &&
      !isLoadingLobs
    )
  }, [
    form.name,
    form.lineOfBusinessId,
    isSubmitting,
    isLoadingLobs,
  ])

  const updateField = <
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setError(null)

    if (!form.name.trim()) {
      setError("Vendor name is required.")
      return
    }

    if (!form.lineOfBusinessId) {
      setError(
        "Line of business is required."
      )
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch(
        "/api/vendors",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),

            vendorCode:
              form.vendorCode.trim() || null,

            lineOfBusinessId:
              form.lineOfBusinessId,

            vendorTier:
              form.vendorTier.trim() || null,

            status: form.status,

            grade:
              form.grade || null,

            color:
              form.color || null,

            description:
              form.description.trim() || null,

            notes:
              form.notes.trim() || null,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create vendor"
        )
      }

      const vendorId = data.vendor?.id

      if (!vendorId) {
        throw new Error(
          "Vendor was created, but no vendor ID was returned."
        )
      }

      router.push(`/vendors/${vendorId}`)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create vendor"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="app-surface">
        <CardHeader>
          <CardTitle>
            Vendor Information
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Vendor Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Vendor Name
                <span className="ml-1 text-destructive">
                  *
                </span>
              </Label>

              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  updateField(
                    "name",
                    e.target.value
                  )
                }
                placeholder="Acme Billing"
                disabled={isSubmitting}
              />
            </div>

            {/* Vendor Code */}
            <div className="space-y-2">
              <Label htmlFor="vendorCode">
                Vendor Code
              </Label>

              <Input
                id="vendorCode"
                value={form.vendorCode}
                onChange={(e) =>
                  updateField(
                    "vendorCode",
                    e.target.value
                  )
                }
                placeholder="ACME-001"
                disabled={isSubmitting}
              />
            </div>

            {/* Line of Business */}
            <div className="space-y-2">
              <Label>
                Line of Business
                <span className="ml-1 text-destructive">
                  *
                </span>
              </Label>

              <Select
                value={form.lineOfBusinessId}
                onValueChange={(value) =>
                  updateField(
                    "lineOfBusinessId",
                    value
                  )
                }
                disabled={
                  isSubmitting ||
                  isLoadingLobs
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingLobs
                        ? "Loading..."
                        : "Select line of business"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {linesOfBusiness.map(
                    (lob) => (
                      <SelectItem
                        key={lob.id}
                        value={lob.id}
                      >
                        {lob.name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor Tier */}
            <div className="space-y-2">
              <Label htmlFor="vendorTier">
                Vendor Tier
              </Label>

              <Select
                value={form.vendorTier}
                onValueChange={(value) =>
                  updateField(
                    "vendorTier",
                    value
                  )
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="vendorTier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Tier 1">
                    Tier 1
                  </SelectItem>

                  <SelectItem value="Tier 2">
                    Tier 2
                  </SelectItem>

                  <SelectItem value="Tier 3">
                    Tier 3
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>
                Status
              </Label>

              <Select
                value={form.status}
                onValueChange={(
                  value: VendorStatus
                ) =>
                  updateField(
                    "status",
                    value
                  )
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="onboarding">
                    Onboarding
                  </SelectItem>

                  <SelectItem value="active">
                    Active
                  </SelectItem>

                  <SelectItem value="under_review">
                    Under Review
                  </SelectItem>

                  <SelectItem value="inactive">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grade */}
            <div className="space-y-2">
              <Label>
                Grade
              </Label>

              <Select
                value={form.grade}
                onValueChange={(value) =>
                  updateField(
                    "grade",
                    value as VendorGrade
                  )
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not graded" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="A">
                    A
                  </SelectItem>

                  <SelectItem value="B">
                    B
                  </SelectItem>

                  <SelectItem value="C">
                    C
                  </SelectItem>

                  <SelectItem value="D">
                    D
                  </SelectItem>

                  <SelectItem value="F">
                    F
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vendor Color */}
            <div className="space-y-2">
              <Label htmlFor="color">
                Vendor Color
              </Label>

              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    updateField(
                      "color",
                      e.target.value
                    )
                  }
                  disabled={isSubmitting}
                  className="h-10 w-16 cursor-pointer p-1"
                />

                <Input
                  value={form.color}
                  onChange={(e) =>
                    updateField(
                      "color",
                      e.target.value
                    )
                  }
                  disabled={isSubmitting}
                  className="max-w-40"
                />
              </div>
            </div>

          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description
            </Label>

            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                updateField(
                  "description",
                  e.target.value
                )
              }
              placeholder="Brief description of the vendor relationship and services provided."
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Internal Notes
            </Label>

            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) =>
                updateField(
                  "notes",
                  e.target.value
                )
              }
              placeholder="Internal notes about this vendor."
              disabled={isSubmitting}
              rows={4}
            />
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() =>
            router.push("/vendors")
          }
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}

          {isSubmitting
            ? "Creating Vendor..."
            : "Create Vendor"}
        </Button>
      </div>
    </form>
  )
}