"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"

import type { Database } from "@/lib/db-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type ClaimDocument = Database["public"]["Tables"]["claim_documents"]["Row"]

interface ClaimDocumentsProps {
  claimId: string
  onUpdated?: () => Promise<void> | void
}

const acceptedDocumentTypes = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
].join(",")

export function ClaimDocuments({ claimId, onUpdated }: ClaimDocumentsProps) {
  const [documents, setDocuments] = useState<ClaimDocument[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalSelectedSize = useMemo(
    () => selectedFiles.reduce((sum, file) => sum + file.size, 0),
    [selectedFiles],
  )

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/claims/${claimId}/documents`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load documents")
      }

      setDocuments(payload.data || [])
    } catch (fetchError) {
      console.error("Error fetching claim documents:", fetchError)
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load documents")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [claimId])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      selectedFiles.forEach((file) => formData.append("files", file))

      const response = await fetch(`/api/claims/${claimId}/documents`, {
        method: "POST",
        body: formData,
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Failed to upload documents")
      }

      setSelectedFiles([])
      await fetchDocuments()
      await onUpdated?.()
    } catch (uploadError) {
      console.error("Error uploading documents:", uploadError)
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload documents")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (document: ClaimDocument) => {
    const confirmed = window.confirm(`Delete "${document.file_name}"?`)
    if (!confirmed) {
      return
    }

    try {
      setDeletingDocumentId(document.id)
      setError(null)

      const response = await fetch(`/api/claims/${claimId}/documents/${document.id}`, {
        method: "DELETE",
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete document")
      }

      setDocuments((prev) => prev.filter((item) => item.id !== document.id))
      await onUpdated?.()
    } catch (deleteError) {
      console.error("Error deleting document:", deleteError)
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete document")
    } finally {
      setDeletingDocumentId(null)
    }
  }

  const formatFileSize = (size: number | null) => {
    if (!size) return "Unknown size"
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatUploadedAt = (value: string | null) => {
    if (!value) return "Unknown upload date"
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const openDocument = (document: ClaimDocument, download = false) => {
    const suffix = download ? "?download=true" : ""
    window.open(`/api/claims/${claimId}/documents/${document.id}${suffix}`, "_blank", "noopener,noreferrer")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Claim Documents
        </CardTitle>
        <Badge variant="outline">{documents.length} attached</Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-dashed bg-muted/20 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium">Attach supporting files for this claim</p>
              <p className="text-sm text-muted-foreground">
                Upload denial letters, EOBs, medical records, spreadsheets, or other supporting documents.
              </p>
              <Input
                type="file"
                multiple
                accept={acceptedDocumentTypes}
                onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
              />
              {selectedFiles.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected •{" "}
                  {formatFileSize(totalSelectedSize)}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Documents
                </>
              )}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border bg-muted/10 px-4 py-8 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No documents attached yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload files above to keep supporting claim records in one place.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => {
              const isDeleting = deletingDocumentId === document.id

              return (
                <div
                  key={document.id}
                  className="flex flex-col gap-4 rounded-xl border bg-background p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{document.file_name}</p>
                      {document.content_type ? <Badge variant="secondary">{document.content_type}</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(document.size)} • Uploaded {formatUploadedAt(document.uploaded_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openDocument(document)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openDocument(document, true)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => handleDelete(document)}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
