import React, { Suspense } from "react"
import ConfirmPage from "./components/ConfirmPage"

function LoadingFallback() {
  return (
    <div className="flex justify-center py-6">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
    </div>
  )
}

export default function Page() {
  return (
    <div className="auth-page">
      <div className="w-full max-w-sm">
        <Suspense fallback={<LoadingFallback />}>
          <ConfirmPage />
        </Suspense>
      </div>
    </div>
  )
}