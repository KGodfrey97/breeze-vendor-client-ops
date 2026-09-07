"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CalendarIcon, Search, Upload, UserRound, X } from "lucide-react"
import { format } from "date-fns"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MedicalFormUpload } from "@/components/medical-form-upload"
import { DENIAL_REASON_GROUPS } from "@/constants/denial-reasons"
import { cn } from "@/lib/utils"
import { insurancePriorityLabels, insurancePriorityBadgeClasses } from "@/constants/insuranceColors"

const claimFormSchema = z.object({
  // Patient Information
  patientFirstName: z.string().min(2, "First name must be at least 2 characters"),
  patientLastName: z.string().min(2, "Last name must be at least 2 characters"),
  patientId: z.string().min(1, "Patient ID is required"),
  dateOfBirth: z.date({
    error: "Date of birth is required",
  }),
  socialSecurityNumber: z
    .string()
    .refine((value) => value === "" || /^\d{3}-\d{2}-\d{4}$/.test(value), "SSN must be in format XXX-XX-XXXX"),

  // Insurance Information
  insuranceProvider: z.string().optional(),
  insurancePlan: z.string().optional(),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),

  // Claim Information
  claimId: z.string().min(1, "Claim ID is required"),
  originalClaimAmount: z.string().min(1, "Original claim amount is required"),
  denialDate: z.date({
    error: "Denial date is required",
  }),
  followUpDate: z.date().optional(),
  denialReason: z.string().min(1, "Denial reason is required"),

  // Provider Information
  providerName: z.string().min(1, "Provider name is required"),
  providerId: z.string().min(1, "Provider ID is required"),
  facilityName: z.string().optional(),

  // Appeal Information
  appealType: z.string().min(1, "Appeal type is required"),
  appealReason: z.string().min(10, "Appeal reason must be at least 10 characters"),
  appealDescription: z.string().min(10, "Appeal description must be at least 10 characters"),
  priority: z.string().min(1, "Priority level is required"),

  // Service Information
  serviceDate: z.date({
    error: "Service date is required",
  }),
  procedureCode: z.string().min(1, "Procedure code is required"),
  diagnosisCode: z.string().min(1, "Diagnosis code is required"),
})

type ClaimFormValues = z.infer<typeof claimFormSchema>

type ExistingPatient = {
  id: string
  patient_external_id: string
  first_name: string
  last_name: string
  dob: string | null
}

type ExistingPatientInsurance = {
  id?: string
  priority: number
  insurance_provider: string
  plan_type: string | null
  policy_number: string
  group_number: string | null
  payer_id?: string | null
  payer_phone_number?: string | null
  member_name?: string | null
  member_dob?: string | null
  claim_address?: string | null
  effective_date?: string | null
  termination_date?: string | null
}

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

