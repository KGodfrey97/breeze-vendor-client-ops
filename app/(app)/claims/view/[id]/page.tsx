"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Calendar, Eye, EyeOff, FileText, User, Building, Edit } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AttributeBadge } from "@/components/ui/attributesBadge"
import { EditClaimModal } from "@/components/edit-claim-modal"
import { LetterGenerator } from "@/components/letter-generator"
import { StatusManager } from "@/components/status-manager"
import { PaymentManager } from "@/components/payment-manager"
import { ClaimNotes } from "@/components/claim-notes"
import { ClaimDocuments } from "@/components/claim-documents"
import { InfoCard } from "@/components/ui/info-card"
import { InfoField } from "@/components/ui/info-field"
import { InfoGrid } from "@/components/ui/info-grid"
import type { AttributeValue } from "@/components/ui/attributesBadge"
import { ClaimInsuranceManager } from "@/components/claim-insurance"

//type User = Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user']

type Claim = {
  id: string
  patient_id: string
  claim_id: string
  first_name: string
  last_name: string
  dob: string | null

  status: string
  priority: string
  letter_status: string

  original_claim_amount: number | null

  service_date: string | null
  denial_date: string | null

  procedure_code: string | null
  diagnosis_code: string | null
  denial_reason: string | null

  provider_name: string | null
  provider_id: string | null
  facility_name: string | null

  appeal_type: string | null
  appeal_reason: string | null
  appeal_description: string | null

  follow_up_date: string | null
}

export default function ClaimDetailsPage() {
  const params = useParams()
  const [timeline, setTimeline] = useState<any[]>([])
  const [editOpen, setEditOpen] = useState(false)

  const claimId = Array.isArray(params.id) ? params.id[0] : params.id
  
  const [claim, setClaim] = useState<Claim | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSsnRevealed, setIsSsnRevealed] = useState(false)

  const maskSsn = (ssn: string | null) => {
    if (!ssn) return "—"
    const digits = ssn.replace(/\D/g, "")
    if (digits.length < 4) return "***-**-****"
    return `***-**-${digits.slice(-4)}`
  }

  const fetchClaim = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setClaim(data.claim)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claim")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (claimId) {
      fetchClaim()
    }
  }, [claimId])

  const refetch = fetchClaim

  const [patientSSN, setPatientSSN] = useState<string | null>(null)
  const [patientExternalID, setPatientExternalID] = useState<string | null>(null)

  useEffect(() => {
    if (!claim?.patient_id) return

    fetch(`/api/patients/${claim.patient_id}`)
      .then((r) => r.json())
      .then((data) => {
        setPatientSSN(data.patient.ssn)
        setPatientExternalID(data.patient.patient_external_id)
      })
  }, [claim])

  useEffect(() => {
    fetchTimeline()
  }, [claimId])

  const handleLetterGenerated = async () => {
    await refetch()
  }

  const handleClaimUpdated = async () => {
    await refetch()
    await fetchTimeline()
  }

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return "—"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const fetchTimeline = async () => {
    const res = await fetch(
      `/api/claims/${claimId}/timeline`
    )

    if (!res.ok) return

    const data = await res.json()
    setTimeline(data.timeline || [])
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading claim details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Claim Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "The claim you're looking for doesn't exist or you don't have permission to view it."}
            </p>
            <Button asChild>
              <Link href="/claims">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Claims
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/claims">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Claims  
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Claim Details</h1>
              <p className="text-muted-foreground">
                {claim.first_name} {claim.last_name} • {claim.claim_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setEditOpen(true)} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <EditClaimModal
              open={editOpen}
              onOpenChange={setEditOpen}
              claim={claim}
              onUpdated={() => refetch()}
            />
            
            <AttributeBadge attribute="status" value={claim.status as AttributeValue<"status">}/>

            <AttributeBadge attribute="priority" value={claim.priority as AttributeValue<"priority">} showLabel={true}/>

            <AttributeBadge attribute="letterStatus" value={claim.letter_status as AttributeValue<"letterStatus">} showLabel={true}/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="gap-4 lg:col-span-2 space-y-6">

          {/* Patient Information */}
          <InfoCard
            title="Patient Information"
            icon={User}
            className="gap-4 space-y-0"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={`/patients/view/${claim.patient_id}`}>
                  <User className="mr-2 h-4 w-4" />
                  View Patient
                </Link>
              </Button>
            }
          >
            <InfoGrid>
              <InfoField label="Full Name" value={`${claim.first_name} ${claim.last_name}`} />
              <InfoField label="Patient ID" value={patientExternalID} />
              <InfoField label="Date of Birth" value={formatDate(claim.dob)} />
              <div className="flex items-end gap-2">
                <InfoField label="SSN" value={isSsnRevealed ? patientSSN : maskSsn(patientSSN)} />
                {patientSSN && (
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
          
          {/* Claim Information */}
          <InfoCard title="Claim Information" icon={FileText}>
            <InfoGrid>
              <InfoField label="Claim ID" value={claim.claim_id}/>
              <InfoField label="Original Amount" value={formatCurrency(claim.original_claim_amount)}/>
              <InfoField label="Service Date" value={formatDate(claim.service_date)}/>
              <InfoField label="Denial Date" value={formatDate(claim.denial_date)}/>
              <InfoField label="Procedure Code" value={claim.procedure_code}/>
              <InfoField label="Diagnosis Code" value={claim.diagnosis_code}/>
              <InfoField label="Denial Reason" value={claim.denial_reason} colSpan={2}/>
            </InfoGrid>
          </InfoCard>

          <ClaimInsuranceManager claim={claim} />

          {/* Provider Information */}
          <InfoCard title="Provider Information" icon={Building}>
            <InfoGrid>
              <InfoField label="Provider Name" value={claim.provider_name}/>
              <InfoField label="Provider ID" value={claim.provider_id}/>
              <InfoField label="Facility Name" value={claim.facility_name} colSpan={2}/>
            </InfoGrid>
          </InfoCard>

          {/* Appeal Information */}
          <InfoCard title="Appeal Information" icon={FileText}>
            <InfoGrid>
              <InfoField label="Appeal type" value={claim.appeal_type}/>
              <InfoField label="Appeal Reason" value={claim.appeal_reason} colSpan={2}/>
              <InfoField label="Appeal Description" value={claim.appeal_description} colSpan={2}/>
            </InfoGrid>
          </InfoCard>

          <ClaimDocuments claimId={claim.id!} onUpdated={handleClaimUpdated} />
          
          {/* Payment Management */}
          <PaymentManager claimId={claim.id!} />
        </div>

        <div className="space-y-6">
          {/* Status Management */}
          <StatusManager
            claimId={claim.id!}
            currentStatus={claim.status!}
            currentFollowUpDate={claim.follow_up_date}
            onStatusUpdate={handleClaimUpdated}
          />

          {/* Letter Generator */}
          <LetterGenerator claimId={claim.id!} onLetterGenerated={handleLetterGenerated} />
          
          {/* Claim Notes */}
          <ClaimNotes
            claimId={claim.id!}
            currentFollowUpDate={claim.follow_up_date}
            onUpdated={handleClaimUpdated}
          />

          {/* Timeline */}
          {/*
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.length === 0 && (
                  <p className="text-sm text-muted-foreground">No timeline events yet.</p>
                )}

                {timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">{event.event_description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          */}
        </div>
      </div>
    </div>
  )
}
