import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import UserMenu from "./UserMenu"
import { getSession } from "@/lib/auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import AuthForm from "../auth/AuthForm"
import { Button } from "../ui/button"
import { getUserProfile } from "@/app/actions/user"

export async function Header() {
  const session = await getSession()
  let points = 0

  if (session) {
      try {
        const res = await getUserProfile();
        if (res) points = res.points;
      } catch {
        console.error('Failed to fetch user profile');
      }
    }

  return (
    <header className="border-b bg-background text-foreground">
      <div className="mx-auto flex items-center justify-between py-4 px-4">
        <Link href="/" className="font-bold text-xl flex items-center">
          <span className="w-2 h-2 bg-primary mr-2 rounded-full" aria-hidden />
          Framerz
          <span className="sr-only">Home</span>
        </Link>
        {session ? (
          <nav className="flex items-center gap-4">
            <Link href="/settings" className="no-underline">
              <Badge variant="secondary" className="font-medium hover:opacity-90">
                Points: {points}
              </Badge>
            </Link>
            <UserMenu />
          </nav>
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
      </div>
    </header>
  )
}

export default Header
