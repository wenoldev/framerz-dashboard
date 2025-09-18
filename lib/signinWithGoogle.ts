'use client'

import { createClient } from "./supabase/client"

export async function signInWithGoogle() {
  try {
    const supabaseClient = createClient()

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
        scopes: 'email profile'
      }
    })

    console.log(data, error)
    return { data, error }
  } catch (err) {
    console.error('Error in signInWithGoogle:', err)
    return { data: null, error: { message: 'Server error during Google sign-in' } }
  }
}
