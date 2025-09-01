// app/actions/links.ts
'use server';

import { createSupabaseServerClient } from '@/lib/auth';

export async function getLinks(uid:string) {
  const supabase = await createSupabaseServerClient();

  const { data: links, error } = await supabase
    .from('short_links')
    .select('*')
    .eq('user_id', uid);

  if (error) throw error;
  return links;
}