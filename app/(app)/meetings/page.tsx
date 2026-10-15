"use client"

import {
  useEffect,
  useState,
} from "react"

import Link from "next/link"

import {
  useRouter,
  useSearchParams,
} from "next/navigation"

import {
  AlertCircle,
  CalendarDays,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import {
  MeetingStatus,
  useMeetings,
} from "@/hooks/use-meetings"

import { cn } from "@/lib/utils"

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Textarea } from "@/components/ui/textarea"

type VendorOption = {
  id: string
  name: string
}

const STATUS_LABELS: Record<
  MeetingStatus,
  string
> = {
  scheduled:
    "Scheduled",

  completed:
    "Completed",

  cancelled:
    "Cancelled",
}

const STATUS_TONES: Record<
  MeetingStatus,
  string
> = {
  scheduled:
    "bg-secondary/10 text-secondary",

  completed:
    "bg-primary/10 text-primary",

  cancelled:
    "bg-muted text-muted-foreground",
}

type MeetingFormState = {
  vendorId: string
  title: string
  meetingType: string
  scheduledAt: string
  durationMinutes: string
  location: string
  meetingLink: string
  summary: string
  internalNotes: string
}

const initialMeetingForm: MeetingFormState = {
  vendorId: "",
  title: "",
  meetingType: "",
  scheduledAt: "",
  durationMinutes: "60",
  location: "",
  meetingLink: "",
  summary: "",
  internalNotes: "",
}

