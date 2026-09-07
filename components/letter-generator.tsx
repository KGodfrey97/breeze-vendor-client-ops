"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Copy, Download, Loader2, Save, Send, Edit3, CheckCircle, AlertCircle } from "lucide-react"
import { AttributeBadge } from "@/components/ui/attributesBadge"
import type { AttributeValue } from "@/components/ui/attributesBadge"
import type { Database } from "@/lib/db-types"


interface LetterGeneratorProps {
  claimId: string
  onLetterGenerated?: () => void
}

type SavedLetter = Database["public"]["Tables"]["appeal_letters"]["Row"]

export function LetterGenerator({ claimId, onLetterGenerated }: LetterGeneratorProps) {
  //const params = useParams()
  const [letter, setLetter] = useState<string | null>(null)
  const [savedLetters, setSavedLetters] = useState<SavedLetter[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLetter, setSelectedLetter] = useState<SavedLetter | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedLetter, setEditedLetter] = useState("")

  // Load existing letters when component mounts
  const loadSavedLetters = async (preserveId?: string) => {
    const response = await fetch(
      `/api/claims/${claimId}/letters`
    )

    const result = await response.json()

    if (result.letters) {
      setSavedLetters(result.letters)

      if (result.letters.length > 0) {
        let letterToSelect = result.letters[0]

        if (preserveId) {
          const found = result.letters.find(
            (l: SavedLetter) => l.id === preserveId
          )

          if (found) {
            letterToSelect = found
          }
        }

        setSelectedLetter(letterToSelect)
        setLetter(letterToSelect.letter_content)
        setEditedLetter(letterToSelect.letter_content)
      }
    }
  }

  useEffect(() => {
    if (claimId) {
      loadSavedLetters()
    }
  }, [claimId])

  const generateLetter = async () => {
    if (!claimId) {
      setError("Missing claim ID")
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      console.log("=== Starting letter generation ===")
      console.log("Claim ID:", claimId)

      const response = await fetch("/api/generate-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimId }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to generate letter")
      }

      const data = await response.json()

      if (!data.letter) {
        throw new Error("No letter content received from server")
      }

      console.log("Response received:")
      console.log("Status:", response.status)
      console.log("Status Text:", response.statusText)
      console.log("Headers:", Object.fromEntries(response.headers.entries()))

      setLetter(data.letter)
      setEditedLetter(data.letter)
      setSelectedLetter(null)
      
      console.log("Letter generated successfully, length:", data.letter.length)
    } catch (err) {
      console.error("Error generating letter:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const saveLetter = async (status: "draft" | "approved" = "draft") => {
    if (!letter || !claimId) return

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(`/api/claims/${claimId}/letters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          letter_content: letter,
          status,
          letter_type: "appeal_letter",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save letter")
      }

      await loadSavedLetters(result.letter?.id)

      if (onLetterGenerated) {
        onLetterGenerated()
      }

      console.log("Letter saved successfully")
    } catch (err) {
      console.error("Error saving letter:", err)
      setError(err instanceof Error ? err.message : "Failed to save letter")
    } finally {
      setIsSaving(false)
    }
  }

  const markAsSent = async (letterId: string) => {
    try {
      const response = await fetch(`/api/letters/${letterId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "sent",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to mark letter as sent")
      }

      await loadSavedLetters(letterId)
    } catch (err) {
      console.error("Error marking letter as sent:", err)
      setError(err instanceof Error ? err.message : "Failed to update letter status")
    }
  }

  const copyToClipboard = async () => {
    if (letter) {
      try {
        await navigator.clipboard.writeText(letter)
        // You could add a toast notification here
      } catch (err) {
        console.error("Failed to copy to clipboard:", err)
      }
    }
  }

  const downloadLetter = () => {
    if (letter) {
      const element = document.createElement("a")
      const file = new Blob([letter], { type: "text/plain" })
      element.href = URL.createObjectURL(file)
      element.download = `claim-letter-${claimId}-${new Date().toISOString().split("T")[0]}.txt`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }

  const selectLetter = (savedLetter: SavedLetter) => {
    setSelectedLetter(savedLetter)
    setLetter(savedLetter.letter_content)
    setEditedLetter(savedLetter.letter_content)
    setIsEditing(false)
    setError(null) // Clear any errors when selecting a letter
  }

  const updateLetterStatus = async (letterId: string, status: "draft" | "approved") => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(`/api/letters/${letterId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to update letter")
      }

      await loadSavedLetters()
    } catch (err) {
      console.error("Error updating letter:", err)
      setError(err instanceof Error ? err.message : "Failed to update letter")
    } finally {
      setIsSaving(false)
    }
  }

  const updateLetterContent = async () => {
    if (!selectedLetter) return

    if (selectedLetter?.status === "sent") {
      setError("Cannot edit a sent letter")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(`/api/letters/${selectedLetter.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          letter_content: editedLetter,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to update letter")
      }

      setLetter(editedLetter)
      setIsEditing(false)

      await loadSavedLetters(selectedLetter.id)
    } catch (err) {
      console.error(err)
      setError("Failed to update letter")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Appeal letter Generator
        </CardTitle>
        <CardDescription>Generate and manage professional appeal letters</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Saved Letters Section */}
        {savedLetters.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Saved Letters</h4>
            <div className="space-y-2">
              {savedLetters.map((savedLetter) => (
                <div
                  key={savedLetter.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedLetter?.id === savedLetter.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => selectLetter(savedLetter)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {savedLetter.created_at
                          ? new Date(savedLetter.created_at).toLocaleDateString()
                          : "Unknown date"}
                      </span>
                    </div>
                    <AttributeBadge attribute="letterStatus" value={savedLetter.status as AttributeValue<"letterStatus">}/>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
          </div>
        )}

        {/* Generate New Letter Section */}
        {!letter && !isGenerating && (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Generate a professional appeal letter using AI based on all the information in this claim.
            </p>
            <Button onClick={generateLetter} disabled={isGenerating} className="w-full">
              Generate New Appeal letter
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating your appeal letter...</p>
            <p className="text-xs text-muted-foreground mt-2">This may take a few moments</p>
          </div>
        )}

        {/* Letter Display */}
        {letter && !isGenerating && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">
                {selectedLetter
                  ? `Letter from ${new Date(selectedLetter.created_at!).toLocaleDateString()}`
                  : "New Letter"}
              </h4>
              {selectedLetter && (
                <AttributeBadge attribute="letterStatus" value={selectedLetter.status as AttributeValue<"letterStatus">}/>
              )}
            </div>
            {isEditing ? (
              <textarea
                className="w-full min-h-[400px] p-4 border rounded-md text-sm"
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
                disabled={selectedLetter?.status === "sent"}
              />
            ) : (
              <div className="bg-muted p-4 rounded-md max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm border">
                {letter}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Action Buttons */}
      {letter && !isGenerating && (
        <CardFooter className="flex flex-col gap-3">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={copyToClipboard} disabled={isEditing}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" onClick={downloadLetter} disabled={isEditing}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* Save/Update Actions */}
          {!selectedLetter && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => saveLetter("draft")} disabled={isSaving} className="flex-1">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save as Draft
              </Button>
              <Button onClick={() => saveLetter("approved")} disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Mark as Approved
              </Button>
            </div>
          )}

          {/* Actions for Saved Letters */}
          {selectedLetter && selectedLetter.status !== "sent" && (
            <div className="flex flex-col gap-3 w-full">

              {/* Edit / Save / Cancel */}
              <div className="flex gap-2 w-full">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(true)
                      setEditedLetter(letter || "")
                    }}
                    className="flex-1"
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Letter
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={updateLetterContent}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setEditedLetter(letter || "")
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 w-full">
                {!isEditing && (
                  <Button variant="outline" onClick={generateLetter} className="flex-1">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Generate New
                  </Button>
                )}

                {!isEditing && selectedLetter.status === "draft" && (
                  <Button
                    onClick={() => updateLetterStatus(selectedLetter.id, "approved")}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Mark as Approved
                  </Button>
                )}

                {!isEditing && selectedLetter.status === "approved" && (
                  <Button
                    onClick={() => markAsSent(selectedLetter.id)}
                    className="flex-1"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </Button>
                )}
              </div>

            </div>
          )}

          {selectedLetter && selectedLetter.status === "sent" && (
            <div className="text-center w-full">
              <Badge variant="outline" className="bg-primary/15 text-primary">
                <CheckCircle className="mr-1 h-3 w-3" />
                Letter Sent
              </Badge>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
