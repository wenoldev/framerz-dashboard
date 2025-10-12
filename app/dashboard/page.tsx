import { redirect } from 'next/navigation';
import LinkTableClient from '@/components/dashboard/LinkTableClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLinks } from '@/app/actions/links';

export default async function Dashboard() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await (await supabase).auth.getSession();
  
  if (!session) {
    console.log('No session found, redirecting to /');
    return redirect('/');
  }

  const allLinks = await getLinks(session.user.id);

  return (
      <LinkTableClient initialLinks={allLinks} />
  );
}