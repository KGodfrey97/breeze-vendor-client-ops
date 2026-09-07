"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { Database, Json } from "@/lib/db-types"
import { useAuth } from "@/hooks/useAuth"  
import {
  AlertCircle,
  CheckCircle2,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Users,
} from "lucide-react"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
type FaqRow = Database["public"]["Tables"]["faqs"]["Row"]
type SupportTicketRow = Database["public"]["Tables"]["support_tickets"]["Row"]
type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]

type UserRole = "admin" | "provider" | "staff"

type FaqFormState = {
  id: string | null
  question: string
  answer: string
  category: string
  tags: string
  is_active: boolean
}

type AdminSystemConfig = {
  maintenanceMode: boolean
  registrationsOpen: boolean
  supportAutoAssignment: boolean
  aiLetterGenerationEnabled: boolean
  releaseChannel: string
  statusBanner: string
}

type AdminComplianceConfig = {
  requireTwoFactorForAdmins: boolean
  passwordRotationDays: number
  auditRetentionDays: number
  allowPiiExports: boolean
  complianceContact: string
  incidentResponseNotes: string
}

const ADMIN_SYSTEM_CONFIG_KEY = "admin_system_config"
const ADMIN_COMPLIANCE_CONFIG_KEY = "admin_security_compliance"

const defaultFaqForm: FaqFormState = {
  id: null,
  question: "",
  answer: "",
  category: "",
  tags: "",
  is_active: true,
}

const defaultSystemConfig: AdminSystemConfig = {
  maintenanceMode: false,
  registrationsOpen: true,
  supportAutoAssignment: true,
  aiLetterGenerationEnabled: true,
  releaseChannel: "stable",
  statusBanner: "",
}

const defaultComplianceConfig: AdminComplianceConfig = {
  requireTwoFactorForAdmins: true,
  passwordRotationDays: 90,
  auditRetentionDays: 365,
  allowPiiExports: false,
  complianceContact: "",
  incidentResponseNotes: "",
}

