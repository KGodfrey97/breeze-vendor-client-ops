"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { Database } from "@/lib/db-types"
import { AlertCircle, Clock, HelpCircle, Loader2, MessageSquare, RefreshCw, Search } from "lucide-react"
import { AttributeBadge } from "@/components/ui/attributesBadge"
import type { AttributeValue } from "@/components/ui/attributesBadge"

interface Faq {
  id: string
  question: string
  answer: string
  category: string | null
  tags: string[] | null
}

interface SupportTicket {
  id: string
  ticket_id: string
  subject: string
  category: string | null
  priority: string
  status: string
  created_at: string
  updated_at: string
}

interface LoadingState {
  tickets: boolean
  faqs: boolean
  user: boolean
}

const TICKET_CATEGORIES = [
  { value: "technical", label: "Technical Issue" },
  { value: "billing", label: "Billing Question" },
  { value: "feature", label: "Feature Request" },
  { value: "general", label: "General Question" },
]

const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const

const initialTicketForm = {
  subject: "",
  category: "",
  priority: "normal",
  description: "",
}

function generateTicketNumber() {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `TICK-${timestamp}${random}`.slice(0, 20)
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatLabel(value: string | null) {
  if (!value) {
    return "Unknown"
  }

  return value
    .split("_")
    .map((part) => part.toUpperCase())
    .join(" ")
}

export default function SupportPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [ticketForm, setTicketForm] = useState(initialTicketForm)
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState<LoadingState>({
    faqs: true,
    tickets: true,
    user: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitSuccessTicketId, setSubmitSuccessTicketId] = useState<string | null>(null)

  const categories = [
    "all",
    ...Array.from(new Set(faqs.map((item) => item.category).filter((category): category is string => Boolean(category)))).sort(),
  ]

  const filteredFAQs = faqs.filter((item) => {
    const normalizedSearch = searchTerm.toLowerCase()
    const matchesTags = item.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ?? false
    const matchesSearch =
      item.question.toLowerCase().includes(normalizedSearch) ||
      item.answer.toLowerCase().includes(normalizedSearch) ||
      matchesTags
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const fetchSupportData = async () => {
    try {
      setLoading({
        faqs: true,
        tickets: true,
        user: true,
      })

      const response = await fetch("/api/support")

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error)
      }

      setFaqs(payload.faqs)
      setSupportTickets(payload.tickets)

      setError(null)

      setLoading({
        faqs: false,
        tickets: false,
        user: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support data")

      setLoading({
        faqs: false,
        tickets: false,
        user: false,
      })
    }
  }

  useEffect(() => {
    fetchSupportData()
  }, [])

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)
    setSubmitSuccessTicketId(null)
    setError(null)

    try {
      const ticketNumber = generateTicketNumber()
      
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: generateTicketNumber(),
          subject: ticketForm.subject.trim(),
          category: ticketForm.category,
          priority: ticketForm.priority,
          description: ticketForm.description.trim(),
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error)
      }

      setSupportTickets((prev) => [payload.ticket, ...prev])
      setTicketForm(initialTicketForm)
      setSubmitSuccessTicketId(payload.ticket.ticket_id)
      setTimeout(() => setSubmitSuccessTicketId(null), 3000)
    } catch (submitError) {
      console.error("Error submitting ticket:", submitError)
      setError(submitError instanceof Error ? submitError.message : "Failed to submit ticket. Please try again.")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    fetchSupportData()
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "open":
        return "bg-warning/15 text-warning"
      case "resolved":
        return "bg-primary/15 text-primary"
      case "closed":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-secondary-light/15 text-secondary-light"
    }
  }

  if (loading.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading support...</p>
        </div>
      </div>
    )
  }

  if (error && !loading.tickets && !loading.faqs && supportTickets.length === 0 && faqs.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={handleRetry} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="app-page">

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={handleRetry} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {submitSuccessTicketId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your support ticket {submitSuccessTicketId} has been submitted successfully. We&apos;ll get back to you soon.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="faq" className="space-y-4">
        <TabsList>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="new_ticket">Submit Ticket</TabsTrigger>
          <TabsTrigger value="my_tickets">My Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          <Card className="app-surface">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search frequently asked questions..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category === "all" ? "All Categories" : category}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {loading.faqs ? (
              [...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))
            ) : filteredFAQs.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No FAQ items found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or category filter</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredFAQs.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.question}</CardTitle>
                      {item.category ? <Badge variant="outline">{item.category}</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.answer}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="new_ticket" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="app-surface">
              <CardHeader>
                <CardTitle>Submit Support Ticket</CardTitle>
                <CardDescription>Describe your issue and we&apos;ll get back to you</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      required
                      disabled={submitLoading}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md disabled:opacity-50"
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      required
                      disabled={submitLoading}
                    >
                      <option value="">Select a category</option>
                      {TICKET_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md disabled:opacity-50"
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      disabled={submitLoading}
                    >
                      {TICKET_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {formatLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      placeholder="Please provide detailed information about your issue..."
                      rows={4}
                      required
                      disabled={submitLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitLoading}>
                    {submitLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Ticket"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my_tickets" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle>My Support Tickets</CardTitle>
              <CardDescription>Track the status of your support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.tickets ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : supportTickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No support tickets found</p>
                  <p className="text-sm text-muted-foreground">Submit a ticket if you need help</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{ticket.ticket_id}</span>
                          <Badge variant="outline" className={getStatusColor(ticket.status)}>{formatLabel(ticket.status)}</Badge>
                          {ticket.priority && (
                            <AttributeBadge attribute="priority" value={ticket.priority as AttributeValue<"priority">} />
                          )}
                          {ticket.category ? <Badge variant="outline">{formatLabel(ticket.category)}</Badge> : null}
                        </div>
                      </div>
                      <h4 className="font-medium mb-2">{ticket.subject}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created: {formatDate(ticket.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Updated: {formatDate(ticket.updated_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
