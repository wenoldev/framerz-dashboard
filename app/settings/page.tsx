import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BuyCredits } from "@/components/dashboard/BuyCredits"
import { TransactionsList } from "@/components/dashboard/TransactionList"
import { getUserProfile } from "../actions/user"

export default async function SettingsPage({ searchParams }: { searchParams: { points?: string } }) {
const res = await getUserProfile()
  const balance = res && res.points ? {points: res.points} : { points: 0 }
  const points = Number(balance?.points ?? 0)
  const conversion = "100₹ → 10 points"
const resolvedSearchParams = await searchParams // Await the searchParams Promise
  const requiredPoints = Number(resolvedSearchParams.points) || 0
  const amountRs = requiredPoints * 10; // 1 point = 10₹
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
            <BuyCredits initialAmountRs={amountRs}/>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions list */}
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
