"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface ExtractedData {
  patientFirstName?: string
  patientLastName?: string
  patientId?: string
  dateOfBirth?: string
  socialSecurityNumber?: string
  insuranceProvider?: string
  insurancePlan?: string
  policyNumber?: string
  groupNumber?: string
  claimId?: string
  originalClaimAmount?: string
  serviceDate?: string
  denialDate?: string
  providerName?: string
  providerId?: string
  facilityName?: string
  procedureCode?: string
  diagnosisCode?: string
  denialReason?: string
}

interface MedicalFormUploadProps {
  onDataExtracted: (data: ExtractedData, sourceFile?: File) => void
}

export function MedicalFormUpload({ onDataExtracted }: MedicalFormUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const [extractedFormType, setExtractedFormType] = useState<string>("")
  const [confidence, setConfidence] = useState<number>(0)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setUploadStatus("idle")
    setUploadMessage("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/process-medical-form", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to process form")
      }

      setUploadStatus("success")
      setUploadMessage(result.message)
      setExtractedFormType(result.formType)
      setConfidence(result.confidence)

      // Auto-populate form fields
      onDataExtracted(result.extractedData, file)
    } catch (error) {
      setUploadStatus("error")
      setUploadMessage(error instanceof Error ? error.message : "Failed to process medical form")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Medical Form Upload
        </CardTitle>
        <CardDescription>Upload a UB04 or CMS1500 form to automatically populate claim fields</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            {isProcessing ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <Label htmlFor="medical-form-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  {isProcessing ? "Processing form..." : "Click to upload medical form"}
                </span>
                {!isProcessing && <span className="text-sm text-muted-foreground"> or drag and drop</span>}
              </Label>
              <Input
                id="medical-form-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.tiff"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supports UB04, CMS1500 forms in PDF, JPG, PNG, or TIFF format (max 10MB)
            </p>
          </div>
        </div>

        {uploadStatus === "success" && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{uploadMessage}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{extractedFormType}</Badge>
                {/*<Badge variant="outline">{Math.round(confidence * 100)}% confidence</Badge>*/}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadMessage}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Supported forms:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>UB04 (CMS-1450):</strong> Hospital/facility billing form
            </li>
            <li>
              <strong>CMS1500 (HCFA-1500):</strong> Professional services billing form
            </li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Note:</strong> Extracted data will be used to pre-fill the form fields. Please review and verify all
            information before submitting.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