function formatDate(value: string | null) {
  if (!value) return "N/A"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatLabel(value: string | null) {
  if (!value) return "Unknown"
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function readObjectSetting<T extends Record<string, unknown>>(setting: UserSettingsRow | undefined, fallback: T): T {
  if (!setting || typeof setting.setting_value !== "object" || setting.setting_value === null || Array.isArray(setting.setting_value)) {
    return fallback
  }

  return {
    ...fallback,
    ...(setting.setting_value as Partial<T>),
  }
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [faqs, setFaqs] = useState<FaqRow[]>([])
  const [tickets, setTickets] = useState<SupportTicketRow[]>([])
  const [faqForm, setFaqForm] = useState<FaqFormState>(defaultFaqForm)
  const [systemConfig, setSystemConfig] = useState<AdminSystemConfig>(defaultSystemConfig)
  const [complianceConfig, setComplianceConfig] = useState<AdminComplianceConfig>(defaultComplianceConfig)
  const [userSearch, setUserSearch] = useState("")
  const [faqSearch, setFaqSearch] = useState("")
  const [ticketSearch, setTicketSearch] = useState("")
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null)
  const [faqSaving, setFaqSaving] = useState(false)
  const [ticketSavingId, setTicketSavingId] = useState<string | null>(null)
  const [configSaving, setConfigSaving] = useState<"system" | "compliance" | null>(null)

  const { user, loading: authLoading } = useAuth()

  const loadAdminData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!loading && !user) {
        throw new Error("Authentication failed - please log in again")
      }

      const res = await fetch("/api/admin")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load admin data")
      }

      setProfiles(data.profiles || [])
      setFaqs(data.faqs || [])
      setTickets(data.tickets || [])

      const settingsByKey = new Map((data.settings || []).map((item) => [item.setting_key, item]))
      setSystemConfig(readObjectSetting(settingsByKey.get(ADMIN_SYSTEM_CONFIG_KEY), defaultSystemConfig))
      setComplianceConfig(readObjectSetting(settingsByKey.get(ADMIN_COMPLIANCE_CONFIG_KEY), defaultComplianceConfig))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admin workspace.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = userSearch.toLowerCase()
    return profiles.filter((profile) => {
      if (!normalizedSearch) return true
      return [profile.full_name, profile.email, profile.organization, profile.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    })
  }, [profiles, userSearch])

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = faqSearch.toLowerCase()
    return faqs.filter((faq) => {
      if (!normalizedSearch) return true
      return (
        faq.question.toLowerCase().includes(normalizedSearch) ||
        faq.answer.toLowerCase().includes(normalizedSearch) ||
        (faq.category || "").toLowerCase().includes(normalizedSearch) ||
        (faq.tags || []).some((tag) => tag.toLowerCase().includes(normalizedSearch))
      )
    })
  }, [faqs, faqSearch])

  const filteredTickets = useMemo(() => {
    const normalizedSearch = ticketSearch.toLowerCase()
    return tickets.filter((ticket) => {
      if (!normalizedSearch) return true
      return [ticket.ticket_id, ticket.subject, ticket.status, ticket.priority, ticket.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    })
  }, [tickets, ticketSearch])

  const adminMetrics = useMemo(() => {
    const adminCount = profiles.filter((profile) => profile.role === "admin").length
    const openTickets = tickets.filter((ticket) => ticket.status === "open").length
    const staleTickets = tickets.filter((ticket) => {
      if (!ticket.updated_at) return false
      const updatedAt = new Date(ticket.updated_at)
      return Date.now() - updatedAt.getTime() > 1000 * 60 * 60 * 24 * 3
    }).length

    return {
      totalUsers: profiles.length,
      adminCount,
      faqCount: faqs.length,
      activeFaqCount: faqs.filter((faq) => faq.is_active).length,
      openTickets,
      staleTickets,
    }
  }, [profiles, faqs, tickets])

  const handleRoleUpdate = async (profileId: string, role: UserRole) => {
    try {
      setRoleSavingId(profileId)
      setMessage(null)

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId,
          role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role")
      }

      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === profileId
            ? { ...profile, role }
            : profile
        )
      )

      setMessage({
        type: "success",
        text: "User role updated.",
      })
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update role",
      })
    } finally {
      setRoleSavingId(null)
    }
  }

  const handleFaqEdit = (faq: FaqRow) => {
    setFaqForm({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "",
      tags: (faq.tags || []).join(", "),
      is_active: faq.is_active ?? true,
    })
  }

  const handleFaqReset = () => {
    setFaqForm(defaultFaqForm)
  }

  const handleFaqSave = async () => {
    try {
      setFaqSaving(true)
      setMessage(null)

      const payload = {
        id: faqForm.id,
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: faqForm.category.trim() || null,
        tags: faqForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_active: faqForm.is_active,
      }

      const res = await fetch("/api/admin/faqs", {
        method: faqForm.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      if (faqForm.id) {
        setFaqs((prev) =>
          prev.map((faq) =>
            faq.id === data.faq.id ? data.faq : faq
          )
        )

        setMessage({
          type: "success",
          text: "FAQ updated.",
        })
      } else {
        setFaqs((prev) => [data.faq, ...prev])

        setMessage({
          type: "success",
          text: "FAQ created.",
        })
      }

      handleFaqReset()
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save FAQ",
      })
    } finally {
      setFaqSaving(false)
    }
  }

  const handleTicketUpdate = async (
    ticketId: string,
    patch: Partial<SupportTicketRow>
  ) => {
    try {
      setTicketSavingId(ticketId)
      setMessage(null)

      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          ...patch,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === data.ticket.id
            ? data.ticket
            : ticket
        )
      )

      setMessage({
        type: "success",
        text: `Ticket ${data.ticket.ticket_id} updated.`,
      })
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update ticket",
      })
    } finally {
      setTicketSavingId(null)
    }
  }

  const handleConfigSave = async (
    key: "system" | "compliance"
  ) => {
    try {
      setConfigSaving(key)
      setMessage(null)

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settingKey:
            key === "system"
              ? ADMIN_SYSTEM_CONFIG_KEY
              : ADMIN_COMPLIANCE_CONFIG_KEY,

          settingValue:
            key === "system"
              ? systemConfig
              : complianceConfig,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setMessage({
        type: "success",
        text:
          key === "system"
            ? "System configuration saved."
            : "Compliance configuration saved.",
      })
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save configuration",
      })
    } finally {
      setConfigSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading admin...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRole="admin">

      <div className="app-page">

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}  

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto flex-wrap rounded-lg border border-border bg-card p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="system">System Config</TabsTrigger>
            <TabsTrigger value="compliance">Security & Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="app-surface">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 text-secondary-light" />
                    Operations Queue
                  </CardTitle>
                  <CardDescription>Immediate issues and backlog indicators for admins.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
                    <p className="text-sm font-semibold text-foreground">Support backlog</p>
                    <p className="mt-1 text-sm text-muted-foreground">{adminMetrics.openTickets} tickets are open and {adminMetrics.staleTickets} have not moved in 3+ days.</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/50 p-4">
                    <p className="text-sm font-semibold text-foreground">Knowledge base health</p>
                    <p className="mt-1 text-sm text-muted-foreground">{adminMetrics.activeFaqCount} FAQs are active. Review inactive entries to decide whether to retire or refresh them.</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <p className="text-sm font-semibold text-foreground">Access control</p>
                    <p className="mt-1 text-sm text-muted-foreground">{adminMetrics.adminCount} users hold admin access. Validate this list regularly as part of quarterly access reviews.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="app-surface">
                <CardHeader>
                  <CardTitle>Platform Posture</CardTitle>
                  <CardDescription>Current workspace controls configured by admins.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <OverviewRow label="Maintenance mode" value={systemConfig.maintenanceMode ? "Enabled" : "Disabled"} />
                  <OverviewRow label="Registrations" value={systemConfig.registrationsOpen ? "Open" : "Closed"} />
                  <OverviewRow label="Auto-assign support" value={systemConfig.supportAutoAssignment ? "Enabled" : "Disabled"} />
                  <OverviewRow label="AI letter generation" value={systemConfig.aiLetterGenerationEnabled ? "Enabled" : "Disabled"} />
                  <OverviewRow label="Release channel" value={formatLabel(systemConfig.releaseChannel)} />
                  <OverviewRow
                    label="Admin 2FA requirement"
                    value={complianceConfig.requireTwoFactorForAdmins ? "Required" : "Optional"}
                  />
                  <OverviewRow label="PII exports" value={complianceConfig.allowPiiExports ? "Allowed" : "Restricted"} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card className="app-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary-light" />
                  User & Role Management
                </CardTitle>
                <CardDescription>Search users and update access levels directly from the profile registry.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name, email, organization, or role"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{profile.full_name || "Unnamed user"}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{profile.organization || "-"}</TableCell>
                        <TableCell>{formatDate(profile.created_at)}</TableCell>
                        <TableCell>
                          <Select
                            value={(profile.role || "staff") as UserRole}
                            onValueChange={(value) => handleRoleUpdate(profile.id, value as UserRole)}
                            disabled={roleSavingId === profile.id}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="provider">Provider</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faqs">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="app-surface">
                <CardHeader>
                  <CardTitle>FAQ Management</CardTitle>
                  <CardDescription>Edit the public help library and control which entries stay active.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search FAQ question, answer, category, or tags"
                      value={faqSearch}
                      onChange={(event) => setFaqSearch(event.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    {filteredFaqs.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => handleFaqEdit(faq)}
                        className="w-full rounded-lg border border-border bg-muted p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{faq.question}</p>
                          <Badge variant={faq.is_active ? "default" : "outline"}>{faq.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{faq.category || "Uncategorized"}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="app-surface">
                <CardHeader>
                  <CardTitle>{faqForm.id ? "Edit FAQ" : "Create FAQ"}</CardTitle>
                  <CardDescription>Keep FAQ content concise, searchable, and current.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Question</label>
                    <Input value={faqForm.question} onChange={(event) => setFaqForm((prev) => ({ ...prev, question: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Answer</label>
                    <Textarea
                      rows={6}
                      value={faqForm.answer}
                      onChange={(event) => setFaqForm((prev) => ({ ...prev, answer: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Input value={faqForm.category} onChange={(event) => setFaqForm((prev) => ({ ...prev, category: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tags</label>
                      <Input
                        placeholder="comma, separated, tags"
                        value={faqForm.tags}
                        onChange={(event) => setFaqForm((prev) => ({ ...prev, tags: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-4">
                    <div>
                      <p className="font-medium text-foreground">Active entry</p>
                      <p className="text-sm text-muted-foreground">Inactive FAQs stay in the admin library but disappear from the public help center.</p>
                    </div>
                    <Switch checked={faqForm.is_active} onCheckedChange={(checked) => setFaqForm((prev) => ({ ...prev, is_active: checked }))} />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleFaqSave} disabled={faqSaving}>
                      {faqSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save FAQ
                    </Button>
                    <Button variant="outline" onClick={handleFaqReset}>
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tickets">
            <Card className="app-surface">
              <CardHeader>
                <CardTitle>Support Ticket Management</CardTitle>
                <CardDescription>Search ticket volume and update operational triage values in place.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by ticket id, subject, status, priority, or category"
                    value={ticketSearch}
                    onChange={(event) => setTicketSearch(event.target.value)}
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{ticket.ticket_id}</p>
                            <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status || "open"}
                            onValueChange={(value) => handleTicketUpdate(ticket.id, { status: value })}
                            disabled={ticketSavingId === ticket.id}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.priority || "normal"}
                            onValueChange={(value) => handleTicketUpdate(ticket.id, { priority: value })}
                            disabled={ticketSavingId === ticket.id}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{formatLabel(ticket.category)}</TableCell>
                        <TableCell>{formatDate(ticket.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card className="app-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-secondary-light" />
                  System Configuration
                </CardTitle>
                <CardDescription>Admin-managed workspace controls for release posture and service operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ConfigSwitch
                  title="Maintenance mode"
                  description="Temporarily freeze normal user operations while planned work is in progress."
                  checked={systemConfig.maintenanceMode}
                  onCheckedChange={(checked) => setSystemConfig((prev) => ({ ...prev, maintenanceMode: checked }))}
                />
                <ConfigSwitch
                  title="Open self-service registrations"
                  description="Allow new users to register without manual onboarding intervention."
                  checked={systemConfig.registrationsOpen}
                  onCheckedChange={(checked) => setSystemConfig((prev) => ({ ...prev, registrationsOpen: checked }))}
                />
                <ConfigSwitch
                  title="Support auto-assignment"
                  description="Automatically route new tickets into the active support workflow."
                  checked={systemConfig.supportAutoAssignment}
                  onCheckedChange={(checked) => setSystemConfig((prev) => ({ ...prev, supportAutoAssignment: checked }))}
                />
                <ConfigSwitch
                  title="AI letter generation"
                  description="Enable or pause automated appeal-letter generation across the workspace."
                  checked={systemConfig.aiLetterGenerationEnabled}
                  onCheckedChange={(checked) => setSystemConfig((prev) => ({ ...prev, aiLetterGenerationEnabled: checked }))}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Release channel</label>
                    <Select
                      value={systemConfig.releaseChannel}
                      onValueChange={(value) => setSystemConfig((prev) => ({ ...prev, releaseChannel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stable">Stable</SelectItem>
                        <SelectItem value="staged">Staged</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status banner</label>
                    <Input
                      placeholder="Optional banner message for admins"
                      value={systemConfig.statusBanner}
                      onChange={(event) => setSystemConfig((prev) => ({ ...prev, statusBanner: event.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={() => handleConfigSave("system")} disabled={configSaving === "system"}>
                  {configSaving === "system" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save System Config
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card className="app-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-secondary-light" />
                  Security & Compliance
                </CardTitle>
                <CardDescription>Track administrative security expectations and core compliance guardrails.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ConfigSwitch
                  title="Require 2FA for admins"
                  description="Enforce stronger sign-in controls for privileged users."
                  checked={complianceConfig.requireTwoFactorForAdmins}
                  onCheckedChange={(checked) => setComplianceConfig((prev) => ({ ...prev, requireTwoFactorForAdmins: checked }))}
                />
                <ConfigSwitch
                  title="Allow PII exports"
                  description="Permit exporting sensitive claim and patient data from administrative workflows."
                  checked={complianceConfig.allowPiiExports}
                  onCheckedChange={(checked) => setComplianceConfig((prev) => ({ ...prev, allowPiiExports: checked }))}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password rotation (days)</label>
                    <Input
                      type="number"
                      min={30}
                      value={complianceConfig.passwordRotationDays}
                      onChange={(event) =>
                        setComplianceConfig((prev) => ({ ...prev, passwordRotationDays: Number(event.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audit retention (days)</label>
                    <Input
                      type="number"
                      min={30}
                      value={complianceConfig.auditRetentionDays}
                      onChange={(event) =>
                        setComplianceConfig((prev) => ({ ...prev, auditRetentionDays: Number(event.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Compliance contact</label>
                  <Input
                    placeholder="security@organization.com"
                    value={complianceConfig.complianceContact}
                    onChange={(event) => setComplianceConfig((prev) => ({ ...prev, complianceContact: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Incident response notes</label>
                  <Textarea
                    rows={5}
                    value={complianceConfig.incidentResponseNotes}
                    onChange={(event) =>
                      setComplianceConfig((prev) => ({ ...prev, incidentResponseNotes: event.target.value }))
                    }
                  />
                </div>
                <Button onClick={() => handleConfigSave("compliance")} disabled={configSaving === "compliance"}>
                  {configSaving === "compliance" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Compliance Config
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function ConfigSwitch({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-4">
      <div className="pr-4">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
