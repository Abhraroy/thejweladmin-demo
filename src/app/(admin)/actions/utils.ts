/**
 * Shared utility functions for admin actions
 */

/**
 * Extracts the R2 key from a URL
 * Handles both endpoint URLs and public URLs
 */
export function extractR2KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
    
    // Check if URL uses the endpoint format
    if (endpoint && url.includes(endpoint.replace('https://', '').replace('http://', ''))) {
      // Endpoint format: https://endpoint/bucketName/key/path
      if (bucketName && pathParts[0] === bucketName) {
        return pathParts.slice(1).join('/')
      }
      // If bucket name not in path, assume it's just the key
      return pathParts.join('/')
    }
    
    // Check if URL uses public URL format
    if (publicUrl && url.startsWith(publicUrl)) {
      // Public URL format: https://publicUrl/key/path
      const publicUrlPath = new URL(publicUrl).pathname
      const publicPathParts = publicUrlPath.split('/').filter(Boolean)
      // Remove public URL path parts and return the rest
      return pathParts.slice(publicPathParts.length).join('/') || pathParts.join('/')
    }
    
    // Fallback: assume everything after first slash is the key
    return pathParts.join('/')
  } catch (error) {
    console.error('Error extracting R2 key from URL:', error)
    return null
  }
}

