"use client"

import { BRAND } from "@/lib/brand";
import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useCallback, useRef, useEffect, useTransition } from "react"
import {
  Activity,
  AlertCircle,
  Loader2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  PieChart,
  Plus,
  Settings,
  Shield,
  Users,
  ChevronUp,
  PanelLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarHeader, SidebarProvider } from "@/components/ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/hooks/useAuth"
import Image from "next/image"

const SIDEBAR_WIDTH_KEY = "sidebar-width"
const SIDEBAR_VISIBLE_KEY = "sidebar-visible"
const DEFAULT_SIDEBAR_WIDTH = 280
const ICON_MODE_WIDTH = 60

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile);
      });
  }, []);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true)

    // Load saved sidebar width and visibility from localStorage
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    const savedVisible = localStorage.getItem(SIDEBAR_VISIBLE_KEY)

    if (savedWidth) {
      const width = Number.parseInt(savedWidth, 10)
      if (width === ICON_MODE_WIDTH || width === DEFAULT_SIDEBAR_WIDTH) {
        setSidebarWidth(width)
      }
    }

    if (savedVisible !== null) {
      setSidebarVisible(savedVisible === "true")
    }
  }, [])

  // Save sidebar width to localStorage whenever it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString())
    }
  }, [sidebarWidth, isClient])

  // Save sidebar visibility to localStorage whenever it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(SIDEBAR_VISIBLE_KEY, sidebarVisible.toString())
    }
  }, [sidebarVisible, isClient])

  useEffect(() => {
    if (!isPending) {
      setPendingRoute(null)
    }
  }, [isPending])

  const routes = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Claims",
      href: "/claims",
      icon: FileText,
    },
    {
      title: "New Claim",
      href: "/claims/new",
      icon: Plus,
    },
    {
      title: "Patients",
      href: "/patients",
      icon: Users,
    },
    {
      title: "Activity",
      href: "/activity",
      icon: Activity,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: PieChart,
    },
    {
      title: "Support",
      href: "/support",
      icon: HelpCircle,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ]

  if (profile?.role === "admin") {
    routes.splice(routes.length, 0, {
      title: "Admin",
      href: "/admin",
      icon: Shield,
    })
  }

  const currentRoute = routes.find((route) => pathname === route.href)
  const currentRouteTitle = currentRoute?.title ?? BRAND.name

  const handleSignOut = async () => {
    setIsLoggingOut(true);

    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/auth/login";
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible)
  }

  const toggleSidebarWidth = useCallback(() => {
    // Toggle between icon mode and full width
    if (sidebarWidth === ICON_MODE_WIDTH) {
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
    } else {
      setSidebarWidth(ICON_MODE_WIDTH)
    }
  }, [sidebarWidth])

  // Determine if we're in icon-only mode
  const isIconMode = sidebarWidth === ICON_MODE_WIDTH

  const handleRouteNavigation = (href: string) => {
    if (pathname === href) {
      setIsMobileOpen(false)
      return
    }

    setPendingRoute(href)
    setIsMobileOpen(false)
    startTransition(() => {
      router.push(href)
    })
  }

  const SidebarContent = () => (
    <>
      <SidebarHeader
        className={`flex h-16 items-center border-b border-sidebar-border ${isIconMode ? "justify-center px-2" : "px-4"}`}
      >
        <Link href="/" className="flex items-center gap-3 font-semibold text-sidebar-foreground">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground">
            <Image
              src="/logo.png"
              alt={BRAND.name}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          </div>
          {!isIconMode && (
            <div className="relative flex h-9 items-center">
              <span className="text-3xl leading-none tracking-tight font-sans">{BRAND.name}</span>
              <span className="text-3xl text-primary font-sans">.</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-1 p-2">
          {routes.map((route) => (
            <div key={route.href} className="group/menu-item relative">
              <button
                type="button"
                className={`flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none transition-[width,height,padding,background-color,color,transform] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                  pathname === route.href || pendingRoute === route.href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70"
                } ${isIconMode ? "justify-center" : ""}`}
                onClick={() => handleRouteNavigation(route.href)}
                title={isIconMode ? route.title : undefined}
                disabled={isPending && pendingRoute !== route.href}
              >
                {isPending && pendingRoute === route.href ? (
                  <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                ) : (
                  <route.icon className="h-4 w-4 flex-shrink-0" />
                )}
                {!isIconMode && (
                  <span className="truncate">
                    {route.title}
                    {isPending && pendingRoute === route.href ? "..." : ""}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-sidebar-border p-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={`h-auto w-full rounded-lg border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 text-left text-sidebar-foreground hover:bg-sidebar-accent ${
                isIconMode ? "justify-center" : "justify-start"
              }`}
              onClick={() => {
                console.log("User button clicked!")
                setIsOpen(!isOpen)
              }}
            >
              <div className={`flex items-center gap-2 ${isIconMode ? "" : "flex-1 min-w-0"}`}>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </div>
                {!isIconMode && (
                  <>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {profile?.full_name || user?.email || "User"}
                      </span>
                      {profile?.organization && (
                        <span className="text-xs text-sidebar-foreground/60 truncate">{profile.organization}</span>
                      )}
                    </div>
                    <ChevronUp className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
                  </>
                )}
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent side={isIconMode ? "right" : "top"} align="start" className="w-60 rounded-xl border-border bg-popover p-0 shadow-lg">
            <div className="border-b border-border p-4">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.full_name || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {profile?.organization && (
                  <p className="text-xs leading-none text-muted-foreground">{profile.organization}</p>
                )}
              </div>
            </div>
            <div className="p-2">
              <Button variant="ghost" className="w-full justify-start text-sm" asChild onClick={() => setIsOpen(false)}>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
                disabled={isLoggingOut || loading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  )

  // Don't render until client-side hydration is complete to avoid hydration mismatch
  if (!isClient) {
    return (
      <ProtectedRoute>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <div
              className="sticky top-0 hidden flex-shrink-0 self-start md:block"
              style={{ width: `${DEFAULT_SIDEBAR_WIDTH}px` }}
            >
              <div className="m-3 flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-sm">
                <SidebarContent />
              </div>
            </div>
            <div className="flex flex-1 flex-col">
              <header className="sticky top-0 z-20 flex h-20 items-center px-4 sm:px-6">
              </header>
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </ProtectedRoute>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        {sidebarVisible && (
          <div
            ref={sidebarRef}
            className="sticky top-0 hidden flex-shrink-0 self-start transition-all duration-200 ease-in-out md:block"
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="m-3 flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-sm">
              <SidebarContent />
            </div>

            {/* Toggle Handle */}
            <div
              className="absolute top-0 right-0 bottom-0 w-1 cursor-pointer hover:bg-border transition-colors group"
              onClick={toggleSidebarWidth}
              style={{ zIndex: 50 }}
              title={isIconMode ? "Click to expand sidebar" : "Click to collapse to icons"}
            >
              {/* Invisible wider area for easier clicking */}
              <div className="absolute top-0 right-0 bottom-0 w-4 -translate-x-1.5" />

              {/* Visual indicator */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 bg-border opacity-0 group-hover:opacity-100 transition-opacity rounded-l-sm" />
            </div>
          </div>
        )}

        {/* Mobile Sidebar */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent side="left" className="w-80 border-sidebar-border bg-sidebar p-0 text-sidebar-accent-foreground md:hidden">
            <div className="flex h-full flex-col">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex h-12 items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg md:hidden"
                  onClick={() => setIsMobileOpen(true)}
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden rounded-lg md:inline-flex"
                  onClick={toggleSidebar}
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
                <div>
                  <p className="text-base font-semibold tracking-tight text-foreground">{currentRouteTitle}</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
