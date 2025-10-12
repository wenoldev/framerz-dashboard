import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount_paise, points, status, created_at, meta")
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data ?? [] })
}
