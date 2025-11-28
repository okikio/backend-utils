// endpoints/follows/list/_env.ts
/**
 * List endpoint environment configuration
 * 
 * Contains cursor secret for HMAC-signed pagination cursors
 */

export const CURSOR_SECRET = Deno.env.get('CURSOR_SECRET') ?? 'default-cursor-secret-change-in-production'