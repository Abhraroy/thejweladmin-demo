/**
 * Cloudflare R2 Upload Utility (S3-compatible)
 *
 * Required Environment Variables:
 * - CLOUDFLARE_R2_ACCESS_KEY_ID: Your R2 Access Key ID
 * - CLOUDFLARE_R2_SECRET_ACCESS_KEY: Your R2 Secret Access Key
 * - CLOUDFLARE_R2_ENDPOINT: Your R2 endpoint URL
 * - CLOUDFLARE_R2_BUCKET_NAME: Your R2 bucket name
 * - CLOUDFLARE_R2_PUBLIC_URL: CDN base URL for accessing uploaded files (e.g. https://cdn.mydomain.com)
 *
 * Note: This uses R2 (S3-compatible storage) instead of Cloudflare Images API
 */

import * as crypto from 'crypto';

const isDev = process.env.NODE_ENV === 'development';

function devLog(message: string, data?: Record<string, unknown>) {
  if (isDev) {
    if (data) {
      console.log(`[R2] ${message}`, data);
    } else {
      console.log(`[R2] ${message}`);
    }
  }
}

type UploadResult =
  | { success: true; url: string; key: string }
  | { success: false; error: string };

type DeleteResult =
  | { success: true }
  | { success: false; error: string };

type GetImageDetailsResult =
  | { success: true; data: { url: string; key: string } }
  | { success: false; error: string };

/**
 * Generates AWS Signature Version 4 for S3-compatible requests
 */
function generateSignature(
  secretKey: string,
  date: string,
  region: string,
  service: string,
  stringToSign: string
): string {
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(date).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/g, '');
}

function joinUrl(baseUrl: string, key: string): string {
  // Stable, safe URL for Supabase (CDN-based, not endpoint/R2 domain based).
  return `${stripTrailingSlashes(baseUrl)}/${key}`;
}

function sanitizeSinglePathSegment(input: string, fallback: string): string {
  // Single segment; use underscore (no hyphen). Allowed: alphanumeric, dot, underscore.
  const collapsed = input.trim().replace(/\s+/g, '_').replace(/[\\/]/g, '_');
  const safe = collapsed.replace(/[^a-zA-Z0-9._]/g, '_');
  if (!safe || safe === '.' || safe === '..') return fallback;
  return safe;
}

function sanitizeFolderPath(input: string, fallback: string): string {
  // Multi-segment folder path: products/images → products/images (sanitize each segment, join with /)
  const trimmed = input.trim().replace(/\\/g, '/');
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length === 0) return fallback;
  const safe = segments.map((s) => sanitizeSinglePathSegment(s, 'default')).join('/');
  return safe || fallback;
}

function sanitizeHeaderValue(input: string): string {
  // Prevent CRLF/header injection.
  return String(input).replace(/[\r\n]+/g, ' ').trim();
}

function normalizeHeaderValueForSigning(input: string): string {
  // AWS SigV4 canonicalization: trim and collapse sequential spaces.
  return sanitizeHeaderValue(input).replace(/\s+/g, ' ');
}

function sanitizeMetadataKey(key: string): string {
  // Restrict to safe characters for stable signing + header safety.
  const lower = String(key).trim().toLowerCase();
  const safe = lower.replace(/[^a-z0-9_-]/g, '-');
  return safe || 'meta';
}

function extensionFromMime(mimeType: string): string {
  // Use MIME type for extension instead of file.name.
  const mime = mimeType.trim().toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  const ext = map[mime];
  if (!ext) {
    throw new Error(`Unsupported image MIME type for upload: ${mimeType}`);
  }
  return ext;
}

function toAmzDates(now: Date): { date: string; datetime: string } {
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, -1) + 'Z';
  if (datetime.length !== 16) {
    throw new Error(`Invalid amz datetime format: ${datetime}`);
  }
  return { date, datetime };
}

function buildCanonicalRequest(params: {
  method: string;
  canonicalUri: string;
  canonicalQueryString: string;
  headers: Record<string, string>;
  signedPayloadHashHex: string;
}): { canonicalRequest: string; signedHeaders: string } {
  // Header names must already be lowercase.
  const headerKeys = Object.keys(params.headers).sort();
  const canonicalHeaders =
    headerKeys.map((k) => `${k}:${normalizeHeaderValueForSigning(params.headers[k])}`).join('\n') + '\n';
  const signedHeaders = headerKeys.join(';');
  const canonicalRequest = [
    params.method,
    params.canonicalUri,
    params.canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    params.signedPayloadHashHex,
  ].join('\n');
  return { canonicalRequest, signedHeaders };
}

