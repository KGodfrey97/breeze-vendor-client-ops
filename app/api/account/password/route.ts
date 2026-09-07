import { NextRequest, NextResponse } from "next/server"
import { updatePassword } from "aws-amplify/auth"

import { requireAuthenticatedUser } from "@/lib/auth-server"
import { handleApiError } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser()

    const body = await request.json()

    await updatePassword({
      oldPassword: body.currentPassword,
      newPassword: body.newPassword,
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    return handleApiError(error, "Failed to change password")
  }
}