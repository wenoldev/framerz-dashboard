import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = await createServerSupabaseClient();

  // Refresh the session
  await supabase.auth.getSession();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  // Protect the /dashboard route
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname === '/settings';

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*','/admin/:path*','/settings/:path*'],
};