"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, Eye, EyeOff, FileText, Pencil, Plus, User } from "lucide-react"
import { InfoCard } from "@/components/ui/info-card"
import { InfoField } from "@/components/ui/info-field"
import { InfoGrid } from "@/components/ui/info-grid"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { PatientClaimsTable } from "@/components/patient-claims-table"
import { PatientsPaymentManager } from "@/components/patient-payments"
import { PatientsInsuranceManager } from "@/components/patient-insurance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttributeBadge } from "@/components/ui/attributesBadge"
import type { AttributeValue } from "@/components/ui/attributesBadge"
import type { Database } from "@/lib/db-types"

type Patient = Database["public"]["Tables"]["patients"]["Row"]

export default function PatientDetailsPage() {
  const params = useParams()
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id

  const [patient, setPatient] = useState<Patient | null>(null)
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false)
  const [isSavingPatient, setIsSavingPatient] = useState(false)
  const [patientFormError, setPatientFormError] = useState<string | null>(null)
  const [patientForm, setPatientForm] = useState({
    first_name: "",
    last_name: "",
    patient_external_id: "",
    dob: "",
    ssn: "",
  })
  const [isSsnRevealed, setIsSsnRevealed] = useState(false)

  const maskSsn = (ssn: string | null) => {
    if (!ssn) return "—"
    const digits = ssn.replace(/\D/g, "")
    if (digits.length < 4) return "***-**-****"
    return `***-**-${digits.slice(-4)}`
  }

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true)

        const response = await fetch(`/api/patients/${patientId}`, {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          setError(payload.error ?? "Patient not found")
          return
        }

        const patientData = payload.patient

        setPatient(patientData)

        setPatientForm({
          first_name: patientData.first_name || "",
          last_name: patientData.last_name || "",
          patient_external_id: patientData.patient_external_id || "",
          dob: patientData.dob || "",
          ssn: patientData.ssn || "",
        })

        const claimsResponse = await fetch(
          `/api/patients/${patientId}/claims`,
          {
            cache: "no-store",
          },
        )

        if (claimsResponse.ok) {
          const claimsPayload = await claimsResponse.json()
          setClaims(claimsPayload.claims ?? [])
        }
      } catch (err) {
        console.error(err)
        setError("Failed to load patient")
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [patientId])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const parseDateString = (dateString: string | null) => {
    if (!dateString) return null

    const normalized = dateString.slice(0, 10)
    const [year, month, day] = normalized.split("-").map(Number)

    if (!year || !month || !day) return null

    return new Date(year, month - 1, day)
  }

  const getFollowUpUrgency = (followUpDate: string | null) => {
    const date = parseDateString(followUpDate)
    if (!date) return "none"

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffInMs = date.getTime() - today.getTime()
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return "overdue"
    if (diffInDays <= 7) return "approaching"
    return "scheduled"
  }
  
  const totalClaims = claims.length
  const activeClaims = claims.filter((claim) => claim.status === "processing" || claim.status === "under_review").length
  const overturnedClaims = claims.filter((claim) => claim.status === "overturned").length
  const deniedClaims = claims.filter((claim) => claim.status === "denied").length
  const totalClaimValue = claims.reduce((sum, claim) => sum + (claim.original_claim_amount || 0), 0)
  const followUpClaims = claims
    .filter((claim) => claim.follow_up_date)
    .sort((a, b) => {
      const left = parseDateString(a.follow_up_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const right = parseDateString(b.follow_up_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return left - right
    })
  const attentionClaims = followUpClaims.filter((claim) => {
    const urgency = getFollowUpUrgency(claim.follow_up_date)
    return urgency === "overdue" || urgency === "approaching"
  })
  const recentClaims = claims
    .slice()
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 3)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)

  const handlePatientFormChange = (field: keyof typeof patientForm, value: string) => {
    setPatientForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSavePatient = async () => {
    if (!patient) return

    if (!patientForm.first_name.trim() || !patientForm.last_name.trim() || !patientForm.patient_external_id.trim()) {
      setPatientFormError("First name, last name, and patient ID are required.")
      return
    }

    setIsSavingPatient(true)
    setPatientFormError(null)

    const payload = {
      first_name: patientForm.first_name.trim(),
      last_name: patientForm.last_name.trim(),
      patient_external_id: patientForm.patient_external_id.trim(),
      dob: patientForm.dob || null,
      ssn: patientForm.ssn.trim() || null,
    }

    const response = await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      setPatientFormError(result.error ?? "Failed to update patient.")
      setIsSavingPatient(false)
      return
    }

    const updatedPatient = result.patient

    setPatient(updatedPatient)
    setPatientForm({
      first_name: updatedPatient.first_name || "",
      last_name: updatedPatient.last_name || "",
      patient_external_id: updatedPatient.patient_external_id || "",
      dob: updatedPatient.dob || "",
      ssn: updatedPatient.ssn || "",
    })
    setIsEditPatientOpen(false)
    setIsSavingPatient(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto flex h-64 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto flex h-64 items-center justify-center p-6">
        <div className="text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">Patient Not Found</h2>
          <p className="mb-4 text-muted-foreground">{error || "This patient does not exist."}</p>
          <Button asChild>
            <Link href="/patients">Back to Patients</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto space-y-6 p-3">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/patients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Patients
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-muted-foreground">Patient ID: {patient.patient_external_id}</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">

              {/* Patient Information */}
              <InfoCard
                title="Patient Information"
                icon={User}
                className="gap-4 space-y-0"
                action={
                  <Button variant="outline" size="sm" onClick={() => setIsEditPatientOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                }
              >
                <InfoGrid>
                  <InfoField label="Full Name" value={`${patient.first_name} ${patient.last_name}`} />
                  <InfoField label="Patient ID" value={patient.patient_external_id} />
                  <InfoField label="Date of Birth" value={formatDate(patient.dob)} />
                  <div className="flex items-end gap-2">
                    <InfoField label="SSN" value={isSsnRevealed ? patient.ssn : maskSsn(patient.ssn)} />
                    {patient.ssn && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsSsnRevealed((prev) => !prev)}
                        aria-label={isSsnRevealed ? "Hide SSN" : "Show SSN"}
                      >
                        {isSsnRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </InfoGrid>
              </InfoCard>

              <PatientsInsuranceManager patient={patient} />

              <PatientsPaymentManager patientId={patient.id} />
            </div>
            
            {/*Claim Summary*/}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Claim Summary</CardTitle>
                  <CardDescription>Quick stats for this patient&apos;s claims</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Claims</p>
                      <p className="mt-1 text-2xl font-semibold">{totalClaims}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active</p>
                      <p className="mt-1 text-2xl font-semibold">{activeClaims}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overturned</p>
                      <p className="mt-1 text-2xl font-semibold">{overturnedClaims}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Denied</p>
                      <p className="mt-1 text-2xl font-semibold">{deniedClaims}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Claim Value</p>
                    <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalClaimValue)}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/*Quick Actions*/}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start">
                    <Link href={`/claims/new?patient=${patient.patient_external_id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Claim
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href={`/claims?search=${patient.patient_external_id}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Search Claims
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Patient Information</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {patientFormError && <p className="text-sm text-destructive">{patientFormError}</p>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="patient_first_name">First Name</Label>
                <Input
                  id="patient_first_name"
                  value={patientForm.first_name}
                  onChange={(e) => handlePatientFormChange("first_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_last_name">Last Name</Label>
                <Input
                  id="patient_last_name"
                  value={patientForm.last_name}
                  onChange={(e) => handlePatientFormChange("last_name", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient_external_id">Patient ID</Label>
              <Input
                id="patient_external_id"
                value={patientForm.patient_external_id}
                onChange={(e) => handlePatientFormChange("patient_external_id", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <DatePicker value={patientForm.dob} onChange={(value) => handlePatientFormChange("dob", value || "")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_ssn">SSN</Label>
                <Input
                  id="patient_ssn"
                  value={patientForm.ssn}
                  onChange={(e) => handlePatientFormChange("ssn", e.target.value)}
                  placeholder="123-45-6789"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsEditPatientOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePatient} disabled={isSavingPatient}>
                {isSavingPatient ? "Saving..." : "Save Patient"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
