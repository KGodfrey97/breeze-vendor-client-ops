"use client"

import { BRAND } from "@/lib/brand";

import type React from "react"

import { useState, useEffect, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useLogin"
import Image from "next/image"

type AuthStep = 'credentials' | 'mfa';

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()

  const { login, submitMFA } = useAuth();
  const [step, setStep] = useState<AuthStep>('credentials');
  const [mfaCode, setMfaCode] = useState('');

  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const messageParam = searchParams.get("message")
    if (messageParam) {
      setMessage(messageParam)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    setError(null)
    setLoading(true);

    startTransition(async () => {
      try {
        const result = await login(email, password);
        console.log("Login result:", result);

        if (!result) {
          setError("Login failed");
          return;
        }

        if (result.isSignedIn) {
          console.log("Redirecting to dashboard...");
          router.replace('/');
          router.refresh();
        } else if (result.nextStep === 'MFA_REQUIRED') {
          // MFA required — move to next step
          setStep('mfa');
        } else if (result.nextStep === 'CONFIRM_SIGN_UP') {
          router.push(`/auth/confirm?email=${encodeURIComponent(email)}`);
        }
        
        if (result?.error) {
          console.error("Sign in error:", result.error)
          
          // Provide more user-friendly error messages
          if (result.error.includes("Invalid login credentials")) {
            setError("Invalid email or password. Please check your credentials and try again.")
          } else if (result.error.includes("Email not confirmed")) {
            setError("Please check your email and click the confirmation link before signing in.")
          } else if (result.error.includes("Too many requests")) {
            setError("Too many sign in attempts. Please wait a moment before trying again.")
          } else {
            setError(result.error || "Failed to sign in. Please try again.")
          } 
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
        setLoading(false);
      }
    })
  }

  const handleMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await submitMFA(mfaCode);
      if (result?.isSignedIn) {
        router.replace('/');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="brand-mark overflow-hidden h-16 w-16">
            <Image
              src="/logo.png"
              alt={BRAND.name}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground font-sans">
            {BRAND.name}
            <span className="text-primary font-sans">.</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your healthcare claims management account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{BRAND.auth.loginTitle}</CardTitle>
            <CardDescription>{BRAND.auth.loginDescription}</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {message && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isPending}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isPending}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isPending || !email || !password}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? "Signing In..." : "Sign In"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
