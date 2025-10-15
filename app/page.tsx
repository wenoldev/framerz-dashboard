import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AuthForm from '@/components/auth/AuthForm'


export default async function Home() {
  const session = await getSession()

  if (session) {
    redirect('/dashboard')
  }
  return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <AuthForm />
      </div>
  )
}