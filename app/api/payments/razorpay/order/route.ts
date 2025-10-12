import { type NextRequest, NextResponse } from "next/server"
import { rupeesToPoints } from "@/lib/points"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { amountRs } = await req.json()
    if (!amountRs || amountRs < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Payment keys missing" }, { status: 500 })
    }

    const shortHash = crypto.randomBytes(4).toString("hex"); // 8 chars
    const receipt = `rcpt_${shortHash}_${Date.now()}`;
    const body = new URLSearchParams({
      amount: String(amountRs * 100), // in paise
      currency: "INR",
      receipt,
      payment_capture: "1",
    })

    const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })

    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: "Failed to create order", detail: t }, { status: 502 })
    }

    const order = await res.json()

    // Create a pending transaction row
    const points = rupeesToPoints(amountRs)
    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      order_id: order.id,
      amount_rs: amountRs,
      points,
      status: "created",
      payload: order,
    })
    if (txErr) {
      console.log("Transaction insert error:", txErr)
      return NextResponse.json({ error: "Transaction init failed" }, { status: 500 })
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      receipt,
      points,
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
