"use client"

import useSWR from "swr"

type Tx = {
  id: string
  created_at: string
  order_id?: string | null
  payment_id?: string | null
  amount_rs?: number | null
  points?: number | null
  status?: string | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function TransactionsList() {
  const { data, error, isLoading } = useSWR<{ data?: Tx[]; error?: string }>("/api/me/transactions", fetcher, {
    revalidateOnFocus: true,
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (error || data?.error) return <p className="text-sm text-destructive">Failed to load transactions</p>

  const items = data?.data || []

  if (items.length === 0) return <p className="text-sm text-muted-foreground">No transactions yet.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-b">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Points</th>
            <th className="py-2 pr-4">Amount (₹)</th>
            <th className="py-2 pr-4">Order</th>
            <th className="py-2 pr-4">Payment</th>
            <th className="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{new Date(t.created_at).toLocaleString()}</td>
              <td className="py-2 pr-4">{t.points ?? 0}</td>
              <td className="py-2 pr-4">{typeof t.amount_rs === "number" ? t.amount_rs.toFixed(2) : "0.00"}</td>
              <td className="py-2 pr-4">{t.order_id ?? "-"}</td>
              <td className="py-2 pr-4">{t.payment_id ?? "-"}</td>
              <td className="py-2 pr-4">{t.status ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
