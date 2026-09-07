"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface ClaimsFilterProps {
  types: string[];
  className?: string;
}

export function ClaimsFilter({ types, className }: ClaimsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    claimType: "",
    priority: "",
    letterStatus: "",
    claimStatus: "",
    dateFrom: "",
    dateTo: "",
  })

  // Initialize state from URL params
  useEffect(() => {
    setSearch(searchParams.get("search") || "")
    setFilters({
      claimType: searchParams.get("appealtype") || "",
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || "",
      priority: searchParams.get("priority") || "",
      letterStatus: searchParams.get("letterStatus") || "",
      claimStatus: searchParams.get("claimStatus") || "",
    })
  }, [searchParams])

  // Update URL params
  const updateURL = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (filters.claimType && filters.claimType !== "all")
      params.set("appealtype", filters.claimType)

    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
    if (filters.dateTo) params.set("dateTo", filters.dateTo)

    if (filters.priority && filters.priority !== "all")
      params.set("priority", filters.priority)

    if (filters.letterStatus && filters.letterStatus !== "all")
      params.set("letterStatus", filters.letterStatus)

    if (filters.claimStatus && filters.claimStatus !== "all")
      params.set("claimStatus", filters.claimStatus)

    router.push(`/claims?${params.toString()}`)
  }

  const handleSearch = () => updateURL()
  const handleApplyFilters = () => updateURL()
  const handleResetFilters = () => {
    setSearch("")
    setFilters({
      claimType: "",
      dateFrom: "",
      dateTo: "",
      priority: "",
      letterStatus: "",
      claimStatus: "",
    })
    router.push("/claims")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
      {/* Search Input */}
      <div className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims, patient name, or patient ID..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>Search</Button>
      </div>

      {/* Filters Sheet */}
      <div className="flex gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Filter
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Claims</SheetTitle>
              <SheetDescription>Set filters to narrow down your claims list</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              {/* Claim Type */}
              <div className="space-y-2">
                <Label htmlFor="claimType">Claim Type</Label>
                <Select
                  value={filters.claimType || "all"}
                  onValueChange={(value) => setFilters({ ...filters, claimType: value })}
                >
                  <SelectTrigger id="claimType">
                    <SelectValue placeholder="Select claim type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={filters.priority || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, priority: value })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Letter Status */}
              <div className="space-y-2">
                <Label htmlFor="letterStatus">Letter Status</Label>
                <Select
                  value={filters.letterStatus || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, letterStatus: value })
                  }
                >
                  <SelectTrigger id="letterStatus">
                    <SelectValue placeholder="Select letter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="not_generated">Not Generated</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Claim Status */}
              <div className="space-y-2">
                <Label htmlFor="claimStatus">Status</Label>
                <Select
                  value={filters.claimStatus || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, claimStatus: value })
                  }
                >
                  <SelectTrigger id="claimStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="overturned">Overturned</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={handleResetFilters}>Reset Filters</Button>
              <SheetClose asChild>
                <Button onClick={handleApplyFilters}>Apply Filters</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/*<Button variant="outline">Export</Button>*/}
      </div>
    </div>
  )
}
