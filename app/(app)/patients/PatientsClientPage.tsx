"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, User, FileText, Calendar, AlertCircle, RefreshCw, Loader2, MoreHorizontal, Plus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Patient {
  id: string
  first_name: string
  last_name: string
  patient_external_id: string
  dob: string | null
  total_claims: number
  active_claims: number
  success_rate: number
  total_recovered: number
  last_claim_date: string
}

interface LoadingState {
  patients: boolean
  stats: boolean
}

export function PatientsClientPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState<LoadingState>({ patients: true, stats: true })
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchPatients = async () => {
    try {
      setLoading({ patients: true, stats: true })
      setError(null)

      const response = await fetch("/api/patients", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Unable to load patients")

      setPatients((payload.patients || []) as Patient[])
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
      setPatients([])
    } finally {
      setLoading({ patients: false, stats: false })
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const handleRetry = () => fetchPatients()

  const filteredPatients = patients.filter((patient) => {
    const terms = searchTerm.toLowerCase().trim().split(/\s+/)
    return terms.every(term =>
      patient.first_name.toLowerCase().includes(term) ||
      patient.last_name.toLowerCase().includes(term) ||
      patient.patient_external_id.toLowerCase().includes(term)
    )
  })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)

  const formatDate = (dateString: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  if (loading.patients) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading patients...</p>
      </div>
    </div>
  )

  if (error) return (
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

  return (
    <div className="app-page">
      <Card className="app-surface">
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name or ID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg mb-2 text-muted-foreground">
                {searchTerm ? "No patients found" : "No patients yet"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? "Try adjusting your search" : "Patients will appear here when you create claims"}
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href="/claims/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Claim
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Total Recovered</TableHead>
                  <TableHead>Last Claim</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                          <div className="text-sm text-muted-foreground">DOB: {formatDate(patient.dob)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{patient.patient_external_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{patient.total_claims} total</Badge>

                        {patient.active_claims > 0 && (
                          <Badge
                            variant="outline"
                            className="bg-warning/15 text-warning hover:bg-warning/15"
                          >
                            {patient.active_claims} active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(patient.total_recovered)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(patient.last_claim_date)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/patients/view/${patient.id}`}>
                              <User className="mr-2 h-4 w-4" />
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/claims?search=${patient.patient_external_id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Claims
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/claims/new?patient=${patient.patient_external_id}`}>
                              <Plus className="mr-2 h-4 w-4" />
                              New Claim
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
