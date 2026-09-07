"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Clock, CheckCircle, AlertCircle, Search, MessageSquare, Upload, Loader2, RefreshCw } from "lucide-react"
import { AttributeBadge } from "@/components/ui/attributesBadge"
import { useAuth } from "@/hooks/useAuth"  
import type { AttributeValue } from "@/components/ui/attributesBadge"

interface ActivityItem {
  id: string
  type: "claim_created" | "claim_updated" | "letter_generated" | "note_added" | "status_changed" | "document_uploaded"
  title: string
  description: string
  timestamp: string
  claimId?: string
  claimTitle?: string
  status?: string
  priority?: string
  user?: {
    name: string
    email: string
  }
}

interface LoadingState {
  activities: boolean
  user: boolean
}

const activityIcons = {
  claim_created: FileText,
  claim_updated: AlertCircle,
  letter_generated: MessageSquare,
  note_added: MessageSquare,
  status_changed: CheckCircle,
  document_uploaded: Upload,
}

const activityColors = {
  claim_created: "text-secondary-light bg-secondary-light/15",
  claim_updated: "text-warning bg-warning/15",
  letter_generated: "text-primary bg-primary/15",
  note_added: "text-approved bg-approved/15",
  status_changed: "text-primary bg-primary/15",
  document_uploaded: "text-muted-foreground bg-muted",
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState<LoadingState>({
    activities: true,
    user: true
  })
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [timeFilter, setTimeFilter] = useState("all")
  const [retryCount, setRetryCount] = useState(0)
  
  const { user, loading: authLoading } = useAuth()

  const fetchActivities = async (isRetry = false) => {
    try {
      if (isRetry) {
        setError(null)
        setLoading({
          activities: true,
          user: false,
        })
      }

      if (!user) {
        throw new Error("Authentication failed - please log in again")
      }

      const res = await fetch("/api/activity")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load activity")
      }

      const activityItems: ActivityItem[] = []

      data.claims.forEach((claim: any) => {
        activityItems.push({
          id: `claim_created_${claim.id}`,
          type: "claim_created",
          title: "Claim Created",
          description: `New claim created for ${claim.first_name} ${claim.last_name} (${claim.claim_id})`,
          timestamp: claim.created_at,
          claimId: claim.id,
          claimTitle: `${claim.first_name} ${claim.last_name} - ${claim.claim_id}`,
          status: claim.status,
          priority: claim.priority,
        })
      })

      data.letters.forEach((letter: any) => {
        activityItems.push({
          id: `letter_${letter.id}`,
          type: "letter_generated",
          title: "Appeal Letter Generated",
          description: `Letter generated for claim ${letter.claim_id}`,
          timestamp: letter.generated_at,
          claimId: letter.claim_id,
          status: letter.status,
        })
      })

      data.notes.forEach((note: any) => {
        activityItems.push({
          id: `note_${note.id}`,
          type: "note_added",
          title: "Note Added",
          description: note.note,
          timestamp: note.created_at,
          claimId: note.claim_id,
        })
      })

      activityItems.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setActivities(activityItems)
      setLoading(prev => ({ ...prev, activities: false }))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unexpected error")
      setLoading({
        activities: false,
        user: false,
      })
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    fetchActivities(true)
  }

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.claimTitle?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === "all" || activity.type === filterType

    const now = new Date()
    const activityDate = new Date(activity.timestamp)
    let matchesTime = true

    switch (timeFilter) {
      case "today":
        matchesTime = activityDate.toDateString() === now.toDateString()
        break
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesTime = activityDate >= weekAgo
        break
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        matchesTime = activityDate >= monthAgo
        break
    }

    return matchesSearch && matchesType && matchesTime
  })

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`
    } else if (diffInHours < 168) {
      // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days} day${days !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }
  }

  // Full page loading (initial load)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    )
  }

  // Error state with retry option
  if (error && !loading.activities) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="ml-4"
            >
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
      <Card className="app-surface">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="claim_created">Claims Created</SelectItem>
                <SelectItem value="status_changed">Status Changes</SelectItem>
                <SelectItem value="letter_generated">Letters Generated</SelectItem>
                <SelectItem value="note_added">Notes Added</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card className="app-surface">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>{filteredActivities.length} activities found</CardDescription>
          </div>
          {loading.activities && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {loading.activities ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activities found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const Icon = activityIcons[activity.type]
                const colorClass = activityColors[activity.type]

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{activity.title}</h4>
                        {activity.status && (
                          activity.type === 'letter_generated' ? (
                            <AttributeBadge attribute="letterStatus" value={activity.status as AttributeValue<"letterStatus">}/>
                          ) : (
                            <AttributeBadge attribute="status" value={activity.status as AttributeValue<"status">}/>
                          )
                        )}
                        {activity.priority && (
                          <AttributeBadge attribute="priority" value={activity.priority as AttributeValue<"priority">}/>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(activity.timestamp)}
                        </span>
                        {activity.claimTitle && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {activity.claimTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {activity.claimId && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/claims/view/${activity.claimId}`}>View Claim</Link>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
