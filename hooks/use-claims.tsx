import { useEffect, useState } from "react"
import type { Database } from "@/lib/db-types"

export type ClaimWithPatientAndProfile =
  Database["public"]["Views"]["claims_with_patients"]["Row"] & {
    profiles: {
      full_name: string | null
      organization: string | null
    } | null
  }

export function useClaim(id: string | undefined) {
  const [claim, setClaim] = useState<ClaimWithPatientAndProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClaim = async () => {
    if (!id) return
    setIsLoading(true)

    const response = await fetch(`/api/claims/${id}`, { cache: "no-store" })
    const payload = await response.json()

    if (!response.ok) {
      setError(payload.error || "Unable to load claim")
      setClaim(null)
    } else {
      setClaim(payload.claim as ClaimWithPatientAndProfile)
      setError(null)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    let isCancelled = false
    fetchClaim()
    return () => {
      isCancelled = true
    }
  }, [id])

  return { claim, isLoading, error, refetch: fetchClaim }
}

export function useClaims({
  status,
  search,
  appealtype,
  dateFrom,
  dateTo,
  priority,
  letterStatus,
  claimStatus,
  page = 1,
  pageSize = 10,
  sortBy,
  sortOrder = "desc",
}: {
  status?: string
  search?: string
  appealtype?: string
  dateFrom?: string
  dateTo?: string
  priority?: string
  letterStatus?: string
  claimStatus?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}) {
  const [claims, setClaims] = useState<ClaimWithPatientAndProfile[]>([])
  const [count, setCount] = useState(0)
  const [types, setTypes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const fetchClaims = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (status) params.set("status", status)
        if (search) params.set("search", search)
        if (appealtype) params.set("appealtype", appealtype)
        if (dateFrom) params.set("dateFrom", dateFrom)
        if (dateTo) params.set("dateTo", dateTo)
        if (priority) params.set("priority", priority)
        if (letterStatus) params.set("letterStatus", letterStatus)
        if (claimStatus) params.set("claimStatus", claimStatus)
        params.set("page", String(page))
        params.set("pageSize", String(pageSize))
        if (sortBy) params.set("sortBy", sortBy)
        params.set("sortOrder", sortOrder)

        const response = await fetch(`/api/claims?${params.toString()}`, { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || "Unable to fetch claims")

        if (!isCancelled) {
          setClaims((payload.claims || []) as ClaimWithPatientAndProfile[])
          setCount(payload.count || 0)
          setTypes(payload.types || [])
          setError(null)
        }
      } catch (e: any) {
        if (!isCancelled) {
          setError(e.message || "Unexpected error")
          setClaims([])
          setCount(0)
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    fetchClaims()

    return () => {
      isCancelled = true
    }
  }, [
    status,
    search,
    appealtype,
    dateFrom,
    dateTo,
    priority,
    letterStatus,
    claimStatus,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ])

  return { claims, count, types, isLoading, error }
}
