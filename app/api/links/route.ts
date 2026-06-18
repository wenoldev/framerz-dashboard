import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import fsPromises from 'fs/promises';
import pathModule from 'path';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function combineChunks(tempDir: string, total: number) {
  const buffers: Buffer[] = [];
  for (let i = 0; i < total; i++) {
    const buf = await fsPromises.readFile(pathModule.join(tempDir, i.toString()));
    buffers.push(buf);
  }
  return Buffer.concat(buffers);
}

async function cleanupTemp(tempDir: string) {
  try {
    const files = await fsPromises.readdir(tempDir);
    for (const file of files) {
      await fsPromises.unlink(pathModule.join(tempDir, file));
    }
    await fsPromises.rmdir(tempDir);
  } catch (err) {
    console.error('Error cleaning up temp files:', err);
  }
}

function extractCloudinaryInfo(url: string): { resource_type: string; public_id: string } | null {
  const match = url.match(/https?:\/\/res\.cloudinary\.com\/[^\/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.*?)(\.[^\/.]*)?$/);
  if (match) {
    const resource_type = match[1];
    const public_id = match[2] + (match[3] || '');
    return { resource_type, public_id };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: links, error } = await supabase
      .from('data')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(links);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    // Handle chunk upload
    try {
      const formData = await request.formData();
      const chunk = formData.get('chunk') as Blob | null;
      const index = parseInt(formData.get('index') as string);
      const total = parseInt(formData.get('total') as string);
      const uploadId = formData.get('uploadId') as string;
      const fileName = formData.get('fileName') as string;
      const fileType = formData.get('fileType') as string;

      if (!chunk) {
        return NextResponse.json({ error: 'No chunk provided' }, { status: 400 });
      }

      const tempDir = pathModule.join('/tmp', uploadId);
      await fsPromises.mkdir(tempDir, { recursive: true });

      const buffer = Buffer.from(await chunk.arrayBuffer());
      await fsPromises.writeFile(pathModule.join(tempDir, index.toString()), buffer);

      if (index + 1 === total) {
        const combinedBuffer = await combineChunks(tempDir, total);

        const resource_type = fileType === 'mind_file' ? 'raw' : fileType === 'video' ? 'video' : 'image';
        let public_id = `${uploadId}/${fileName.replace(/\.[^/.]+$/, "")}`;
        if (resource_type === 'raw') {
          public_id = `${uploadId}/${fileName}`;
        }

        const uploadPromise = new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type, public_id },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(combinedBuffer);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uploadResult: any = await uploadPromise;

        await cleanupTemp(tempDir);

        return NextResponse.json({ status: 'complete', url: uploadResult.secure_url });
      }

      return NextResponse.json({ status: 'partial' });
    } catch (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
  } else {
    // Handle create link
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
          mind_file_url,
          video_url,
          thumbnail_url,
          user_id: session.user.id,
          scans: 0,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(link, { status: 201 });
    } catch (error) {
      console.error('Create link error:', error);
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, customer_name, slug, mind_file_url, video_url, thumbnail_url, status } = body;

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
    if (slug) updates.slug = slug.trim();
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

    if (error) {
      if (error.code === '23505') { // postgres unique violation
        return NextResponse.json({ error: 'This slug is already taken' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
  }
}

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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}