import { redirect } from 'next/navigation';
import LinkTableClient from '@/components/dashboard/LinkTableClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLinks } from '@/app/actions/links';
import Layout from '@/components/root/HeaderWrapper';

export default async function Dashboard() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await (await supabase).auth.getSession();

  console.log('Dashboard session:', session);
  
  if (!session) {
    console.log('No session found, redirecting to /');
    return redirect('/');
  }

  const allLinks = await getLinks(session.user.id);

  return (
    <Layout>
      <LinkTableClient initialLinks={allLinks} />
    </Layout>
  );
}