import { NextResponse } from "next/server"

import { isUnauthorizedError } from "@/lib/auth-server"

export function handleApiError(error: unknown, fallback = "Internal server error") {
  if (isUnauthorizedError(error)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
