import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}
export async function POST(req: NextRequest) {
  try {
    const { error } = await supabase.rpc('delete_expired_links');

    if (error) {
      console.error('RPC error:', error);
      return withCors(
        NextResponse.json({ error: error.message }, { status: 500 })
      );
    }

    return withCors(
      NextResponse.json(
        { message: 'Expired links deleted successfully' },
        { status: 200 }
      )
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected server error';
    return withCors(
      NextResponse.json(
        { error: 'Unexpected server error', details: errorMessage },
        { status: 500 }
      )
    );
  }
}