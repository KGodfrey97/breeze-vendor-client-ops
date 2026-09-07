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
import { DollarSign, Plus, CreditCard, CheckCircle2 } from "lucide-react"
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

interface PaymentManagerProps {
  claimId: string
}

const paymentMethods = [
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH Transfer" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
]

export function PaymentManager({ claimId }: PaymentManagerProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "",
    reference_number: "",
    check_number: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [claimId])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/claims/${claimId}/payments`)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || !formData.payment_method) {
      toast({
        title: "Validation Error",
        description: "Amount and payment method are required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/claims/${claimId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add payment")
      }

      toast({
        title: "Payment Added",
        description: data.message,
        variant: "default",
      })

      // Reset form and close dialog
      setFormData({
        amount: "",
        payment_method: "",
        reference_number: "",
        check_number: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      })
      // Remove focus before closing dialog (fixes aria-hidden warning)
      ;(document.activeElement as HTMLElement)?.blur()
      
      setIsDialogOpen(false)

      // Refresh payments
      fetchPayments()
    } catch (error) {
      console.error("Error adding payment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add payment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const markAsCompleted = async (paymentId: string) => {
    setUpdatingPaymentId(paymentId)
    try {
      const response = await fetch(`/api/claims/${claimId}/payments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, payment_status: "completed" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update payment")
      }

      toast({
        title: "Payment Updated",
        description: "Payment marked as completed.",
        variant: "default",
      })

      fetchPayments()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment",
        variant: "destructive",
      })
    } finally {
      setUpdatingPaymentId(null)
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
            Payment Management
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Payment</DialogTitle>
                <DialogDescription>
                  Enter the details for the payment received for this claim.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Payment Date</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reference_number">Reference Number</Label>
                    <Input
                      id="reference_number"
                      placeholder="REF123456"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check_number">Check Number</Label>
                    <Input
                      id="check_number"
                      placeholder="1001"
                      value={formData.check_number}
                      onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this payment..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Payment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      {payment.payment_status !== "completed" && payment.payment_status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary"
                          onClick={() => markAsCompleted(payment.id)}
                          disabled={updatingPaymentId === payment.id}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          {updatingPaymentId === payment.id ? "Updating..." : "Completed"}
                        </Button>
                      )}
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
