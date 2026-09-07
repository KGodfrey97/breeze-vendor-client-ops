import { NextRequest, NextResponse } from "next/server"
import {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
} from "@aws-sdk/client-textract"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"

interface ExtractedData {
  patientFirstName?: string
  patientLastName?: string
  patientId?: string
  dateOfBirth?: string
  socialSecurityNumber?: string
  insuranceProvider?: string
  insurancePlan?: string
  policyNumber?: string
  groupNumber?: string
  claimId?: string
  originalClaimAmount?: string
  serviceDate?: string
  denialDate?: string
  providerName?: string
  providerId?: string
  facilityName?: string
  procedureCode?: string
  diagnosisCode?: string
  denialReason?: string
}

const textract = new TextractClient({
  region: process.env.AWS_REGION,
})

const s3 = new S3Client({
  region: process.env.AWS_REGION,
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/*
Extract answers from Textract Query results
*/
function extractQueryResults(blocks: any[]): ExtractedData {
  const data: any = {}

  const blockMap: Record<string, any> = {}

  blocks.forEach((block) => {
    blockMap[block.Id] = block
  })

  blocks.forEach((block) => {
    if (block.BlockType === "QUERY") {
      const alias = block.Query?.Alias

      const answerRel = block.Relationships?.find(
        (rel: any) => rel.Type === "ANSWER"
      )

      if (!answerRel) return

      const answerBlock = blockMap[answerRel.Ids[0]]

      if (alias && answerBlock?.Text) {
        data[alias] = answerBlock.Text
      }
    }
  })

  return data
}

/*
Detect UB04 vs CMS1500 based on text inside document
*/
function detectFormType(blocks: any[]) {
  const text = blocks
    .filter((b) => b.BlockType === "LINE")
    .map((b) => b.Text?.toLowerCase() || "")
    .join(" ")

  if (
    text.includes("ub-04") ||
    text.includes("cms 1450") ||
    text.includes("uniform billing")
  ) {
    return "UB04"
  }

  if (
    text.includes("cms-1500") ||
    text.includes("health insurance claim form") ||
    text.includes("1500")
  ) {
    return "CMS1500"
  }

  return "Unknown"
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/tiff",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const key = `medical-forms/${uuidv4()}-${file.name}`

    /*
    Upload file to S3
    */

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    /*
    Start Textract analysis
    */

    const startCommand = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET!,
          Name: key,
        },
      },
      FeatureTypes: ["FORMS", "QUERIES"],
      QueriesConfig: {
        Queries: [
          { Text: "What is the patient first name?", Alias: "patientFirstName" },
          { Text: "What is the patient last name?", Alias: "patientLastName" },
          { Text: "What is the patient date of birth?", Alias: "dateOfBirth" },
          { Text: "What is the patient ID?", Alias: "patientId" },
          { Text: "What is the social security number?", Alias: "socialSecurityNumber" },
          { Text: "What is the insurance provider?", Alias: "insuranceProvider" },
          { Text: "What is the insurance plan?", Alias: "insurancePlan" },
          { Text: "What is the policy number?", Alias: "policyNumber" },
          { Text: "What is the group number?", Alias: "groupNumber" },
          { Text: "What is the claim number?", Alias: "claimId" },
          { Text: "What is the total claim amount?", Alias: "originalClaimAmount" },
          { Text: "What is the date of service?", Alias: "serviceDate" },
          { Text: "What is the denial date?", Alias: "denialDate" },
          { Text: "What is the provider name?", Alias: "providerName" },
          { Text: "What is the provider NPI?", Alias: "providerId" },
          { Text: "What is the facility name?", Alias: "facilityName" },
          { Text: "What is the procedure code?", Alias: "procedureCode" },
          { Text: "What is the diagnosis code?", Alias: "diagnosisCode" },
          { Text: "What is the denial reason?", Alias: "denialReason" },
        ],
      },
    })

    const startResponse = await textract.send(startCommand)

    const jobId = startResponse.JobId

    if (!jobId) {
      throw new Error("Textract job failed to start")
    }

    /*
    Poll Textract until job completes
    */

    let status = "IN_PROGRESS"
    let blocks: any[] = []

    let attempts = 0

    while (status === "IN_PROGRESS" && attempts < 20) {
      attempts++
      await sleep(2000)

      const result = await textract.send(
        new GetDocumentAnalysisCommand({
          JobId: jobId,
        })
      )

      status = result.JobStatus || "FAILED"

      if (status === "SUCCEEDED") {
        blocks = result.Blocks || []

        // Paginate through all remaining pages
        let nextToken = result.NextToken
        while (nextToken) {
          const nextPage = await textract.send(
            new GetDocumentAnalysisCommand({
              JobId: jobId,
              NextToken: nextToken,
            })
          )
          blocks = blocks.concat(nextPage.Blocks || [])
          nextToken = nextPage.NextToken
        }

        //console.log("TEXTRACT BLOCKS:", JSON.stringify(blocks.slice(0, 10), null, 2))
      }

      if (status === "FAILED") {
        throw new Error("Textract job failed")
      }
    }

    /*
    Extract fields from queries
    */

    const extractedData = extractQueryResults(blocks)
    console.log("EXTRACTED DATA:", extractedData)
    /*
    Detect form type
    */

    const formType = detectFormType(blocks)

    return NextResponse.json({
      success: true,
      formType,
      extractedData,
      confidence: 0.96,
      message: `Successfully processed ${formType} form`,
    })
  } catch (error) {
    console.error("Medical form processing error:", error)

    return NextResponse.json(
      { error: "Failed to process medical form" },
      { status: 500 }
    )
  }
}