function buildEncodedR2Path(key: string): string {
  // Encode each path segment independently.
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function readR2ErrorMessage(status: number, statusText: string, bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) return `R2 request failed: ${status} ${statusText}`;

  if (trimmed.startsWith('<')) {
    const match = trimmed.match(/<Message>([\s\S]*?)<\/Message>/i);
    if (match?.[1]) return `R2 request failed: ${status} ${statusText} - ${match[1].trim()}`;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const msg =
      parsed?.message ||
      parsed?.error?.message ||
      parsed?.Message ||
      parsed?.error ||
      parsed?.Error;
    if (typeof msg === 'string' && msg.trim()) {
      return `R2 request failed: ${status} ${statusText} - ${msg.trim()}`;
    }
  } catch {
    // ignore JSON parse errors
  }

  const shortened = trimmed.length > 800 ? `${trimmed.slice(0, 800)}...` : trimmed;
  return `R2 request failed: ${status} ${statusText} - ${shortened}`;
}

type UploadImageOptions = {
  folder?: string;
  metadata?: Record<string, string>;
  /**
   * Optional Content-Disposition value (e.g. `inline; filename="x.png"`).
   * Header injection is prevented.
   */
  contentDisposition?: string;
};

/**
 * Uploads an image file to Cloudflare R2 and returns the public URL
 * @param file - The image file to upload
 * @param options - Optional configuration
 * @returns Promise with upload result containing public URL
 */
export async function uploadImageToCloudflare(
  file: File,
  options: UploadImageOptions = {}
): Promise<UploadResult> {
  try {
    // Validate all required env vars up-front (fail fast with a clear message).
    const accessKeyId = getRequiredEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = getRequiredEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const endpoint = getRequiredEnv('CLOUDFLARE_R2_ENDPOINT');
    const bucketName = getRequiredEnv('CLOUDFLARE_R2_BUCKET_NAME');
    const publicUrl = getRequiredEnv('CLOUDFLARE_R2_PUBLIC_URL');

    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.host; // includes port if present
    const endpointOrigin = endpointUrl.origin;

    // Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      devLog('Upload rejected: invalid file type', { type: file.type, name: file.name });
      return { success: false, error: 'File must be an image with a valid MIME type' };
    }

    // Validate file size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      devLog('Upload rejected: file too large', { size: file.size, maxSize, name: file.name });
      return { success: false, error: 'File size must be <= 50MB' };
    }

    devLog('Upload started', { name: file.name, size: file.size, type: file.type, folder: options.folder ?? 'categories' });

    // Generate deterministic, safe object key:
    // folder/random.ext (all / no -, no timestamp)
    const folder = sanitizeFolderPath(options.folder ?? 'categories', 'categories');
    const ext = extensionFromMime(file.type); // MIME-type-based extension
    const randomString = crypto.randomBytes(8).toString('hex');
    const key = `${folder}/${randomString}.${ext}`;

    // Prepare S3-compatible SigV4 request
    const region = 'auto'; // R2 uses 'auto' as region
    const service = 's3';
    const now = new Date();
    const { date, datetime } = toAmzDates(now);

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Path-style URL: canonical URI must be /{bucket}/{key} to match actual request path
    const canonicalUri = `/${bucketName}/${key}`;
    const canonicalQueryString = '';

    const payloadHashHex = crypto.createHash('sha256').update(buffer).digest('hex');
    const cacheControl = 'public, max-age=31536000, immutable';

    // Headers (lowercase keys for signing).
    const signingHeaders: Record<string, string> = {
      host,
      'x-amz-content-sha256': payloadHashHex,
      'x-amz-date': datetime,
      'content-type': file.type,
      'cache-control': cacheControl,
    };

    // Optional metadata headers: x-amz-meta-*
    if (options.metadata) {
      for (const [rawKey, rawValue] of Object.entries(options.metadata)) {
        const metaKey = sanitizeMetadataKey(rawKey);
        signingHeaders[`x-amz-meta-${metaKey}`] = sanitizeHeaderValue(rawValue);
      }
    }

    // Optional content-disposition header.
    if (options.contentDisposition) {
      signingHeaders['content-disposition'] = sanitizeHeaderValue(options.contentDisposition);
    }

    const { canonicalRequest, signedHeaders: signedHeadersList } = buildCanonicalRequest({
      method: 'PUT',
      canonicalUri,
      canonicalQueryString,
      headers: signingHeaders,
      signedPayloadHashHex: payloadHashHex,
    });

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      datetime,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Generate signature
    const signature = generateSignature(secretAccessKey, date, region, service, stringToSign);

    // Create authorization header
    const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

    // Upload to R2:
    // actual request URL must include the bucket name.
    const uploadUrl = `${endpointOrigin}/${bucketName}/${buildEncodedR2Path(key)}`;

    const fetchHeaders: Record<string, string> = {
      'x-amz-date': datetime,
      'x-amz-content-sha256': payloadHashHex,
      'Content-Type': file.type,
      'Cache-Control': cacheControl,
      Authorization: authorization,
    };

    if (options.metadata) {
      for (const [rawKey, rawValue] of Object.entries(options.metadata)) {
        const metaKey = sanitizeMetadataKey(rawKey);
        fetchHeaders[`x-amz-meta-${metaKey}`] = sanitizeHeaderValue(rawValue);
      }
    }

    if (options.contentDisposition) {
      fetchHeaders['content-disposition'] = sanitizeHeaderValue(options.contentDisposition);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: fetchHeaders,
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const errorMsg = readR2ErrorMessage(response.status, response.statusText, errorText);
      devLog('R2 upload failed', { status: response.status, statusText: response.statusText, errorText, errorMsg, key });
      return {
        success: false,
        error: errorMsg,
      };
    }

    devLog('R2 upload success', { key, url: joinUrl(publicUrl, key) });

    // Always return a clean CDN URL from CLOUDFLARE_R2_PUBLIC_URL.
    // This is safe to store in Supabase and will remain stable (doesn't reference R2 endpoints).
    const fileUrl = joinUrl(publicUrl, key);

    return {
      success: true,
      url: fileUrl,
      key: key,
    };

  } catch (error) {
    devLog('R2 upload error (caught)', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during R2 upload',
    };
  }
}

