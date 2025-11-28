
// middleware/auth.ts
import type { Context, MiddlewareHandler, Next } from 'hono'
import type { Session, User } from '@supabase/supabase-js'

import { createAdminClient, createUserClient } from '../supabase.ts'
import { unauthorized } from '../response/index.ts'
import { getLogger } from './correlation.ts'

export type AuthUserVariables = {
  /** Authenticated user ID from JWT */
  user: User;
  /** Authenticated Supabase client with user context from Authorization header */
  supabase: ReturnType<typeof createUserClient>;
}

export type AuthAdminVariables = {
  /** Admin Supabase client with service role (bypasses RLS) */
  admin?: ReturnType<typeof createAdminClient>;
}

export const authUserMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  const logger = getLogger(c)
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Missing authorization header', {
      path: c.req.path,
      method: c.req.method,
    })

    return c.json(...unauthorized(c.req.path, 'Missing or invalid authorization header'));
  }

  const supabase = createUserClient(authHeader);
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('Authentication failed', {
      user_error: userError?.message,
    })

    return c.json(...unauthorized(c.req.path, 'Authentication required'));
  }

  c.set('user', user);
  c.set('supabase', supabase);

  logger.debug('User authenticated', {
    user_id: user.id,
  })

  await next()
}

export const authAdminMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  const supabase = createAdminClient();
  c.set('admin', supabase)
  await next()
}

