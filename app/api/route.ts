import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ✅ CORS helper
function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*') // Allow all origins
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400') // Optional: Cache preflight for 24 hours
  return response
}

type RequestBody = {
  targetUrl: string;
  expireDate: string | Date; // Can be preset string or ISO date string
  customSlug?: string;
  title?: string;
};

// ✅ Handle OPTIONS for preflight
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

// GET: /api/resolve-url?slug=abc123
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return withCors(
      NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    )
  }

  const { data, error } = await supabase.rpc('get_url_by_slug', {
    slug_input: slug,
  })

  if (error || !data || data.length === 0) {
    return withCors(
      NextResponse.json({ error: 'Not found or expired' }, { status: 404 })
    )
  }

  return withCors(NextResponse.json({ targetUrl: data[0].target_url }))
}

// POST: /api/resolve-url
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  // Get authenticated user securely
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const userId = user?.id || null;

  try {
    const body: RequestBody = await req.json();
    const { targetUrl, expireDate, title } = body;

    // Basic validation
    if (!targetUrl) {
      return withCors(
        NextResponse.json({ error: 'targetUrl is required' }, { status: 400 })
      );
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      return withCors(
        NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
      );
    }

    // Parse expiration date
    let expiresAt: string | null = null;
    if (expireDate) {
      if (typeof expireDate === 'string') {
        const now = new Date();
        
        switch (expireDate) {
          case '1day':
            now.setDate(now.getDate() + 1);
            expiresAt = now.toISOString();
            break;
          case '1week':
            now.setDate(now.getDate() + 7);
            expiresAt = now.toISOString();
            break;
          case '1month':
            now.setMonth(now.getMonth() + 1);
            expiresAt = now.toISOString();
            break;
          case 'never':
            expiresAt = null;
            break;
          default:
            // Try to parse as ISO date string
            try {
              new Date(expireDate);
              expiresAt = expireDate;
            } catch {
              return withCors(
                NextResponse.json(
                  { error: 'Invalid expireDate format. Use preset or ISO date string' },
                  { status: 400 }
                )
              );
            }
        }
      } else {
        expiresAt = new Date(expireDate).toISOString();
      }
    }

    // Call Supabase RPC
    const { data, error } = await supabase.rpc('create_short_link', {
      target_url_input: targetUrl,
      expires_at_input: expiresAt,
      title_input: title ?? '',
      user_id_input: userId // Will be null if not authenticated
    });

    if (error) {
      console.error('RPC error:', error);
      return withCors(
        NextResponse.json(
          { 
            error: error.message.includes('already exists') 
              ? 'This custom slug is already taken' 
              : 'Failed to create link'
          },
          { status: error.message.includes('already exists') ? 409 : 500 }
        )
      );
    }

    return withCors(
      NextResponse.json(
        { 
          success: true,
          shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${data}`,
          slug: data,
          expiresAt,
          isAuthenticated: !!userId
        },
        { status: 201 }
      )
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected server error';
    return withCors(
      NextResponse.json(
        { error: 'Failed to process request', details: errorMessage },
        { status: 500 }
      )
    );
  }
}