"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  DollarSign,
  Edit,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

type VendorBudget = {
  id: string
  vendor_id: string
  budget_year: number
  budget_amount: number | string
  forecast_amount: number | string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type BudgetForm = {
  budgetYear: string
  budgetAmount: string
  forecastAmount: string
  notes: string
}

type VendorBudgetProps = {
  vendorId: string
  onUpdated?: () => void | Promise<void>
}

const getCurrentYear = () =>
  new Date().getFullYear()

const createEmptyForm = (): BudgetForm => ({
  budgetYear: String(getCurrentYear()),
  budgetAmount: "",
  forecastAmount: "",
  notes: "",
})

export function VendorBudget({
  vendorId,
  onUpdated,
}: VendorBudgetProps) {
  const [budgets, setBudgets] = useState<VendorBudget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addingBudget, setAddingBudget] =
    useState(false)

  const [editingBudgetId, setEditingBudgetId] =
    useState<string | null>(null)

  const [budgetToDelete, setBudgetToDelete] =
    useState<VendorBudget | null>(null)

  const [deletingBudgetId, setDeletingBudgetId] =
    useState<string | null>(null)

  const [isSaving, setIsSaving] =
    useState(false)

  const [form, setForm] =
    useState<BudgetForm>(createEmptyForm)

  const fetchBudgets = async () => {
    try {
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/budgets`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load vendor budgets"
        )
      }

      setBudgets(data.budgets || [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load vendor budgets"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [vendorId])

  const currentYear = getCurrentYear()

  const currentBudget = useMemo(
    () =>
      budgets.find(
        (budget) =>
          budget.budget_year === currentYear
      ) || null,
    [budgets, currentYear]
  )

  const resetForm = () => {
    setForm(createEmptyForm())
    setAddingBudget(false)
    setEditingBudgetId(null)
  }

  const startAdd = () => {
    setEditingBudgetId(null)

    const nextAvailableYear = (() => {
      let year = currentYear

      const usedYears = new Set(
        budgets.map(
          (budget) => budget.budget_year
        )
      )

      while (usedYears.has(year)) {
        year += 1
      }

      return year
    })()

    setForm({
      budgetYear: String(nextAvailableYear),
      budgetAmount: "",
      forecastAmount: "",
      notes: "",
    })

    setAddingBudget(true)
  }

  const startEdit = (
    budget: VendorBudget
  ) => {
    setAddingBudget(false)
    setEditingBudgetId(budget.id)

    setForm({
      budgetYear: String(
        budget.budget_year
      ),
      budgetAmount: String(
        budget.budget_amount
      ),
      forecastAmount:
        budget.forecast_amount != null
          ? String(
              budget.forecast_amount
            )
          : "",
      notes: budget.notes || "",
    })
  }

  const notifyParent = async () => {
    if (onUpdated) {
      await onUpdated()
    }
  }

  const saveNewBudget = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/budgets`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            budgetYear:
              form.budgetYear,
            budgetAmount:
              form.budgetAmount,
            forecastAmount:
              form.forecastAmount ||
              null,
            notes:
              form.notes || null,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create budget"
        )
      }

      await fetchBudgets()
      await notifyParent()
      resetForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create budget"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const saveEditedBudget = async () => {
    if (!editingBudgetId) return

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/budgets/${editingBudgetId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            budgetYear:
              form.budgetYear,
            budgetAmount:
              form.budgetAmount,
            forecastAmount:
              form.forecastAmount ||
              null,
            notes:
              form.notes || null,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update budget"
        )
      }

      await fetchBudgets()
      await notifyParent()
      resetForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update budget"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteBudget = async (
    budgetId: string
  ) => {
    try {
      setDeletingBudgetId(budgetId)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/budgets/${budgetId}`,
        {
          method: "DELETE",
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete budget"
        )
      }

      await fetchBudgets()
      await notifyParent()

      if (
        editingBudgetId === budgetId
      ) {
        resetForm()
      }

      setBudgetToDelete(null)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete budget"
      )
    } finally {
      setDeletingBudgetId(null)
    }
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

  const getVariance = (
    budget: VendorBudget
  ) => {
    const budgetAmount = Number(
      budget.budget_amount
    )

    const forecastAmount =
      budget.forecast_amount != null
        ? Number(
            budget.forecast_amount
          )
        : null

    if (
      !Number.isFinite(
        budgetAmount
      ) ||
      forecastAmount === null ||
      !Number.isFinite(
        forecastAmount
      )
    ) {
      return null
    }

    const amount =
      budgetAmount -
      forecastAmount

    const percentage =
      budgetAmount > 0
        ? (amount /
            budgetAmount) *
          100
        : null

    return {
      amount,
      percentage,
      isUnderBudget:
        forecastAmount <=
        budgetAmount,
    }
  }

  const renderForm = () => (
    <div className="space-y-5 rounded-lg border bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <div className="space-y-2">
          <Label htmlFor="budgetYear">
            Budget Year
          </Label>

          <Input
            id="budgetYear"
            type="number"
            min="2000"
            max="2200"
            value={form.budgetYear}
            onChange={(e) =>
              setForm({
                ...form,
                budgetYear:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budgetAmount">
            Approved Budget
          </Label>

          <Input
            id="budgetAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="120000"
            value={
              form.budgetAmount
            }
            onChange={(e) =>
              setForm({
                ...form,
                budgetAmount:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="forecastAmount">
            Forecasted Spend
          </Label>

          <Input
            id="forecastAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            value={
              form.forecastAmount
            }
            onChange={(e) =>
              setForm({
                ...form,
                forecastAmount:
                  e.target.value,
              })
            }
          />

          <p className="text-xs text-muted-foreground">
            Optional for now. Later we can calculate this automatically from vendor spend.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="budgetNotes">
            Notes
          </Label>

          <Textarea
            id="budgetNotes"
            placeholder="Budget assumptions, approvals, exceptions..."
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
            editingBudgetId
              ? saveEditedBudget
              : saveNewBudget
          }
          disabled={
            isSaving ||
            !form.budgetYear ||
            !form.budgetAmount
          }
        >
          <Check className="mr-2 h-4 w-4" />

          {isSaving
            ? "Saving..."
            : editingBudgetId
            ? "Save Changes"
            : "Add Budget"}
        </Button>
      </div>
    </div>
  )

  const currentVariance =
    currentBudget
      ? getVariance(
          currentBudget
        )
      : null

  return (
    <>
      <InfoCard
        title="Budget"
        icon={DollarSign}
        action={
          !addingBudget &&
          !editingBudgetId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={startAdd}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          ) : null
        }
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {addingBudget &&
            renderForm()}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading budget...
            </p>
          ) : budgets.length === 0 &&
            !addingBudget ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <DollarSign className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

              <p className="font-medium">
                No vendor budget yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Add an annual budget to track forecasted spend and vendor budget health.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={startAdd}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Budget
              </Button>
            </div>
          ) : (
            <>
              {currentBudget &&
                editingBudgetId !==
                  currentBudget.id && (
                  <div
                    className={`rounded-lg border p-4 ${
                      currentVariance
                        ? currentVariance.isUnderBudget
                          ? "border-primary/30 bg-primary/5"
                          : "border-destructive/30 bg-destructive/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {currentYear} Budget
                          </p>

                          {currentVariance && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                currentVariance.isUnderBudget
                                  ? "bg-primary/10 text-primary"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {currentVariance.isUnderBudget ? (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              )}

                              {currentVariance.isUnderBudget
                                ? "Within Budget"
                                : "Over Budget"}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              Budget
                            </p>

                            <p className="mt-1 truncate text-base font-semibold">
                              {formatCurrency(
                                currentBudget.budget_amount
                              )}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              Forecast
                            </p>

                            <p className="mt-1 truncate text-base font-semibold">
                              {formatCurrency(
                                currentBudget.forecast_amount
                              )}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              Variance
                            </p>

                            <p
                              className={`mt-1 truncate text-base font-semibold ${
                                currentVariance
                                  ? currentVariance.isUnderBudget
                                    ? "text-primary"
                                    : "text-destructive"
                                  : ""
                              }`}
                            >
                              {currentVariance
                                ? formatCurrency(
                                    Math.abs(
                                      currentVariance.amount
                                    )
                                  )
                                : "—"}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="whitespace-nowrap text-xs text-muted-foreground">
                              Variance %
                            </p>

                            <p
                              className={`mt-1 text-base font-semibold ${
                                currentVariance
                                  ? currentVariance.isUnderBudget
                                    ? "text-primary"
                                    : "text-destructive"
                                  : ""
                              }`}
                            >
                              {currentVariance?.percentage != null
                                ? `${Math.abs(
                                    currentVariance.percentage
                                  ).toFixed(1)}%`
                                : "—"}
                            </p>
                          </div>
                        </div>

                        {currentBudget.forecast_amount ==
                          null && (
                          <div className="mt-4 flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                            <p>
                              Add a forecast amount to calculate budget health.
                            </p>
                          </div>
                        )}

                        {currentBudget.notes && (
                          <div className="mt-4">
                            <p className="text-xs text-muted-foreground">
                              Notes
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {currentBudget.notes}
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
                              currentBudget
                            )
                          }
                          title="Edit budget"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setBudgetToDelete(
                              currentBudget
                            )
                          }
                          title="Delete budget"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              {currentBudget &&
                editingBudgetId ===
                  currentBudget.id &&
                renderForm()}

              {budgets.some(
                (budget) =>
                  budget.budget_year !==
                  currentYear
              ) && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Budget History
                  </p>

                  {budgets
                    .filter(
                      (budget) =>
                        budget.budget_year !==
                        currentYear
                    )
                    .map((budget) => {
                      const variance =
                        getVariance(
                          budget
                        )

                      return (
                        <div
                          key={
                            budget.id
                          }
                        >
                          {editingBudgetId ===
                          budget.id ? (
                            renderForm()
                          ) : (
                            <div className="rounded-lg border p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold">
                                      {
                                        budget.budget_year
                                      }
                                    </p>

                                    {variance && (
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                          variance.isUnderBudget
                                            ? "bg-primary/10 text-primary"
                                            : "bg-destructive/10 text-destructive"
                                        }`}
                                      >
                                        {variance.isUnderBudget
                                          ? "Within Budget"
                                          : "Over Budget"}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Budget
                                      </p>

                                      <p className="mt-1 text-sm font-medium">
                                        {formatCurrency(
                                          budget.budget_amount
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Forecast
                                      </p>

                                      <p className="mt-1 text-sm font-medium">
                                        {formatCurrency(
                                          budget.forecast_amount
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Variance
                                      </p>

                                      <p className="mt-1 text-sm font-medium">
                                        {variance
                                          ? formatCurrency(
                                              Math.abs(
                                                variance.amount
                                              )
                                            )
                                          : "—"}
                                      </p>
                                    </div>
                                  </div>

                                  {budget.notes && (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                      {
                                        budget.notes
                                      }
                                    </p>
                                  )}
                                </div>

                                <div className="flex shrink-0 gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      startEdit(
                                        budget
                                      )
                                    }
                                    title="Edit budget"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setBudgetToDelete(
                                        budget
                                      )
                                    }
                                    title="Delete budget"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </InfoCard>

      <AlertDialog
        open={Boolean(
          budgetToDelete
        )}
        onOpenChange={(open) => {
          if (!open) {
            setBudgetToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete budget?
            </AlertDialogTitle>

            <AlertDialogDescription>
              {budgetToDelete ? (
                <>
                  This will permanently delete the{" "}
                  <span className="font-medium text-foreground">
                    {budgetToDelete.budget_year}
                  </span>{" "}
                  vendor budget. This action cannot be undone.
                </>
              ) : (
                "This budget will be permanently deleted."
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
                deletingBudgetId !==
                null
              }
              onClick={async (
                event
              ) => {
                event.preventDefault()

                if (!budgetToDelete) {
                  return
                }

                await deleteBudget(
                  budgetToDelete.id
                )
              }}
            >
              {deletingBudgetId
                ? "Deleting..."
                : "Delete Budget"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}