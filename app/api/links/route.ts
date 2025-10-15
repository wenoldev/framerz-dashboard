import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import fsPromises from 'fs/promises';
import pathModule from 'path';

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

function extractPathFromUrl(url: string): string | null {
  const match = url.match(/\/object\/public\/files\/(.+)/);
  return match ? match[1] : null;
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

      if (!chunk) {
        return NextResponse.json({ error: 'No chunk provided' }, { status: 400 });
      }

      const tempDir = pathModule.join('/tmp', uploadId);
      await fsPromises.mkdir(tempDir, { recursive: true });

      const buffer = Buffer.from(await chunk.arrayBuffer());
      await fsPromises.writeFile(pathModule.join(tempDir, index.toString()), buffer);

      if (index + 1 === total) {
        const combinedBuffer = await combineChunks(tempDir, total);

        const { data, error: uploadError } = await supabase.storage
          .from('files')
          .upload(`${uploadId}/${fileName}`, combinedBuffer, {
            contentType: chunk.type,
          });

        if (uploadError) {
          await cleanupTemp(tempDir);
          throw uploadError;
        }

        const { data: publicData } = supabase.storage
          .from('files')
          .getPublicUrl(`${uploadId}/${fileName}`);

        await cleanupTemp(tempDir);

        return NextResponse.json({ status: 'complete', url: publicData.publicUrl });
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

      const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 10);

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

    const updates: any = {};

    if (customer_name) updates.customer_name = customer_name;
    if (status) updates.status = status;

    if (mind_file_url && mind_file_url !== existingLink.mind_file_url) {
      if (existingLink.mind_file_url) {
        const oldPath = extractPathFromUrl(existingLink.mind_file_url);
        if (oldPath) {
          await supabase.storage.from('files').remove([oldPath]);
        }
      }
      updates.mind_file_url = mind_file_url;
    }

    if (video_url && video_url !== existingLink.video_url) {
      if (existingLink.video_url) {
        const oldPath = extractPathFromUrl(existingLink.video_url);
        if (oldPath) {
          await supabase.storage.from('files').remove([oldPath]);
        }
      }
      updates.video_url = video_url;
    }

    if (thumbnail_url && thumbnail_url !== existingLink.thumbnail_url) {
      if (existingLink.thumbnail_url) {
        const oldPath = extractPathFromUrl(existingLink.thumbnail_url);
        if (oldPath) {
          await supabase.storage.from('files').remove([oldPath]);
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

    const paths: string[] = [];
    if (existingLink.mind_file_url) {
      const p = extractPathFromUrl(existingLink.mind_file_url);
      if (p) paths.push(p);
    }
    if (existingLink.video_url) {
      const p = extractPathFromUrl(existingLink.video_url);
      if (p) paths.push(p);
    }
    if (existingLink.thumbnail_url) {
      const p = extractPathFromUrl(existingLink.thumbnail_url);
      if (p) paths.push(p);
    }

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from('files').remove(paths);
      if (removeError) console.error('Error removing files:', removeError);
    }

    const { error } = await supabase.from('data').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}