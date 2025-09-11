/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/auth';
import cloudinary from 'cloudinary';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CORS helper
function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

type RequestBody = {
  customer_name: string;
  mind_file?: File;
  video?: File;
  thumbnail?: File; // Added for thumbnail support
};

// Handle OPTIONS for preflight
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// GET: /api/links?slug=abc123
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');

  if (!slug) {
    return withCors(
      NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    );
  }

  const { data, error } = await supabase
    .from('data')
    .select('image_url, video_url, thumbnail_url, customer_name') // Added thumbnail_url
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return withCors(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
  }

  return withCors(NextResponse.json({
    customer_name: data.customer_name,
    mind_file_url: data.image_url,
    video_url: data.video_url,
    thumbnail_url: data.thumbnail_url, // Added thumbnail_url
  }));
}

// POST: /api/links
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  // Get authenticated user securely
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const userId = user?.id || null;

  try {
    const formData = await req.formData();
    const customer_name = formData.get('customer_name') as string;
    const mind_file = formData.get('mind_file') as File | null;
    const video = formData.get('video') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null; // Added thumbnail

    // Basic validation
    if (!customer_name) {
      return withCors(
        NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
      );
    }

    let mind_file_url = '';
    let video_url = '';
    let thumbnail_url = ''; // Added thumbnail_url

    // Use user_id as folder name, fallback to 'anonymous' if not authenticated
    const folderName = userId || 'anonymous';

    // Upload mind file to Cloudinary
    if (mind_file) {
      if (!mind_file.name.endsWith('.mind')) {
        return withCors(
          NextResponse.json({ error: 'Invalid file format. Only .mind files are allowed' }, { status: 400 })
        );
      }
      const mindFileBuffer = Buffer.from(await mind_file.arrayBuffer());
      const mindFileUpload = await new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload_stream(
          { resource_type: 'raw', folder: folderName },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(mindFileBuffer);
      });
      mind_file_url = (mindFileUpload as any).secure_url;
    }

    // Upload video to Cloudinary
    if (video) {
      const videoBuffer = Buffer.from(await video.arrayBuffer());
      const videoUpload = await new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload_stream(
          { resource_type: 'video', folder: folderName },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(videoBuffer);
      });
      video_url = (videoUpload as any).secure_url;
    }

    // Upload thumbnail to Cloudinary (new)
    if (thumbnail) {
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(thumbnail.type)) {
        return withCors(
          NextResponse.json({ error: 'Invalid thumbnail format. Only JPEG, PNG, GIF, WebP are allowed' }, { status: 400 })
        );
      }
      if (thumbnail.size > 2 * 1024 * 1024) { // 2MB limit
        return withCors(
          NextResponse.json({ error: 'Thumbnail size must be less than 2MB' }, { status: 400 })
        );
      }
      const thumbnailBuffer = Buffer.from(await thumbnail.arrayBuffer());
      const thumbnailUpload = await new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload_stream(
          { resource_type: 'image', folder: folderName, transformation: [{ width: 400, height: 300, crop: 'fill' }] }, // Optional: auto-resize thumbnail
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(thumbnailBuffer);
      });
      thumbnail_url = (thumbnailUpload as any).secure_url;
    }

    // Generate random slug
    const slug = Math.random().toString(36).substring(2, 8);

    // Save to Supabase
    const { data, error } = await supabase
      .from('data')
      .insert({
        slug,
        image_url: mind_file_url || '',
        video_url: video_url || '',
        thumbnail_url: thumbnail_url || '', // Added thumbnail_url
        customer_name: customer_name,
        user_id: userId,
        created_at: new Date().toISOString(),
        scans: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return withCors(
        NextResponse.json(
          { error: error.message.includes('duplicate key') ? 'Slug already exists' : 'Failed to create link' },
          { status: error.message.includes('duplicate key') ? 409 : 500 }
        )
      );
    }

    return withCors(
      NextResponse.json(
        {
          success: true,
          shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${slug}`,
          slug,
          customer_name,
          mind_file_url,
          video_url,
          thumbnail_url, // Added thumbnail_url
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