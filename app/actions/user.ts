'use server';

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getUserProfile() {
  const supabase = await createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new Error("Unauthorized");
  }

  // Check if profile exists
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, role, points, demo_used")
    .eq("user_id", user.id)
    .limit(1);

  if (error) throw new Error(error.message);

  // If profile does not exist, create it
  if (!profiles || profiles.length === 0) {
    const { data: newProfile, error: insErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, role: "user", points: 0, demo_used: false })
      .select("user_id, role, points, demo_used")
      .single();

    if (insErr) throw new Error(insErr.message);

    return newProfile;
  }

  return profiles[0];
}
