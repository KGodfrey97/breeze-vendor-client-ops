import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-server"

const ADMIN_SYSTEM_CONFIG_KEY = "admin_system_config"
const ADMIN_COMPLIANCE_CONFIG_KEY = "admin_security_compliance"

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!user.id) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const userId = user.id

  try {
    const [profiles, faqs, tickets, settings] = await Promise.all([
      query(
        `SELECT *
         FROM profiles
         ORDER BY created_at DESC`,
      ),

      query(
        `SELECT *
         FROM faqs
         ORDER BY created_at DESC`,
      ),

      query(
        `SELECT *
         FROM support_tickets
         ORDER BY created_at DESC`,
      ),

      query(
        `SELECT *
         FROM user_settings
         WHERE user_id = $1
           AND (setting_key = $2 OR setting_key = $3)
         ORDER BY created_at DESC`,
        [userId, ADMIN_SYSTEM_CONFIG_KEY, ADMIN_COMPLIANCE_CONFIG_KEY]
      ),
    ])

    return NextResponse.json({
      profiles: profiles.rows,
      faqs: faqs.rows,
      tickets: tickets.rows,
      settings: settings.rows,
    })
  } catch (error) {
    console.error("Failed to load admin data:", error)
    return NextResponse.json(
      { error: "Failed to load admin data" },
      { status: 500 }
    )
  }
}