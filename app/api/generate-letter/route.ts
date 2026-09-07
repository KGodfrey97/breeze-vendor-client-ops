import { type NextRequest } from 'next/server'
import { NextResponse } from "next/server"
import OpenAI from "openai"
import { requireAuthenticatedUser } from "@/lib/auth-server"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("=== Letter Generation API Start ===")

    // Get the claim ID from the request
    let claimId
    try {
      const body = await request.json()
      claimId = body.claimId
      console.log("Request body parsed successfully, claimId:", claimId)
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    if (!claimId) {
      console.error("No claim ID provided")
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 })
    }

    // Check environment variables
    console.log("Checking environment variables...")
    console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY)


    // Check authentication
    console.log("Checking user authentication...")
    const user = await requireAuthenticatedUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!user.id) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    console.log("User authenticated:", user.id)

    // Get the claim data with better error handling
    console.log("Fetching claim data for ID:", claimId)
    const { rows } = await query(
      `
      SELECT
        c.*,
        p.first_name,
        p.last_name,
        p.dob,
        p.patient_external_id
      FROM claims c
      LEFT JOIN patients p
        ON p.id = c.patient_id
        AND p.user_id = c.user_id
      WHERE c.id = $1
        AND c.user_id = $2
      `,
      [claimId, user.id]
    )

    const claim = rows[0]

    if (!claim) {
      return NextResponse.json(
        { error: "Claim not found or access denied" },
        { status: 404 }
      )
    }

    const normalizedClaim = {
      ...claim,
      patient_first_name: claim.first_name ?? null,
      patient_last_name: claim.last_name ?? null,
      patient_id: claim.patient_external_id ?? null,
      patient_dob: claim.dob ?? null,
    }

    console.log("Claim retrieved:", {
      id: claim.id,
      userId: claim.user_id,
      patientId: claim.patient_id,
    })

    // Validate required claim fields
    const requiredFields = [
      "patient_first_name",
      "patient_last_name",
      "patient_id",
      "patient_dob",
      "insurance_provider",
      "insurance_plan",
      "policy_number",
      "claim_id",
      "original_claim_amount",
      "service_date",
      "denial_date",
      "denial_reason",
      "procedure_code",
      "diagnosis_code",
      "provider_name",
      "provider_id",
      "appeal_type",
      "appeal_reason",
      "appeal_description",
    ]

    const missingFields = requiredFields.filter((field) => {
      const value = normalizedClaim[field as keyof typeof normalizedClaim]

      return value === null || value === undefined || value === ""
    })
    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields)
      return NextResponse.json(
        {
          error: `Missing required claim data: ${missingFields.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Initialize OpenAI client
    console.log("Initializing OpenAI client...")
    let openai
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      console.log("OpenAI client initialized successfully")
    } catch (openaiInitError) {
      console.error("Error initializing OpenAI client:", openaiInitError)
      return NextResponse.json({ error: "AI service initialization failed" }, { status: 500 })
    }

    // Format the current date
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Create a prompt for the AI
    const prompt = `
Generate a professional appeal letter for a healthcare claim denial. Use the following information:

PATIENT INFORMATION:
- Name: ${normalizedClaim.patient_first_name} ${normalizedClaim.patient_last_name}
- ID: ${normalizedClaim.patient_id}
- Date of Birth: ${new Date(normalizedClaim.patient_dob).toLocaleDateString()}

INSURANCE INFORMATION:
- Provider: ${claim.insurance_provider}
- Plan: ${claim.insurance_plan}
- Policy Number: ${claim.policy_number}
- Group Number: ${claim.group_number || "N/A"}

CLAIM INFORMATION:
- Claim ID: ${claim.claim_id}
- Amount: $${Number(claim.original_claim_amount || 0).toFixed(2)}
- Service Date: ${new Date(claim.service_date).toLocaleDateString()}
- Denial Date: ${new Date(claim.denial_date).toLocaleDateString()}
- Denial Reason: ${claim.denial_reason}
- Procedure Code: ${claim.procedure_code}
- Diagnosis Code: ${claim.diagnosis_code}

PROVIDER INFORMATION:
- Provider Name: ${claim.provider_name}
- Provider ID: ${claim.provider_id}
- Facility Name: ${claim.facility_name || "N/A"}

APPEAL INFORMATION:
- Appeal type: ${claim.appeal_type}
- Claim Reason: ${claim.appeal_reason}
- Claim Description: ${claim.appeal_description}

Format the letter professionally with today's date (${currentDate}), appropriate salutation, body paragraphs explaining the claim with supporting details, and a professional closing. The letter should be addressed to the Claims Department at ${claim.insurance_provider}.
`

    console.log("Calling OpenAI API...")
    console.log("Prompt length:", prompt.length)
    console.log("Prompt:", prompt)
    
    // Generate the letter using OpenAI
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a professional healthcare claims specialist who writes clear, persuasive appeal letters to insurance companies.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })
      console.log("OpenAI API call completed successfully")
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError)

      // Handle specific OpenAI errors
      if (openaiError instanceof Error) {
        if (openaiError.message.includes("API key")) {
          return NextResponse.json({ error: "Invalid OpenAI API key" }, { status: 500 })
        }
        if (openaiError.message.includes("rate limit") || openaiError.message.includes("quota")) {
          return NextResponse.json({ error: "OpenAI rate limit exceeded. Please try again later." }, { status: 429 })
        }
        if (openaiError.message.includes("model")) {
          return NextResponse.json({ error: "OpenAI model error. Please try again." }, { status: 500 })
        }
      }

      return NextResponse.json(
        {
          error: `AI service error: ${openaiError instanceof Error ? openaiError.message : "Unknown error"}`,
        },
        { status: 500 },
      )
    }

    const letter = completion?.choices?.[0]?.message?.content ?? null

    if (!letter) {
      console.error("No letter content generated")
      return NextResponse.json({ error: "Failed to generate letter content" }, { status: 500 })
    }

    console.log("Letter generated successfully, length:", letter.length)
    console.log("=== Letter Generation API End ===")

    // Return the generated letter
    return NextResponse.json({ letter })
  } catch (error) {
    console.error("=== UNEXPECTED ERROR IN LETTER GENERATION ===")
    console.error("Error type:", error?.constructor?.name)
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error")
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("Error object:", error)

    // Return a detailed error for debugging
    return NextResponse.json(
      {
        error: "Internal server error occurred during letter generation",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
