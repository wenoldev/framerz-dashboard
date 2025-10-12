'use server';

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminTransactions({
  email,
  status,
}: {
  email?: string;
  status?: string;
}) {
  const supabase = await createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Check if user is admin
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "admin") throw new Error("Forbidden");

  // Build query
  let query = supabase
    .from("admin_transactions_view")
    .select("id, user_id, email, type, amount_paise, points, status, created_at")
    .order("created_at", { ascending: false });

  if (email) query = query.ilike("email", `%${email}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data ?? [];
}
