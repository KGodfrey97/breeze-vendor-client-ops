"use client"

import { useEffect, useState } from "react"
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Target,
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

type VendorMetric = {
  id: string
  vendor_id: string
  name: string
  description: string | null
  metric_type: "kpi" | "sla"
  unit: string
  comparison_operator: ">=" | "<=" | ">" | "<" | "="
  target_value: number | string
  weight: number | string
  reporting_frequency:
    | "weekly"
    | "monthly"
    | "quarterly"
    | "annually"
  is_active: boolean
  notes: string | null

  latest_actual_value: number | string | null
  latest_status: "met" | "missed" | "not_measured" | null
  latest_period_start: string | null
  latest_period_end: string | null
}

type MetricResult = {
  id: string
  metric_id: string
  vendor_id: string
  period_start: string
  period_end: string
  actual_value: number | string
  status: "met" | "missed" | "not_measured"
  notes: string | null
  created_at: string
  updated_at: string
}

type MetricForm = {
  name: string
  description: string
  metricType: "kpi" | "sla"
  unit: string
  comparisonOperator: ">=" | "<=" | ">" | "<" | "="
  targetValue: string
  weight: string
  reportingFrequency:
    | "weekly"
    | "monthly"
    | "quarterly"
    | "annually"
  isActive: boolean
  notes: string
}

type ResultForm = {
  periodStart: string
  periodEnd: string
  actualValue: string
  notes: string
}

type VendorPerformanceProps = {
  vendorId: string
  onUpdated?: () => void | Promise<void>
}

const EMPTY_METRIC_FORM: MetricForm = {
  name: "",
  description: "",
  metricType: "kpi",
  unit: "percentage",
  comparisonOperator: ">=",
  targetValue: "",
  weight: "1",
  reportingFrequency: "monthly",
  isActive: true,
  notes: "",
}

const EMPTY_RESULT_FORM: ResultForm = {
  periodStart: "",
  periodEnd: "",
  actualValue: "",
  notes: "",
}

