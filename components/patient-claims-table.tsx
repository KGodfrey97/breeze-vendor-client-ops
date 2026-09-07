"use client"
import Link from "next/link"
import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CheckCircle2, Clock, XCircle, AlertCircle, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, User, Mail, Phone, Calendar, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { Database } from '@/lib/db-types'
import { AttributeBadge } from "@/components/ui/attributesBadge"
import type { AttributeValue } from "@/components/ui/attributesBadge"

type claims = Database['public']['Tables']['claims']['Row']

interface PatientClaimsTableProps {
  claims: claims[]
}

interface Column {
  id: string
  label: string
}


export function PatientClaimsTable({ claims }: PatientClaimsTableProps) {
  const router = useRouter()

  // Default column configuration
  const columns: Column[] = ([
    { id: "claim_id", label: "Claim ID" },
    { id: "type", label: "Type" },
    { id: "amount", label: "Amount" },
    { id: "service_date", label: "Service Date" },
    { id: "follow_up_date", label: "Follow-Up" },
    { id: "insurance", label: "Insurance" },
    { id: "status", label: "Status" },
    { id: "actions", label: "Actions" },
  ])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"

    const [year, month, day] = dateString.split("-").map(Number)
    const date = new Date(year, month - 1, day)

    return date.toLocaleDateString()
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Render cell content based on column
  const renderCell = (claim: claims, columnId: string) => {    
    switch (columnId) {
      case "claim_id":
        return <TableCell className="font-medium whitespace-nowrap">{claim.claim_id ?? "—"}</TableCell>
      case "type":
        return <TableCell className="whitespace-nowrap">{claim.appeal_type}</TableCell>
      case "amount":
        return <TableCell className="whitespace-nowrap">{claim.original_claim_amount !== null
                  ? formatCurrency(claim.original_claim_amount)
                  : "—"}
                </TableCell>
      case "service_date":
        return <TableCell className="whitespace-nowrap">{formatDate(claim.service_date)}</TableCell>
      case "follow_up_date":
        return <TableCell className="whitespace-nowrap">{formatDate(claim.follow_up_date)}</TableCell>
      case "insurance":
          return <TableCell className="whitespace-nowrap">{claim.insurance_provider ?? "—"}</TableCell>
      case "status":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex justify-center">
              <AttributeBadge attribute="status" value={claim.status as AttributeValue<"status">}/>
            </div>
          </TableCell>
        )
      case "priority":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex justify-center">
              <AttributeBadge attribute="priority" value={claim.priority as AttributeValue<"priority">}/>
            </div>
          </TableCell>
        )
      case "letter_status":
        return (
          <TableCell className="whitespace-nowrap">
            <div className="flex justify-center">
              <AttributeBadge attribute="letterStatus" value={claim.letter_status as AttributeValue<"letterStatus">}/>
            </div>
          </TableCell>
        )
      case "actions":
        return (
          <TableCell className="text-right">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/claims/view/${claim.id}`}>View</Link>
            </Button>
          </TableCell>
        )
        
      default:
        return <TableCell></TableCell>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Claims
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.id}>{column.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length > 0 ? (
                  claims.map((claim) => (
                    <TableRow key={claim.id}>
                      {columns.map((column) =>
                          <React.Fragment key={`${claim.id}-${column.id}`}>
                            {renderCell(claim, column.id)}
                          </React.Fragment>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No claims found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
