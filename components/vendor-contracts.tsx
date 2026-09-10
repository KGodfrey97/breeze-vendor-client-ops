"use client"

import { useEffect, useState } from "react"
import {
  CalendarDays,
  Check,
  Edit,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { InfoCard } from "@/components/ui/info-card"

type VendorContract = {
  id: string
  vendor_id: string
  name: string
  contract_type: string | null
  status: string
  start_date: string | null
  end_date: string | null
  renewal_date: string | null
  auto_renews: boolean
  notice_period_days: number | null
  annual_value: number | string | null
  total_contract_value: number | string | null
  fee_structure: string | null
  document_key: string | null
  document_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type ContractForm = {
  name: string
  contractType: string
  status: string
  startDate: string
  endDate: string
  renewalDate: string
  autoRenews: boolean
  noticePeriodDays: string
  annualValue: string
  totalContractValue: string
  feeStructure: string
  notes: string
}

type VendorContractsProps = {
  vendorId: string
  onUpdated?: () => void | Promise<void>
}

const EMPTY_FORM: ContractForm = {
  name: "",
  contractType: "",
  status: "draft",
  startDate: "",
  endDate: "",
  renewalDate: "",
  autoRenews: false,
  noticePeriodDays: "",
  annualValue: "",
  totalContractValue: "",
  feeStructure: "",
  notes: "",
}

export function VendorContracts({
  vendorId,
  onUpdated,
}: VendorContractsProps) {
  const [contracts, setContracts] = useState<VendorContract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addingContract, setAddingContract] = useState(false)

  const [editingContractId, setEditingContractId] =
    useState<string | null>(null)

  const [contractToDelete, setContractToDelete] =
    useState<VendorContract | null>(null)

  const [deletingContractId, setDeletingContractId] =
    useState<string | null>(null)

  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] =
    useState<ContractForm>(EMPTY_FORM)

  const fetchContracts = async () => {
    try {
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contracts`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load vendor contracts"
        )
      }

      setContracts(data.contracts || [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load vendor contracts"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [vendorId])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setAddingContract(false)
    setEditingContractId(null)
  }

  const startAdd = () => {
    setEditingContractId(null)
    setForm(EMPTY_FORM)
    setAddingContract(true)
  }

  const startEdit = (
    contract: VendorContract
  ) => {
    setAddingContract(false)
    setEditingContractId(contract.id)

    setForm({
      name: contract.name || "",
      contractType:
        contract.contract_type || "",
      status:
        contract.status || "draft",
      startDate:
        contract.start_date?.slice(0, 10) || "",
      endDate:
        contract.end_date?.slice(0, 10) || "",
      renewalDate:
        contract.renewal_date?.slice(0, 10) || "",
      autoRenews:
        contract.auto_renews || false,
      noticePeriodDays:
        contract.notice_period_days != null
          ? String(
              contract.notice_period_days
            )
          : "",
      annualValue:
        contract.annual_value != null
          ? String(contract.annual_value)
          : "",
      totalContractValue:
        contract.total_contract_value != null
          ? String(
              contract.total_contract_value
            )
          : "",
      feeStructure:
        contract.fee_structure || "",
      notes:
        contract.notes || "",
    })
  }

  const notifyParent = async () => {
    if (onUpdated) {
      await onUpdated()
    }
  }

  const saveNewContract = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contracts`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            contractType:
              form.contractType || null,
            status: form.status,
            startDate:
              form.startDate || null,
            endDate:
              form.endDate || null,
            renewalDate:
              form.renewalDate || null,
            autoRenews:
              form.autoRenews,
            noticePeriodDays:
              form.noticePeriodDays || null,
            annualValue:
              form.annualValue || null,
            totalContractValue:
              form.totalContractValue ||
              null,
            feeStructure:
              form.feeStructure || null,
            notes:
              form.notes || null,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create contract"
        )
      }

      await fetchContracts()
      await notifyParent()
      resetForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create contract"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const saveEditedContract = async () => {
    if (!editingContractId) return

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contracts/${editingContractId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            contractType:
              form.contractType || null,
            status: form.status,
            startDate:
              form.startDate || null,
            endDate:
              form.endDate || null,
            renewalDate:
              form.renewalDate || null,
            autoRenews:
              form.autoRenews,
            noticePeriodDays:
              form.noticePeriodDays || null,
            annualValue:
              form.annualValue || null,
            totalContractValue:
              form.totalContractValue ||
              null,
            feeStructure:
              form.feeStructure || null,
            notes:
              form.notes || null,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update contract"
        )
      }

      await fetchContracts()
      await notifyParent()
      resetForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update contract"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteContract = async (
    contractId: string
  ) => {
    try {
      setDeletingContractId(contractId)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contracts/${contractId}`,
        {
          method: "DELETE",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete contract"
        )
      }

      await fetchContracts()
      await notifyParent()

      if (
        editingContractId === contractId
      ) {
        resetForm()
      }

      setContractToDelete(null)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete contract"
      )
    } finally {
      setDeletingContractId(null)
    }
  }

  const formatDate = (
    value: string | null
  ) => {
    if (!value) return "—"

    return new Date(
      `${value.slice(0, 10)}T00:00:00`
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (
    value: number | string | null
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—"
    }

    const amount = Number(value)

    if (!Number.isFinite(amount)) {
      return "—"
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }
    ).format(amount)
  }

  const formatStatus = (
    value: string
  ) => {
    return value
      .split("_")
      .map(
        (word) =>
          word
            .charAt(0)
            .toUpperCase() +
          word.slice(1)
      )
      .join(" ")
  }

  const getStatusClasses = (
    status: string
  ) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"

      case "expiring":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400"

      case "expired":
        return "bg-red-500/10 text-red-700 dark:text-red-400"

      case "terminated":
        return "bg-red-500/10 text-red-700 dark:text-red-400"

      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const renderForm = () => (
    <div className="space-y-5 rounded-lg border bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="contractName">
            Contract Name
          </Label>

          <Input
            id="contractName"
            placeholder="Master Services Agreement"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractType">
            Contract Type
          </Label>

          <Input
            id="contractType"
            placeholder="MSA, SOW, Service Agreement..."
            value={form.contractType}
            onChange={(e) =>
              setForm({
                ...form,
                contractType:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>
            Status
          </Label>

          <Select
            value={form.status}
            onValueChange={(value) =>
              setForm({
                ...form,
                status: value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="draft">
                Draft
              </SelectItem>

              <SelectItem value="active">
                Active
              </SelectItem>

              <SelectItem value="expiring">
                Expiring
              </SelectItem>

              <SelectItem value="expired">
                Expired
              </SelectItem>

              <SelectItem value="terminated">
                Terminated
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">
            Start Date
          </Label>

          <Input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm({
                ...form,
                startDate: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">
            End Date
          </Label>

          <Input
            id="endDate"
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm({
                ...form,
                endDate: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="renewalDate">
            Renewal Date
          </Label>

          <Input
            id="renewalDate"
            type="date"
            value={form.renewalDate}
            onChange={(e) =>
              setForm({
                ...form,
                renewalDate:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="noticePeriodDays">
            Notice Period
          </Label>

          <div className="relative">
            <Input
              id="noticePeriodDays"
              type="number"
              min="0"
              placeholder="90"
              className="pr-14"
              value={
                form.noticePeriodDays
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  noticePeriodDays:
                    e.target.value,
                })
              }
            />

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              days
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="annualValue">
            Annual Value
          </Label>

          <Input
            id="annualValue"
            type="number"
            min="0"
            step="0.01"
            placeholder="100000"
            value={form.annualValue}
            onChange={(e) =>
              setForm({
                ...form,
                annualValue:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalContractValue">
            Total Contract Value
          </Label>

          <Input
            id="totalContractValue"
            type="number"
            min="0"
            step="0.01"
            placeholder="300000"
            value={
              form.totalContractValue
            }
            onChange={(e) =>
              setForm({
                ...form,
                totalContractValue:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>
            Auto Renewal
          </Label>

          <Button
            type="button"
            variant={
              form.autoRenews
                ? "default"
                : "outline"
            }
            className="w-full justify-start"
            onClick={() =>
              setForm({
                ...form,
                autoRenews:
                  !form.autoRenews,
              })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />

            {form.autoRenews
              ? "Contract Auto-Renews"
              : "Contract Does Not Auto-Renew"}
          </Button>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="feeStructure">
            Fee Structure
          </Label>

          <Textarea
            id="feeStructure"
            placeholder="Monthly fixed fee, percentage of revenue, per-unit pricing..."
            value={form.feeStructure}
            onChange={(e) =>
              setForm({
                ...form,
                feeStructure:
                  e.target.value,
              })
            }
            className="min-h-20"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="contractNotes">
            Notes
          </Label>

          <Textarea
            id="contractNotes"
            placeholder="Internal notes about this contract..."
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
            className="min-h-24"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetForm}
          disabled={isSaving}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>

        <Button
          size="sm"
          onClick={
            editingContractId
              ? saveEditedContract
              : saveNewContract
          }
          disabled={
            isSaving ||
            !form.name.trim()
          }
        >
          <Check className="mr-2 h-4 w-4" />

          {isSaving
            ? "Saving..."
            : editingContractId
            ? "Save Changes"
            : "Add Contract"}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <InfoCard
        title="Contracts"
        icon={FileText}
        action={
          !addingContract &&
          !editingContractId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={startAdd}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contract
            </Button>
          ) : null
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {addingContract &&
            renderForm()}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading contracts...
            </p>
          ) : contracts.length === 0 &&
            !addingContract ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

              <p className="font-medium">
                No contracts yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Add this vendor&apos;s contract to track value,
                renewal dates, and contract terms.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={startAdd}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Contract
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map(
                (contract) => (
                  <div
                    key={contract.id}
                  >
                    {editingContractId ===
                    contract.id ? (
                      renderForm()
                    ) : (
                      <div className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">
                                {contract.name}
                              </p>

                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                                  contract.status
                                )}`}
                              >
                                {formatStatus(
                                  contract.status
                                )}
                              </span>

                              {contract.auto_renews && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  Auto-Renew
                                </span>
                              )}
                            </div>

                            {contract.contract_type && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {
                                  contract.contract_type
                                }
                              </p>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Start Date
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {formatDate(
                                    contract.start_date
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  End Date
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {formatDate(
                                    contract.end_date
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Renewal
                                </p>

                                <p className="mt-1 flex items-center text-sm font-medium">
                                  <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />

                                  {formatDate(
                                    contract.renewal_date
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Notice Period
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {contract.notice_period_days !=
                                  null
                                    ? `${contract.notice_period_days} days`
                                    : "—"}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Annual Value
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {formatCurrency(
                                    contract.annual_value
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Total Value
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {formatCurrency(
                                    contract.total_contract_value
                                  )}
                                </p>
                              </div>
                            </div>

                            {contract.fee_structure && (
                              <div className="mt-4">
                                <p className="text-xs text-muted-foreground">
                                  Fee Structure
                                </p>

                                <p className="mt-1 whitespace-pre-wrap text-sm">
                                  {
                                    contract.fee_structure
                                  }
                                </p>
                              </div>
                            )}

                            {contract.notes && (
                              <div className="mt-4">
                                <p className="text-xs text-muted-foreground">
                                  Notes
                                </p>

                                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                  {contract.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                startEdit(
                                  contract
                                )
                              }
                              title="Edit contract"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setContractToDelete(
                                  contract
                                )
                              }
                              disabled={
                                deletingContractId ===
                                contract.id
                              }
                              title="Delete contract"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </InfoCard>

      <AlertDialog
        open={Boolean(
          contractToDelete
        )}
        onOpenChange={(open) => {
          if (!open) {
            setContractToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete contract?
            </AlertDialogTitle>

            <AlertDialogDescription>
              {contractToDelete ? (
                <>
                  This will permanently
                  delete{" "}
                  <span className="font-medium text-foreground">
                    {
                      contractToDelete.name
                    }
                  </span>
                  . This action cannot be
                  undone.
                </>
              ) : (
                "This contract will be permanently deleted."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                deletingContractId !==
                null
              }
              onClick={async (
                event
              ) => {
                event.preventDefault()

                if (
                  !contractToDelete
                ) {
                  return
                }

                await deleteContract(
                  contractToDelete.id
                )
              }}
            >
              {deletingContractId
                ? "Deleting..."
                : "Delete Contract"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}