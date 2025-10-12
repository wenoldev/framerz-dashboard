import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createServerSupabaseClient } from "@/lib/supabase/server"


export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })

  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature") || ""
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const payload = JSON.parse(rawBody)
  const supabase = await createServerSupabaseClient()

  // We only handle captured payments
  if (payload?.event === "payment.captured") {
    const paymentId = payload?.payload?.payment?.entity?.id
    const orderId = payload?.payload?.payment?.entity?.order_id
    const amount = payload?.payload?.payment?.entity?.amount // paise

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: "Missing payment IDs" }, { status: 400 })
    }

    // find transaction
    const { data: tx, error: txErr } = await supabase.from("transactions").select("*").eq("order_id", orderId).single()

    if (!tx || txErr) {
      // best effort: create a row for observability
      await supabase.from("transactions").insert({
        order_id: orderId,
        payment_id: paymentId,
        amount_rs: amount ? Math.round(amount / 100) : null,
        points: amount ? Math.round(amount / 1000) : null,
        status: "captured",
        payload,
      })
      return NextResponse.json({ ok: true })
    }

    if (tx.status !== "captured" && tx.status !== "paid") {
      const { error: updErr } = await supabase
        .from("transactions")
        .update({ status: "captured", payment_id: paymentId, payload })
        .eq("id", tx.id)

      if (!updErr) {
        await supabase.rpc("add_points", {
          p_user_id: tx.user_id,
          p_points: tx.points,
          p_reason: `razorpay:${orderId}`,
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
