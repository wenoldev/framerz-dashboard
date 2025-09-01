import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/auth'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  
  // Get session from request cookies
  const { data: { session }, error: authError } = await supabase.auth.getSession()

  if (authError || !session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { data: links, error } = await supabase
      .from('short_links')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(links)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    )
  }
}

// export async function POST(request: NextRequest) {
//   const supabase = await createSupabaseServerClient()
//   const { data: { session }, error: authError } = await supabase.auth.getSession()

//   if (authError || !session) {
//     return NextResponse.json(
//       { error: 'Unauthorized' },
//       { status: 401 }
//     )
//   }

//   try {
//     const body = await request.json()
    
//     const { data: link, error } = await supabase
//       .from('short_links')
//       .insert({
//         ...body,
//         user_id: session.user.id
//       })
//       .select()
//       .single()

//     if (error) throw error

//     return NextResponse.json(link, { status: 201 })
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to create link' },
//       { status: 500 }
//     )
//   }
// }

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id, target_url, title, expires_at } = await request.json();

    // Verify link ownership
    const { data: existingLink, error: fetchError } = await supabase
      .from('short_links')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || existingLink.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Link not found or unauthorized' },
        { status: 404 }
      );
    }

    // Basic validation
    if (!target_url) {
      return NextResponse.json(
        { error: 'target_url is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(target_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Parse expiration date
    let expiresAt: string | null = null;
    if (expires_at) {
      if (typeof expires_at === 'string') {
        const now = new Date();
        
        switch (expires_at) {
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
              new Date(expires_at);
              expiresAt = expires_at;
            } catch {
              return NextResponse.json(
                { error: 'Invalid expires_at format. Use preset or ISO date string' },
                { status: 400 }
              );
            }
        }
      } else {
        expiresAt = new Date(expires_at).toISOString();
      }
    }

    // Prepare updates object
    const updates = {
      target_url,
      title: title ?? '',
      expires_at: expiresAt
    };

    const { data: updatedLink, error } = await supabase
      .from('short_links')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()

  if (authError || !session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = await request.json()
    
    // Verify link ownership
    const { data: existingLink, error: fetchError } = await supabase
      .from('short_links')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || existingLink.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Link not found or unauthorized' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('short_links')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    )
  }
}