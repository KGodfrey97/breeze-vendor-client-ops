// components/ui/editable-info-field.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface EditableInfoFieldProps {
  label: string
  value: string | null
  type?: "text" | "date" | "number"
  onSave: (value: string) => Promise<void> | void
}

export function EditableInfoField({
  label,
  value,
  type = "text",
  onSave,
}: EditableInfoFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(draft)
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(value || "")
    setIsEditing(false)
  }

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      {!isEditing ? (
        <div
          className="font-medium cursor-pointer hover:underline"
          onClick={() => setIsEditing(true)}
        >
          {value || "—"}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <Input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />

          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            Save
          </Button>

          <Button size="sm" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}