export function NewClaimForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([])
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedExistingPatient, setSelectedExistingPatient] = useState("")
  const [isLoadingPatients, setIsLoadingPatients] = useState(true)
  const [patientLoadError, setPatientLoadError] = useState("")
  const [insuranceAutofillMessage, setInsuranceAutofillMessage] = useState("")
  const [draftInsurances, setDraftInsurances] = useState<ExistingPatientInsurance[]>([])
  const [noInsuranceSelected, setNoInsuranceSelected] = useState(false)
  const [isInsuranceDialogOpen, setIsInsuranceDialogOpen] = useState(false)
  const [insuranceDialogMode, setInsuranceDialogMode] = useState<"add" | "edit">("add")
  const [insurancePriorityToAdd, setInsurancePriorityToAdd] = useState<number>(1)
  const [editingInsurancePriority, setEditingInsurancePriority] = useState<number | null>(null)
  const [insuranceForm, setInsuranceForm] = useState(emptyInsuranceForm)
  const [insuranceSubmitError, setInsuranceSubmitError] = useState("")
  const [submitError, setSubmitError] = useState("")

  type FormInput = z.input<typeof claimFormSchema>

  const form = useForm<FormInput>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      patientFirstName: "",
      patientLastName: "",
      patientId: "",
      socialSecurityNumber: "",
      insuranceProvider: "",
      insurancePlan: "",
      policyNumber: "",
      groupNumber: "",
      claimId: "",
      originalClaimAmount: "",
      denialReason: "",
      serviceDate: undefined,
      denialDate: undefined,
      followUpDate: undefined,
      providerName: "",
      providerId: "",
      facilityName: "",
      appealReason: "",
      appealDescription: "",
      procedureCode: "",
      diagnosisCode: "",
    },
  })

  const filteredPatients = useMemo(() => {
    const normalizedSearch = patientSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return existingPatients
    }

    return existingPatients.filter((patient) => {
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()

      return (
        fullName.includes(normalizedSearch) ||
        patient.patient_external_id.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [existingPatients, patientSearch])

  const syncClaimInsuranceFields = (insurances: ExistingPatientInsurance[], useNoInsuranceFallback = noInsuranceSelected) => {
    const primaryInsurance = insurances.find((insurance) => insurance.priority === 1)

    if (primaryInsurance) {
      form.setValue("insuranceProvider", primaryInsurance.insurance_provider, { shouldValidate: true })
      form.setValue("insurancePlan", primaryInsurance.plan_type ?? "", { shouldValidate: true })
      form.setValue("policyNumber", primaryInsurance.policy_number, { shouldValidate: true })
      form.setValue("groupNumber", primaryInsurance.group_number ?? "", { shouldValidate: true })
      return
    }

    if (useNoInsuranceFallback) {
      form.setValue("insuranceProvider", "No Insurance", { shouldValidate: true })
      form.setValue("insurancePlan", "None", { shouldValidate: true })
      form.setValue("policyNumber", "N/A", { shouldValidate: true })
      form.setValue("groupNumber", "", { shouldValidate: true })
      return
    }

    form.setValue("insuranceProvider", "", { shouldValidate: true })
    form.setValue("insurancePlan", "", { shouldValidate: true })
    form.setValue("policyNumber", "", { shouldValidate: true })
    form.setValue("groupNumber", "", { shouldValidate: true })
  }

  const hasPrimaryInsurance = draftInsurances.some((insurance) => insurance.priority === 1)
  const hasSecondaryInsurance = draftInsurances.some((insurance) => insurance.priority === 2)
  const hasTertiaryInsurance = draftInsurances.some((insurance) => insurance.priority === 3)

  const canAddPrimaryInsurance = !noInsuranceSelected && !hasPrimaryInsurance
  const canAddSecondaryInsurance = !noInsuranceSelected && hasPrimaryInsurance && !hasSecondaryInsurance
  const canAddTertiaryInsurance = !noInsuranceSelected && hasPrimaryInsurance && hasSecondaryInsurance && !hasTertiaryInsurance

  const insuranceCoverageSummary = [
    { label: "Primary", present: hasPrimaryInsurance },
    { label: "Secondary", present: hasSecondaryInsurance },
    { label: "Tertiary", present: hasTertiaryInsurance },
  ]

  const handleInsuranceFormChange = (field: keyof typeof emptyInsuranceForm, value: string) => {
    setInsuranceForm((prev) => ({ ...prev, [field]: value }))
  }

  const openAddInsuranceDialog = (priority: number) => {
    setInsuranceDialogMode("add")
    setInsurancePriorityToAdd(priority)
    setEditingInsurancePriority(null)
    setInsuranceSubmitError("")
    setNoInsuranceSelected(false)
    setInsuranceForm({
      ...emptyInsuranceForm,
      member_name: `${form.getValues("patientFirstName")} ${form.getValues("patientLastName")}`.trim(),
      member_dob: form.getValues("dateOfBirth") ? formatDateForDatabase(form.getValues("dateOfBirth") as Date) : "",
    })
    setIsInsuranceDialogOpen(true)
  }

  const openEditInsuranceDialog = (insurance: ExistingPatientInsurance) => {
    setInsuranceDialogMode("edit")
    setInsurancePriorityToAdd(insurance.priority)
    setEditingInsurancePriority(insurance.priority)
    setInsuranceSubmitError("")
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

  const handleInsuranceDialogSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!insuranceForm.insurance_provider.trim() || !insuranceForm.policy_number.trim()) {
      setInsuranceSubmitError("Insurance provider and policy number are required.")
      return
    }

    const nextInsurance: ExistingPatientInsurance = {
      priority: insurancePriorityToAdd,
      insurance_provider: insuranceForm.insurance_provider.trim(),
      payer_id: insuranceForm.payer_id.trim() || null,
      policy_number: insuranceForm.policy_number.trim(),
      group_number: insuranceForm.group_number.trim() || null,
      plan_type: insuranceForm.plan_type.trim() || null,
      member_name: insuranceForm.member_name.trim() || null,
      member_dob: insuranceForm.member_dob || null,
      claim_address: insuranceForm.claim_address.trim() || null,
      payer_phone_number: insuranceForm.payer_phone_number.trim() || null,
      effective_date: insuranceForm.effective_date || null,
      termination_date: insuranceForm.termination_date || null,
    }

    const nextInsurances =
      insuranceDialogMode === "edit" && editingInsurancePriority
        ? draftInsurances.map((insurance) =>
            insurance.priority === editingInsurancePriority ? nextInsurance : insurance,
          )
        : [...draftInsurances, nextInsurance]

    const sortedInsurances = [...nextInsurances].sort((a, b) => a.priority - b.priority)
    setDraftInsurances(sortedInsurances)
    syncClaimInsuranceFields(sortedInsurances, false)
    setNoInsuranceSelected(false)
    setInsuranceSubmitError("")
    setInsuranceForm(emptyInsuranceForm)
    setIsInsuranceDialogOpen(false)
  }

  const handleDeleteInsurance = (priority: number) => {
    const nextInsurances = draftInsurances.filter((insurance) => insurance.priority < priority)
    setDraftInsurances(nextInsurances)
    syncClaimInsuranceFields(nextInsurances, false)
  }

  const handleSelectNoInsurance = () => {
    setNoInsuranceSelected(true)
    setDraftInsurances([])
    setInsuranceAutofillMessage("This claim will be created without any claim insurance records.")
    syncClaimInsuranceFields([], true)
  }

  const handleEnableInsuranceEntry = () => {
    setNoInsuranceSelected(false)
    setInsuranceAutofillMessage("")
    syncClaimInsuranceFields([], false)
    openAddInsuranceDialog(1)
  }

  const fillInsuranceFromPrimary = async (patientId: string) => {
    const response = await fetch(`/api/patients/${patientId}/insurance`, { cache: "no-store" })
    const payload = await response.json()

    if (!response.ok) {
      console.error("Error loading primary insurance:", payload.error || response.statusText)
      setInsuranceAutofillMessage("We could not load the patient's insurance records.")
      return
    }

    const data = payload.data || []
    if (!data || data.length === 0) {
      setDraftInsurances([])
      setNoInsuranceSelected(false)
      setInsuranceAutofillMessage("This patient does not have insurance on file yet.")
      syncClaimInsuranceFields([], false)
      return
    }

    const insurancePlans = data as ExistingPatientInsurance[]
    setDraftInsurances(insurancePlans)
    setNoInsuranceSelected(false)
    syncClaimInsuranceFields(insurancePlans, false)
    setInsuranceAutofillMessage("Insurance plans were auto-filled from the patient's current coverage.")
  }

  const applyExistingPatient = async (patient: ExistingPatient) => {
    setSelectedExistingPatient(patient.id)
    setInsuranceAutofillMessage("")
    form.setValue("patientFirstName", patient.first_name, { shouldValidate: true })
    form.setValue("patientLastName", patient.last_name, { shouldValidate: true })
    form.setValue("patientId", patient.patient_external_id, { shouldValidate: true })
    form.setValue("socialSecurityNumber", "", { shouldValidate: true })

    if (patient.dob) {
      const parsedDob = new Date(`${patient.dob}T00:00:00`)
      if (!isNaN(parsedDob.getTime())) {
        form.setValue("dateOfBirth", parsedDob, { shouldValidate: true })
      }
    }

    await fillInsuranceFromPrimary(patient.id)
  }

  const clearSelectedPatient = () => {
    setSelectedExistingPatient("")
    setPatientSearch("")
    setInsuranceAutofillMessage("")
  }

  useEffect(() => {
    let isMounted = true

    const loadPatients = async () => {
      setIsLoadingPatients(true)
      setPatientLoadError("")

      const response = await fetch("/api/patients", { cache: "no-store" })
      const payload = await response.json()

      if (!isMounted) {
        return
      }

      if (!response.ok) {
        console.error("Error loading patients:", payload.error || response.statusText)
        setPatientLoadError("Unable to load existing patients right now.")
        setExistingPatients([])
      } else {
        setExistingPatients(payload.patients ?? [])
      }

      setIsLoadingPatients(false)
    }

    loadPatients()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const patientExternalId = searchParams.get("patient")
    if (!patientExternalId || existingPatients.length === 0 || selectedExistingPatient) {
      return
    }

    const matchedPatient = existingPatients.find((patient) => patient.patient_external_id === patientExternalId)
    if (matchedPatient) {
      void applyExistingPatient(matchedPatient)
    }
  }, [existingPatients, searchParams, selectedExistingPatient])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles((prev) => {
      const existingFileKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`))
      const nextFiles = files.filter((file) => !existingFileKeys.has(`${file.name}-${file.size}-${file.lastModified}`))
      return [...prev, ...nextFiles]
    })
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMedicalFormData = (extractedData: any, sourceFile?: File) => {
    if (sourceFile) {
      const sourceFileKey = `${sourceFile.name}-${sourceFile.size}-${sourceFile.lastModified}`
      setUploadedFiles((prev) => {
        const alreadyAdded = prev.some((file) => `${file.name}-${file.size}-${file.lastModified}` === sourceFileKey)
        return alreadyAdded ? prev : [...prev, sourceFile]
      })
    }

    // Auto-populate form fields with extracted data
    Object.entries(extractedData).forEach(([key, value]) => {
      if (!value) return

      if (key === "dateOfBirth" || key === "serviceDate" || key === "denialDate" || key === "followUpDate") {
        let parsedDate: Date | null = null

        if (typeof value === "string") {
          const raw = value.trim()

          // Detect 8-digit MMDDYYYY format
          if (/^\d{8}$/.test(raw)) {
            const month = parseInt(raw.slice(0, 2), 10) - 1 // JS months are 0-indexed
            const day = parseInt(raw.slice(2, 4), 10)
            const year = parseInt(raw.slice(4, 8), 10)
            parsedDate = new Date(year, month, day)
          } else {
            // Fallback: try standard Date parsing
            const d = new Date(raw)
            if (!isNaN(d.getTime())) parsedDate = d
          }
        } else if (value instanceof Date && !isNaN(value.getTime())) {
          parsedDate = value
        }

        // Only set valid dates
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          form.setValue(key as keyof ClaimFormValues, parsedDate as any)
        }
      } else {
        form.setValue(key as keyof ClaimFormValues, value as any)
      }
    })
  }

  async function onSubmit(data: ClaimFormValues) {
    setIsSubmitting(true)
    setSubmitError("")

    try {
      if (!noInsuranceSelected && draftInsurances.length === 0) {
        throw new Error("Add at least a primary insurance or choose No Insurance before submitting.")
      }


      let patientRecordId = selectedExistingPatient

      if (!patientRecordId) {
        const patientResponse = await fetch("/api/patients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: data.patientFirstName.trim(),
            last_name: data.patientLastName.trim(),
            patient_external_id: data.patientId.trim(),
            dob: formatDateForDatabase(data.dateOfBirth),
            ssn: data.socialSecurityNumber.trim() || null,
          }),
        })

        const patientResult = await patientResponse.json()

        if (!patientResponse.ok) {
          throw new Error(patientResult.error || "Unable to create patient.")
        }

        patientRecordId = patientResult.patient.id

        // New patient — also save insurance to their patient record so it's on file for future claims
        if (!noInsuranceSelected && draftInsurances.length > 0) {
          for (const insurance of draftInsurances) {
            const patientInsuranceResponse = await fetch(`/api/patients/${patientRecordId}/insurance`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(insurance),
            })

            if (!patientInsuranceResponse.ok) {
              const errPayload = await patientInsuranceResponse.json().catch(() => null)
              console.error("Error saving patient insurance:", errPayload?.error || patientInsuranceResponse.statusText)
            }
          }
        }
      }

      const originalClaimAmount = parseCurrencyValue(data.originalClaimAmount)
      if (originalClaimAmount === null) {
        throw new Error("Original claim amount must be a valid number.")
      }

      const claimPayload = {
        patient_id: patientRecordId || null,
        insurance_provider: data.insuranceProvider || "",
        insurance_plan: data.insurancePlan || "",
        policy_number: data.policyNumber || "",
        group_number: data.groupNumber?.trim() || "",
        claim_id: data.claimId.trim(),
        original_claim_amount: originalClaimAmount,
        service_date: formatDateForDatabase(data.serviceDate),
        denial_date: formatDateForDatabase(data.denialDate),
        follow_up_date: data.followUpDate ? formatDateForDatabase(data.followUpDate) : null,
        denial_reason: data.denialReason.trim(),
        procedure_code: data.procedureCode.trim(),
        diagnosis_code: data.diagnosisCode.trim(),
        provider_name: data.providerName.trim(),
        provider_id: data.providerId.trim(),
        facility_name: data.facilityName?.trim() || null,
        appeal_type: data.appealType,
        appeal_reason: data.appealReason.trim(),
        appeal_description: data.appealDescription.trim(),
        priority: data.priority,
        status: "under_review",
      }
      
      const claimResponse = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(claimPayload),
      })
      
      const claimResult = await claimResponse.json()

      if (!claimResponse.ok) {
        throw new Error(claimResult.error || "Unable to create claim.")
      }
      
      const createdClaim = claimResult.data
      
      if (!createdClaim || !createdClaim.id) {
        console.error("Unexpected claim creation response:", claimResult)
        throw new Error("Claim was created, but the response was malformed. Please refresh and check the claims list.")
      }

      if (!noInsuranceSelected && draftInsurances.length > 0) {
        const claimInsurancePayload = draftInsurances.map((insurance) => ({
          claim_id: createdClaim.id,
          insurance_provider: insurance.insurance_provider,
          payer_id: insurance.payer_id ?? null,
          policy_number: insurance.policy_number,
          group_number: insurance.group_number ?? null,
          plan_type: insurance.plan_type ?? null,
          member_name: insurance.member_name ?? `${data.patientFirstName.trim()} ${data.patientLastName.trim()}`.trim(),
          member_dob: insurance.member_dob ?? formatDateForDatabase(data.dateOfBirth),
          claim_address: insurance.claim_address ?? null,
          payer_phone_number: insurance.payer_phone_number ?? null,
          priority: insurance.priority,
          effective_date: insurance.effective_date ?? null,
          termination_date: insurance.termination_date ?? null,
        }))

        const insuranceResponse = await fetch(`/api/claims/${createdClaim.id}/insurance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ insurance: claimInsurancePayload }),
        })

        if (!insuranceResponse.ok) {
          const errPayload = await insuranceResponse.json().catch(() => null)
          console.error("Error saving claim insurance:", errPayload?.error || insuranceResponse.statusText)
        }
      }

      await fetch(`/api/claims/${createdClaim.id}/timeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "claim_created",
          event_description: "Claim created",
        }),
      })

      try {
        const initDocumentsResponse = await fetch(`/api/claims/${createdClaim.id}/documents/init`, {
          method: "POST",
        })

        if (!initDocumentsResponse.ok) {
          const initDocumentsPayload = await initDocumentsResponse.json().catch(() => null)
          console.error("Error initializing claim document folder:", initDocumentsPayload?.error || initDocumentsResponse.statusText)
        }
      } catch (documentInitError) {
        console.error("Error initializing claim document folder:", documentInitError)
      }

      if (uploadedFiles.length > 0) {
        try {
          const documentsFormData = new FormData()
          uploadedFiles.forEach((file) => {
            documentsFormData.append("files", file)
          })

          const documentsUploadResponse = await fetch(`/api/claims/${createdClaim.id}/documents`, {
            method: "POST",
            body: documentsFormData,
          })

          if (!documentsUploadResponse.ok) {
            const documentsUploadPayload = await documentsUploadResponse.json().catch(() => null)
            console.error(
              "Error uploading claim documents after claim creation:",
              documentsUploadPayload?.error || documentsUploadResponse.statusText,
            )
          }
        } catch (documentUploadError) {
          console.error("Error uploading claim documents after claim creation:", documentUploadError)
        }
      }
      
      router.push(`/claims/view/${createdClaim.id}`)
    } catch (error) {
      console.error("Error submitting claim:", error)
      setSubmitError(error instanceof Error ? error.message : "Unable to create claim.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const parseCurrencyValue = (value: string) => {
    const normalizedValue = value.replace(/[^0-9.-]/g, "")
    if (!normalizedValue) return null

    const parsedValue = Number.parseFloat(normalizedValue)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  const formatDateForDatabase = (date: Date) => format(date, "yyyy-MM-dd")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        )}
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="upload">Form Upload</TabsTrigger>
            <TabsTrigger value="patient">Patient Info</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="claim">Claim Details</TabsTrigger>
            <TabsTrigger value="appeal">Appeal Info</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <MedicalFormUpload onDataExtracted={handleMedicalFormData} />
          </TabsContent>

          <TabsContent value="patient" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Select an existing patient or enter the patient's personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Use an Existing Patient</p>
                          <p className="text-sm text-muted-foreground">
                            Pull in patient details from your current records instead of re-entering them.
                          </p>
                        </div>
                      </div>
                    </div>
                    {selectedExistingPatient && (
                      <Button type="button" variant="outline" size="sm" onClick={clearSelectedPatient}>
                        Clear Selection
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={patientSearch}
                        onChange={(event) => setPatientSearch(event.target.value)}
                        placeholder="Search by patient name or patient ID"
                        className="pl-9"
                      />
                    </div>

                    <div className="rounded-lg border bg-background">
                      {isLoadingPatients ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Loading patients...</div>
                      ) : patientLoadError ? (
                        <div className="px-4 py-3 text-sm text-destructive">{patientLoadError}</div>
                      ) : filteredPatients.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          No patients matched your search.
                        </div>
                      ) : (
                        <Select
                          onValueChange={(value) => {
                            const patient = existingPatients.find((entry) => entry.id === value)
                            if (patient) {
                              void applyExistingPatient(patient)
                            }
                          }}
                          value={selectedExistingPatient}
                        >
                          <SelectTrigger className="border-0 shadow-none focus:ring-0">
                            <SelectValue placeholder="Select an existing patient" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPatients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.first_name} {patient.last_name} ({patient.patient_external_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {selectedExistingPatient && (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                        <Badge variant="secondary" className="bg-primary/15 text-primary hover:bg-primary/15">
                          Existing patient selected
                        </Badge>
                        <span>
                          Patient information is locked to the selected record. Clear the selection if you need to create a claim for someone new.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedExistingPatient ? (
                  <div className="rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">Selected Patient Details</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Patient details are locked to the selected record. Clear the selection to create a claim for a new patient.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">First Name</p>
                        <p className="mt-1 text-sm text-foreground">{form.getValues("patientFirstName") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Last Name</p>
                        <p className="mt-1 text-sm text-foreground">{form.getValues("patientLastName") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Patient ID</p>
                        <p className="mt-1 text-sm text-foreground">{form.getValues("patientId") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Social Security Number</p>
                        <p className="mt-1 text-sm text-foreground">{form.getValues("socialSecurityNumber") || "—"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Date of Birth</p>
                        <p className="mt-1 text-sm text-foreground">
                          {form.getValues("dateOfBirth") ? format(form.getValues("dateOfBirth"), "PPP") : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="patientFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patientLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Patient ID</FormLabel>
                            <FormControl>
                              <Input placeholder="PT-10045" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="socialSecurityNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Social Security Number</FormLabel>
                            <FormControl>
                              <Input placeholder="123-45-6789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Birth</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Insurance Information</CardTitle>
                <CardDescription>Add claim-specific primary, secondary, or tertiary coverage, or mark the claim as having none</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insuranceAutofillMessage && (
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    {insuranceAutofillMessage}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {insuranceCoverageSummary.map((coverage) => (
                    <Badge key={coverage.label} variant="outline" className={coverage.present ? "border-primary/30 bg-primary/5" : ""}>
                      {coverage.label}: {coverage.present ? "Added" : "Not Added"}
                    </Badge>
                  ))}
                  {noInsuranceSelected && (
                    <Badge variant="outline" className="border-muted-foreground/30 bg-muted text-muted-foreground">
                      No Insurance Selected
                    </Badge>
                  )}
                </div>

                {!noInsuranceSelected && draftInsurances.length > 0 && (
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="ghost" onClick={handleSelectNoInsurance}>
                      Use No Insurance Instead
                    </Button>
                  </div>
                )}

                {draftInsurances.length > 0 ? (
                  <div className="space-y-4">
                    {draftInsurances.map((insurance) => (
                      <div key={insurance.priority} className="space-y-3">
                        <div className="space-y-4 rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/20 p-5 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <Badge
                                variant="outline"
                                className={cn("font-medium", insurancePriorityBadgeClasses[insurance.priority])}
                              >
                                {insurancePriorityLabels[insurance.priority]}
                              </Badge>
                              <div>
                                <p className="text-lg font-semibold tracking-tight">{insurance.insurance_provider}</p>
                                <p className="text-sm text-muted-foreground">
                                  {insurance.plan_type || "Plan type not specified"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => openEditInsuranceDialog(insurance)}>
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteInsurance(insurance.priority)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Policy Number</p>
                              <p className="mt-1 text-foreground">{insurance.policy_number}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Group Number</p>
                              <p className="mt-1 text-foreground">{insurance.group_number || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Member Name</p>
                              <p className="mt-1 text-foreground">{insurance.member_name || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Payer ID</p>
                              <p className="mt-1 text-foreground">{insurance.payer_id || "—"}</p>
                            </div>
                          </div>
                        </div>

                        {insurance.priority === 1 && canAddSecondaryInsurance && (
                          <div className="flex justify-start pl-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => openAddInsuranceDialog(2)}>
                              Add Secondary
                            </Button>
                          </div>
                        )}

                        {insurance.priority === 2 && canAddTertiaryInsurance && (
                          <div className="flex justify-start pl-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => openAddInsuranceDialog(3)}>
                              Add Tertiary
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : noInsuranceSelected ? (
                  <div className="space-y-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 text-center">
                    <p className="font-semibold">No insurance will be attached to this claim</p>
                    <p className="text-sm text-muted-foreground">
                      You can still create the claim now and add claim-specific insurance later if needed.
                    </p>
                    <div>
                      <Button type="button" size="sm" variant="outline" onClick={handleEnableInsuranceEntry}>
                        Add Insurance Instead
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 text-center">
                    <div className="space-y-1">
                      <p className="font-semibold">No claim insurance added yet</p>
                      <p className="text-sm text-muted-foreground">
                        Start with primary coverage, then add secondary and tertiary plans if needed.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openAddInsuranceDialog(1)}>
                        Add Primary
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={handleSelectNoInsurance}>
                        No Insurance
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claim" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Claim Information</CardTitle>
                <CardDescription>Enter details about the denied claim</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="claimId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Claim ID</FormLabel>
                        <FormControl>
                          <Input placeholder="CL-2023-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originalClaimAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Claim Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="$1,250.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Service Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="denialDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Denial Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Follow-Up Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Optional date to remind your team when to follow up.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="procedureCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedure Code</FormLabel>
                        <FormControl>
                          <Input placeholder="99213" {...field} />
                        </FormControl>
                        <FormDescription>CPT or HCPCS code</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="diagnosisCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnosis Code</FormLabel>
                        <FormControl>
                          <Input placeholder="M79.3" {...field} />
                        </FormControl>
                        <FormDescription>ICD-10 code</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="denialReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Denial Reason</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select denial reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <FormDescription>Choose the most common payer denial reason that best matches the EOB or remittance.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="providerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Sarah Johnson" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="providerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider ID/NPI</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="facilityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="General Hospital" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appeal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appeal Information</CardTitle>
                <CardDescription>Provide details about your appeal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appeal Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select claim type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="medical-necessity">Medical Necessity</SelectItem>
                            <SelectItem value="coding-error">Coding Error</SelectItem>
                            <SelectItem value="coverage-issue">Coverage Issue</SelectItem>
                            <SelectItem value="prior-authorization">Prior Authorization</SelectItem>
                            <SelectItem value="network-issue">Network Issue</SelectItem>
                            <SelectItem value="billing-error">Billing Error</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="appealReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appeal Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary of why this claim should be overturned..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Provide a concise reason for the appeal (minimum 10 characters)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appealDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appeal Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of your appeal..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Provide a description of the appeal (minimum 10 characters)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
                <CardDescription>Upload documents to support your claim</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary hover:underline">Click to upload files</span>
                        <span className="text-sm text-muted-foreground"> or drag and drop</span>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB each</p>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Files</Label>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Recommended documents to include:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Medical records and clinical notes</li>
                    <li>Physician letter of medical necessity</li>
                    <li>Original denial letter from insurance</li>
                    <li>Lab results or diagnostic reports</li>
                    <li>Treatment history and previous authorizations</li>
                    <li>Relevant medical literature or guidelines</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting Claim..." : "Add Claim"}
          </Button>
        </div>
      </form>

      <Dialog
        open={isInsuranceDialogOpen}
        onOpenChange={(open) => {
          setIsInsuranceDialogOpen(open)
          if (!open) {
            setInsuranceSubmitError("")
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
                ? `Update the ${insurancePriorityLabels[insurancePriorityToAdd].toLowerCase()} claim insurance for this new claim.`
                : `Add the ${insurancePriorityLabels[insurancePriorityToAdd].toLowerCase()} claim insurance for this new claim.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInsuranceDialogSubmit} className="space-y-4">
            {insuranceSubmitError && <p className="text-sm text-destructive">{insuranceSubmitError}</p>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_claim_insurance_provider">Insurance Provider</Label>
                <Input
                  id="new_claim_insurance_provider"
                  value={insuranceForm.insurance_provider}
                  onChange={(e) => handleInsuranceFormChange("insurance_provider", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_claim_plan_type">Plan Type</Label>
                <Input
                  id="new_claim_plan_type"
                  value={insuranceForm.plan_type}
                  onChange={(e) => handleInsuranceFormChange("plan_type", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_claim_policy_number">Policy Number</Label>
                <Input
                  id="new_claim_policy_number"
                  value={insuranceForm.policy_number}
                  onChange={(e) => handleInsuranceFormChange("policy_number", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_claim_group_number">Group Number</Label>
                <Input
                  id="new_claim_group_number"
                  value={insuranceForm.group_number}
                  onChange={(e) => handleInsuranceFormChange("group_number", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_claim_payer_id">Payer ID</Label>
                <Input
                  id="new_claim_payer_id"
                  value={insuranceForm.payer_id}
                  onChange={(e) => handleInsuranceFormChange("payer_id", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_claim_payer_phone_number">Payer Phone Number</Label>
                <Input
                  id="new_claim_payer_phone_number"
                  value={insuranceForm.payer_phone_number}
                  onChange={(e) => handleInsuranceFormChange("payer_phone_number", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_claim_member_name">Member Name</Label>
                <Input
                  id="new_claim_member_name"
                  value={insuranceForm.member_name}
                  onChange={(e) => handleInsuranceFormChange("member_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_claim_member_dob">Member DOB</Label>
                <Input
                  id="new_claim_member_dob"
                  type="date"
                  value={insuranceForm.member_dob}
                  onChange={(e) => handleInsuranceFormChange("member_dob", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_claim_effective_date">Effective Date</Label>
                <Input
                  id="new_claim_effective_date"
                  type="date"
                  value={insuranceForm.effective_date}
                  onChange={(e) => handleInsuranceFormChange("effective_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_claim_termination_date">Termination Date</Label>
                <Input
                  id="new_claim_termination_date"
                  type="date"
                  value={insuranceForm.termination_date}
                  onChange={(e) => handleInsuranceFormChange("termination_date", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_claim_claim_address">Claim Address</Label>
              <Textarea
                id="new_claim_claim_address"
                value={insuranceForm.claim_address}
                onChange={(e) => handleInsuranceFormChange("claim_address", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsInsuranceDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{insuranceDialogMode === "edit" ? "Save Changes" : "Add Insurance"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
