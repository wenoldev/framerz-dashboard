/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/auth';
import cloudinary from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

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

// Handle OPTIONS for preflight
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// GET: /api?slug=abc123
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

// POST: /api
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  // Get authenticated user securely
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;
  const folderName = userId || 'anonymous';

  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const chunk = formData.get('chunk') as File | null;

      if (chunk) {
        // Handle chunk upload
        const uploadId = formData.get('uploadId') as string;
        const index = parseInt(formData.get('index') as string);
        const total = parseInt(formData.get('total') as string);
        const fileName = formData.get('fileName') as string;
        const fileType = formData.get('fileType') as string;

        const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `${uploadId}_${fileName}`);

        if (index === 0) {
          await fs.writeFile(tempFilePath, chunkBuffer);
        } else {
          await fs.appendFile(tempFilePath, chunkBuffer);
        }

        if (index === total - 1) {
          // All chunks received, upload to Cloudinary
          const fileBuffer = await fs.readFile(tempFilePath);

          let resourceType: 'image' | 'video' | 'raw' = 'image';
          let transformations: { width: number; height: number; crop: string; }[];
          if (fileType === 'video') {
            resourceType = 'video';
          } else if (fileType === 'mind_file') {
            resourceType = 'raw';
          } else if (fileType === 'thumbnail') {
            transformations = [{ width: 400, height: 300, crop: 'fill' }];
          }

          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
              {
                resource_type: resourceType,
                folder: folderName,
                transformation: transformations,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            stream.end(fileBuffer);
          });

          const url = (uploadResult as any).secure_url;

          // Cleanup temp file
          await fs.unlink(tempFilePath);

          return withCors(NextResponse.json({ status: 'complete', url }));
        } else {
          return withCors(NextResponse.json({ status: 'chunk received' }));
        }
      } else {
        // Legacy full file upload (if needed, but can remove if fully switching to chunks)
        const customer_name = formData.get('customer_name') as string;
        const mind_file = formData.get('mind_file') as File | null;
        const video = formData.get('video') as File | null;
        const thumbnail = formData.get('thumbnail') as File | null;

        if (!customer_name) {
          return withCors(NextResponse.json({ error: 'Customer name is required' }, { status: 400 }));
        }

        let mind_file_url = '';
        if (mind_file) {
          if (!mind_file.name.endsWith('.mind')) {
            return withCors(NextResponse.json({ error: 'Invalid file format. Only .mind files are allowed' }, { status: 400 }));
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

        let video_url = '';
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

        let thumbnail_url = '';
        if (thumbnail) {
          const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
          if (!validImageTypes.includes(thumbnail.type)) {
            return withCors(NextResponse.json({ error: 'Invalid thumbnail format. Only JPEG, PNG, GIF, WebP are allowed' }, { status: 400 }));
          }
          const thumbnailBuffer = Buffer.from(await thumbnail.arrayBuffer());
          const thumbnailUpload = await new Promise((resolve, reject) => {
            cloudinary.v2.uploader.upload_stream(
              { resource_type: 'image', folder: folderName, transformation: [{ width: 400, height: 300, crop: 'fill' }] },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(thumbnailBuffer);
          });
          thumbnail_url = (thumbnailUpload as any).secure_url;
        }

        const slug = Math.random().toString(36).substring(2, 8);

        const { data, error } = await supabase
          .from('data')
          .insert({
            slug,
            image_url: mind_file_url || '',
            video_url: video_url || '',
            thumbnail_url: thumbnail_url || '',
            customer_name: customer_name,
            user_id: userId,
            created_at: new Date().toISOString(),
            scans: 0
          })
          .select()
          .single();

        if (error) {
          return withCors(NextResponse.json({ error: 'Failed to create link' }, { status: 500 }));
        }

        return withCors(NextResponse.json({
          success: true,
          shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${data.slug}`,
          slug: data.slug,
          customer_name,
          mind_file_url,
          video_url,
          thumbnail_url,
          isAuthenticated: !!userId
        }, { status: 201 }));
      }
    } else {
      // JSON body for create with pre-uploaded URLs
      const body = await req.json();
      const { customer_name, mind_file_url = '', video_url = '', thumbnail_url = '' } = body;

      if (!customer_name) {
        return withCors(NextResponse.json({ error: 'Customer name is required' }, { status: 400 }));
      }

      const slug = Math.random().toString(36).substring(2, 8);

      const { data, error } = await supabase
        .from('data')
        .insert({
          slug,
          image_url: mind_file_url,
          video_url: video_url,
          thumbnail_url: thumbnail_url,
          customer_name,
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
    }
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