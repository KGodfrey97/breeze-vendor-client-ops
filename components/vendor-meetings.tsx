"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  ListChecks,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InfoCard } from "@/components/ui/info-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { cn } from "@/lib/utils"

type MeetingStatus =
  | "scheduled"
  | "completed"
  | "cancelled"

type ActionStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"

type MeetingListItem = {
  id: string
  organization_id: string
  vendor_id: string
  title: string
  meeting_type: string | null
  status: MeetingStatus
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
  meeting_link: string | null
  summary: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string

  agenda_item_count: number
  action_item_count: number
  open_action_item_count: number
}

type AgendaItem = {
  id: string
  organization_id: string
  meeting_id: string
  title: string
  description: string | null
  notes: string | null
  is_vendor_visible: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type ActionItem = {
  id: string
  organization_id: string
  meeting_id: string
  agenda_item_id: string | null
  title: string
  description: string | null
  owner_name: string | null
  due_date: string | null
  status: ActionStatus
  is_vendor_visible: boolean
  created_at: string
  updated_at: string
}

type MeetingDetail = MeetingListItem & {
  agendaItems: AgendaItem[]
  actionItems: ActionItem[]
}

type VendorMeetingsProps = {
  vendorId: string
}

type MeetingFormState = {
  title: string
  meetingType: string
  status: MeetingStatus
  scheduledAt: string
  durationMinutes: string
  location: string
  meetingLink: string
  summary: string
  internalNotes: string
}

type AgendaFormState = {
  title: string
  description: string
  notes: string
  isVendorVisible: boolean
}

type ActionFormState = {
  title: string
  description: string
  ownerName: string
  dueDate: string
  status: ActionStatus
  agendaItemId: string
  isVendorVisible: boolean
}

const initialMeetingForm: MeetingFormState = {
  title: "",
  meetingType: "",
  status: "scheduled",
  scheduledAt: "",
  durationMinutes: "60",
  location: "",
  meetingLink: "",
  summary: "",
  internalNotes: "",
}

const initialAgendaForm: AgendaFormState = {
  title: "",
  description: "",
  notes: "",
  isVendorVisible: false,
}

const initialActionForm: ActionFormState = {
  title: "",
  description: "",
  ownerName: "",
  dueDate: "",
  status: "open",
  agendaItemId: "",
  isVendorVisible: false,
}

function toDateTimeLocal(
  value: string | null
) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ""
  }

  const offset =
    date.getTimezoneOffset()

  const local =
    new Date(
      date.getTime() -
        offset * 60 * 1000
    )

  return local
    .toISOString()
    .slice(0, 16)
}

function formatMeetingDate(
  value: string
) {
  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—"
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )
}

function formatMeetingTime(
  value: string
) {
  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—"
  }

  return date.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  )
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—"
  }

  const normalized =
    value.slice(0, 10)

  const [
    year,
    month,
    day,
  ] = normalized
    .split("-")
    .map(Number)

  if (
    !year ||
    !month ||
    !day
  ) {
    return "—"
  }

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )
}

function getMeetingStatusTone(
  status: MeetingStatus
) {
  switch (status) {
    case "scheduled":
      return "bg-secondary/10 text-secondary"

    case "completed":
      return "bg-primary/10 text-primary"

    case "cancelled":
      return "bg-muted text-muted-foreground"
  }
}

function getMeetingStatusLabel(
  status: MeetingStatus
) {
  switch (status) {
    case "scheduled":
      return "Scheduled"

    case "completed":
      return "Completed"

    case "cancelled":
      return "Cancelled"
  }
}

function getActionStatusTone(
  status: ActionStatus
) {
  switch (status) {
    case "open":
      return "bg-secondary/10 text-secondary"

    case "in_progress":
      return "bg-warning/10 text-warning"

    case "completed":
      return "bg-primary/10 text-primary"

    case "cancelled":
      return "bg-muted text-muted-foreground"
  }
}

