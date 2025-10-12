// app/actions/links.ts
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getLinks(uid:string) {
  const supabase = await createServerSupabaseClient();

  const { data: links, error } = await supabase
    .from('data')
    .select('*')
    .eq('user_id', uid);

  if (error) throw error;
  return links;
}