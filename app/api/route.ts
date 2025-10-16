import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CORS helper
function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// Handle OPTIONS for preflight
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// GET: Fetch all links for the authenticated user
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const slug = req.nextUrl.searchParams.get("slug");

  if (!slug) {
    return withCors(NextResponse.json({ error: "Slug is required" }, { status: 400 }));
  }

  const { data, error } = await supabase
    .from("data")
    .select("mind_file_url, video_url, thumbnail_url, customer_name")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  return withCors(
    NextResponse.json({
      customer_name: data.customer_name,
      mind_file_url: data.mind_file_url,
      video_url: data.video_url,
      thumbnail_url: data.thumbnail_url,
    }),
  );
}

// POST: Generate presigned URL for Cloudinary upload
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    // Handle presigned URL request
    try {
      const body = await request.json();
      const { fileName, fileType, fileSize } = body;

      if (!fileName || !fileType || !fileSize) {
        return NextResponse.json({ error: 'fileName, fileType, and fileSize are required' }, { status: 400 });
      }

      // Validate file size limits
      const maxSizes = {
        mind_file: 5 * 1024 * 1024, // 5MB
        video: 100 * 1024 * 1024,  // 100MB
        thumbnail: 2 * 1024 * 1024, // 2MB
      };
      if (fileSize > maxSizes[fileType as keyof typeof maxSizes]) {
        return NextResponse.json({ error: `${fileType} size must be less than ${maxSizes[fileType as keyof typeof maxSizes] / (1024 * 1024)}MB` }, { status: 400 });
      }

      // Generate a unique public ID
      const publicId = `${session.user.id}/${crypto.randomUUID()}_${fileName.replace(/\.[^/.]+$/, '')}`;
      const resourceType = fileType === 'mind_file' ? 'raw' : fileType === 'video' ? 'video' : 'image';
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create signature (do NOT include api_key in signature)
      const signature = cloudinary.utils.api_sign_request(
        { 
          timestamp, 
          public_id: publicId,
        },
        process.env.CLOUDINARY_API_SECRET!
      );

      const presignedUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
      
      // Prepare upload parameters (include api_key here)
      const uploadParams = {
        api_key: process.env.CLOUDINARY_API_KEY,
        timestamp: timestamp.toString(),
        public_id: publicId,
        signature,
      };

      return withCors(NextResponse.json({ 
        presignedUrl, 
        publicId,
        uploadParams 
      }));
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
    }
  } else {
    // Handle create link with pre-uploaded URLs
    try {
      const body = await request.json();
      const { customer_name, mind_file_url, video_url, thumbnail_url } = body;

      if (!customer_name) {
        return NextResponse.json({ error: 'customer_name is required' }, { status: 400 });
      }

    const slug = Math.random().toString(36).substring(2, 8);

      const { data: link, error } = await supabase
        .from('data')
        .insert({
          slug,
          customer_name,
          mind_file_url: mind_file_url || '',
          video_url: video_url || '',
          thumbnail_url: thumbnail_url || '',
          user_id: session.user.id,
          scans: 0,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return withCors(NextResponse.json(link, { status: 201 }));
    } catch (error) {
      console.error('Create link error:', error);
      return withCors(NextResponse.json({ error: 'Failed to create link' }, { status: 500 }));
    }
  }
}

// PUT: Update existing link
export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, customer_name, mind_file_url, video_url, thumbnail_url, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: existingLink, error: fetchError } = await supabase
      .from('data')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || existingLink.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Link not found or unauthorized' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {};

    if (customer_name) updates.customer_name = customer_name;
    if (status) updates.status = status;

    if (mind_file_url && mind_file_url !== existingLink.mind_file_url) {
      if (existingLink.mind_file_url) {
        const oldInfo = extractCloudinaryInfo(existingLink.mind_file_url);
        if (oldInfo) {
          await cloudinary.uploader.destroy(oldInfo.public_id, { resource_type: oldInfo.resource_type });
        }
      }
      updates.mind_file_url = mind_file_url;
    }

    if (video_url && video_url !== existingLink.video_url) {
      if (existingLink.video_url) {
        const oldInfo = extractCloudinaryInfo(existingLink.video_url);
        if (oldInfo) {
          await cloudinary.uploader.destroy(oldInfo.public_id, { resource_type: oldInfo.resource_type });
        }
      }
      updates.video_url = video_url;
    }

    if (thumbnail_url && thumbnail_url !== existingLink.thumbnail_url) {
      if (existingLink.thumbnail_url) {
        const oldInfo = extractCloudinaryInfo(existingLink.thumbnail_url);
        if (oldInfo) {
          await cloudinary.uploader.destroy(oldInfo.public_id, { resource_type: oldInfo.resource_type });
        }
      }
      updates.thumbnail_url = thumbnail_url;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: updatedLink, error } = await supabase
      .from('data')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return withCors(NextResponse.json(updatedLink));
  } catch (error) {
    console.error('Error updating link:', error);
    return withCors(NextResponse.json({ error: 'Failed to update link' }, { status: 500 }));
  }
}

// DELETE: Delete a link and its associated media
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    const { data: existingLink, error: fetchError } = await supabase
      .from('data')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || existingLink.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Link not found or unauthorized' }, { status: 404 });
    }

    if (existingLink.mind_file_url) {
      const info = extractCloudinaryInfo(existingLink.mind_file_url);
      if (info) {
        await cloudinary.uploader.destroy(info.public_id, { resource_type: info.resource_type });
      }
    }

    if (existingLink.video_url) {
      const info = extractCloudinaryInfo(existingLink.video_url);
      if (info) {
        await cloudinary.uploader.destroy(info.public_id, { resource_type: info.resource_type });
      }
    }

    if (existingLink.thumbnail_url) {
      const info = extractCloudinaryInfo(existingLink.thumbnail_url);
      if (info) {
        await cloudinary.uploader.destroy(info.public_id, { resource_type: info.resource_type });
      }
    }

    const { error } = await supabase.from('data').delete().eq('id', id);

    if (error) throw error;

    return withCors(NextResponse.json({ success: true }, { status: 200 }));
  } catch (error) {
    console.error('Error deleting link:', error);
    return withCors(NextResponse.json({ error: 'Failed to delete link' }, { status: 500 }));
  }
}

// Helper function to extract Cloudinary info
function extractCloudinaryInfo(url: string): { resource_type: string; public_id: string } | null {
  const match = url.match(/https?:\/\/res\.cloudinary\.com\/[^\/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.*?)(\.[^\/.]*)?$/);
  if (match) {
    const resource_type = match[1];
    const public_id = match[2] + (match[3] || '');
    return { resource_type, public_id };
  }
  return null;
}