import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Footer from '@/components/root/Footer'
import LandingPage from '@/components/root/Landing'


export default async function Home() {
  const session = await getSession()

  if (session) {
    redirect('/dashboard')
  }
  return (
      <div className="min-h-screen flex flex-col">
        <LandingPage />
        <Footer />
      </div>
  )
}