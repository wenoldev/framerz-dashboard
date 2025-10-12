import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("points, demo_used")
    .eq("user_id", user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!profile?.demo_used) {
    return NextResponse.json({
      allowed: true,
      reason: "demo",
      requiredPoints: 0,
    })
  }

  const required = 200
  const currentPoints = profile?.points ?? 0
  const allowed = currentPoints >= required

  return NextResponse.json({
    allowed,
    reason: allowed ? "sufficient" : "insufficient",
    requiredPoints: required,
    currentPoints,
  })
}
