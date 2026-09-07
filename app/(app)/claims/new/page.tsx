import type { Metadata } from "next"
import { NewClaimForm } from "@/components/new-claim-form"
import { CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "New Claim | Healthcare Claims Claim Management",
  description: "Submit a new claim for a denied claim",
}

export default function NewClaimPage() {
  return (
    <div className="app-page">
      <NewClaimForm />
    </div>
  )
}
