// endpoints/update/handler.ts
/**
 * Update Follow Preferences Handler
 * 
 * PATCH /follows/:id
 * 
 * Updates follow preferences using deep merge semantics.
 * Notifications object is merged (not replaced) for partial updates.
 */

import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '#shared/server/types.ts'
import type { FollowPreferences } from '../../../utils/_schemas.ts'
import type { Json } from '@platform/shared/types/index.ts'

import { authUserMiddleware, type AuthUserVariables } from '#shared/middleware/auth.ts'
import { createValidator } from '#shared/middleware/validation.ts'

import { ok, notFound, forbidden, internalServerError } from '@platform/backend/response/index.ts'
import { getLogger } from '#shared/middleware/correlation.ts'

import { deepMergePreferences } from '../../../utils/_schemas.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('param', Definition.Schemas.Param),
  createValidator('json', Definition.Schemas.Json),
]

/**
 * PATCH /follows/:id - Update follow preferences
 * 
 * Updates follow preferences using deep merge semantics.
 * 
 * ## Deep Merge Behavior
 * 
 * - Top-level keys (auto_pull, formats, etc.) replace existing values
 * - `notifications` object is merged, not replaced
 * 
 * This allows partial updates like:
 * ```json
 * { "preferences": { "notifications": { "new_issue": false } } }
 * ```
 * 
 * Without losing other notification settings.
 * 
 * ## Nuances Handled
 * 
 * 1. **Ownership verification** - Ensures user owns the follow
 * 2. **Deep merge** - Merges notifications, replaces other fields
 * 3. **No updated_at** - Schema doesn't have updated_at column
 * 
 * @param id - UUID of the follow to update
 * @body preferences - Partial preferences to merge
 * @returns Updated follow with merged preferences
 * @throws 401 if not authenticated
 * @throws 403 if follow belongs to another user
 * @throws 404 if follow not found
 * @throws 500 if database error
 */
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async function (c) {
  const logger = getLogger(c)
  const user = c.get('user')
  const supabase = c.get('supabase')

  try {
    const { id } = c.req.valid('param')
    const { preferences: inputPreferences } = c.req.valid('json')

    logger.info('Updating follow preferences', {
      user_id: user.id,
      follow_id: id,
      update_keys: Object.keys(inputPreferences),
    })

    // ========================================================================
    // Fetch existing follow to merge preferences
    // ========================================================================
    const { data: existingFollow, error: fetchError } = await supabase
      .from('user_follows')
      .select('id, user_id, target_type_code, target_id, preferences, created_at')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      logger.error('Database error fetching follow', {
        error_code: fetchError.code,
        error_message: fetchError.message,
      })
      return c.json(...internalServerError(c.req.path, 'Failed to fetch follow'))
    }

    if (!existingFollow) {
      logger.warn('Follow not found', { follow_id: id })
      return c.json(...notFound(c.req.path, 'Follow not found'))
    }

    // ========================================================================
    // Verify ownership
    // ========================================================================
    if (existingFollow.user_id !== user.id) {
      logger.warn('Unauthorized update attempt', {
        follow_id: id,
        owner_id: existingFollow.user_id,
        requester_id: user.id,
      })
      return c.json(...forbidden(c.req.path, 'Cannot update follow on behalf of another user'))
    }

    // ========================================================================
    // NUANCE #2: Deep merge preferences
    // ========================================================================
    const mergedPreferences = deepMergePreferences(
      existingFollow.preferences as FollowPreferences | null,
      inputPreferences
    )

    logger.debug('Preferences merged', {
      original: existingFollow.preferences,
      update: inputPreferences,
      merged: mergedPreferences,
    })

    // ========================================================================
    // Update the follow
    // ========================================================================
    const { data: updatedFollow, error: updateError } = await supabase
      .from('user_follows')
      .update({ preferences: mergedPreferences as Json })
      .eq('id', id)
      .eq('user_id', user.id)  // Extra safety
      .select('id, user_id, target_type_code, target_id, preferences, created_at')
      .single()

    if (updateError) {
      logger.error('Database error updating follow', {
        error_code: updateError.code,
        error_message: updateError.message,
      })
      return c.json(...internalServerError(c.req.path, 'Failed to update follow'))
    }

    logger.info('Follow updated successfully', {
      follow_id: id,
      target_type: updatedFollow.target_type_code,
    })

    // ========================================================================
    // Transform response: target_type_code → target_type
    // ========================================================================
    const response = {
      id: updatedFollow.id,
      user_id: updatedFollow.user_id,
      target_type: updatedFollow.target_type_code,
      target_id: updatedFollow.target_id,
      preferences: updatedFollow.preferences,
      created_at: updatedFollow.created_at,
    }

    return c.json(...ok(response, 200))

  } catch (error) {
    logger.fatal('Unhandled error in update handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    return c.json(...internalServerError(c.req.path))
  }
}

export default Handler