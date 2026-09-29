"use client"

import {
  useEffect,
  useState,
} from "react"

import {
  Edit3,
  Loader2,
  Save,
  Star,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { cn } from "@/lib/utils"

type RatingKey =
  | "responsiveness"
  | "adaptability"
  | "compliance"
  | "relationship"

type VendorRatings = {
  responsiveness: number | null
  adaptability: number | null
  compliance: number | null
  relationship: number | null
  updatedAt: string | null
}

type VendorRelationshipRatingsProps = {
  vendorId: string
  onUpdated?: () =>
    void | Promise<void>
}

const RATING_OPTIONS: Array<{
  key: RatingKey
  label: string
  description: string
  weight: number
}> = [
  {
    key: "responsiveness",
    label: "Responsiveness",
    description:
      "Speed and consistency when responding to requests or issues.",
    weight: 7,
  },
  {
    key: "adaptability",
    label: "Adaptability",
    description:
      "Ability to adjust to changing business needs and requirements.",
    weight: 7,
  },
  {
    key: "compliance",
    label: "Compliance",
    description:
      "Adherence to agreed processes, requirements, and expectations.",
    weight: 7,
  },
  {
    key: "relationship",
    label: "Relationship",
    description:
      "Overall quality of the vendor relationship and collaboration.",
    weight: 7,
  },
]

const EMPTY_RATINGS: VendorRatings = {
  responsiveness: null,
  adaptability: null,
  compliance: null,
  relationship: null,
  updatedAt: null,
}

function StarRating({
  value,
  editable = false,
  onChange,
}: {
  value: number | null
  editable?: boolean
  onChange?: (
    value: number | null
  ) => void
}) {
  const [
    hoverValue,
    setHoverValue,
  ] =
    useState<number | null>(
      null
    )

  const displayValue =
    hoverValue ??
    value ??
    0

  return (
    <div className="flex items-center gap-1">
      {[
        1,
        2,
        3,
        4,
        5,
      ].map(
        (star) => {
          const active =
            star <=
            displayValue

          if (!editable) {
            return (
              <Star
                key={
                  star
                }
                className={cn(
                  "h-5 w-5",
                  active
                    ? "fill-warning text-warning"
                    : "text-muted-foreground/30"
                )}
              />
            )
          }

          return (
            <button
              key={
                star
              }
              type="button"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onMouseEnter={() =>
                setHoverValue(
                  star
                )
              }
              onMouseLeave={() =>
                setHoverValue(
                  null
                )
              }
              onClick={() => {
                if (
                  value ===
                  star
                ) {
                  onChange?.(
                    null
                  )
                } else {
                  onChange?.(
                    star
                  )
                }
              }}
              aria-label={`Rate ${star} out of 5`}
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  active
                    ? "fill-warning text-warning"
                    : "text-muted-foreground/30 hover:text-warning"
                )}
              />
            </button>
          )
        }
      )}
    </div>
  )
}

