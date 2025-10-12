import { type NextRequest, NextResponse } from "next/server"
import cloudinary from "cloudinary"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function parseCloudinaryPublicId(url?: string | null) {
  if (!url) return null
  try {
    // Example: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.ext
    const u = new URL(url)
    const parts = u.pathname.split("/")
    // remove leading '' (from starting slash)
    const filtered = parts.filter(Boolean)
    // filtered = ["image","upload","v123","folder","name.ext"]
    const uploadIdx = filtered.findIndex((p) => p === "upload")
    const afterUpload = filtered.slice(uploadIdx + 1) // ["v123","folder","name.ext"]
    if (afterUpload[0]?.startsWith("v")) afterUpload.shift()
    const last = afterUpload.pop() // "name.ext"
    if (!last) return afterUpload.join("/") || null
    const [filename] = last.split(".")
    const publicId = [...afterUpload, filename].join("/")
    return publicId || null
  } catch {
    return null
  }
}

function resourceTypeFromUrl(url?: string | null): "image" | "video" | "raw" {
  if (!url) return "image"
  if (url.includes("/video/")) return "video"
  if (url.includes("/raw/")) return "raw"
  return "image"
}

async function destroyIfExists(url?: string | null) {
  const publicId = parseCloudinaryPublicId(url)
  if (!publicId) return
  const resource_type = resourceTypeFromUrl(url)
  try {
    await cloudinary.v2.uploader.destroy(publicId, { resource_type, invalidate: true })
  } catch (e) {
    console.error("Cloudinary destroy error:", e)
  }
}

// GET /api/links?id=...
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { data, error } = await supabase
    .from("data")
    .select("id, slug, customer_name, image_url, video_url, thumbnail_url")
    .eq("id", id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

// PUT update with optional file replacements (old files cleanup)
export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const { id, customer_name, mind_file_url = null, video_url = null, thumbnail_url = null, replaced = {} } = body || {}

  if (!id || !customer_name) return NextResponse.json({ error: "id and customer_name required" }, { status: 400 })

  // fetch current row to know what to delete
  const { data: current, error: curErr } = await supabase
    .from("data")
    .select("image_url, video_url, thumbnail_url")
    .eq("id", id)
    .single()

  if (curErr || !current) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // If files replaced, delete old ones
  if (replaced.mind_file && current.image_url) await destroyIfExists(current.image_url)
  if (replaced.video && current.video_url) await destroyIfExists(current.video_url)
  if (replaced.thumbnail && current.thumbnail_url) await destroyIfExists(current.thumbnail_url)

  const { data, error } = await supabase
    .from("data")
    .update({
      customer_name,
      image_url: mind_file_url,
      video_url,
      thumbnail_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: "Failed to update link" }, { status: 500 })

  return NextResponse.json(data)
}

// DELETE link and all assets
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const { id } = body || {}
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { data: current, error: curErr } = await supabase
    .from("data")
    .select("image_url, video_url, thumbnail_url")
    .eq("id", id)
    .single()

  if (curErr || !current) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // delete row first or after? We'll delete assets then row
  await Promise.all([
    destroyIfExists(current.image_url),
    destroyIfExists(current.video_url),
    destroyIfExists(current.thumbnail_url),
  ])

  const { error } = await supabase.from("data").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Failed to delete link" }, { status: 500 })

  return NextResponse.json({ success: true })
}
