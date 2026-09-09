"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"

interface LineOfBusinessOption {
  id: string
  name: string
  description: string | null
}

interface VendorsFilterProps {
  linesOfBusiness: LineOfBusinessOption[]
  className?: string
}

export function VendorsFilter({
  linesOfBusiness,
  className,
}: VendorsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState("")

  const [filters, setFilters] = useState({
    lineOfBusinessId: "",
    vendorTier: "",
    grade: "",
    vendorStatus: "",
  })

  // ----------------------------------------------------
  // Initialize state from URL params
  // ----------------------------------------------------

  useEffect(() => {
    setSearch(searchParams.get("search") || "")

    setFilters({
      lineOfBusinessId:
        searchParams.get("lob") || "",

      vendorTier:
        searchParams.get("tier") || "",

      grade:
        searchParams.get("grade") || "",

      vendorStatus:
        searchParams.get("status") || "",
    })
  }, [searchParams])

  // ----------------------------------------------------
  // Update URL params
  // ----------------------------------------------------

  const updateURL = () => {
    const params = new URLSearchParams()

    if (search.trim()) {
      params.set("search", search.trim())
    }

    if (
      filters.lineOfBusinessId &&
      filters.lineOfBusinessId !== "all"
    ) {
      params.set(
        "lob",
        filters.lineOfBusinessId
      )
    }

    if (
      filters.vendorTier &&
      filters.vendorTier !== "all"
    ) {
      params.set(
        "tier",
        filters.vendorTier
      )
    }

    if (
      filters.grade &&
      filters.grade !== "all"
    ) {
      params.set(
        "grade",
        filters.grade
      )
    }

    if (
      filters.vendorStatus &&
      filters.vendorStatus !== "all"
    ) {
      params.set(
        "status",
        filters.vendorStatus
      )
    }

    const query =
      params.toString()

    router.push(
      query
        ? `/vendors?${query}`
        : "/vendors"
    )
  }

  const handleSearch = () => {
    updateURL()
  }

  const handleApplyFilters = () => {
    updateURL()
  }

  const handleResetFilters = () => {
    setSearch("")

    setFilters({
      lineOfBusinessId: "",
      vendorTier: "",
      grade: "",
      vendorStatus: "",
    })

    router.push("/vendors")
  }

  const handleKeyPress = (
    event: React.KeyboardEvent
  ) => {
    if (event.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row",
        className
      )}
    >
      {/* ------------------------------------------------
          Search
      ------------------------------------------------- */}

      <div className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search vendor name, vendor code, or line of business..."
            className="pl-8"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyPress
            }
          />
        </div>

        <Button
          variant="outline"
          onClick={
            handleSearch
          }
        >
          Search
        </Button>
      </div>

      {/* ------------------------------------------------
          Filters
      ------------------------------------------------- */}

      <div className="flex gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </SheetTrigger>

          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                Filter Vendors
              </SheetTitle>

              <SheetDescription>
                Set filters to narrow down your vendor list.
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 py-4">

              {/* --------------------------------------
                  Line of Business
              --------------------------------------- */}

              <div className="space-y-2">
                <Label htmlFor="lineOfBusiness">
                  Line of Business
                </Label>

                <Select
                  value={
                    filters.lineOfBusinessId ||
                    "all"
                  }
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      lineOfBusinessId:
                        value,
                    })
                  }
                >
                  <SelectTrigger id="lineOfBusiness">
                    <SelectValue placeholder="Select line of business" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Lines of Business
                    </SelectItem>

                    {linesOfBusiness.map(
                      (lob) => (
                        <SelectItem
                          key={lob.id}
                          value={lob.id}
                        >
                          {lob.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* --------------------------------------
                  Vendor Tier
              --------------------------------------- */}

              <div className="space-y-2">
                <Label htmlFor="vendorTier">
                  Vendor Tier
                </Label>

                <Select
                  value={
                    filters.vendorTier ||
                    "all"
                  }
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      vendorTier:
                        value,
                    })
                  }
                >
                  <SelectTrigger id="vendorTier">
                    <SelectValue placeholder="Select vendor tier" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Tiers
                    </SelectItem>

                    <SelectItem value="Tier 1">
                      Tier 1
                    </SelectItem>

                    <SelectItem value="Tier 2">
                      Tier 2
                    </SelectItem>

                    <SelectItem value="Tier 3">
                      Tier 3
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* --------------------------------------
                  Grade
              --------------------------------------- */}

              <div className="space-y-2">
                <Label htmlFor="grade">
                  Grade
                </Label>

                <Select
                  value={
                    filters.grade ||
                    "all"
                  }
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      grade:
                        value,
                    })
                  }
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Grades
                    </SelectItem>

                    <SelectItem value="A">
                      A
                    </SelectItem>

                    <SelectItem value="B">
                      B
                    </SelectItem>

                    <SelectItem value="C">
                      C
                    </SelectItem>

                    <SelectItem value="D">
                      D
                    </SelectItem>

                    <SelectItem value="F">
                      F
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* --------------------------------------
                  Status
              --------------------------------------- */}

              <div className="space-y-2">
                <Label htmlFor="vendorStatus">
                  Status
                </Label>

                <Select
                  value={
                    filters.vendorStatus ||
                    "all"
                  }
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      vendorStatus:
                        value,
                    })
                  }
                >
                  <SelectTrigger id="vendorStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All
                    </SelectItem>

                    <SelectItem value="onboarding">
                      Onboarding
                    </SelectItem>

                    <SelectItem value="active">
                      Active
                    </SelectItem>

                    <SelectItem value="under_review">
                      Under Review
                    </SelectItem>

                    <SelectItem value="inactive">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            <SheetFooter>
              <Button
                variant="outline"
                onClick={
                  handleResetFilters
                }
              >
                Reset Filters
              </Button>

              <SheetClose asChild>
                <Button
                  onClick={
                    handleApplyFilters
                  }
                >
                  Apply Filters
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}