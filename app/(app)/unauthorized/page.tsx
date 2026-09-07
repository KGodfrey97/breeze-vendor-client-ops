import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="app-page">
      <section className="app-hero">
        <div className="app-hero-inner">
          <div className="space-y-4">
            <div className="app-eyebrow">
              Access Control
            </div>
            <div className="space-y-3">
              <h1 className="app-title">Unauthorized</h1>
              <p className="app-subtitle">
                You do not have permission to view this area. Contact an administrator if you need expanded access.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Your current role does not include access to this page.</span>
          <Button asChild variant="outline">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
