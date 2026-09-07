"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { DollarSign, Plus, CreditCard, CheckCircle, Clock, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { paymentStatuses } from "@/constants/paymentColors"

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  reference_number: string | null
  check_number: string | null
  payment_date: string
  notes: string | null
  created_at: string
}

interface PatientsPaymentManagerProps {
  patientId: string
}

const paymentMethods = [
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH Transfer" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
]

export function PatientsPaymentManager({ patientId }: PatientsPaymentManagerProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPayments()
  }, [patientId])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/patients/${patientId}/payments`)

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`)
      }

      const data = await response.json()

      if (response.ok) {
        setPayments(data.data.payments)
        setTotalAmount(data.data.totalAmount)
      } else {
        throw new Error(data.error || "Failed to fetch payments")
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const statusOption = paymentStatuses.find((s) => s.value === status)
    if (!statusOption) return null

    return (
      <Badge variant="outline" className={statusOption.color}>
        <statusOption.icon className="mr-1 h-3 w-3" />
        {statusOption.label}
      </Badge>
    )
  }

  const getPaymentMethodLabel = (method: string) => {
    const methodOption = paymentMethods.find((m) => m.value === method)
    return methodOption?.label || method
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Management
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-lg font-semibold">{payments.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-lg font-semibold">{payments.filter((p) => p.payment_status === "completed").length}</p>
          </div>
        </div>

        {/* Payments Table */}
        {payments.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                    <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.reference_number || payment.check_number || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payments recorded yet</p>
            <p className="text-sm">Add a payment to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
