/**
 * Server-side admin configuration.
 * The admin key is used for both creating new admins and logging in.
 * Set ADMIN_SECRET_KEY in .env.local for production (never commit real secrets).
 */
export const ADMIN_SECRET_KEY =
  process.env.ADMIN_SECRET_KEY ?? 'jwel-admin-secret-key-2024'
