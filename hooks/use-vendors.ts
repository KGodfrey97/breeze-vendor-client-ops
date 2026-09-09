import { useEffect, useState } from "react"

export type VendorListItem = {
  id: string
  name: string
  vendor_code: string | null
  grade: string | null
  vendor_tier: string | null
  status: string
  color: string | null
  description: string | null
  notes: string | null

  line_of_business_id: string | null
  line_of_business: string | null

  renewal_date: string | null

  created_at: string
  updated_at: string
}

export type LineOfBusinessOption = {
  id: string
  name: string
  description: string | null
}

export function useVendor(id: string | undefined) {
  const [vendor, setVendor] = useState<VendorListItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVendor = async () => {
    if (!id) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/vendors/${id}`, {
        cache: "no-store",
      })

      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || "Unable to load vendor")
        setVendor(null)
      } else {
        setVendor(payload.vendor as VendorListItem)
        setError(null)
      }
    } catch (e: any) {
      setError(e.message || "Unexpected error")
      setVendor(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    const loadVendor = async () => {
      if (!id) {
        if (!isCancelled) {
          setVendor(null)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch(`/api/vendors/${id}`, {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load vendor")
        }

        if (!isCancelled) {
          setVendor(payload.vendor as VendorListItem)
          setError(null)
        }
      } catch (e: any) {
        if (!isCancelled) {
          setError(e.message || "Unexpected error")
          setVendor(null)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadVendor()

    return () => {
      isCancelled = true
    }
  }, [id])

  return {
    vendor,
    isLoading,
    error,
    refetch: fetchVendor,
  }
}

export function useVendors({
  status,
  search,
  lineOfBusinessId,
  vendorTier,
  grade,
  page = 1,
  pageSize = 10,
  sortBy,
  sortOrder = "asc",
}: {
  status?: string
  search?: string
  lineOfBusinessId?: string
  vendorTier?: string
  grade?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}) {
  const [vendors, setVendors] = useState<VendorListItem[]>([])
  const [count, setCount] = useState(0)
  const [linesOfBusiness, setLinesOfBusiness] = useState<LineOfBusinessOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const fetchVendors = async () => {
      setIsLoading(true)

      try {
        const params = new URLSearchParams()

        if (status && status !== "all") {
          params.set("status", status)
        }

        if (search) {
          params.set("search", search)
        }

        if (lineOfBusinessId) {
          params.set("lob", lineOfBusinessId)
        }

        if (vendorTier) {
          params.set("tier", vendorTier)
        }

        if (grade) {
          params.set("grade", grade)
        }

        params.set("page", String(page))
        params.set("pageSize", String(pageSize))

        if (sortBy) {
          params.set("sortBy", sortBy)
        }

        params.set("sortOrder", sortOrder)

        const response = await fetch(
          `/api/vendors?${params.toString()}`,
          {
            cache: "no-store",
          }
        )

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(
            payload.error || "Unable to fetch vendors"
          )
        }

        if (!isCancelled) {
          setVendors((payload.vendors || []) as VendorListItem[])
          setCount(payload.count || 0)
          setError(null)
        }
      } catch (e: any) {
        if (!isCancelled) {
          setError(e.message || "Unexpected error")
          setVendors([])
          setCount(0)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchVendors()

    return () => {
      isCancelled = true
    }
  }, [
    status,
    search,
    lineOfBusinessId,
    vendorTier,
    grade,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ])

  useEffect(() => {
    let isCancelled = false

    const fetchLinesOfBusiness = async () => {
      try {
        const response = await fetch("/api/lines-of-business", {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(
            payload.error || "Unable to fetch lines of business"
          )
        }

        if (!isCancelled) {
          setLinesOfBusiness(
            (payload.linesOfBusiness || []) as LineOfBusinessOption[]
          )
        }
      } catch (e) {
        if (!isCancelled) {
          console.error("Unable to load lines of business:", e)
          setLinesOfBusiness([])
        }
      }
    }

    fetchLinesOfBusiness()

    return () => {
      isCancelled = true
    }
  }, [])

  return {
    vendors,
    count,
    linesOfBusiness,
    isLoading,
    error,
  }
}