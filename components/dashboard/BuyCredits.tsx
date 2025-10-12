/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

async function loadRazorpay() {
  if (typeof window === "undefined") return;
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export function BuyCredits({ initialAmountRs }: { initialAmountRs?: number }) {
  const [amountRs, setAmountRs] = useState<number>(initialAmountRs || 100); // Default to 100 if no initialAmountRs
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadRazorpay().catch(() => {});
  }, []);

  // Automatically trigger checkout if initialAmountRs is provided
  useEffect(() => {
    if (initialAmountRs) {
      setAmountRs(initialAmountRs); // Update amountRs to match initialAmountRs
      startCheckout();
    }
  }, [initialAmountRs]);

  const startCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRs }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Order error");

      const options = {
        key: data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "Credits Purchase",
        description: `${data.points} points`,
        order_id: data.orderId,
        handler: async (resp: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) throw new Error("Verification failed");

            toast("Payment successful", {
              description: "Points will reflect shortly.",
            });

            // Redirect to /link/new after successful payment
            router.push("/links/new");
          } catch {
            toast("Payment verification failed", {
              description: "Please contact support if not reflected.",
            });
          }
        },
        modal: { ondismiss: () => setLoading(false) },
        theme: { color: "#0ea5e9" },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (e: any) {
      toast("Payment failed", {
        description: e?.message || "Try again later.",
        className: "bg-red-50 text-red-800",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="rounded-lg border p-4 bg-background w-full max-w-md">
        <h3 className="text-base font-medium">Buy Credits</h3>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="number"
            min={100}
            step={100}
            value={amountRs}
            onChange={(e) => setAmountRs(Number(e.target.value))}
            className="w-40 rounded-md border bg-background px-3 py-2"
            aria-label="Amount in rupees"
          />
          <button
            onClick={startCheckout}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Pay with Razorpay"}
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">100₹ = 10 points. One link costs 200 points.</p>
      </div>
    </>
  );
}