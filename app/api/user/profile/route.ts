import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  // Create Supabase client for this request/response
  const supabase = await createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if profile exists
  // eslint-disable-next-line prefer-const
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, role, points, demo_used")
    .eq("user_id", user.id)
    .single() // single() is better than limit(1)

  // If profile does not exist, create it
  if (!profile) {
    const { data: newProfile, error: insErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, role: "user", points: 0, demo_used: false })
      .select("user_id, role, points, demo_used")
      .single()

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    profile = newProfile
  }

  return NextResponse.json(profile)
}
