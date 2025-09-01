import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Link from 'next/link'
import { getSession } from '@/lib/auth' // Import your auth utilities
import { SignOutButton } from '../auth/SignOutButton' // You'll need to create this
import AuthForm from '../auth/AuthForm'

export async function Header() {
  const session = await getSession()
  
  return (
    <header className="border-b">
      <div className="container mx-auto flex justify-between items-center py-4 px-4">
        <Link href="/" className="font-bold text-xl flex items-center">
          <span className="w-2 h-2 bg-black mr-2 font-mono"></span>
          Slug.gy
        </Link>
        <nav className="flex items-center space-x-6">
          {/* <Link href="/pricing" className="text-sm hover:text-blue-600 transition-colors">
            Pricing
          </Link>
          <Link href="/resources" className="text-sm hover:text-blue-600 transition-colors">
            Resources
          </Link>
          <Link href="/features" className="text-sm hover:text-blue-600 transition-colors">
            Features
          </Link> */}
          {session ? (
            <SignOutButton />
          ) : (
            <Dialog>
              <form>
                <DialogTrigger asChild>
                  <Button>Get Started</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader className='sr-only'>
                    <DialogTitle>Authentication Dialog</DialogTitle>
                  </DialogHeader>
                  <AuthForm />
                </DialogContent>
              </form>
            </Dialog>
          )}
        </nav>
      </div>
    </header>
  )
}