export default function MeetingsPage() {
  const router =
    useRouter()

  const searchParams =
    useSearchParams()

  // --------------------------------------------------
  // View
  // --------------------------------------------------

  const view =
    searchParams.get(
      "view"
    ) || "upcoming"

  const vendorId =
    searchParams.get(
      "vendorId"
    ) || "all"

  const date =
    searchParams.get(
      "date"
    ) || "all"

  const urlSearch =
    searchParams.get(
      "search"
    ) || ""

  const meetingType =
    searchParams.get(
      "meetingType"
    ) || ""

  // --------------------------------------------------
  // Local state
  // --------------------------------------------------

  const [
    search,
    setSearch,
  ] =
    useState(
      urlSearch
    )

  const [
    typeSearch,
    setTypeSearch,
  ] =
    useState(
      meetingType
    )

  const [
    vendors,
    setVendors,
  ] =
    useState<
      VendorOption[]
    >([])

  const [
    meetingDialogOpen,
    setMeetingDialogOpen,
  ] = useState(false)

  const [
    meetingForm,
    setMeetingForm,
  ] =
    useState<MeetingFormState>(
      initialMeetingForm
    )

  const [
    isCreatingMeeting,
    setIsCreatingMeeting,
  ] = useState(false)

  const [
    createMeetingError,
    setCreateMeetingError,
  ] =
    useState<string | null>(
      null
    )

  const rawPage = Number(searchParams.get("page") || 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1

  // --------------------------------------------------
  // Resolve filters for hook
  // --------------------------------------------------

  let meetingStatus:
    | string
    | undefined

  let meetingDate:
    | string
    | undefined

  if (
    view ===
    "upcoming"
  ) {
    meetingDate =
      "upcoming"
  }

  if (
    view ===
    "completed"
  ) {
    meetingStatus =
      "completed"
  }

  if (
    view ===
    "cancelled"
  ) {
    meetingStatus =
      "cancelled"
  }

  if (
    view ===
    "all"
  ) {
    meetingStatus =
      undefined

    meetingDate =
      date === "all"
        ? undefined
        : date
  }

  // --------------------------------------------------
  // Meetings
  // --------------------------------------------------

  const {
    meetings,
    count,
    summary,
    isLoading,
    error,
    refetch,
  } = useMeetings({
    status:
      meetingStatus,

    date:
      meetingDate,

    vendorId:
      vendorId ===
      "all"
        ? undefined
        : vendorId,

    meetingType:
      meetingType ||
      undefined,

    search:
      urlSearch ||
      undefined,

    page,
    pageSize: 25,
  })

  // --------------------------------------------------
  // Vendors
  // --------------------------------------------------

  useEffect(() => {
    const loadVendors =
      async () => {
        try {
          const response =
            await fetch(
              "/api/vendors?page=1&pageSize=100&sortBy=name&sortOrder=asc",
              {
                cache:
                  "no-store",
              }
            )

          const data =
            await response.json()

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ||
                "Failed to load vendors"
            )
          }

          setVendors(
            (
              data.vendors ||
              []
            ).map(
              (
                vendor: {
                  id: string
                  name: string
                }
              ) => ({
                id:
                  vendor.id,

                name:
                  vendor.name,
              })
            )
          )
        } catch (
          error
        ) {
          console.error(
            "LOAD MEETING VENDORS ERROR:",
            error
          )
        }
      }

    loadVendors()
  }, [])

  useEffect(() => {
    setSearch(
      urlSearch
    )

    setTypeSearch(
      meetingType
    )
  }, [
    urlSearch,
    meetingType,
  ])

  // --------------------------------------------------
  // URL helper
  // --------------------------------------------------

  const updateParams = (
    updates: Record<
      string,
      string | null
    >
  ) => {
    const params =
      new URLSearchParams(
        searchParams.toString()
      )

    Object.entries(
      updates
    ).forEach(
      ([
        key,
        value,
      ]) => {
        if (
          key ===
          "view"
        ) {
          if (
            !value ||
            value ===
              "upcoming"
          ) {
            params.delete(
              "view"
            )
          } else {
            params.set(
              "view",
              value
            )
          }

          return
        }

        if (
          !value ||
          value ===
            "all"
        ) {
          params.delete(
            key
          )
        } else {
          params.set(
            key,
            value
          )
        }
      }
    )

    if (!("page" in updates)) params.delete("page")

    const query =
      params.toString()

    router.push(
      query
        ? `/meetings?${query}`
        : "/meetings"
    )
  }

  const hasActiveFilters = view !== "upcoming" || vendorId !== "all" ||
    (view === "all" && date !== "all") || Boolean(urlSearch) || Boolean(meetingType)

  const clearFilters = () => {
    setSearch("")
    setTypeSearch("")
    router.push("/meetings")
  }

  const totalPages = Math.max(1, Math.ceil(count / 25))

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  const handleSearch =
    () => {
      updateParams({
        search:
          search.trim() ||
          null,

        meetingType:
          typeSearch.trim() ||
          null,
      })
    }

  const handleKeyDown =
    (
      event:
        React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (
        event.key ===
        "Enter"
      ) {
        handleSearch()
      }
    }

  // --------------------------------------------------
  // Formatting
  // --------------------------------------------------

  const formatDate =
    (
      value: string
    ) => {
      const date =
        new Date(
          value
        )

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
          weekday:
            "short",
          month:
            "short",
          day:
            "numeric",
          year:
            "numeric",
        }
      )
    }

  const formatTime =
    (
      value: string
    ) => {
      const date =
        new Date(
          value
        )

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
          hour:
            "numeric",
          minute:
            "2-digit",
        }
      )
    }

  const openNewMeeting =
    () => {
      setCreateMeetingError(
        null
      )

      setMeetingForm(
        initialMeetingForm
      )

      setMeetingDialogOpen(
        true
      )
    }

  const createMeeting =
    async () => {
      if (
        !meetingForm.vendorId
      ) {
        setCreateMeetingError(
          "Please select a vendor."
        )

        return
      }

      if (
        !meetingForm.title.trim()
      ) {
        setCreateMeetingError(
          "Meeting title is required."
        )

        return
      }

      if (
        !meetingForm.scheduledAt
      ) {
        setCreateMeetingError(
          "Meeting date and time are required."
        )

        return
      }

      const duration =
        meetingForm.durationMinutes
          ? Number(
              meetingForm.durationMinutes
            )
          : null

      if (
        duration !== null &&
        (
          !Number.isInteger(
            duration
          ) ||
          duration <= 0
        )
      ) {
        setCreateMeetingError(
          "Duration must be a positive whole number."
        )

        return
      }

      try {
        setIsCreatingMeeting(
          true
        )

        setCreateMeetingError(
          null
        )

        const response =
          await fetch(
            `/api/vendors/${meetingForm.vendorId}/meetings`,
            {
              method: "POST",

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
                    "scheduled",

                  scheduledAt:
                    meetingForm.scheduledAt,

                  durationMinutes:
                    duration,

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
              "Failed to create meeting"
          )
        }

        setMeetingDialogOpen(
          false
        )

        setMeetingForm(
          initialMeetingForm
        )

        await refetch()
      } catch (error) {
        setCreateMeetingError(
          error instanceof Error
            ? error.message
            : "Failed to create meeting"
        )
      } finally {
        setIsCreatingMeeting(
          false
        )
      }
    }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <>
      <div className="app-page space-y-5">

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" className="text-left" onClick={() => updateParams({ view: "upcoming", date: null })}>
            <Card
              className={cn(
                "app-surface h-full cursor-pointer transition-all duration-200",
                "hover:border-primary/40 hover:bg-primary/5 hover:shadow-md",
                view === "upcoming" &&
                  "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle><CalendarDays className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{summary.upcoming}</div><p className="mt-1 text-xs text-muted-foreground">Future scheduled meetings</p></CardContent>
            </Card>
          </button>
          <button type="button" className="text-left" onClick={() => updateParams({ view: "all", date: "next_7_days" })}>
            <Card
              className={cn(
                "app-surface h-full cursor-pointer transition-all duration-200",
                "hover:border-primary/40 hover:bg-primary/5 hover:shadow-md",
                view === "all" &&
                  date === "next_7_days" &&
                  "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Next 7 Days</CardTitle><Clock3 className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{summary.next7Days}</div><p className="mt-1 text-xs text-muted-foreground">Scheduled within the next 7 days</p></CardContent>
            </Card>
          </button>
          <Card className="app-surface"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Open Actions</CardTitle><AlertCircle className="h-4 w-4 text-warning" /></CardHeader><CardContent><div className="text-2xl font-bold text-warning">{summary.openActions}</div><p className="mt-1 text-xs text-muted-foreground">Across matching meetings</p></CardContent></Card>
          <Card className="app-surface"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">This Week</CardTitle><CalendarDays className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.thisWeek}</div><p className="mt-1 text-xs text-muted-foreground">Meetings this calendar week</p></CardContent></Card>
        </div>

        <Card className="app-surface">
          <CardHeader className="pb-4"><CardTitle>Meeting Schedule</CardTitle><CardDescription>Review upcoming and historical vendor meetings.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={view} onValueChange={value => updateParams({ view: value, date: null })}>
              <TabsList className="flex h-auto w-fit max-w-full flex-wrap">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-col gap-3 border-y py-4 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder="Search meetings or vendors..." className="pl-9" /></div>
                <Button variant="outline" onClick={handleSearch}>Search</Button>
              </div>
              <Select value={vendorId} onValueChange={value => updateParams({ vendorId: value })}>
                <SelectTrigger className="w-full lg:w-[190px]"><SelectValue placeholder="All vendors" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Vendors</SelectItem>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={view === "all" ? date : "all"} onValueChange={value => updateParams({ date: value })} disabled={view !== "all"}>
                <SelectTrigger className="w-full lg:w-[175px]"><SelectValue placeholder="All dates" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Dates</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="next_7_days">Next 7 Days</SelectItem><SelectItem value="next_30_days">Next 30 Days</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="past">Past</SelectItem></SelectContent>
              </Select>
              <Input value={typeSearch} onChange={e => setTypeSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder="Meeting type" className="w-full lg:w-[170px]" />
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><RotateCcw className="mr-2 h-4 w-4" />Clear</Button>}
            </div>
            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="ml-3 text-sm text-muted-foreground">Loading meetings...</span></div>
            ) : meetings.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 font-semibold">{hasActiveFilters ? "No matching meetings" : "No upcoming meetings"}</h3><p className="mt-1 text-sm text-muted-foreground">{hasActiveFilters ? "Try changing or clearing your filters." : "Schedule a meeting to get started."}</p><div className="mt-4 flex justify-center gap-2">{hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>}<Button size="sm" onClick={openNewMeeting}><Plus className="mr-2 h-4 w-4" />New Meeting</Button></div></div>
            ) : (
              <div className="space-y-3">{meetings.map(meeting => {
                const when = new Date(meeting.scheduledAt)
                const valid = !Number.isNaN(when.getTime())
                const day = valid ? when.toLocaleDateString("en-US", { day: "numeric" }) : "—"
                const month = valid ? when.toLocaleDateString("en-US", { month: "short" }) : "—"
                const today = new Date(); today.setHours(0,0,0,0)
                const meetingDay = new Date(when); meetingDay.setHours(0,0,0,0)
                const dayDiff = valid ? Math.round((meetingDay.getTime()-today.getTime()) / 86400000) : null
                const relative = dayDiff === 0 ? "Today" : dayDiff === 1 ? "Tomorrow" : dayDiff !== null && dayDiff > 1 && dayDiff <= 7 ? `In ${dayDiff} days` : null
                return <div key={meeting.id} className="rounded-xl border bg-card p-4 transition-all hover:bg-muted/20 hover:shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary/10 text-secondary"><span className="text-xs font-semibold uppercase">{month}</span><span className="text-xl font-bold leading-none">{day}</span></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{meeting.title}</h3><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONES[meeting.status])}>{STATUS_LABELS[meeting.status]}</span>{meeting.meetingType && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{meeting.meetingType}</span>}</div>
                        <Link href={`/vendors/view/${meeting.vendorId}`} className="mt-1 inline-flex items-center gap-2 text-sm font-medium hover:underline"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meeting.vendorColor || "hsl(var(--muted-foreground))" }} />{meeting.vendorName}</Link>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(meeting.scheduledAt)}{relative && meeting.status === "scheduled" && <span className="font-medium text-primary">· {relative}</span>}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTime(meeting.scheduledAt)}</span>{meeting.durationMinutes && <span>{meeting.durationMinutes} min</span>}{meeting.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{meeting.location}</span>}</div>
                        <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{meeting.agendaItemCount} agenda items</span><span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{meeting.actionItemCount} action items</span>{meeting.openActionItemCount > 0 && <span className="rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning">{meeting.openActionItemCount} open</span>}</div>
                        {meeting.summary && <p className="mt-3 line-clamp-2 max-w-3xl text-sm text-muted-foreground">{meeting.summary}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">{meeting.meetingLink && meeting.status === "scheduled" && <Button variant="outline" size="sm" asChild><a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Join</a></Button>}<Button variant="outline" size="sm" asChild><Link href={`/vendors/view/${meeting.vendorId}`}>View Vendor</Link></Button></div>
                  </div>
                </div>
              })}</div>
            )}
            {!isLoading && count > 0 && <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Showing {Math.min((page - 1) * 25 + 1, count)}–{Math.min(page * 25, count)} of {count} meetings</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="text-xs">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}
          </CardContent>
        </Card>
      </div>
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
              New Meeting
            </DialogTitle>

            <DialogDescription>
              Schedule a new meeting with one of your vendors.
            </DialogDescription>
          </DialogHeader>

          {createMeetingError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />

              <AlertDescription>
                {
                  createMeetingError
                }
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 py-2 md:grid-cols-2">

            {/* Vendor */}

            <div className="space-y-2 md:col-span-2">
              <Label>
                Vendor
              </Label>

              <Select
                value={
                  meetingForm.vendorId
                }
                onValueChange={(
                  value
                ) =>
                  setMeetingForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      vendorId:
                        value,
                    })
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>

                <SelectContent>
                  {vendors.map(
                    (
                      vendor
                    ) => (
                      <SelectItem
                        key={
                          vendor.id
                        }
                        value={
                          vendor.id
                        }
                      >
                        {
                          vendor.name
                        }
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}

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
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Quarterly Business Review"
              />
            </div>

            {/* Meeting Type */}

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
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="QBR, Operations Review..."
              />
            </div>

            {/* Date */}

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
                        event.target
                          .value,
                    })
                  )
                }
              />
            </div>

            {/* Duration */}

            <div className="space-y-2">
              <Label>
                Duration (minutes)
              </Label>

              <Input
                type="number"
                min="1"
                step="1"
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
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="60"
              />
            </div>

            {/* Location */}

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
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Conference Room A"
              />
            </div>

            {/* Meeting Link */}

            <div className="space-y-2 md:col-span-2">
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
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="https://teams.microsoft.com/..."
              />
            </div>

            {/* Summary */}

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
                        event.target
                          .value,
                    })
                  )
                }
                rows={3}
                placeholder="Purpose or summary of the meeting..."
              />
            </div>

            {/* Internal Notes */}

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
                        event.target
                          .value,
                    })
                  )
                }
                rows={3}
                placeholder="Internal notes not intended for the vendor..."
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
                isCreatingMeeting
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                createMeeting
              }
              disabled={
                isCreatingMeeting
              }
            >
              {isCreatingMeeting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}

              Create Meeting
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  )
}