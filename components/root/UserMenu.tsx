"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function UserMenu() {
  async function onSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus:outline-none" aria-label="User menu">
      <Avatar className="h-8 w-8">
        <AvatarImage src="/avatar.png" alt="User" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/settings">Edit profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
