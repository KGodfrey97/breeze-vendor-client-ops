"use client"

import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  CircleDollarSign,
  FileText,
  Gauge,
  Pencil,
  User,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { InfoCard } from "@/components/ui/info-card"
import { InfoField } from "@/components/ui/info-field"
import { InfoGrid } from "@/components/ui/info-grid"

type Vendor = {
  id: string
  name: string
  lob: string
  grade: string
  tier: string
  status: string

  primaryContact: string
  email: string

  annualBudget: number
  actualSpend: number

  contractStartDate: string
  contractRenewalDate: string
  contractStatus: string

  kpiScore: number
  slaScore: number
}

const sampleVendors: Record<string, Vendor> = {
  "1": {
    id: "1",
    name: "Acme Billing",
    lob: "Billing",
    grade: "A",
    tier: "Tier 1",
    status: "Active",

    primaryContact: "Jane Smith",
    email: "jane@example.com",

    annualBudget: 1200000,
    actualSpend: 785000,

    contractStartDate: "2026-01-01",
    contractRenewalDate: "2026-12-31",
    contractStatus: "Active",

    kpiScore: 94,
    slaScore: 97,
  },

  "2": {
    id: "2",
    name: "ClearPath RCM",
    lob: "RCM",
    grade: "B",
    tier: "Tier 1",
    status: "Under Review",

    primaryContact: "Michael Carter",
    email: "michael@example.com",

    annualBudget: 900000,
    actualSpend: 935000,

    contractStartDate: "2025-11-15",
    contractRenewalDate: "2026-11-15",
    contractStatus: "Active",

    kpiScore: 87,
    slaScore: 91,
  },

  "3": {
    id: "3",
    name: "SecureTech",
    lob: "Cyber Security",
    grade: "A",
    tier: "Tier 2",
    status: "Active",

    primaryContact: "Sarah Johnson",
    email: "sarah@example.com",

    annualBudget: 450000,
    actualSpend: 280000,

    contractStartDate: "2026-03-01",
    contractRenewalDate: "2027-03-01",
    contractStatus: "Active",

    kpiScore: 96,
    slaScore: 99,
  },
}

export default function VendorDetailsPage() {
  const params = useParams()

  const vendorId = Array.isArray(params.id)
    ? params.id[0]
    : params.id

  const vendor = sampleVendors[vendorId]

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  if (!vendor) {
    return (
      <div className="container mx-auto p-3">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

            <h2 className="mb-2 text-xl font-semibold">
              Vendor Not Found
            </h2>

            <p className="mb-4 text-muted-foreground">
              The vendor you're looking for could not
              be found.
            </p>

            <Button asChild>
              <Link href="/vendors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const budgetRemaining =
    vendor.annualBudget - vendor.actualSpend

  const budgetStatus =
    budgetRemaining < 0
      ? "Over Budget"
      : "In Budget"

  return (
    <div className="container mx-auto p-3">
      <div className="mb-6">
        <div className="flex items-center justify-between">

          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/vendors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Vendors
              </Link>
            </Button>

            <div>
              <h1 className="text-3xl font-bold">
                {vendor.name}
              </h1>

              <p className="text-muted-foreground">
                {vendor.lob} • {vendor.tier}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <div className="rounded-lg border px-4 py-2">
              <p className="text-xs text-muted-foreground">
                Grade
              </p>

              <p className="text-lg font-bold">
                {vendor.grade}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">

          <InfoCard
            title="Vendor Information"
            icon={Building2}
          >
            <InfoGrid>
              <InfoField
                label="Vendor Name"
                value={vendor.name}
              />

              <InfoField
                label="Line of Business"
                value={vendor.lob}
              />

              <InfoField
                label="Vendor Tier"
                value={vendor.tier}
              />

              <InfoField
                label="Status"
                value={vendor.status}
              />
            </InfoGrid>
          </InfoCard>

          <InfoCard
            title="Primary Contact"
            icon={User}
          >
            <InfoGrid>
              <InfoField
                label="Contact Name"
                value={vendor.primaryContact}
              />

              <InfoField
                label="Email"
                value={vendor.email}
              />
            </InfoGrid>
          </InfoCard>

          <InfoCard
            title="Contract"
            icon={FileText}
          >
            <InfoGrid>
              <InfoField
                label="Contract Status"
                value={vendor.contractStatus}
              />

              <InfoField
                label="Start Date"
                value={formatDate(
                  vendor.contractStartDate
                )}
              />

              <InfoField
                label="Renewal Date"
                value={formatDate(
                  vendor.contractRenewalDate
                )}
              />

              <InfoField
                label="Annual Value"
                value={formatCurrency(
                  vendor.annualBudget
                )}
              />
            </InfoGrid>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          <InfoCard
            title="Budget"
            icon={CircleDollarSign}
          >
            <InfoGrid>
              <InfoField
                label="Annual Budget"
                value={formatCurrency(
                  vendor.annualBudget
                )}
              />

              <InfoField
                label="Actual Spend"
                value={formatCurrency(
                  vendor.actualSpend
                )}
              />

              <InfoField
                label="Remaining"
                value={formatCurrency(
                  budgetRemaining
                )}
              />

              <InfoField
                label="Budget Status"
                value={budgetStatus}
              />
            </InfoGrid>
          </InfoCard>

          <InfoCard
            title="Performance"
            icon={Gauge}
          >
            <InfoGrid>
              <InfoField
                label="Vendor Grade"
                value={vendor.grade}
              />

              <InfoField
                label="KPI Score"
                value={`${vendor.kpiScore}%`}
              />

              <InfoField
                label="SLA Score"
                value={`${vendor.slaScore}%`}
              />
            </InfoGrid>
          </InfoCard>
        </div>
      </div>
    </div>
  )
}