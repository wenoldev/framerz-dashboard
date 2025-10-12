"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation" // ✅ client hook
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BuyCredits } from "@/components/dashboard/BuyCredits"
import { TransactionsList } from "@/components/dashboard/TransactionList"

export default function SettingsPage() {
  const searchParams = useSearchParams() // ✅ client hook
  const pointsQuery = searchParams.get("points") // string | null
  const requiredPoints = Number(pointsQuery ?? 0)
  const amountRs = requiredPoints * 10 // 1 point = 10₹

  const [points, setPoints] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const conversion = "100₹ → 10 points"

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true)
        const res = await fetch("/api/user/profile", { credentials: "include" })
        if (!res.ok) throw new Error("Failed to load user profile")
        const data = await res.json()
        setPoints(data?.points ?? 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message || "Error loading profile")
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <main className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your profile and credits</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Current balance</p>
            <p className="text-3xl font-semibold mt-1">{points} points</p>
            <p className="text-sm text-muted-foreground mt-2">Conversion: {conversion}</p>
          </div>
          <div className="flex items-end justify-end">
            <BuyCredits initialAmountRs={amountRs} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Last 100 credits activity</CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionsList />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
