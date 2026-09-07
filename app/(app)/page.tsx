"use client"

import { useEffect, useState } from "react"
import CountUp from "react-countup"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { CheckCircle2, Clock, DollarSign, FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Overview } from "@/components/overview"
import { RecentClaims } from "@/components/recent-claims"
import { StatusDistribution } from "@/components/status-distribution"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Database } from "@/lib/db-types"
import { useRouter } from "next/navigation";

type ClaimWithRelations = Database["public"]["Tables"]["claims"]["Row"] & {
  id: string
  claim_id?: string | null
  original_claim_amount?: number | null

  status?: string | null
  priority?: string | null
  appeal_type?: string | null
  letter_status?: string | null

  created_at?: string | null
  updated_at?: string | null

  patients?: {
    first_name: string | null
    last_name: string | null
  } | null

  profiles?: {
    full_name: string | null
    organization: string | null
  } | null
}

interface DashboardStats {
  totalClaims: number
  successRate: number
  processingClaims: number
  recoveredRevenue: number
  statusCounts: Array<{ status: string; count: number }>
}

interface LoadingState {
  stats: boolean
  followUpClaims: boolean
  user: boolean
}

interface Claim {
  status: string | null
  original_claim_amount: number | null
  created_at: string | null
}


interface ChartData {
  name: string
  submitted: number
  overturned: number
  denied: number
}

interface PerformanceRowProps {
  label: string
  value: number
}

export default function DashboardPage() {
  console.log("Dashboard mounted");

  const { user, loading: authLoading, error: authError, initialized } = useAuth()

  console.log({
    user,
    authLoading,
    authError,
    initialized,
  });
  
  const router = useRouter();

  useEffect(() => {
    if (initialized && !authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [initialized, authLoading, user]);

  const [chartData, setChartData] = useState<ChartData[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [followUpClaims, setFollowUpClaims] = useState<ClaimWithRelations[]>([])
  const [timeRange, setTimeRange] = useState("all")
  const [loading, setLoading] = useState<LoadingState>({
    stats: true,
    followUpClaims: true,
    user: true
  })
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const fetchDashboardData = async (isRetry = false) => {
    try {
      if (isRetry) {
        setError(null)
        setLoading({
          stats: true,
          followUpClaims: true,
          user: false
        })
      }


      const response = await fetch(`/api/dashboard?timeRange=${encodeURIComponent(timeRange)}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load dashboard data")
      }

      setStats(payload.stats)
      setChartData(payload.chartData)
      setLoading(prev => ({ ...prev, stats: false }))
      setFollowUpClaims((payload.followUpClaims || []) as ClaimWithRelations[])
      setLoading(prev => ({ ...prev, followUpClaims: false }))
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
      setLoading({
        stats: false,
        followUpClaims: false,
        user: false
      })
    }
  }

  useEffect(() => {
    if (!initialized || authLoading) return;
    if (!user) return;

    fetchDashboardData();
  }, [initialized, authLoading, user, timeRange]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    fetchDashboardData(true)
  }

  // Full page loading (initial load)
  // Show loading while auth is being determined
  if (!initialized || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }


  // Show error if auth failed
  if (authError && !user) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{authError}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = '/auth/login'}
              className="ml-4"
            >
              Go to Login
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // If no user after auth loading is complete, redirect will happen via useAuth hook
  if (initialized && !authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Error state with retry option
  if (error && !loading.stats && !loading.followUpClaims) {
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

  function PerformanceRow({ label, value }: PerformanceRowProps) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">{value}%</span>
        </div>
        <Progress value={value} />
      </div>
    )
  }

  return (
    <div className="app-page">
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">
          Reporting Range
        </span>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading.stats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                <CountUp end={stats?.totalClaims || 0} duration={1.2} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading.stats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                <CountUp end={stats?.successRate || 0} duration={1.2} suffix="%" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Processing Claims</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading.stats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                <CountUp end={stats?.processingClaims || 0} duration={1.2} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recovered Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading.stats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                $
                <CountUp
                  end={stats?.recoveredRevenue || 0}
                  duration={1.2}
                  separator=","
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 app-surface">
          <CardHeader>
            <CardTitle>Claim Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading.stats ? <Skeleton className="h-64 w-full" /> : <Overview data={chartData} />}
          </CardContent>
        </Card>

        <Card className="col-span-3 app-surface">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>
              Distribution of claims by current status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading.stats ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <StatusDistribution statusCounts={stats?.statusCounts || []} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 app-surface">
          <CardHeader>
            <CardTitle>Approaching Follow-Up</CardTitle>
            <CardDescription>
              Overdue claims and claims with follow-up dates in the next 7 days
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading.followUpClaims ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <RecentClaims
                claims={followUpClaims}
                emptyMessage="No claims are overdue or approaching their follow-up date."
                showFollowUpDate
              />
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 app-surface">
          <CardHeader>
            <CardTitle>Claim Performance</CardTitle>
            <CardDescription>Success rate by claim type</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">

              <PerformanceRow label="Medical Necessity" value={78} />
              <PerformanceRow label="Coding Errors" value={64} />
              <PerformanceRow label="Coverage Issues" value={52} />
              <PerformanceRow label="Prior Authorization" value={71} />
              <PerformanceRow label="Network Issues" value={45} />

            </div>
          </CardContent>

          <CardFooter>
            <Link
              href="/analytics"
              className="text-sm text-muted-foreground hover:underline"
            >
              View detailed analytics
            </Link>
          </CardFooter>

        </Card>

      </div>

    </div>
  )
}
