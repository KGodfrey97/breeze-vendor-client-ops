import React, { Suspense } from "react"
import { LoginForm } from "./components/login-form"

function LoadingFallback() {
  return (
    <div className="flex justify-center py-6">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-transparent" />
    </div>
  )
}

export default function Page() {
  return (
    <div className="auth-page">
      <div className="w-full max-w-sm">
        <Suspense fallback={<LoadingFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
