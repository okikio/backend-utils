// endpoints/follows/list/_env.ts
/**
 * List endpoint environment configuration
 * 
 * Contains cursor secret for HMAC-signed pagination cursors
 */

import { getEnv } from '@platform/shared/utils/env.ts'

export const CURSOR_SECRET = getEnv('CURSOR_SECRET') ?? 'default-cursor-secret-change-in-production'