/**
 * Deletes an image from Cloudflare R2
 * @param key - The key (path) of the image to delete
 * @returns Promise with deletion result
 */
export async function deleteImageFromCloudflare(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate all required env vars up-front (fail fast with a clear message).
    const accessKeyId = getRequiredEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = getRequiredEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const endpoint = getRequiredEnv('CLOUDFLARE_R2_ENDPOINT');
    const bucketName = getRequiredEnv('CLOUDFLARE_R2_BUCKET_NAME');

    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.host;
    const endpointOrigin = endpointUrl.origin;

    const region = 'auto';
    const service = 's3';
    const now = new Date();
    const { date, datetime } = toAmzDates(now);

    // Create canonical request for DELETE
    const payloadHashHex = crypto.createHash('sha256').update('').digest('hex');

    const safeKey = key.trim().replace(/^\/+/, '');
    if (!safeKey || safeKey.includes('..')) {
      return { success: false, error: 'Invalid R2 key provided for deletion' };
    }

    // Path-style URL: canonical URI must be /{bucket}/{key} to match actual request path
    const canonicalUri = `/${bucketName}/${safeKey}`;
    const canonicalQueryString = '';

    const signingHeaders: Record<string, string> = {
      host,
      'x-amz-content-sha256': payloadHashHex,
      'x-amz-date': datetime,
    };

    const { canonicalRequest, signedHeaders: signedHeadersList } = buildCanonicalRequest({
      method: 'DELETE',
      canonicalUri,
      canonicalQueryString,
      headers: signingHeaders,
      signedPayloadHashHex: payloadHashHex,
    });

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      datetime,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Generate signature
    const signature = generateSignature(secretAccessKey, date, region, service, stringToSign);

    // Create authorization header
    const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

    // Delete from R2
    const deleteUrl = `${endpointOrigin}/${bucketName}/${buildEncodedR2Path(safeKey)}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'x-amz-date': datetime,
        'x-amz-content-sha256': payloadHashHex,
        'Authorization': authorization,
      },
    });

    // Idempotent delete: treat missing object as success.
    if (response.ok) return { success: true };
    if (response.status === 404) return { success: true };

    const errorText = await response.text().catch(() => '');
    return {
      success: false,
      error: readR2ErrorMessage(response.status, response.statusText, errorText),
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during R2 deletion',
    };
  }
}

/**
 * Gets image details from Cloudflare R2 (basic implementation)
 * @param key - The key (path) of the image
 * @returns Promise with image details
 */
export async function getImageDetails(key: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Validate required env vars up-front (fail fast with a clear message).
    const publicUrl = getRequiredEnv('CLOUDFLARE_R2_PUBLIC_URL');

    const safeKey = key.trim().replace(/^\/+/, '');
    if (!safeKey) return { success: false, error: 'Invalid key provided' };

    // Always return a CDN-based stable URL safe to store in Supabase.
    const url = joinUrl(publicUrl, safeKey);
    return { success: true, data: { url, key: safeKey } };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during getImageDetails',
    };
  }
}
