"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Clock, XCircle, AlertCircle, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { attributeColors } from "@/constants/attributesColors"
import { DatePicker } from "@/components/ui/date-picker"

interface StatusManagerProps {
  claimId: string
  currentStatus: string
  currentFollowUpDate?: string | null
  onStatusUpdate: () => Promise<void> | void
}

const statusOptions = [
  { value: "processing", label: "Processing", icon: Clock, color: attributeColors.status.processing },
  { value: "under_review", label: "Under Review", icon: AlertCircle, color: attributeColors.status.under_review },
  { value: "overturned", label: "Overturned", icon: CheckCircle2, color: attributeColors.status.overturned },
  { value: "denied", label: "Denied", icon: XCircle, color: attributeColors.status.denied },
]

export function StatusManager({ claimId, currentStatus, currentFollowUpDate, onStatusUpdate }: StatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)
  const [note, setNote] = useState("")
  const [followUpDate, setFollowUpDate] = useState<string | undefined>(currentFollowUpDate ?? undefined)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setSelectedStatus(currentStatus)
  }, [currentStatus])

  useEffect(() => {
    setFollowUpDate(currentFollowUpDate ?? undefined)
  }, [currentFollowUpDate])

  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus && (followUpDate || null) === (currentFollowUpDate || null)) {
      toast({
        title: "No changes",
        description: "Status and follow-up date are already set to these values",
        variant: "default",
      })
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/claims/${claimId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: selectedStatus,
          note: note.trim() || undefined,
          followUpDate: followUpDate || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update status")
      }

      toast({
        title: "Status Updated",
        description: data.message,
        variant: "default",
      })

      await onStatusUpdate()
      setNote("")
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const currentStatusOption = statusOptions.find((option) => option.value === currentStatus)
  const selectedStatusOption = statusOptions.find((option) => option.value === selectedStatus)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Status Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="space-y-2">
          <Label htmlFor="status-select">Update Status</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status-note">Note (Optional)</Label>
          <Textarea
            id="status-note"
            placeholder="Add context for this status change..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status-follow-up-date">Follow-Up Date (Optional)</Label>
          <DatePicker
            value={followUpDate}
            onChange={(value) => setFollowUpDate(value)}
            placeholder="Set follow-up date"
          />
        </div>

        <Button
          onClick={handleStatusUpdate}
          disabled={isUpdating || selectedStatus === currentStatus}
          className="w-full"
        >
          {isUpdating ? "Updating..." : "Update Status"}
        </Button>

        {selectedStatus !== currentStatus && selectedStatusOption && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              Status will be changed to:
              <Badge variant="outline" className={selectedStatusOption.color}>
                <selectedStatusOption.icon className="mr-1 h-3 w-3" />
                {selectedStatusOption.label}
              </Badge>
            </div>
            {(followUpDate || null) !== (currentFollowUpDate || null) && (
              <div className="mt-2 text-sm text-muted-foreground">
                Follow-up date will be updated.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