export function VendorRelationshipRatings({
  vendorId,
  onUpdated,
}: VendorRelationshipRatingsProps) {
  const [
    ratings,
    setRatings,
  ] =
    useState<VendorRatings>(
      EMPTY_RATINGS
    )

  const [
    draftRatings,
    setDraftRatings,
  ] =
    useState<VendorRatings>(
      EMPTY_RATINGS
    )

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    isEditing,
    setIsEditing,
  ] = useState(false)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  // --------------------------------------------------
  // Load ratings
  // --------------------------------------------------

  const fetchRatings =
    async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response =
          await fetch(
            `/api/vendors/${vendorId}/ratings`,
            {
              cache:
                "no-store",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load vendor ratings"
          )
        }

        const nextRatings: VendorRatings =
          {
            responsiveness:
              data.ratings
                ?.responsiveness ??
              null,

            adaptability:
              data.ratings
                ?.adaptability ??
              null,

            compliance:
              data.ratings
                ?.compliance ??
              null,

            relationship:
              data.ratings
                ?.relationship ??
              null,

            updatedAt:
              data.ratings
                ?.updatedAt ??
              null,
          }

        setRatings(
          nextRatings
        )

        setDraftRatings(
          nextRatings
        )
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load vendor ratings"
        )
      } finally {
        setIsLoading(
          false
        )
      }
    }

  useEffect(() => {
    fetchRatings()
  }, [vendorId])

  // --------------------------------------------------
  // Edit
  // --------------------------------------------------

  const startEditing =
    () => {
      setDraftRatings(
        ratings
      )

      setError(null)

      setIsEditing(
        true
      )
    }

  const cancelEditing =
    () => {
      setDraftRatings(
        ratings
      )

      setError(null)

      setIsEditing(
        false
      )
    }

  const updateDraftRating =
    (
      key: RatingKey,
      value: number | null
    ) => {
      setDraftRatings(
        (
          previous
        ) => ({
          ...previous,
          [key]:
            value,
        })
      )
    }

  // --------------------------------------------------
  // Save
  // --------------------------------------------------

  const saveRatings =
    async () => {
      try {
        setIsSaving(true)
        setError(null)

        const response =
          await fetch(
            `/api/vendors/${vendorId}/ratings`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  responsiveness:
                    draftRatings.responsiveness,

                  adaptability:
                    draftRatings.adaptability,

                  compliance:
                    draftRatings.compliance,

                  relationship:
                    draftRatings.relationship,
                }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to save vendor ratings"
          )
        }

        const updatedRatings: VendorRatings =
          {
            responsiveness:
              data.ratings
                ?.responsiveness ??
              null,

            adaptability:
              data.ratings
                ?.adaptability ??
              null,

            compliance:
              data.ratings
                ?.compliance ??
              null,

            relationship:
              data.ratings
                ?.relationship ??
              null,

            updatedAt:
              data.ratings
                ?.updatedAt ??
              null,
          }

        setRatings(
          updatedRatings
        )

        setDraftRatings(
          updatedRatings
        )

        setIsEditing(
          false
        )

        await onUpdated?.()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save vendor ratings"
        )
      } finally {
        setIsSaving(
          false
        )
      }
    }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const formatUpdatedAt =
    (
      value:
        | string
        | null
    ) => {
      if (!value) {
        return null
      }

      const date =
        new Date(
          value
        )

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null
      }

      return date.toLocaleDateString(
        "en-US",
        {
          month:
            "short",
          day:
            "numeric",
          year:
            "numeric",
        }
      )
    }

  const activeRatings =
    isEditing
      ? draftRatings
      : ratings

  const ratedValues =
    [
      activeRatings.responsiveness,
      activeRatings.adaptability,
      activeRatings.compliance,
      activeRatings.relationship,
    ].filter(
      (
        value
      ): value is number =>
        value !== null
    )

  const averageRating =
    ratedValues.length >
    0
      ? ratedValues.reduce(
          (
            total,
            value
          ) =>
            total +
            value,
          0
        ) /
        ratedValues.length
      : null

  const updatedAt =
    formatUpdatedAt(
      ratings.updatedAt
    )

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <Card className="app-surface">

      <CardHeader>
        <div className="flex items-start justify-between gap-4">

          <div>
            <CardTitle>
              Relationship Ratings
            </CardTitle>

            <CardDescription>
              Qualitative vendor ratings that contribute to overall health.
            </CardDescription>
          </div>

          {!isLoading ? (
            isEditing ? (
              <div className="flex items-center gap-2">

                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    cancelEditing
                  }
                  disabled={
                    isSaving
                  }
                >
                  <X className="mr-2 h-4 w-4" />

                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={
                    saveRatings
                  }
                  disabled={
                    isSaving
                  }
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}

                  Save
                </Button>

              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={
                  startEditing
                }
              >
                <Edit3 className="mr-2 h-4 w-4" />

                Edit
              </Button>
            )
          ) : null}

        </div>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* Error */}

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {/* Loading */}

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <div className="text-center">

              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />

              <p className="mt-2 text-sm text-muted-foreground">
                Loading ratings...
              </p>

            </div>
          </div>
        ) : (
          <>
            {/* Average */}

            <div className="rounded-xl border border-border bg-muted/20 p-4">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-sm font-medium">
                    Average Relationship Rating
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Across currently rated categories
                  </p>
                </div>

                <div className="flex items-center gap-3">

                  <StarRating
                    value={
                      averageRating !==
                      null
                        ? Math.round(
                            averageRating
                          )
                        : null
                    }
                  />

                  <span className="text-lg font-semibold">
                    {averageRating !==
                    null
                      ? averageRating.toFixed(
                          1
                        )
                      : "—"}

                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / 5
                    </span>
                  </span>

                </div>
              </div>

            </div>

            {/* Rating rows */}

            <div className="divide-y divide-border rounded-xl border border-border">

              {RATING_OPTIONS.map(
                (
                  option
                ) => {
                  const value =
                    activeRatings[
                      option.key
                    ]

                  return (
                    <div
                      key={
                        option.key
                      }
                      className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
                    >

                      <div>
                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-medium">
                            {
                              option.label
                            }
                          </p>

                          <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                            {
                              option.weight
                            }
                            % of health
                          </span>

                        </div>

                        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                          {
                            option.description
                          }
                        </p>
                      </div>

                      <div className="flex items-center gap-3">

                        <StarRating
                          value={
                            value
                          }
                          editable={
                            isEditing
                          }
                          onChange={(
                            rating
                          ) =>
                            updateDraftRating(
                              option.key,
                              rating
                            )
                          }
                        />

                        <span className="w-10 text-right text-sm font-medium">
                          {value !==
                          null
                            ? `${value}/5`
                            : "—"}
                        </span>

                      </div>

                    </div>
                  )
                }
              )}

            </div>

            {/* Footer */}

            <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">

              <p>
                These four ratings contribute a combined{" "}
                <span className="font-medium text-foreground">
                  28%
                </span>{" "}
                to the vendor health score.
              </p>

              {updatedAt ? (
                <p>
                  Last updated{" "}
                  {
                    updatedAt
                  }
                </p>
              ) : null}

            </div>
          </>
        )}

      </CardContent>
    </Card>
  )
}