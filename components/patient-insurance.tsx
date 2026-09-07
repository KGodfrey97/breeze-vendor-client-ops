"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { InfoCard } from "@/components/ui/info-card"
import { InfoField } from "@/components/ui/info-field"
import { InfoGrid } from "@/components/ui/info-grid"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Database } from "@/lib/db-types"
import { cn } from "@/lib/utils"
import { FileText, Pencil, Plus, Trash2, ChevronDown } from "lucide-react"
import { insurancePriorityLabels, insurancePriorityBadgeClasses } from "@/constants/insuranceColors"

type Patient = Database["public"]["Tables"]["patients"]["Row"]
type PatientInsurance = Database["public"]["Tables"]["patient_insurance"]["Row"]

const emptyInsuranceForm = {
  insurance_provider: "",
  payer_id: "",
  policy_number: "",
  group_number: "",
  plan_type: "",
  member_name: "",
  member_dob: "",
  claim_address: "",
  payer_phone_number: "",
  effective_date: "",
  termination_date: "",
}

interface PatientsInsuranceManagerProps {
  patient: Patient
}

export function PatientsInsuranceManager({ patient }: PatientsInsuranceManagerProps) {
  const [insurances, setInsurances] = useState<PatientInsurance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInsuranceDialogOpen, setIsInsuranceDialogOpen] = useState(false)
  const [insurancePriorityToAdd, setInsurancePriorityToAdd] = useState<number>(1)
  const [insuranceDialogMode, setInsuranceDialogMode] = useState<"add" | "edit">("add")
  const [editingInsuranceId, setEditingInsuranceId] = useState<string | null>(null)
  const [insuranceForm, setInsuranceForm] = useState(emptyInsuranceForm)
  const [isSubmittingInsurance, setIsSubmittingInsurance] = useState(false)
  const [insuranceSubmitError, setInsuranceSubmitError] = useState<string | null>(null)

  const fetchInsurances = async () => {
    setIsLoading(true)

    const response = await fetch(`/api/patients/${patient.id}/insurance`, { cache: "no-store" })
    const payload = await response.json()

    if (response.ok) {
      setInsurances(payload.data || [])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchInsurances()
  }, [patient.id])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const hasPrimaryInsurance = insurances.some((insurance) => insurance.priority === 1)
  const hasSecondaryInsurance = insurances.some((insurance) => insurance.priority === 2)
  const hasTertiaryInsurance = insurances.some((insurance) => insurance.priority === 3)

  const canAddPrimaryInsurance = !hasPrimaryInsurance
  const canAddSecondaryInsurance = hasPrimaryInsurance && !hasSecondaryInsurance
  const canAddTertiaryInsurance = hasPrimaryInsurance && hasSecondaryInsurance && !hasTertiaryInsurance

  const insuranceCoverageSummary = [
    { label: "Primary", present: hasPrimaryInsurance },
    { label: "Secondary", present: hasSecondaryInsurance },
    { label: "Tertiary", present: hasTertiaryInsurance },
  ]

  const openAddInsuranceDialog = (priority: number) => {
    setInsuranceDialogMode("add")
    setEditingInsuranceId(null)
    setInsurancePriorityToAdd(priority)
    setInsuranceSubmitError(null)
    setInsuranceForm({
      ...emptyInsuranceForm,
      member_name: `${patient.first_name} ${patient.last_name}`,
      member_dob: patient.dob || "",
    })
    setIsInsuranceDialogOpen(true)
  }

  const openEditInsuranceDialog = (insurance: PatientInsurance) => {
    setInsuranceDialogMode("edit")
    setEditingInsuranceId(insurance.id)
    setInsurancePriorityToAdd(insurance.priority)
    setInsuranceSubmitError(null)
    setInsuranceForm({
      insurance_provider: insurance.insurance_provider || "",
      payer_id: insurance.payer_id || "",
      policy_number: insurance.policy_number || "",
      group_number: insurance.group_number || "",
      plan_type: insurance.plan_type || "",
      member_name: insurance.member_name || "",
      member_dob: insurance.member_dob || "",
      claim_address: insurance.claim_address || "",
      payer_phone_number: insurance.payer_phone_number || "",
      effective_date: insurance.effective_date || "",
      termination_date: insurance.termination_date || "",
    })
    setIsInsuranceDialogOpen(true)
  }

  const handleInsuranceFormChange = (field: keyof typeof emptyInsuranceForm, value: string) => {
    setInsuranceForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleInsuranceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsSubmittingInsurance(true)
    setInsuranceSubmitError(null)

    const payload: Database["public"]["Tables"]["patient_insurance"]["Insert"] = {
      patient_id: patient.id,
      insurance_provider: insuranceForm.insurance_provider.trim(),
      policy_number: insuranceForm.policy_number.trim(),
      priority: insurancePriorityToAdd,
      payer_id: insuranceForm.payer_id.trim() || null,
      group_number: insuranceForm.group_number.trim() || null,
      plan_type: insuranceForm.plan_type.trim() || null,
      member_name: insuranceForm.member_name.trim() || null,
      member_dob: insuranceForm.member_dob || null,
      claim_address: insuranceForm.claim_address.trim() || null,
      payer_phone_number: insuranceForm.payer_phone_number.trim() || null,
      effective_date: insuranceForm.effective_date || null,
      termination_date: insuranceForm.termination_date || null,
    }

    const response = await fetch(
      insuranceDialogMode === "edit" && editingInsuranceId
        ? `/api/patients/${patient.id}/insurance/${editingInsuranceId}`
        : `/api/patients/${patient.id}/insurance`,
      {
        method: insuranceDialogMode === "edit" && editingInsuranceId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    )

    if (!response.ok) {
      const submitError = await response.json().catch(() => null)
      console.error("Error saving insurance:", submitError)
      setInsuranceSubmitError(submitError?.error || "Failed to save insurance")
      setIsSubmittingInsurance(false)
      return
    }

    await fetchInsurances()
    setIsInsuranceDialogOpen(false)
    setInsuranceDialogMode("add")
    setEditingInsuranceId(null)
    setInsuranceForm(emptyInsuranceForm)
    setIsSubmittingInsurance(false)
  }

  const handleDeleteInsurance = async (insurance: PatientInsurance) => {
    const confirmed = window.confirm(
      `Delete the ${insurancePriorityLabels[insurance.priority]?.toLowerCase()} insurance for ${insurance.insurance_provider}?`,
    )

    if (!confirmed) return

    const response = await fetch(`/api/patients/${patient.id}/insurance/${insurance.id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const deleteError = await response.json().catch(() => null)
      console.error("Error deleting insurance:", deleteError)
      setInsuranceSubmitError(deleteError?.error || "Failed to delete insurance")
      return
    }

    await fetchInsurances()
  }

  return (
    <>
      <InfoCard title="Insurance Information" icon={FileText} className="relative">


        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">Loading insurance records...</p>
          </div>
        ) : insurances.length > 0 ? (
          <div className="space-y-4">
            {insurances.map((insurance) => (
              <Collapsible key={insurance.id} defaultOpen={false}>
                <div className="space-y-3">
                  <div className="space-y-5 rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/20 p-5 shadow-sm">
                    
                    
                    {/* HEADER (CLICKABLE) */}
                    <CollapsibleTrigger asChild>
                      <div className="group flex cursor-pointer flex-col gap-4 lg:flex-row lg:items-start lg:justify-between data-[state=open]:[&>div>svg]:rotate-180">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("font-medium", insurancePriorityBadgeClasses[insurance.priority])}
                            >
                              {insurancePriorityLabels[insurance.priority] || `Priority ${insurance.priority}`}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-lg font-semibold tracking-tight">{insurance.insurance_provider}</p>
                            <p className="text-sm text-muted-foreground">
                              {insurance.plan_type || "Plan type not specified"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={(e) => {
                              e.stopPropagation() // prevent collapse toggle
                              openEditInsuranceDialog(insurance)
                            }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation() // prevent collapse toggle
                              handleDeleteInsurance(insurance)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"/>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    {/* COLLAPSIBLE CONTENT (THIS WAS YOUR space-y-4 DIV) */}
                    <CollapsibleContent>
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Coverage Details
                          </p>
                          <InfoGrid>
                            <InfoField label="Policy Number" value={insurance.policy_number} />
                            <InfoField label="Group Number" value={insurance.group_number} />
                            <InfoField label="Effective Date" value={formatDate(insurance.effective_date)} />
                            <InfoField label="Termination Date" value={formatDate(insurance.termination_date)} />
                          </InfoGrid>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Member & Payer
                          </p>
                          <InfoGrid>
                            <InfoField label="Member Name" value={insurance.member_name} />
                            <InfoField label="Member DOB" value={formatDate(insurance.member_dob)} />
                            <InfoField label="Payer ID" value={insurance.payer_id} />
                            <InfoField label="Payer Phone" value={insurance.payer_phone_number} />
                            <InfoField label="Claim Address" value={insurance.claim_address} colSpan={2} />
                          </InfoGrid>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                  
                  {/*    THESE STAY OUTSIDE THE COLLAPSIBLE */}
                  {insurance.priority === 1 && canAddSecondaryInsurance && (
                    <div className="flex justify-start pl-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => openAddInsuranceDialog(2)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Secondary
                      </Button>
                    </div>
                  )}

                  {insurance.priority === 2 && canAddTertiaryInsurance && (
                    <div className="flex justify-start pl-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => openAddInsuranceDialog(3)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Tertiary
                      </Button>
                    </div>
                  )}
                </div>
              </Collapsible>
            ))}
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">No insurance records yet</p>
              <p className="text-sm text-muted-foreground">
                Add primary coverage first, then secondary and tertiary plans as needed.
              </p>
            </div>
            {canAddPrimaryInsurance && (
              <div>
                <Button type="button" size="sm" variant="outline" onClick={() => openAddInsuranceDialog(1)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Primary
                </Button>
              </div>
            )}
          </div>
        )}
      </InfoCard>

      <Dialog
        open={isInsuranceDialogOpen}
        onOpenChange={(open) => {
          setIsInsuranceDialogOpen(open)
          if (!open) {
            setInsuranceSubmitError(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {insuranceDialogMode === "edit" ? "Edit" : "Add"} {insurancePriorityLabels[insurancePriorityToAdd]} Insurance
            </DialogTitle>
            <DialogDescription>
              {insuranceDialogMode === "edit"
                ? `Update the ${insurancePriorityLabels[insurancePriorityToAdd]?.toLowerCase()} insurance plan for this patient.`
                : `Add the missing ${insurancePriorityLabels[insurancePriorityToAdd]?.toLowerCase()} insurance plan for this patient.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInsuranceSubmit} className="space-y-4">
            {insuranceSubmitError && <p className="text-sm text-destructive">{insuranceSubmitError}</p>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  value={insuranceForm.insurance_provider}
                  onChange={(e) => handleInsuranceFormChange("insurance_provider", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan_type">Plan Type</Label>
                <Input id="plan_type" value={insuranceForm.plan_type} onChange={(e) => handleInsuranceFormChange("plan_type", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="policy_number">Policy Number</Label>
                <Input
                  id="policy_number"
                  value={insuranceForm.policy_number}
                  onChange={(e) => handleInsuranceFormChange("policy_number", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group_number">Group Number</Label>
                <Input id="group_number" value={insuranceForm.group_number} onChange={(e) => handleInsuranceFormChange("group_number", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payer_id">Payer ID</Label>
                <Input id="payer_id" value={insuranceForm.payer_id} onChange={(e) => handleInsuranceFormChange("payer_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payer_phone_number">Payer Phone Number</Label>
                <Input
                  id="payer_phone_number"
                  value={insuranceForm.payer_phone_number}
                  onChange={(e) => handleInsuranceFormChange("payer_phone_number", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member_name">Member Name</Label>
                <Input id="member_name" value={insuranceForm.member_name} onChange={(e) => handleInsuranceFormChange("member_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member_dob">Member DOB</Label>
                <Input
                  id="member_dob"
                  type="date"
                  value={insuranceForm.member_dob}
                  onChange={(e) => handleInsuranceFormChange("member_dob", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={insuranceForm.effective_date}
                  onChange={(e) => handleInsuranceFormChange("effective_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termination_date">Termination Date</Label>
                <Input
                  id="termination_date"
                  type="date"
                  value={insuranceForm.termination_date}
                  onChange={(e) => handleInsuranceFormChange("termination_date", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim_address">Claim Address</Label>
              <Textarea
                id="claim_address"
                value={insuranceForm.claim_address}
                onChange={(e) => handleInsuranceFormChange("claim_address", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsInsuranceDialogOpen(false)
                  setInsuranceDialogMode("add")
                  setEditingInsuranceId(null)
                }}
                disabled={isSubmittingInsurance}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingInsurance}>
                {isSubmittingInsurance
                  ? insuranceDialogMode === "edit"
                    ? "Saving..."
                    : "Adding..."
                  : insuranceDialogMode === "edit"
                    ? "Save Changes"
                    : `Add ${insurancePriorityLabels[insurancePriorityToAdd]}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
