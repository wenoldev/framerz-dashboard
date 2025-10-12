/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/app/actions/user";
import { getAdminTransactions } from "@/app/actions/transactions";

type SearchParams = {
  q?: string;
  type?: "credit" | "debit";
  status?: string;
  from?: string;
  to?: string;
};

export default async function AdminTransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  // Check user
  let me;
  try {
    me = await getUserProfile();
  } catch (err: any) {
    redirect("/");
  }

  const { q, type, from, to, status: statusParam } = searchParams || {};

  // Fetch transactions directly via server function
  let data: any[] = [];
  try {
    data = await getAdminTransactions({
      email: q,        // assume 'q' is email or user_id
      status: statusParam,
    });
  } catch (err) {
    data = [];
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-center gap-2">
            <Input name="q" placeholder="Search by user id or email" defaultValue={q} className="w-64" />
            <Input type="date" name="from" defaultValue={from} />
            <Input type="date" name="to" defaultValue={to} />
            <select name="type" defaultValue={type} className="border rounded-md h-9 px-2">
              <option value="">All types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <select name="status" defaultValue={statusParam} className="border rounded-md h-9 px-2">
              <option value="">Any status</option>
              <option value="created">Created</option>
              <option value="authorized">Authorized</option>
              <option value="captured">Captured</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Points</th>
                  <th className="py-2 pr-4">Amount (₹)</th>
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Payment</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t: any) => {
                  const derivedType = Number(t.points || 0) >= 0 ? "credit" : "debit";
                  return (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{t.email || t.user_id}</td>
                      <td className="py-2 pr-4">{derivedType}</td>
                      <td className="py-2 pr-4">{t.status ?? "-"}</td>
                      <td className="py-2 pr-4">{t.points ?? 0}</td>
                      <td className="py-2 pr-4">{typeof t.amount_rs === "number" ? t.amount_rs.toFixed(2) : "0.00"}</td>
                      <td className="py-2 pr-4">{t.order_id ?? "-"}</td>
                      <td className="py-2 pr-4">{t.payment_id ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
