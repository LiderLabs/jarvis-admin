import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    let uploadUrl = req.headers.get("x-upload-url")
    const contentType = req.headers.get("x-content-type") || "application/octet-stream"

    if (!uploadUrl) {
      return NextResponse.json({ error: "Missing upload URL" }, { status: 400 })
    }

    // Fix: self-hosted Convex returns dashboard URL instead of backend URL
    uploadUrl = uploadUrl.replace("convex-dashboard.washlab.app", "convex-backend.washlab.app")
    console.log("Upload URL (corrected):", uploadUrl)

    const bytes = await req.bytes()
    const blob = new Blob([bytes], { type: contentType })

    const convexRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    })

    const text = await convexRes.text()
    console.log("Convex storage response:", convexRes.status, text)

    return new NextResponse(text, {
      status: convexRes.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("Proxy error:", err?.message, err)
    return NextResponse.json({ error: err?.message || "unknown" }, { status: 500 })
  }
}
