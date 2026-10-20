
"use client"

import { useState } from "react"

export function TestReportUpload() {
  const [vendorId, setVendorId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleUpload() {
    if (!file || !vendorId) {
      setMessage("Please select a file and enter a vendor ID.")
      return
    }

    setLoading(true)
    setMessage("Preparing upload...")

    try {
      const prepareResponse = await fetch(
        "/api/vendor-reports/upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vendorId,
            filename: file.name,
            fileSize: file.size,
            periodStart: "2026-09-01",
            periodEnd: "2026-09-30",
          }),
        }
      )

      const prepared = await prepareResponse.json()

      if (!prepareResponse.ok) {
        throw new Error(
          prepared.error ?? "Failed to prepare upload"
        )
      }

      setMessage("Uploading to S3...")

      const uploadResponse = await fetch(
        prepared.uploadUrl,
        {
          method: "PUT",
          headers: {
            "Content-Type": prepared.contentType,
          },
          body: file,
        }
      )

      if (!uploadResponse.ok) {
        throw new Error("S3 upload failed")
      }

      setMessage("Confirming upload...")

      const confirmResponse = await fetch(
        `/api/vendor-reports/${prepared.reportId}/confirm-upload`,
        {
          method: "POST",
        }
      )

      const confirmation = await confirmResponse.json()

      if (!confirmResponse.ok) {
        throw new Error(
          confirmation.error ?? "Confirmation failed"
        )
      }

      setMessage("Report uploaded successfully!")
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4 rounded-xl border p-6">
      <h2 className="text-xl font-semibold">
        Test Vendor Report Upload
      </h2>

      <input
        type="text"
        placeholder="Vendor UUID"
        value={vendorId}
        onChange={(event) => setVendorId(event.target.value)}
        className="w-full rounded-lg border p-2"
      />

      <input
        type="file"
        accept=".xlsx,.csv,.pdf"
        onChange={(event) =>
          setFile(event.target.files?.[0] ?? null)
        }
        className="w-full"
      />

      <button
        type="button"
        disabled={loading}
        onClick={handleUpload}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Report"}
      </button>

      {message && <p className="text-sm">{message}</p>}
    </div>
  )
}
