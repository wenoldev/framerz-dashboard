import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Layout from '@/components/root/HeaderWrapper'
import Footer from '@/components/root/Footer'


export default async function Home() {
  const session = await getSession()

  if (session) {
    redirect('/dashboard')
  }
  return (
    <Layout>
      <div className="min-h-screen flex flex-col">
        <Footer />
      </div>
    </Layout>
  )
}