// endpoints/follows/check/handler.ts
/**
 * Check Follow Status Handler
 * 
 * GET /follows/check?target_type=story_work&target_id=http://...
 * 
 * Returns whether the authenticated user follows a target, including
 * full follow data (id, preferences) for subsequent operations.
 */

import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '@platform/backend/server/types.ts'

import { authUserMiddleware, type AuthUserVariables } from '@platform/backend/middleware/auth.ts'
import { createValidator } from '@platform/backend/middleware/validation.ts'

import { ok, badRequest, internalServerError } from '@platform/backend/response/index.ts'
import { getLogger } from '@platform/backend/middleware/correlation.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('query', Definition.Schemas.Query),
]

/**
 * GET /follows/check - Check if user follows something
 * 
 * Determines whether the authenticated user follows a specific target.
 * Returns full follow data including `id` and `preferences` if following,
 * enabling immediate update/unfollow operations without additional lookups.
 * 
 * @query target_type - Type of entity (story_work, character, creator, user, etc.)
 * @query target_id - ID of entity (UUID for users, URI for Neptune entities)
 * @returns Follow status with full data if following
 * @throws 400 if target_type or target_id invalid/malformed
 * @throws 401 if not authenticated
 * @throws 500 if database error
 */
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async function (c) {
  const logger = getLogger(c)
  const user = c.get('user')
  const supabase = c.get('supabase')

  try {
    const query = c.req.valid('query')
    const { target_type, target_id } = query

    logger.info('Checking follow status', {
      user_id: user.id,
      target_type,
      target_id,
    })

    // ========================================================================
    // Query for follow - select all fields needed for response
    // ========================================================================
    const { data: follow, error: followError } = await supabase
      .from('user_follows')
      .select('id, preferences, created_at')
      .eq('user_id', user.id)
      .eq('target_type_code', target_type)
      .eq('target_id', target_id)
      .maybeSingle()

    if (followError) {
      logger.error('Database error checking follow', {
        error_code: followError.code,
        error_message: followError.message,
      })
      return c.json(...internalServerError(
        c.req.path,
        'Failed to check follow status'
      ))
    }

    logger.info('Follow status checked', {
      user_id: user.id,
      is_following: !!follow,
      follow_id: follow?.id ?? null,
    })

    // ========================================================================
    // Return full follow data if following
    // This enables: check → get id → immediately unfollow/update
    // ========================================================================
    const response = {
      is_following: !!follow,
      id: follow?.id ?? null,
      preferences: follow?.preferences ?? null,
      created_at: follow?.created_at ?? null,
    }

    return c.json(...ok(response, 200))

  } catch (error) {
    logger.fatal('Unhandled error in check handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    return c.json(...internalServerError(c.req.path))
  }
}

export default Handler