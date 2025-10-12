// Marks transaction paid and credits points if signature valid
import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createServerSupabaseClient } from "@/lib/supabase/server"


export async function POST(req: NextRequest) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) return NextResponse.json({ error: "Server not configured" }, { status: 500 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const hmac = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex")

  if (hmac !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient();
  // update transaction and credit points atomically with an RPC
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("order_id", razorpay_order_id)
    .single()

  if (txErr || !tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })

  // Idempotent credit (status check)
  if (tx.status !== "captured" && tx.status !== "paid") {
    const { error: updErr } = await supabase
      .from("transactions")
      .update({ status: "paid", payment_id: razorpay_payment_id })
      .eq("id", tx.id)

    if (updErr) return NextResponse.json({ error: "Update failed" }, { status: 500 })

    const { error: creditErr } = await supabase.rpc("add_points", {
      p_user_id: tx.user_id,
      p_points: tx.points,
      p_reason: `razorpay:${razorpay_order_id}`,
    })
    if (creditErr) return NextResponse.json({ error: "Credit failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
