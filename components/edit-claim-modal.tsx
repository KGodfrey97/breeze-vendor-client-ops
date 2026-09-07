"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COMMON_DENIAL_REASONS, DENIAL_REASON_GROUPS } from "@/constants/denial-reasons"
import { useEffect } from "react"


interface EditClaimModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  claim: Claim
  onUpdated: (claim: Claim) => void
}

export function EditClaimModal({ open, onOpenChange, claim, onUpdated }: EditClaimModalProps) {
  if (!claim) return null

  const [formData, setFormData] = useState({
    claim_id: "",
    original_claim_amount: "",
    service_date: "",
    denial_date: "",
    denial_reason: "",
    procedure_code: "",
    diagnosis_code: "",
    provider_name: "",
    provider_id: "",
    facility_name: "",
    appeal_type: "",
    priority: "normal",
    claim_reason: "",
    claim_description: "",
  })

  useEffect(() => {

    setFormData({
      claim_id: claim.claim_id || "",
      original_claim_amount: claim.original_claim_amount?.toString() || "",
      service_date: claim.service_date || "",
      denial_date: claim.denial_date || "",
      denial_reason: claim.denial_reason || "",
      procedure_code: claim.procedure_code || "",
      diagnosis_code: claim.diagnosis_code || "",
      provider_name: claim.provider_name || "",
      provider_id: claim.provider_id || "",
      facility_name: claim.facility_name || "",
      appeal_type: claim.appeal_type || "",
      priority: claim.priority || "normal",
      claim_reason: claim.appeal_reason || "",
      claim_description: claim.appeal_description || "",
    })
  }, [claim])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const denialReasonOptions = !formData.denial_reason || COMMON_DENIAL_REASONS.includes(formData.denial_reason as (typeof COMMON_DENIAL_REASONS)[number])
    ? [...COMMON_DENIAL_REASONS]
    : [formData.denial_reason, ...COMMON_DENIAL_REASONS]

  const handleSave = async () => {
    try {
      if (!claim.id) throw new Error("Claim ID missing")

      const originalClaimAmount = parseFloat(
        formData.original_claim_amount
      )

      if (isNaN(originalClaimAmount)) {
        throw new Error("Invalid claim amount")
      }

      // Required text fields validation
      const requiredFields: Array<keyof typeof formData> = [
        "claim_id",
        "service_date",
        "denial_date",
        "denial_reason",
        "procedure_code",
        "diagnosis_code",
        "provider_name",
        "provider_id",
        "appeal_type",
        "claim_reason",
        "claim_description",
      ]
      for (const field of requiredFields) {
        if (!formData[field]) throw new Error(`Field "${field}" is required`)
      }
      
      const payload = {
        claim_id: formData.claim_id,
        original_claim_amount: originalClaimAmount,
        service_date: formData.service_date,
        denial_date: formData.denial_date,
        denial_reason: formData.denial_reason,
        procedure_code: formData.procedure_code,
        diagnosis_code: formData.diagnosis_code,

        provider_name: formData.provider_name,
        provider_id: formData.provider_id,
        facility_name: formData.facility_name || null,

        appeal_type: formData.appeal_type,
        appeal_reason: formData.claim_reason,
        appeal_description: formData.claim_description,
        priority: formData.priority || "normal",
      }

      const response = await fetch(`/api/claims/${claim.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update claim")
      }

      onUpdated(result.data)
      onOpenChange(false)
    } catch (err) {
      console.error("Unexpected error:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Claim</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Claim Info */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Claim Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={formData.claim_id}
                onChange={(e) => handleChange("claim_id", e.target.value)}
                placeholder="Claim ID"
              />
              <Input
                type="number"
                value={formData.original_claim_amount}
                onChange={(e) => handleChange("original_claim_amount", e.target.value)}
                placeholder="Claim Amount"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Date</Label>
                <DatePicker value={formData.service_date} onChange={(value) => handleChange("service_date", value || "")} />
              </div>
              <div className="space-y-2">
                <Label>Denial Date</Label>
                <DatePicker value={formData.denial_date} onChange={(value) => handleChange("denial_date", value || "")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={formData.procedure_code}
                onChange={(e) => handleChange("procedure_code", e.target.value)}
                placeholder="Procedure Code"
              />
              <Input
                value={formData.diagnosis_code}
                onChange={(e) => handleChange("diagnosis_code", e.target.value)}
                placeholder="Diagnosis Code"
              />
            </div>
            <div className="space-y-2">
              <Label>Denial Reason</Label>
              <Select value={formData.denial_reason} onValueChange={(value) => handleChange("denial_reason", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select denial reason" />
                </SelectTrigger>
                <SelectContent>
                  {denialReasonOptions[0] &&
                    !COMMON_DENIAL_REASONS.includes(denialReasonOptions[0] as (typeof COMMON_DENIAL_REASONS)[number]) && (
                      <SelectGroup>
                        <SelectLabel>Current Value</SelectLabel>
                        <SelectItem value={denialReasonOptions[0]}>{denialReasonOptions[0]}</SelectItem>
                      </SelectGroup>
                    )}
                  {DENIAL_REASON_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.reasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
          {/* Provider Info */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Provider Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={formData.provider_name}
                onChange={(e) => handleChange("provider_name", e.target.value)}
                placeholder="Provider Name"
              />
              <Input
                value={formData.provider_id}
                onChange={(e) => handleChange("provider_id", e.target.value)}
                placeholder="Provider ID/NPI"
              />
            </div>
            <Input
              value={formData.facility_name}
              onChange={(e) => handleChange("facility_name", e.target.value)}
              placeholder="Facility Name"
            />
          </section>

          {/* Appeal Info */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Appeal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select value={formData.appeal_type} onValueChange={(value) => handleChange("appeal_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Appeal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Medical Necessity">Medical Necessity</SelectItem>
                  <SelectItem value="Coding Error">Coding Error</SelectItem>
                  <SelectItem value="Coverage Issue">Coverage Issue</SelectItem>
                  <SelectItem value="Prior Authorization">Prior Authorization</SelectItem>
                  <SelectItem value="Network Issue">Network Issue</SelectItem>
                  <SelectItem value="Billing Error">Billing Error</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={formData.claim_reason}
              onChange={(e) => handleChange("claim_reason", e.target.value)}
              placeholder="Appeal Reason"
            />
            <Textarea
              value={formData.claim_description}
              onChange={(e) => handleChange("claim_description", e.target.value)}
              placeholder="Claim Description"
            />
          </section>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
