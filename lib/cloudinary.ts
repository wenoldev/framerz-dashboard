/**
 * Cloudinary helper utility for Edge / Cloudflare Workers and Node.js runtimes.
 * Uses native fetch and Web Crypto / crypto to avoid Node https.request incompatibilities in worker isolates.
 */

async function sha1Hex(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const nodeCrypto = await import('crypto');
  return nodeCrypto.createHash('sha1').update(str).digest('hex');
}

/**
 * Extracts resource_type and public_id from a Cloudinary delivery URL.
 * - For 'raw' resources (e.g. .mind files), public_id includes the file extension.
 * - For 'image' and 'video' resources, public_id excludes the file extension.
 */
export function extractCloudinaryInfo(url: string): { resource_type: string; public_id: string } | null {
  if (!url) return null;
  const match = url.match(
    /https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.*?)(\.[^/.]*)?$/
  );
  if (match) {
    const resource_type = match[1];
    const public_id = resource_type === 'raw'
      ? match[2] + (match[3] || '')
      : match[2];
    return { resource_type, public_id };
  }
  return null;
}

/**
 * Destroys an asset on Cloudinary via its direct REST API using fetch.
 * All errors are caught and logged so asset cleanup failures never block core database operations.
 */
export async function destroyCloudinaryAsset(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;

  try {
    const info = extractCloudinaryInfo(url);
    if (!info) return false;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('Cloudinary credentials missing, skipping asset deletion:', info.public_id);
      return false;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const toSign = `public_id=${info.public_id}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1Hex(toSign);

    const formData = new URLSearchParams();
    formData.append('public_id', info.public_id);
    formData.append('timestamp', timestamp);
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${info.resource_type}/destroy`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json().catch(() => null);
    console.log(`Cloudinary destroyed asset ${info.public_id} (${info.resource_type}):`, data);
    return res.ok;
  } catch (err) {
    // Non-fatal: Never fail database updates or deletes if Cloudinary cleanup encounters an issue
    console.error('Non-fatal error destroying Cloudinary asset:', err);
    return false;
  }
}

