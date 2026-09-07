"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "admin" | "provider" | "staff"
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile);
      });
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
        return
      }

      if (requiredRole && profile && profile.role !== requiredRole) {
        router.push("/unauthorized")
        return
      }
    }
  }, [user, profile, loading, router, requiredRole])

  if (loading || (requiredRole && user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRole && profile && profile.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
