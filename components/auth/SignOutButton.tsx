'use client'

import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth' // Import your server action

export function SignOutButton() {
  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/' // Force refresh to update auth state
  }

  return (
    <Button onClick={handleSignOut} variant="outline">
      Sign Out
    </Button>
  )
}