import { AppShell } from "@/components/app-shell"
import { getAuthenticatedUser } from "@/lib/auth-server"
import { redirect } from "next/navigation"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <AppShell>{children}</AppShell>
}