"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AttributeBadge } from "@/components/ui/attributesBadge"
import type { AttributeValue } from "@/components/ui/attributesBadge"
import type { Database } from "@/lib/db-types"
import { cn } from "@/lib/utils"

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

interface RecentClaimsProps {
  claims: ClaimWithRelations[]
  emptyMessage?: string
  showFollowUpDate?: boolean
}


export function RecentClaims({
  claims,
  emptyMessage = "No claims found.",
  showFollowUpDate = false,
}: RecentClaimsProps) {
  const parseDateString = (dateString: string | null) => {
    if (!dateString) return null

    const normalized = dateString.slice(0, 10)
    const [year, month, day] = normalized.split("-").map(Number)

    if (!year || !month || !day) return null

    return new Date(year, month - 1, day)
  }

  const formatDate = (dateString: string | null) => {
    const date = parseDateString(dateString)
    if (!date) return "—"

    return date.toLocaleDateString()
  }

  const getFollowUpUrgency = (followUpDate: string | null) => {
    const date = parseDateString(followUpDate)
    if (!date) return "none"

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffInMs = date.getTime() - today.getTime()
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return "overdue"
    if (diffInDays <= 3) return "approaching"
    return "scheduled"
  }

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return "—"

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{emptyMessage}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/claims/new">Create New Claim</Link>
        </Button>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Claim ID</TableHead>
          <TableHead>Patient</TableHead>
          {showFollowUpDate ? <TableHead>Follow-Up</TableHead> : null}
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.map((claim) => {
          const followUpUrgency = getFollowUpUrgency(claim.follow_up_date)

          return (
            <TableRow key={claim.id}>
              <TableCell className="font-medium">{claim.claim_id ?? claim.id.substring(0, 8)}</TableCell>
              <TableCell>
                {claim.patients?.first_name || claim.patients?.last_name
                  ? `${claim.patients?.first_name ?? ""} ${claim.patients?.last_name ?? ""}`.trim()
                  : "—"}
              </TableCell>
              {showFollowUpDate ? (
                <TableCell
                  className={cn(
                    "whitespace-nowrap font-medium",
                    followUpUrgency === "approaching" && "text-warning",
                    followUpUrgency === "overdue" && "text-destructive",
                  )}
                >
                  {formatDate(claim.follow_up_date)}
                </TableCell>
              ) : null}
              <TableCell>{formatCurrency(claim.original_claim_amount)}</TableCell>
              <TableCell className="whitespace-nowrap flex justify-center">
                <AttributeBadge attribute="status" value={claim.status as AttributeValue<"status">} />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/claims/view/${claim.id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
