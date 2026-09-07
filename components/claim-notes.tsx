"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"

interface ClaimNote {
  id: string
  claim_id: string
  note: string
  created_by: string
  created_at: string
  profiles?: {
    full_name: string | null
  }
}

interface ClaimNotesProps {
  claimId: string
  currentFollowUpDate?: string | null
  onUpdated?: () => Promise<void> | void
}

export function ClaimNotes({ claimId, currentFollowUpDate, onUpdated }: ClaimNotesProps) {
  const [notes, setNotes] = useState<ClaimNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [followUpDate, setFollowUpDate] = useState<string | undefined>(currentFollowUpDate ?? undefined)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    //bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    if (bottomRef.current) {
      bottomRef.current.scrollTop = bottomRef.current.scrollHeight
    }
  }

  const fetchNotes = async () => {
    setLoadingNotes(true)

    const response = await fetch(`/api/claims/${claimId}/notes`, { cache: "no-store" })
    const payload = await response.json()

    if (response.ok) {
      setNotes((payload.data || []) as ClaimNote[])
      setTimeout(scrollToBottom, 100)
    }

    setLoadingNotes(false)
  }

  const getUser = async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" })
    const payload = await response.json()
    setUserId(payload.user?.id ?? null)
  }

  useEffect(() => {
    getUser()
    fetchNotes()
  }, [claimId])

  useEffect(() => {
    setFollowUpDate(currentFollowUpDate ?? undefined)
  }, [currentFollowUpDate])

  const addNote = async () => {
    if (!newNote.trim() || !userId) return

    if (newNote.length > 2000) {
      alert("Notes must be under 2000 characters.")
      return
    }

    setSubmitting(true)

    const response = await fetch(`/api/claims/${claimId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: newNote.trim(),
        followUpDate: followUpDate || null,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      console.error("Error adding note:", payload?.error || response.statusText)
    } else {
      setNewNote("")
      await fetchNotes()
      await onUpdated?.()
    }

    setSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      addNote()
    }
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "U"

    const parts = name.split(" ")
    if (parts.length === 1) return parts[0][0]

    return `${parts[0][0]}${parts[1][0]}`
  }

  return (
    <Card id="claim-notes">
      <CardHeader>
        <CardTitle>Claim Notes</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* NOTES TIMELINE */}

        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">

          {loadingNotes && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {!loadingNotes && notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notes yet
            </p>
          )}

          {notes.map((note) => (
            <div key={note.id} className="flex gap-3">

              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(note.profiles?.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {note.profiles?.full_name ?? "User"}
                  </span>

                  <span className="text-muted-foreground text-xs">
                    {formatTime(note.created_at)}
                  </span>
                </div>

                <div className="mt-1 text-sm bg-muted/40 border rounded-lg p-3 whitespace-pre-wrap">
                  {note.note}
                </div>

              </div>
            </div>
          ))}

          <div
            ref={bottomRef}
            className="space-y-6 max-h-[400px] overflow-y-auto pr-2"
            />

        </div>

        {/* ADD NOTE INPUT */}

        <div className="space-y-2">
          <div className="space-y-2">
            <Label htmlFor="note-follow-up-date">Follow-Up Date (Optional)</Label>
            <DatePicker
              value={followUpDate}
              onChange={(value) => setFollowUpDate(value)}
              placeholder="Set follow-up date"
            />
          </div>

          <Textarea
            placeholder="Add a note about this claim... (Ctrl + Enter to submit)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />

          <div className="flex items-center justify-between">

            <span className="text-xs text-muted-foreground">
              {newNote.length}/2000
            </span>

            <Button
              onClick={addNote}
              disabled={submitting || !newNote.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Adding
                </>
              ) : (
                "Add Note"
              )}
            </Button>

          </div>

        </div>

      </CardContent>
    </Card>
  )
}
