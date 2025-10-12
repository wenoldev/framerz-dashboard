/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";

// Use a distinct name for the top-level anon client (public)
const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configure Cloudinary (using v2 import)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CORS helper — returns the same response after setting headers
function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

// Handle OPTIONS for preflight
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// GET: /api?slug=abc123
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");

  if (!slug) {
    return withCors(NextResponse.json({ error: "Slug is required" }, { status: 400 }));
  }

  const { data, error } = await publicSupabase
    .from("data")
    .select("image_url, video_url, thumbnail_url, customer_name")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  return withCors(
    NextResponse.json({
      customer_name: data.customer_name,
      mind_file_url: data.image_url,
      video_url: data.video_url,
      thumbnail_url: data.thumbnail_url,
    }),
  );
}

// POST: /api
export async function POST(req: NextRequest) {
  // serverSupabase is the server-side client (authenticated via cookies)
  const serverSupabase = await createServerSupabaseClient();

  // Get authenticated user securely
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  const userId = user?.id ?? null;
  const folderName = userId ?? "anonymous";

  const MAX_MINDFILE_BYTES = 5 * 1024 * 1024; // 5MB
  const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
  const MAX_THUMBNAIL_BYTES = 500 * 1024; // 500KB

  // helper: ensure profile row and return profile data
  async function ensureProfileAndGet(supabaseClient: SupabaseClient, userIdArg: string) {
    await supabaseClient.from("profiles").upsert({ user_id: userIdArg }, { onConflict: "user_id" });
    const { data } = await supabaseClient.from("profiles").select("points").eq("user_id", userIdArg).maybeSingle();
    return data ?? { points: 0 };
  }

  // helper: check and spend points (or allow demo)
  async function requirePointsOrDemo(supabaseClient: SupabaseClient, userIdArg: string | null, requiredPoints: number) {
    if (!userIdArg) return { ok: true }; // anonymous flow allowed (first link free etc)

    // count existing links to decide demo
    // const { count } = await supabaseClient.from("data").select("id", { count: "exact", head: true }).eq("user_id", userIdArg);

    // if ((count ?? 0) === 0) return { ok: true }; // first link free

    const profile = await ensureProfileAndGet(supabaseClient, userIdArg);
    const current = profile.points ?? 0;
    console.log('User points:', current, 'Required:', requiredPoints);
    if (current < requiredPoints) {
      const missingPoints = requiredPoints - current;
      const amountRs = missingPoints * 10; // 1 point -> 10₹ per your mapping
      return {
        ok: false,
        missingPoints,
        amountRs,
        payUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/settings?points=${missingPoints}`,
      };
    }

    // attempt atomic spend via RPC (assumes you have spend_points RPC defined)
    const { error: rpcErr } = await supabaseClient.rpc("spend_points", { p_user_id: userIdArg, p_points: requiredPoints });
    if (rpcErr) {
      return {
        ok: false,
        missingPoints: requiredPoints,
        amountRs: requiredPoints * 10,
        payUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/settings?points=${requiredPoints}`,
      };
    }
    return { ok: true };
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const chunk = formData.get("chunk") as File | null;

      if (chunk) {
        // Handle chunked upload
        const uploadId = String(formData.get("uploadId") ?? "");
        const index = Number.parseInt(String(formData.get("index") ?? "0"), 10);
        const total = Number.parseInt(String(formData.get("total") ?? "1"), 10);
        const fileName = String(formData.get("fileName") ?? "upload");
        const fileType = String(formData.get("fileType") ?? "mind_file");

        // Extract extension from fileName
        const ext = path.extname(fileName).toLowerCase() || (fileType === "mind_file" ? ".mind" : fileType === "video" ? ".mp4" : ".jpg");
        const baseName = path.basename(fileName, ext) || "content";
        const publicId = `${folderName}/${fileType === "mind_file" ? "mind" : fileType}/${baseName}${ext}`;

        // Validate file type
        if (fileType === "mind_file" && ext !== ".mind") {
          return withCors(NextResponse.json({ error: "Invalid file format. Only .mind files are allowed for mind_file" }, { status: 400 }));
        }
        if (fileType === "thumbnail") {
          const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
          const ext = path.extname(fileName).toLowerCase();
          const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

          if (!validImageTypes.includes(chunk.type) && !validExtensions.includes(ext)) {
            return withCors(
              NextResponse.json({ error: "Invalid thumbnail format. Only JPEG, PNG, GIF, WebP are allowed" }, { status: 400 }),
            );
          }
        }
        // Convert File -> Buffer safely
        const chunkArrayBuffer = await chunk.arrayBuffer();
        const chunkBuffer = Buffer.from(new Uint8Array(chunkArrayBuffer));

        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `${uploadId}_${fileName}`);

        if (index === 0) {
          await fs.writeFile(tempFilePath, chunkBuffer);
        } else {
          await fs.appendFile(tempFilePath, chunkBuffer);
        }

        if (index === total - 1) {
          // Last chunk; read assembled file
          let fileBuffer = await fs.readFile(tempFilePath);

          // Size validation
          if (fileType === "mind_file" && fileBuffer.byteLength > MAX_MINDFILE_BYTES) {
            await fs.unlink(tempFilePath).catch(() => {});
            return withCors(NextResponse.json({ error: "Mind file exceeds 5MB" }, { status: 413 }));
          }
          if (fileType === "video" && fileBuffer.byteLength > MAX_VIDEO_BYTES) {
            await fs.unlink(tempFilePath).catch(() => {});
            return withCors(NextResponse.json({ error: "Video exceeds 100MB" }, { status: 413 }));
          }
          if (fileType === "thumbnail" && fileBuffer.byteLength > MAX_THUMBNAIL_BYTES) {
            try {
              let quality = 80;
              for (let i = 0; i < 3 && fileBuffer.byteLength > MAX_THUMBNAIL_BYTES; i++) {
                fileBuffer = await sharp(fileBuffer).jpeg({ quality, mozjpeg: true }).toBuffer();
                quality = Math.max(40, quality - 20);
              }
              if (fileBuffer.byteLength > MAX_THUMBNAIL_BYTES) {
                await fs.unlink(tempFilePath).catch(() => {});
                return withCors(NextResponse.json({ error: "Thumbnail exceeds 500KB even after compression" }, { status: 413 }));
              }
            } catch {
              await fs.unlink(tempFilePath).catch(() => {});
              return withCors(NextResponse.json({ error: "Failed to process thumbnail" }, { status: 400 }));
            }
          }

          // Decide Cloudinary resource type & transformations
          let resourceType: "image" | "video" | "raw" = "image";
          let transformation: any | undefined;
          if (fileType === "video") resourceType = "video";
          else if (fileType === "mind_file") resourceType = "raw";
          else if (fileType === "thumbnail") transformation = [{ width: 400, height: 300, crop: "fill" }];

          // Upload to Cloudinary with structured public_id
          const uploadResult = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                resource_type: resourceType,
                public_id: publicId,
                folder: folderName, // Still set folder for base path, but public_id overrides
                transformation: transformation,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            );
            stream.end(fileBuffer);
          });

          const url = uploadResult?.secure_url ?? "";

          await fs.unlink(tempFilePath).catch(() => {});

          return withCors(NextResponse.json({ status: "complete", url }));
        } else {
          return withCors(NextResponse.json({ status: "chunk received" }));
        }
      } else {
        // Legacy full-file upload via multipart form
        const customer_name = String(formData.get("customer_name") ?? "");
        const mind_file = formData.get("mind_file") as File | null;
        const video = formData.get("video") as File | null;
        const thumbnail = formData.get("thumbnail") as File | null;

        // Validate file sizes and types before points check
        if (mind_file) {
          const ab = await mind_file.arrayBuffer();
          const b = Buffer.from(new Uint8Array(ab));
          if (b.byteLength > MAX_MINDFILE_BYTES) {
            return withCors(NextResponse.json({ error: "Mind file exceeds 5MB" }, { status: 413 }));
          }
          if (!mind_file.name.endsWith(".mind")) {
            return withCors(NextResponse.json({ error: "Invalid file format. Only .mind files are allowed" }, { status: 400 }));
          }
        }
        if (video) {
          const ab = await video.arrayBuffer();
          const b = Buffer.from(new Uint8Array(ab));
          if (b.byteLength > MAX_VIDEO_BYTES) {
            return withCors(NextResponse.json({ error: "Video exceeds 100MB" }, { status: 413 }));
          }
        }
        if (thumbnail) {
          const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
          if (!validImageTypes.includes(thumbnail.type)) {
            return withCors(
              NextResponse.json({ error: "Invalid thumbnail format. Only JPEG, PNG, GIF, WebP are allowed" }, { status: 400 }),
            );
          }
          const ab = await thumbnail.arrayBuffer();
          const b = Buffer.from(new Uint8Array(ab));
          if (b.byteLength > MAX_THUMBNAIL_BYTES) {
            try {
              const compressedBuffer = await sharp(b).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
              if (compressedBuffer.byteLength > MAX_THUMBNAIL_BYTES) {
                return withCors(NextResponse.json({ error: "Thumbnail exceeds 500KB even after compression" }, { status: 413 }));
              }
            } catch {
              return withCors(NextResponse.json({ error: "Failed to process thumbnail" }, { status: 400 }));
            }
          }
        }

        // Check points before uploading to Cloudinary
        const requiredPoints = 20;
        const gating = await requirePointsOrDemo(serverSupabase, userId, requiredPoints);
        if (!gating.ok) {
          return withCors(
            NextResponse.json(
              {
                paymentRequired: true,
                requiredPoints,
                missingPoints: gating.missingPoints,
                amountRs: gating.amountRs,
                payUrl: gating.payUrl,
              },
              { status: 402 },
            ),
          );
        }

        // Proceed with uploads after points check
        let thumbnail_url = "";
        if (thumbnail) {
          const ext = path.extname(thumbnail.name).toLowerCase();
          const baseName = path.basename(thumbnail.name, ext) || "content";
          const publicId = `${folderName}/thumbnail/${baseName}${ext}`;
          let thumbnailBuffer:any = Buffer.from(new Uint8Array(await thumbnail.arrayBuffer()));
          if (thumbnailBuffer.byteLength > MAX_THUMBNAIL_BYTES) {
            thumbnailBuffer = await sharp(thumbnailBuffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
          }
          const thumbnailUpload = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "image",
                  public_id: publicId,
                  folder: folderName,
                  transformation: [{ width: 400, height: 300, crop: "fill" }],
                },
                (error, result) => (error ? reject(error) : resolve(result)),
              )
              .end(thumbnailBuffer);
          });
          thumbnail_url = thumbnailUpload?.secure_url ?? "";
        }

        let mind_file_url = "";
        if (mind_file) {
          const ext = path.extname(mind_file.name).toLowerCase();
          const baseName = path.basename(mind_file.name, ext) || "content";
          const publicId = `${folderName}/mind/${baseName}${ext}`;
          const ab = await mind_file.arrayBuffer();
          const mindFileBuffer = Buffer.from(new Uint8Array(ab));
          const mindFileUpload = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "raw",
                  public_id: publicId,
                  folder: folderName,
                },
                (error, result) => (error ? reject(error) : resolve(result)),
              )
              .end(mindFileBuffer);
          });
          mind_file_url = mindFileUpload?.secure_url ?? "";
        }

        let video_url = "";
        if (video) {
          const ext = path.extname(video.name).toLowerCase();
          const baseName = path.basename(video.name, ext) || "content";
          const publicId = `${folderName}/video/${baseName}${ext}`;
          const ab = await video.arrayBuffer();
          const videoBuffer = Buffer.from(new Uint8Array(ab));
          const videoUpload = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "video",
                  public_id: publicId,
                  folder: folderName,
                },
                (error, result) => (error ? reject(error) : resolve(result)),
              )
              .end(videoBuffer);
          });
          video_url = videoUpload?.secure_url ?? "";
        }

        const slug = Math.random().toString(36).substring(2, 8);

        const { data, error } = await serverSupabase
          .from("data")
          .insert({
            slug,
            image_url: mind_file_url ?? "",
            video_url: video_url ?? "",
            thumbnail_url: thumbnail_url ?? "",
            customer_name,
            user_id: userId,
            created_at: new Date().toISOString(),
            scans: 0,
          })
          .select()
          .maybeSingle();

        if (error || !data) {
          return withCors(NextResponse.json({ error: "Failed to create link" }, { status: 500 }));
        }

        return withCors(
          NextResponse.json(
            {
              success: true,
              shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${data.slug}`,
              slug: data.slug,
              customer_name,
              mind_file_url,
              video_url,
              thumbnail_url,
              isAuthenticated: !!userId,
            },
            { status: 201 },
          ),
        );
      }
    } else {
      // JSON body for create with pre-uploaded URLs
      const body = await req.json();
      const { customer_name, mind_file_url = "", video_url = "", thumbnail_url = "" } = body;

      const requiredPoints = 20;
      const gating = await requirePointsOrDemo(serverSupabase, userId, requiredPoints);
      if (!gating.ok) {
        return withCors(
          NextResponse.json(
            {
              paymentRequired: true,
              requiredPoints,
              missingPoints: gating.missingPoints,
              amountRs: gating.amountRs,
              payUrl: gating.payUrl,
            },
            { status: 402 },
          ),
        );
      }

      const slug = Math.random().toString(36).substring(2, 8);

      const { data, error } = await serverSupabase
        .from("data")
        .insert({
          slug,
          image_url: mind_file_url,
          video_url: video_url,
          thumbnail_url: thumbnail_url,
          customer_name,
          user_id: userId,
          created_at: new Date().toISOString(),
          scans: 0,
        })
        .select()
        .maybeSingle();

      if (error || !data) {
        console.error("Supabase error:", error);
        return withCors(
          NextResponse.json(
            { error: error?.message?.includes("duplicate key") ? "Slug already exists" : "Failed to create link" },
            { status: error?.message?.includes("duplicate key") ? 409 : 500 },
          ),
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
            thumbnail_url,
            isAuthenticated: !!userId,
          },
          { status: 201 },
        ),
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return withCors(NextResponse.json({ error: "Failed to process request", details: errorMessage }, { status: 500 }));
  }
}