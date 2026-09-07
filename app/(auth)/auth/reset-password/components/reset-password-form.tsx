"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()

    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            code,
            newPassword: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Unable to reset password.")
      }

      setSuccess(true)

      setTimeout(() => {
        router.push("/auth/login")
      }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Updated</CardTitle>
            <CardDescription>
              Your password has been changed successfully.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">
              Redirecting to the login page...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter the verification code sent to your email along with your new password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="email">
                    Email
                </Label>

                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="code">
                    Verification Code
                </Label>

                <Input
                    id="code"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                New Password
              </Label>

              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Confirm Password
              </Label>

              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>

            <div className="text-center text-sm">
              <Link
                href="/auth/login"
                className="underline"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}