"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type VendorStatus =
  | "active"
  | "onboarding"
  | "under_review"
  | "inactive"

type BudgetStatus =
  | "in_budget"
  | "at_risk"
  | "over_budget"

type Vendor = {
  id: string
  name: string
  lob: string
  grade: string
  tier: string
  budgetStatus: BudgetStatus
  contractRenewalDate: string
  status: VendorStatus
  color: string
}

const sampleVendors: Vendor[] = [
  {
    id: "1",
    name: "Acme Billing",
    lob: "Billing",
    grade: "A",
    tier: "Tier 1",
    budgetStatus: "in_budget",
    contractRenewalDate: "2026-12-31",
    status: "active",
    color: "#3B82F6",
  },
  {
    id: "2",
    name: "ClearPath RCM",
    lob: "RCM",
    grade: "B",
    tier: "Tier 1",
    budgetStatus: "over_budget",
    contractRenewalDate: "2026-11-15",
    status: "under_review",
    color: "#8B5CF6",
  },
  {
    id: "3",
    name: "SecureTech",
    lob: "Cyber Security",
    grade: "A",
    tier: "Tier 2",
    budgetStatus: "in_budget",
    contractRenewalDate: "2027-03-01",
    status: "active",
    color: "#14B8A6",
  },
]

export function VendorsClientPage() {
  const router = useRouter()
  const [status, setStatus] = useState("all")

  const filteredVendors =
    status === "all"
      ? sampleVendors
      : sampleVendors.filter((vendor) => vendor.status === status)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const formatStatus = (value: string) =>
    value
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ")

  const getBudgetLabel = (status: BudgetStatus) => {
    switch (status) {
      case "in_budget":
        return "In Budget"
      case "at_risk":
        return "At Risk"
      case "over_budget":
        return "Over Budget"
    }
  }

  return (
    <div className="app-page">
      <Card className="app-surface">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">

            {/* Top Row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">
                  Vendors
                </h1>

                <p className="text-sm text-muted-foreground">
                  Manage vendor relationships, contracts,
                  performance, and operational risk.
                </p>
              </div>

              <Button
                onClick={() => router.push("/vendors/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Vendor
              </Button>
            </div>

            <Tabs
              value={status}
              onValueChange={setStatus}
              className="space-y-4"
            >
              <div className="flex w-full items-center justify-between">
                <TabsList>
                  <TabsTrigger value="all">
                    All Vendors
                  </TabsTrigger>

                  <TabsTrigger value="active">
                    Active
                  </TabsTrigger>

                  <TabsTrigger value="onboarding">
                    Onboarding
                  </TabsTrigger>

                  <TabsTrigger value="under_review">
                    Under Review
                  </TabsTrigger>

                  <TabsTrigger value="inactive">
                    Inactive
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={status}>
                {filteredVendors.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="mb-2 text-lg">
                      No vendors found
                    </p>

                    <p className="mb-4 text-sm">
                      There are no vendors with this status.
                    </p>

                    <Button
                      onClick={() =>
                        router.push("/vendors/new")
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Vendor
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor</TableHead>
                          <TableHead>LOB</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>
                            Contract Renewal
                          </TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filteredVendors.map((vendor) => (
                          <TableRow
                            key={vendor.id}
                            className="cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/vendors/${vendor.id}`
                              )
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{
                                    backgroundColor:
                                      vendor.color,
                                  }}
                                />

                                <span className="font-medium">
                                  {vendor.name}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              {vendor.lob}
                            </TableCell>

                            <TableCell>
                              <span className="font-semibold">
                                {vendor.grade}
                              </span>
                            </TableCell>

                            <TableCell>
                              {vendor.tier}
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    vendor.budgetStatus ===
                                    "in_budget"
                                      ? "bg-emerald-500"
                                      : vendor.budgetStatus ===
                                        "at_risk"
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  }`}
                                />

                                {getBudgetLabel(
                                  vendor.budgetStatus
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              {formatDate(
                                vendor.contractRenewalDate
                              )}
                            </TableCell>

                            <TableCell>
                              {formatStatus(
                                vendor.status
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}