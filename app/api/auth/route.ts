// app/api/auth/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const { event, session } = await request.json()

  if (event === 'SIGNED_IN' && session) {
    const { access_token, refresh_token } = session

    // Set the cookies manually
    ;(await
          // Set the cookies manually
          cookies()).set('sb-access-token', access_token, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    
    ;(await cookies()).set('sb-refresh-token', refresh_token, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return NextResponse.json({ success: true })
}