export function VendorPerformance({
  vendorId,
  onUpdated,
}: VendorPerformanceProps) {
  const [metrics, setMetrics] = useState<VendorMetric[]>([])
  const [results, setResults] = useState<Record<string, MetricResult[]>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addingMetric, setAddingMetric] = useState(false)
  const [editingMetricId, setEditingMetricId] =
    useState<string | null>(null)

  const [metricForm, setMetricForm] =
    useState<MetricForm>(EMPTY_METRIC_FORM)

  const [expandedMetricId, setExpandedMetricId] =
    useState<string | null>(null)

  const [addingResultMetricId, setAddingResultMetricId] =
    useState<string | null>(null)

  const [editingResultId, setEditingResultId] =
    useState<string | null>(null)

  const [resultForm, setResultForm] =
    useState<ResultForm>(EMPTY_RESULT_FORM)

  const [metricToDelete, setMetricToDelete] =
    useState<VendorMetric | null>(null)

  const [resultToDelete, setResultToDelete] =
    useState<{
      metricId: string
      result: MetricResult
    } | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const notifyParent = async () => {
    if (onUpdated) {
      await onUpdated()
    }
  }

  const fetchMetrics = async () => {
    try {
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/metrics`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load vendor performance"
        )
      }

      setMetrics(data.metrics || [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load vendor performance"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const fetchResults = async (
    metricId: string
  ) => {
    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/metrics/${metricId}/results`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load metric results"
        )
      }

      setResults((prev) => ({
        ...prev,
        [metricId]: data.results || [],
      }))
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load metric results"
      )
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [vendorId])

  const resetMetricForm = () => {
    setMetricForm(EMPTY_METRIC_FORM)
    setAddingMetric(false)
    setEditingMetricId(null)
  }

  const startAddMetric = () => {
    setEditingMetricId(null)
    setMetricForm(EMPTY_METRIC_FORM)
    setAddingMetric(true)
  }

  const startEditMetric = (
    metric: VendorMetric
  ) => {
    setAddingMetric(false)
    setEditingMetricId(metric.id)

    setMetricForm({
      name: metric.name,
      description: metric.description || "",
      metricType: metric.metric_type,
      unit: metric.unit,
      comparisonOperator:
        metric.comparison_operator,
      targetValue: String(metric.target_value),
      weight: String(metric.weight),
      reportingFrequency:
        metric.reporting_frequency,
      isActive: metric.is_active,
      notes: metric.notes || "",
    })
  }

  const saveNewMetric = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/metrics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metricForm),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create metric"
        )
      }

      await fetchMetrics()
      await notifyParent()
      resetMetricForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create metric"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const saveEditedMetric = async () => {
    if (!editingMetricId) return

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/metrics/${editingMetricId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metricForm),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update metric"
        )
      }

      await fetchMetrics()
      await notifyParent()
      resetMetricForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update metric"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteMetric = async (
    metricId: string
  ) => {
    try {
      setIsDeleting(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/metrics/${metricId}`,
        {
          method: "DELETE",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete metric"
        )
      }

      await fetchMetrics()
      await notifyParent()

      setMetricToDelete(null)

      setResults((prev) => {
        const copy = { ...prev }
        delete copy[metricId]
        return copy
      })
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete metric"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleExpanded = async (
    metricId: string
  ) => {
    if (expandedMetricId === metricId) {
      setExpandedMetricId(null)
      return
    }

    setExpandedMetricId(metricId)

    if (!results[metricId]) {
      await fetchResults(metricId)
    }
  }

  const startAddResult = (
    metricId: string
  ) => {
    setEditingResultId(null)
    setAddingResultMetricId(metricId)
    setResultForm(EMPTY_RESULT_FORM)
  }

  const startEditResult = (
    metricId: string,
    result: MetricResult
  ) => {
    setAddingResultMetricId(metricId)
    setEditingResultId(result.id)

    setResultForm({
      periodStart:
        result.period_start?.slice(0, 10) || "",
      periodEnd:
        result.period_end?.slice(0, 10) || "",
      actualValue: String(result.actual_value),
      notes: result.notes || "",
    })
  }

  const resetResultForm = () => {
    setAddingResultMetricId(null)
    setEditingResultId(null)
    setResultForm(EMPTY_RESULT_FORM)
  }

  const saveNewResult = async (
    metricId: string
  ) => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/metrics/${metricId}/results`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resultForm),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to add result"
        )
      }

      await fetchResults(metricId)
      await fetchMetrics()
      await notifyParent()
      resetResultForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to add result"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const saveEditedResult = async (
    metricId: string
  ) => {
    if (!editingResultId) return

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/metrics/${metricId}/results/${editingResultId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resultForm),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update result"
        )
      }

      await fetchResults(metricId)
      await fetchMetrics()
      await notifyParent()
      resetResultForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update result"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteResult = async (
    metricId: string,
    resultId: string
  ) => {
    try {
      setIsDeleting(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/metrics/${metricId}/results/${resultId}`,
        {
          method: "DELETE",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete result"
        )
      }

      await fetchResults(metricId)
      await fetchMetrics()
      await notifyParent()
      setResultToDelete(null)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete result"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const formatValue = (
    value: number | string | null,
    unit: string
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—"
    }

    const numeric = Number(value)

    switch (unit.toLowerCase()) {
      case "percentage":
      case "percent":
      case "%":
        return `${numeric}%`

      case "currency":
      case "dollars":
        return new Intl.NumberFormat(
          "en-US",
          {
            style: "currency",
            currency: "USD",
          }
        ).format(numeric)

      case "hours":
        return `${numeric} hrs`

      case "days":
        return `${numeric} days`

      default:
        return `${numeric} ${unit}`
    }
  }

  const formatDate = (
    value: string | null
  ) => {
    if (!value) return "—"

    return new Date(
      `${value.slice(0, 10)}T00:00:00`
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusClasses = (
    status: string | null
  ) => {
    if (status === "met") {
      return "bg-primary/10"
    }

    if (status === "missed") {
      return "bg-desctructive/10"
    }

    return "bg-muted text-muted-foreground"
  }

  const getStatusLabel = (
    status: string | null
  ) => {
    if (status === "met") return "Met"
    if (status === "missed") return "Missed"
    return "Not Measured"
  }

  const renderMetricForm = () => (
    <div className="space-y-5 rounded-lg border bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <div className="space-y-2 md:col-span-2">
          <Label>Metric Name</Label>

          <Input
            placeholder="Accuracy Rate"
            value={metricForm.name}
            onChange={(e) =>
              setMetricForm({
                ...metricForm,
                name: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Metric Type</Label>

          <Select
            value={metricForm.metricType}
            onValueChange={(value) =>
              setMetricForm({
                ...metricForm,
                metricType:
                  value as "kpi" | "sla",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="kpi">
                KPI
              </SelectItem>

              <SelectItem value="sla">
                SLA
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Unit</Label>

          <Select
            value={metricForm.unit}
            onValueChange={(value) =>
              setMetricForm({
                ...metricForm,
                unit: value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="percentage">
                Percentage
              </SelectItem>

              <SelectItem value="hours">
                Hours
              </SelectItem>

              <SelectItem value="days">
                Days
              </SelectItem>

              <SelectItem value="currency">
                Currency
              </SelectItem>

              <SelectItem value="count">
                Count
              </SelectItem>

              <SelectItem value="score">
                Score
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Comparison
          </Label>

          <Select
            value={
              metricForm.comparisonOperator
            }
            onValueChange={(value) =>
              setMetricForm({
                ...metricForm,
                comparisonOperator:
                  value as MetricForm["comparisonOperator"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value=">=">
                Greater than or equal
              </SelectItem>

              <SelectItem value="<=">
                Less than or equal
              </SelectItem>

              <SelectItem value=">">
                Greater than
              </SelectItem>

              <SelectItem value="<">
                Less than
              </SelectItem>

              <SelectItem value="=">
                Equal to
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Target Value
          </Label>

          <Input
            type="number"
            step="0.0001"
            value={
              metricForm.targetValue
            }
            onChange={(e) =>
              setMetricForm({
                ...metricForm,
                targetValue:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>
            Reporting Frequency
          </Label>

          <Select
            value={
              metricForm.reportingFrequency
            }
            onValueChange={(value) =>
              setMetricForm({
                ...metricForm,
                reportingFrequency:
                  value as MetricForm["reportingFrequency"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="weekly">
                Weekly
              </SelectItem>

              <SelectItem value="monthly">
                Monthly
              </SelectItem>

              <SelectItem value="quarterly">
                Quarterly
              </SelectItem>

              <SelectItem value="annually">
                Annually
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Weight
          </Label>

          <Input
            type="number"
            min="0"
            step="0.1"
            value={metricForm.weight}
            onChange={(e) =>
              setMetricForm({
                ...metricForm,
                weight: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>
            Description
          </Label>

          <Textarea
            value={
              metricForm.description
            }
            onChange={(e) =>
              setMetricForm({
                ...metricForm,
                description:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>
            Notes
          </Label>

          <Textarea
            value={metricForm.notes}
            onChange={(e) =>
              setMetricForm({
                ...metricForm,
                notes: e.target.value,
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetMetricForm}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>

        <Button
          size="sm"
          disabled={
            isSaving ||
            !metricForm.name ||
            !metricForm.targetValue
          }
          onClick={
            editingMetricId
              ? saveEditedMetric
              : saveNewMetric
          }
        >
          <Check className="mr-2 h-4 w-4" />

          {isSaving
            ? "Saving..."
            : editingMetricId
            ? "Save Changes"
            : "Add Metric"}
        </Button>
      </div>
    </div>
  )

  const renderResultForm = (
    metricId: string
  ) => (
    <div className="mt-3 space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="space-y-2">
          <Label>
            Period Start
          </Label>

          <Input
            type="date"
            value={
              resultForm.periodStart
            }
            onChange={(e) =>
              setResultForm({
                ...resultForm,
                periodStart:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>
            Period End
          </Label>

          <Input
            type="date"
            value={
              resultForm.periodEnd
            }
            onChange={(e) =>
              setResultForm({
                ...resultForm,
                periodEnd:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>
            Actual Value
          </Label>

          <Input
            type="number"
            step="0.0001"
            value={
              resultForm.actualValue
            }
            onChange={(e) =>
              setResultForm({
                ...resultForm,
                actualValue:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label>
            Notes
          </Label>

          <Textarea
            value={resultForm.notes}
            onChange={(e) =>
              setResultForm({
                ...resultForm,
                notes: e.target.value,
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetResultForm}
        >
          Cancel
        </Button>

        <Button
          size="sm"
          disabled={
            isSaving ||
            !resultForm.periodStart ||
            !resultForm.periodEnd ||
            !resultForm.actualValue
          }
          onClick={() =>
            editingResultId
              ? saveEditedResult(
                  metricId
                )
              : saveNewResult(
                  metricId
                )
          }
        >
          {editingResultId
            ? "Save Result"
            : "Add Result"}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <InfoCard
        title="Performance"
        icon={BarChart3}
        action={
          !addingMetric &&
          !editingMetricId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={
                startAddMetric
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Metric
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

          {addingMetric &&
            renderMetricForm()}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading performance...
            </p>
          ) : metrics.length === 0 &&
            !addingMetric ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

              <p className="font-medium">
                No KPIs or SLAs yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Add performance metrics to track whether this vendor is meeting expectations.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={
                  startAddMetric
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Metric
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.map(
                (metric) => (
                  <div
                    key={metric.id}
                  >
                    {editingMetricId ===
                    metric.id ? (
                      renderMetricForm()
                    ) : (
                      <div className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-semibold">
                                {metric.name}
                              </p>

                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase">
                                {
                                  metric.metric_type
                                }
                              </span>

                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                                  metric.latest_status
                                )}`}
                              >
                                {getStatusLabel(
                                  metric.latest_status
                                )}
                              </span>
                            </div>

                            {metric.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {
                                  metric.description
                                }
                              </p>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Target
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {
                                    metric.comparison_operator
                                  }{" "}
                                  {formatValue(
                                    metric.target_value,
                                    metric.unit
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Latest
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {formatValue(
                                    metric.latest_actual_value,
                                    metric.unit
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Frequency
                                </p>

                                <p className="mt-1 text-sm font-medium capitalize">
                                  {
                                    metric.reporting_frequency
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Weight
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {Number(
                                    metric.weight
                                  )}
                                </p>
                              </div>
                            </div>

                            {metric.latest_period_end && (
                              <p className="mt-3 text-xs text-muted-foreground">
                                Latest period:{" "}
                                {formatDate(
                                  metric.latest_period_start
                                )}{" "}
                                –{" "}
                                {formatDate(
                                  metric.latest_period_end
                                )}
                              </p>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-3 px-0"
                              onClick={() =>
                                toggleExpanded(
                                  metric.id
                                )
                              }
                            >
                              {expandedMetricId ===
                              metric.id ? (
                                <ChevronUp className="mr-2 h-4 w-4" />
                              ) : (
                                <ChevronDown className="mr-2 h-4 w-4" />
                              )}

                              History
                            </Button>

                            {expandedMetricId ===
                              metric.id && (
                              <div className="mt-3 space-y-3">

                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      startAddResult(
                                        metric.id
                                      )
                                    }
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Result
                                  </Button>
                                </div>

                                {addingResultMetricId ===
                                  metric.id &&
                                  renderResultForm(
                                    metric.id
                                  )}

                                {(results[
                                  metric.id
                                ] || []).length ===
                                0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No results recorded yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {(
                                      results[
                                        metric.id
                                      ] || []
                                    ).map(
                                      (
                                        result
                                      ) => (
                                        <div
                                          key={
                                            result.id
                                          }
                                          className="rounded-md border bg-background p-3"
                                        >
                                          {editingResultId ===
                                            result.id ? (
                                            renderResultForm(
                                              metric.id
                                            )
                                          ) : (
                                            <div className="flex items-center justify-between gap-4">

                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                                                      result.status
                                                    )}`}
                                                  >
                                                    {getStatusLabel(
                                                      result.status
                                                    )}
                                                  </span>

                                                  <span className="font-medium">
                                                    {formatValue(
                                                      result.actual_value,
                                                      metric.unit
                                                    )}
                                                  </span>
                                                </div>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                  {formatDate(
                                                    result.period_start
                                                  )}{" "}
                                                  –{" "}
                                                  {formatDate(
                                                    result.period_end
                                                  )}
                                                </p>

                                                {result.notes && (
                                                  <p className="mt-2 text-sm text-muted-foreground">
                                                    {
                                                      result.notes
                                                    }
                                                  </p>
                                                )}
                                              </div>

                                              <div className="flex gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() =>
                                                    startEditResult(
                                                      metric.id,
                                                      result
                                                    )
                                                  }
                                                >
                                                  <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() =>
                                                    setResultToDelete(
                                                      {
                                                        metricId:
                                                          metric.id,
                                                        result,
                                                      }
                                                    )
                                                  }
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                startEditMetric(
                                  metric
                                )
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setMetricToDelete(
                                  metric
                                )
                              }
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
          metricToDelete
        )}
        onOpenChange={(open) => {
          if (!open) {
            setMetricToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete metric?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Deleting this metric will also delete all of its recorded results.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async (
                event
              ) => {
                event.preventDefault()

                if (!metricToDelete) {
                  return
                }

                await deleteMetric(
                  metricToDelete.id
                )
              }}
            >
              {isDeleting
                ? "Deleting..."
                : "Delete Metric"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(
          resultToDelete
        )}
        onOpenChange={(open) => {
          if (!open) {
            setResultToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete result?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This performance result will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async (
                event
              ) => {
                event.preventDefault()

                if (!resultToDelete) {
                  return
                }

                await deleteResult(
                  resultToDelete.metricId,
                  resultToDelete.result.id
                )
              }}
            >
              {isDeleting
                ? "Deleting..."
                : "Delete Result"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}