function getActionStatusLabel(
  status: ActionStatus
) {
  switch (status) {
    case "open":
      return "Open"

    case "in_progress":
      return "In Progress"

    case "completed":
      return "Completed"

    case "cancelled":
      return "Cancelled"
  }
}

export function VendorMeetings({
  vendorId,
}: VendorMeetingsProps) {
  const [
    meetings,
    setMeetings,
  ] = useState<MeetingListItem[]>(
    []
  )

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  const [
    selectedMeeting,
    setSelectedMeeting,
  ] =
    useState<MeetingDetail | null>(
      null
    )

  const [
    expandedMeetingId,
    setExpandedMeetingId,
  ] =
    useState<string | null>(
      null
    )

  const [
    isLoadingMeeting,
    setIsLoadingMeeting,
  ] = useState(false)

  const [
    meetingDialogOpen,
    setMeetingDialogOpen,
  ] = useState(false)

  const [
    editingMeetingId,
    setEditingMeetingId,
  ] =
    useState<string | null>(
      null
    )

  const [
    meetingForm,
    setMeetingForm,
  ] =
    useState<MeetingFormState>(
      initialMeetingForm
    )

  const [
    agendaDialogOpen,
    setAgendaDialogOpen,
  ] = useState(false)

  const [
    editingAgendaId,
    setEditingAgendaId,
  ] =
    useState<string | null>(
      null
    )

  const [
    agendaForm,
    setAgendaForm,
  ] =
    useState<AgendaFormState>(
      initialAgendaForm
    )

  const [
    actionDialogOpen,
    setActionDialogOpen,
  ] = useState(false)

  const [
    editingActionId,
    setEditingActionId,
  ] =
    useState<string | null>(
      null
    )

  const [
    actionForm,
    setActionForm,
  ] =
    useState<ActionFormState>(
      initialActionForm
    )

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  // --------------------------------------------------
  // Meetings
  // --------------------------------------------------

  const fetchMeetings =
    async () => {
      try {
        setError(null)

        const response =
          await fetch(
            `/api/vendors/${vendorId}/meetings`,
            {
              cache: "no-store",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load meetings"
          )
        }

        setMeetings(
          data.meetings || []
        )
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load meetings"
        )

        setMeetings([])
      } finally {
        setIsLoading(false)
      }
    }

  const fetchMeetingDetail =
    async (
      meetingId: string
    ) => {
      try {
        setIsLoadingMeeting(
          true
        )

        const response =
          await fetch(
            `/api/vendors/${vendorId}/meetings/${meetingId}`,
            {
              cache: "no-store",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load meeting"
          )
        }

        setSelectedMeeting(
          data.meeting
        )
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load meeting"
        )
      } finally {
        setIsLoadingMeeting(
          false
        )
      }
    }

  useEffect(() => {
    fetchMeetings()
  }, [vendorId])

  const upcomingMeetings =
    useMemo(() => {
      const now = new Date()

      return meetings
        .filter(
          (meeting) =>
            meeting.status ===
              "scheduled" &&
            new Date(
              meeting.scheduled_at
            ) >= now
        )
        .sort(
          (a, b) =>
            new Date(
              a.scheduled_at
            ).getTime() -
            new Date(
              b.scheduled_at
            ).getTime()
        )
    }, [meetings])

  const pastMeetings =
    useMemo(() => {
      const now = new Date()

      return meetings
        .filter(
          (meeting) =>
            meeting.status !==
              "scheduled" ||
            new Date(
              meeting.scheduled_at
            ) < now
        )
        .sort(
          (a, b) =>
            new Date(
              b.scheduled_at
            ).getTime() -
            new Date(
              a.scheduled_at
            ).getTime()
        )
    }, [meetings])

  const toggleMeeting =
    async (
      meetingId: string
    ) => {
      if (
        expandedMeetingId ===
        meetingId
      ) {
        setExpandedMeetingId(
          null
        )

        setSelectedMeeting(
          null
        )

        return
      }

      setExpandedMeetingId(
        meetingId
      )

      await fetchMeetingDetail(
        meetingId
      )
    }

  // --------------------------------------------------
  // Meeting create/edit
  // --------------------------------------------------

  const openNewMeeting =
    () => {
      setEditingMeetingId(
        null
      )

      setMeetingForm(
        initialMeetingForm
      )

      setMeetingDialogOpen(
        true
      )
    }

  const openEditMeeting =
    (
      meeting: MeetingListItem
    ) => {
      setEditingMeetingId(
        meeting.id
      )

      setMeetingForm({
        title:
          meeting.title,

        meetingType:
          meeting.meeting_type ||
          "",

        status:
          meeting.status,

        scheduledAt:
          toDateTimeLocal(
            meeting.scheduled_at
          ),

        durationMinutes:
          meeting.duration_minutes !==
          null
            ? String(
                meeting.duration_minutes
              )
            : "",

        location:
          meeting.location ||
          "",

        meetingLink:
          meeting.meeting_link ||
          "",

        summary:
          meeting.summary ||
          "",

        internalNotes:
          meeting.internal_notes ||
          "",
      })

      setMeetingDialogOpen(
        true
      )
    }

  const saveMeeting =
    async () => {
      if (
        !meetingForm.title.trim()
      ) {
        setError(
          "Meeting title is required."
        )

        return
      }

      if (
        !meetingForm.scheduledAt
      ) {
        setError(
          "Meeting date and time are required."
        )

        return
      }

      try {
        setIsSubmitting(true)
        setError(null)

        const url =
          editingMeetingId
            ? `/api/vendors/${vendorId}/meetings/${editingMeetingId}`
            : `/api/vendors/${vendorId}/meetings`

        const response =
          await fetch(
            url,
            {
              method:
                editingMeetingId
                  ? "PATCH"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    meetingForm.title.trim(),

                  meetingType:
                    meetingForm.meetingType.trim() ||
                    null,

                  status:
                    meetingForm.status,

                  scheduledAt:
                    meetingForm.scheduledAt,

                  durationMinutes:
                    meetingForm.durationMinutes
                      ? Number(
                          meetingForm.durationMinutes
                        )
                      : null,

                  location:
                    meetingForm.location.trim() ||
                    null,

                  meetingLink:
                    meetingForm.meetingLink.trim() ||
                    null,

                  summary:
                    meetingForm.summary.trim() ||
                    null,

                  internalNotes:
                    meetingForm.internalNotes.trim() ||
                    null,
                }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to save meeting"
          )
        }

        setMeetingDialogOpen(
          false
        )

        await fetchMeetings()

        if (
          editingMeetingId &&
          expandedMeetingId ===
            editingMeetingId
        ) {
          await fetchMeetingDetail(
            editingMeetingId
          )
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save meeting"
        )
      } finally {
        setIsSubmitting(
          false
        )
      }
    }

  const deleteMeeting =
    async (
      meetingId: string
    ) => {
      const confirmed =
        window.confirm(
          "Delete this meeting? Agenda items and action items will also be deleted."
        )

      if (!confirmed) {
        return
      }

      try {
        const response =
          await fetch(
            `/api/vendors/${vendorId}/meetings/${meetingId}`,
            {
              method: "DELETE",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to delete meeting"
          )
        }

        if (
          expandedMeetingId ===
          meetingId
        ) {
          setExpandedMeetingId(
            null
          )

          setSelectedMeeting(
            null
          )
        }

        await fetchMeetings()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to delete meeting"
        )
      }
    }

  // --------------------------------------------------
  // Agenda
  // --------------------------------------------------

  const openNewAgendaItem =
    () => {
      setEditingAgendaId(
        null
      )

      setAgendaForm(
        initialAgendaForm
      )

      setAgendaDialogOpen(
        true
      )
    }

  const openEditAgendaItem =
    (
      item: AgendaItem
    ) => {
      setEditingAgendaId(
        item.id
      )

      setAgendaForm({
        title:
          item.title,

        description:
          item.description ||
          "",

        notes:
          item.notes || "",

        isVendorVisible:
          item.is_vendor_visible,
      })

      setAgendaDialogOpen(
        true
      )
    }

  const saveAgendaItem =
    async () => {
      if (
        !selectedMeeting
      ) {
        return
      }

      if (
        !agendaForm.title.trim()
      ) {
        setError(
          "Agenda item title is required."
        )

        return
      }

      try {
        setIsSubmitting(true)
        setError(null)

        const baseUrl =
          `/api/vendors/${vendorId}/meetings/${selectedMeeting.id}/agenda`

        const url =
          editingAgendaId
            ? `${baseUrl}/${editingAgendaId}`
            : baseUrl

        const response =
          await fetch(
            url,
            {
              method:
                editingAgendaId
                  ? "PATCH"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    agendaForm.title.trim(),

                  description:
                    agendaForm.description.trim() ||
                    null,

                  notes:
                    agendaForm.notes.trim() ||
                    null,

                  isVendorVisible:
                    agendaForm.isVendorVisible,
                }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to save agenda item"
          )
        }

        setAgendaDialogOpen(
          false
        )

        await fetchMeetingDetail(
          selectedMeeting.id
        )

        await fetchMeetings()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save agenda item"
        )
      } finally {
        setIsSubmitting(
          false
        )
      }
    }

  const deleteAgendaItem =
    async (
      agendaItemId: string
    ) => {
      if (
        !selectedMeeting
      ) {
        return
      }

      const confirmed =
        window.confirm(
          "Delete this agenda item?"
        )

      if (!confirmed) {
        return
      }

      try {
        const response =
          await fetch(
            `/api/vendors/${vendorId}/meetings/${selectedMeeting.id}/agenda/${agendaItemId}`,
            {
              method: "DELETE",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to delete agenda item"
          )
        }

        await fetchMeetingDetail(
          selectedMeeting.id
        )

        await fetchMeetings()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to delete agenda item"
        )
      }
    }

  // --------------------------------------------------
  // Action items
  // --------------------------------------------------

  const openNewActionItem =
    () => {
      setEditingActionId(
        null
      )

      setActionForm(
        initialActionForm
      )

      setActionDialogOpen(
        true
      )
    }

  const openEditActionItem =
    (
      item: ActionItem
    ) => {
      setEditingActionId(
        item.id
      )

      setActionForm({
        title:
          item.title,

        description:
          item.description ||
          "",

        ownerName:
          item.owner_name ||
          "",

        dueDate:
          item.due_date
            ? item.due_date.slice(
                0,
                10
              )
            : "",

        status:
          item.status,

        agendaItemId:
          item.agenda_item_id ||
          "",

        isVendorVisible:
          item.is_vendor_visible,
      })

      setActionDialogOpen(
        true
      )
    }

  const saveActionItem =
    async () => {
      if (
        !selectedMeeting
      ) {
        return
      }

      if (
        !actionForm.title.trim()
      ) {
        setError(
          "Action item title is required."
        )

        return
      }

      try {
        setIsSubmitting(true)
        setError(null)

        const baseUrl =
          `/api/vendors/${vendorId}/meetings/${selectedMeeting.id}/actions`

        const url =
          editingActionId
            ? `${baseUrl}/${editingActionId}`
            : baseUrl

        const response =
          await fetch(
            url,
            {
              method:
                editingActionId
                  ? "PATCH"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    actionForm.title.trim(),

                  description:
                    actionForm.description.trim() ||
                    null,

                  ownerName:
                    actionForm.ownerName.trim() ||
                    null,

                  dueDate:
                    actionForm.dueDate ||
                    null,

                  status:
                    actionForm.status,

                  agendaItemId:
                    actionForm.agendaItemId ||
                    null,

                  isVendorVisible:
                    actionForm.isVendorVisible,
                }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to save action item"
          )
        }

        setActionDialogOpen(
          false
        )

        await fetchMeetingDetail(
          selectedMeeting.id
        )

        await fetchMeetings()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save action item"
        )
      } finally {
        setIsSubmitting(
          false
        )
      }
    }

  const deleteActionItem =
    async (
      actionItemId: string
    ) => {
      if (
        !selectedMeeting
      ) {
        return
      }

      const confirmed =
        window.confirm(
          "Delete this action item?"
        )

      if (!confirmed) {
        return
      }

      try {
        const response =
          await fetch(
            `/api/vendors/${vendorId}/meetings/${selectedMeeting.id}/actions/${actionItemId}`,
            {
              method: "DELETE",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to delete action item"
          )
        }

        await fetchMeetingDetail(
          selectedMeeting.id
        )

        await fetchMeetings()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to delete action item"
        )
      }
    }

  // --------------------------------------------------
  // Meeting card
  // --------------------------------------------------

  const renderMeetingCard =
    (
      meeting: MeetingListItem
    ) => {
      const expanded =
        expandedMeetingId ===
        meeting.id

      return (
        <div
          key={meeting.id}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="flex items-start justify-between gap-4 p-4">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() =>
                toggleMeeting(
                  meeting.id
                )
              }
            >
              <div className="flex items-start gap-3">

                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <span className="text-xs font-medium uppercase">
                    {new Date(
                      meeting.scheduled_at
                    ).toLocaleDateString(
                      "en-US",
                      {
                        month:
                          "short",
                      }
                    )}
                  </span>

                  <span className="text-lg font-bold leading-none">
                    {new Date(
                      meeting.scheduled_at
                    ).getDate()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {
                        meeting.title
                      }
                    </p>

                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        getMeetingStatusTone(
                          meeting.status
                        )
                      )}
                    >
                      {getMeetingStatusLabel(
                        meeting.status
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">

                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />

                      {formatMeetingDate(
                        meeting.scheduled_at
                      )}

                      {" • "}

                      {formatMeetingTime(
                        meeting.scheduled_at
                      )}
                    </span>

                    {meeting.duration_minutes ? (
                      <span>
                        {
                          meeting.duration_minutes
                        }{" "}
                        min
                      </span>
                    ) : null}

                    {meeting.meeting_type ? (
                      <span>
                        {
                          meeting.meeting_type
                        }
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      {
                        meeting.agenda_item_count
                      }{" "}
                      agenda item
                      {meeting.agenda_item_count ===
                      1
                        ? ""
                        : "s"}
                    </span>

                    <span>
                      {
                        meeting.open_action_item_count
                      }{" "}
                      open action
                      {meeting.open_action_item_count ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1">

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleMeeting(
                    meeting.id
                  )
                }
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                >
                  <Button
                    variant="ghost"
                    size="icon"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      openEditMeeting(
                        meeting
                      )
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" />

                    Edit Meeting
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() =>
                      deleteMeeting(
                        meeting.id
                      )
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />

                    Delete Meeting
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>

          {expanded ? (
            <div className="border-t border-border bg-muted/20">

              {isLoadingMeeting &&
              selectedMeeting?.id !==
                meeting.id ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Loading meeting...
                </div>
              ) : selectedMeeting?.id ===
                meeting.id ? (
                <div className="space-y-6 p-4">

                  {/* Meeting details */}

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Location
                      </p>

                      <p className="mt-1 font-medium">
                        {selectedMeeting.location ||
                          "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Meeting Link
                      </p>

                      {selectedMeeting.meeting_link ? (
                        <a
                          href={
                            selectedMeeting.meeting_link
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Open meeting link

                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <p className="mt-1 font-medium">
                          —
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Summary
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-foreground">
                        {selectedMeeting.summary ||
                          "No summary added."}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Internal Notes
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-foreground">
                        {selectedMeeting.internal_notes ||
                          "No internal notes added."}
                      </p>
                    </div>

                  </div>

                  {/* Agenda */}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">
                          Agenda
                        </h4>

                        <p className="text-xs text-muted-foreground">
                          Topics and notes for this meeting
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          openNewAgendaItem
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />

                        Add Item
                      </Button>
                    </div>

                    {selectedMeeting
                      .agendaItems
                      .length > 0 ? (
                      <div className="space-y-2">
                        {selectedMeeting.agendaItems.map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className="rounded-lg border border-border bg-card p-3"
                            >
                              <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                      {index +
                                        1}
                                    </span>

                                    <p className="font-medium">
                                      {
                                        item.title
                                      }
                                    </p>

                                    {item.is_vendor_visible ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">
                                        <Eye className="h-3 w-3" />
                                        Vendor visible
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                        <EyeOff className="h-3 w-3" />
                                        Internal
                                      </span>
                                    )}
                                  </div>

                                  {item.description ? (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {
                                        item.description
                                      }
                                    </p>
                                  ) : null}

                                  {item.notes ? (
                                    <div className="mt-2 rounded-md bg-muted/60 p-2 text-sm">
                                      <span className="font-medium">
                                        Notes:{" "}
                                      </span>

                                      {
                                        item.notes
                                      }
                                    </div>
                                  ) : null}
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    asChild
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openEditAgendaItem(
                                          item
                                        )
                                      }
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() =>
                                        deleteAgendaItem(
                                          item.id
                                        )
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        No agenda items yet.
                      </div>
                    )}
                  </div>

                  {/* Action items */}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">
                          Action Items
                        </h4>

                        <p className="text-xs text-muted-foreground">
                          Follow-up tasks from the meeting
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          openNewActionItem
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />

                        Add Action
                      </Button>
                    </div>

                    {selectedMeeting
                      .actionItems
                      .length > 0 ? (
                      <div className="space-y-2">
                        {selectedMeeting.actionItems.map(
                          (item) => {
                            const linkedAgenda =
                              selectedMeeting.agendaItems.find(
                                (
                                  agenda
                                ) =>
                                  agenda.id ===
                                  item.agenda_item_id
                              )

                            return (
                              <div
                                key={
                                  item.id
                                }
                                className="rounded-lg border border-border bg-card p-3"
                              >
                                <div className="flex items-start justify-between gap-3">

                                  <div className="flex min-w-0 flex-1 items-start gap-3">
                                    {item.status ===
                                    "completed" ? (
                                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                                    ) : (
                                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}

                                    <div className="min-w-0 flex-1">

                                      <div className="flex flex-wrap items-center gap-2">
                                        <p
                                          className={cn(
                                            "font-medium",
                                            item.status ===
                                              "completed" &&
                                              "text-muted-foreground line-through"
                                          )}
                                        >
                                          {
                                            item.title
                                          }
                                        </p>

                                        <span
                                          className={cn(
                                            "rounded-full px-2 py-0.5 text-xs font-medium",
                                            getActionStatusTone(
                                              item.status
                                            )
                                          )}
                                        >
                                          {getActionStatusLabel(
                                            item.status
                                          )}
                                        </span>

                                        {item.is_vendor_visible ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">
                                            <Eye className="h-3 w-3" />
                                            Vendor visible
                                          </span>
                                        ) : null}
                                      </div>

                                      {item.description ? (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                          {
                                            item.description
                                          }
                                        </p>
                                      ) : null}

                                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">

                                        {item.owner_name ? (
                                          <span className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />

                                            {
                                              item.owner_name
                                            }
                                          </span>
                                        ) : null}

                                        {item.due_date ? (
                                          <span className="inline-flex items-center gap-1">
                                            <CalendarDays className="h-3.5 w-3.5" />

                                            Due{" "}
                                            {formatDate(
                                              item.due_date
                                            )}
                                          </span>
                                        ) : null}

                                        {linkedAgenda ? (
                                          <span>
                                            Agenda:{" "}
                                            {
                                              linkedAgenda.title
                                            }
                                          </span>
                                        ) : null}

                                      </div>
                                    </div>
                                  </div>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      asChild
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openEditActionItem(
                                            item
                                          )
                                        }
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() =>
                                          deleteActionItem(
                                            item.id
                                          )
                                        }
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        No action items yet.
                      </div>
                    )}
                  </div>

                </div>
              ) : null}

            </div>
          ) : null}
        </div>
      )
    }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <>
      <InfoCard
        title="Meetings"
        icon={CalendarDays}
        action={
          <Button
            size="sm"
            onClick={
              openNewMeeting
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        }
      >
        <div className="space-y-6">

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading meetings...
            </div>
          ) : meetings.length ===
            0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

              <p className="font-medium">
                No meetings yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Schedule the first meeting for this vendor.
              </p>

              <Button
                className="mt-4"
                size="sm"
                onClick={
                  openNewMeeting
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                New Meeting
              </Button>
            </div>
          ) : (
            <>
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />

                  <h4 className="font-semibold">
                    Upcoming
                  </h4>

                  <span className="text-xs text-muted-foreground">
                    {
                      upcomingMeetings.length
                    }
                  </span>
                </div>

                {upcomingMeetings.length >
                0 ? (
                  <div className="space-y-3">
                    {upcomingMeetings.map(
                      renderMeetingCard
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No upcoming meetings.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />

                  <h4 className="font-semibold">
                    Past Meetings
                  </h4>

                  <span className="text-xs text-muted-foreground">
                    {
                      pastMeetings.length
                    }
                  </span>
                </div>

                {pastMeetings.length >
                0 ? (
                  <div className="space-y-3">
                    {pastMeetings.map(
                      renderMeetingCard
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No past meetings.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </InfoCard>

      {/* ---------------------------------------------
          Meeting dialog
      ---------------------------------------------- */}

      <Dialog
        open={
          meetingDialogOpen
        }
        onOpenChange={
          setMeetingDialogOpen
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMeetingId
                ? "Edit Meeting"
                : "New Meeting"}
            </DialogTitle>

            <DialogDescription>
              Add the meeting details, schedule, and internal notes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">

            <div className="space-y-2 md:col-span-2">
              <Label>
                Meeting Title
              </Label>

              <Input
                value={
                  meetingForm.title
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      title:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="Quarterly Business Review"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Meeting Type
              </Label>

              <Input
                value={
                  meetingForm.meetingType
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      meetingType:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="QBR, Operations Review..."
              />
            </div>

            <div className="space-y-2">
              <Label>
                Status
              </Label>

              <Select
                value={
                  meetingForm.status
                }
                onValueChange={(
                  value: MeetingStatus
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      status:
                        value,
                    })
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="scheduled">
                    Scheduled
                  </SelectItem>

                  <SelectItem value="completed">
                    Completed
                  </SelectItem>

                  <SelectItem value="cancelled">
                    Cancelled
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Date & Time
              </Label>

              <Input
                type="datetime-local"
                value={
                  meetingForm.scheduledAt
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      scheduledAt:
                        event
                          .target
                          .value,
                    })
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Duration
              </Label>

              <Input
                type="number"
                min="1"
                value={
                  meetingForm.durationMinutes
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      durationMinutes:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="60"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Location
              </Label>

              <Input
                value={
                  meetingForm.location
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      location:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="Conference Room A"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Meeting Link
              </Label>

              <Input
                value={
                  meetingForm.meetingLink
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      meetingLink:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>
                Summary
              </Label>

              <Textarea
                value={
                  meetingForm.summary
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      summary:
                        event
                          .target
                          .value,
                    })
                  )
                }
                rows={3}
                placeholder="Meeting summary..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>
                Internal Notes
              </Label>

              <Textarea
                value={
                  meetingForm.internalNotes
                }
                onChange={(
                  event
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      internalNotes:
                        event
                          .target
                          .value,
                    })
                  )
                }
                rows={3}
                placeholder="Internal-only notes..."
              />
            </div>

          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setMeetingDialogOpen(
                  false
                )
              }
              disabled={
                isSubmitting
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                saveMeeting
              }
              disabled={
                isSubmitting
              }
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}

              Save Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------
          Agenda dialog
      ---------------------------------------------- */}

      <Dialog
        open={
          agendaDialogOpen
        }
        onOpenChange={
          setAgendaDialogOpen
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAgendaId
                ? "Edit Agenda Item"
                : "Add Agenda Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            <div className="space-y-2">
              <Label>
                Title
              </Label>

              <Input
                value={
                  agendaForm.title
                }
                onChange={(
                  event
                ) =>
                  setAgendaForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      title:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="Review SLA performance"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Description
              </Label>

              <Textarea
                value={
                  agendaForm.description
                }
                onChange={(
                  event
                ) =>
                  setAgendaForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      description:
                        event
                          .target
                          .value,
                    })
                  )
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Notes
              </Label>

              <Textarea
                value={
                  agendaForm.notes
                }
                onChange={(
                  event
                ) =>
                  setAgendaForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      notes:
                        event
                          .target
                          .value,
                    })
                  )
                }
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="agendaVendorVisible"
                checked={
                  agendaForm.isVendorVisible
                }
                onCheckedChange={(
                  checked
                ) =>
                  setAgendaForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      isVendorVisible:
                        checked ===
                        true,
                    })
                  )
                }
              />

              <Label htmlFor="agendaVendorVisible">
                Visible to vendor
              </Label>
            </div>

          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAgendaDialogOpen(
                  false
                )
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                saveAgendaItem
              }
              disabled={
                isSubmitting
              }
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              Save Agenda Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------
          Action item dialog
      ---------------------------------------------- */}

      <Dialog
        open={
          actionDialogOpen
        }
        onOpenChange={
          setActionDialogOpen
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingActionId
                ? "Edit Action Item"
                : "Add Action Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            <div className="space-y-2">
              <Label>
                Title
              </Label>

              <Input
                value={
                  actionForm.title
                }
                onChange={(
                  event
                ) =>
                  setActionForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      title:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="Send revised SLA report"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Description
              </Label>

              <Textarea
                value={
                  actionForm.description
                }
                onChange={(
                  event
                ) =>
                  setActionForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      description:
                        event
                          .target
                          .value,
                    })
                  )
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div className="space-y-2">
                <Label>
                  Owner
                </Label>

                <Input
                  value={
                    actionForm.ownerName
                  }
                  onChange={(
                    event
                  ) =>
                    setActionForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        ownerName:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Due Date
                </Label>

                <Input
                  type="date"
                  value={
                    actionForm.dueDate
                  }
                  onChange={(
                    event
                  ) =>
                    setActionForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        dueDate:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Status
                </Label>

                <Select
                  value={
                    actionForm.status
                  }
                  onValueChange={(
                    value: ActionStatus
                  ) =>
                    setActionForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        status:
                          value,
                      })
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="open">
                      Open
                    </SelectItem>

                    <SelectItem value="in_progress">
                      In Progress
                    </SelectItem>

                    <SelectItem value="completed">
                      Completed
                    </SelectItem>

                    <SelectItem value="cancelled">
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Agenda Item
                </Label>

                <Select
                  value={
                    actionForm.agendaItemId ||
                    "none"
                  }
                  onValueChange={(
                    value
                  ) =>
                    setActionForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        agendaItemId:
                          value ===
                          "none"
                            ? ""
                            : value,
                      })
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not linked" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      Not Linked
                    </SelectItem>

                    {selectedMeeting?.agendaItems.map(
                      (
                        agenda
                      ) => (
                        <SelectItem
                          key={
                            agenda.id
                          }
                          value={
                            agenda.id
                          }
                        >
                          {
                            agenda.title
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="actionVendorVisible"
                checked={
                  actionForm.isVendorVisible
                }
                onCheckedChange={(
                  checked
                ) =>
                  setActionForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      isVendorVisible:
                        checked ===
                        true,
                    })
                  )
                }
              />

              <Label htmlFor="actionVendorVisible">
                Visible to vendor
              </Label>
            </div>

          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialogOpen(
                  false
                )
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                saveActionItem
              }
              disabled={
                isSubmitting
              }
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              Save Action Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}