// endpoints/follows/unfollow/handler.ts
/**
 * Unfollow Handler
 * 
 * DELETE /follows/:id
 * 
 * Removes a follow relationship by its ID.
 * Optionally reports orphaned pull list items that were linked to this follow.
 */

import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '@platform/backend/server/types.ts'

import { authUserMiddleware, type AuthUserVariables } from '@platform/backend/middleware/auth.ts'
import { createValidator } from '@platform/backend/middleware/validation.ts'

import { ok, notFound, forbidden, internalServerError } from '@platform/backend/response/index.ts'
import { getLogger } from '@platform/backend/middleware/correlation.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('param', Definition.Schemas.Param),
  createValidator('query', Definition.Schemas.Query),
]

/**
 * DELETE /follows/:id - Remove a follow
 * 
 * Deletes the follow relationship by ID.
 * 
 * ## Nuances Handled
 * 
 * 1. **ID-based deletion** - Uses standalone UUID, not composite key
 * 2. **Ownership verification** - Ensures user owns the follow
 * 3. **FK cascade handling** - pull_list_items.follow_id becomes NULL (ON DELETE SET NULL)
 * 4. **Orphan count** - Optionally reports affected pull list items
 * 
 * @param id - UUID of the follow to remove
 * @query include_orphan_count - If true, count pull list items that were linked
 * @returns Success message with optional orphan count
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
    const { include_orphan_count } = c.req.valid('query')

    logger.info('Unfollowing', {
      user_id: user.id,
      follow_id: id,
      include_orphan_count,
    })

    // ========================================================================
    // Verify follow exists and belongs to user
    // ========================================================================
    const { data: existingFollow, error: fetchError } = await supabase
      .from('user_follows')
      .select('id, user_id, target_type_code, target_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      logger.error('Database error fetching follow', {
        error_code: fetchError.code,
        error_message: fetchError.message,
      })
      return c.json(...internalServerError(c.req.path, 'Failed to verify follow'))
    }

    if (!existingFollow) {
      logger.warn('Follow not found', { follow_id: id })
      return c.json(...notFound(c.req.path, 'Follow not found'))
    }

    // ========================================================================
    // NUANCE: Verify ownership (RLS should handle this, but explicit is better)
    // ========================================================================
    if (existingFollow.user_id !== user.id) {
      logger.warn('Unauthorized unfollow attempt', {
        follow_id: id,
        owner_id: existingFollow.user_id,
        requester_id: user.id,
      })
      return c.json(...forbidden(c.req.path, 'Cannot unfollow on behalf of another user'))
    }

    // ========================================================================
    // NUANCE #3: Optionally count pull list items that will be orphaned
    // These items have follow_id pointing to this follow.
    // After deletion, their follow_id becomes NULL (ON DELETE SET NULL).
    // ========================================================================
    let orphanedCount: number | undefined

    if (include_orphan_count) {
      const { count, error: countError } = await supabase
        .from('pull_list_items')
        .select('id', { count: 'exact', head: true })
        .eq('follow_id', id)

      if (countError) {
        logger.warn('Failed to count orphaned items', {
          error_code: countError.code,
          error_message: countError.message,
        })
        // Non-fatal, continue with deletion
      } else {
        orphanedCount = count ?? 0
      }
    }

    // ========================================================================
    // Delete the follow
    // ========================================================================
    const { error: deleteError } = await supabase
      .from('user_follows')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)  // Extra safety

    if (deleteError) {
      logger.error('Database error deleting follow', {
        error_code: deleteError.code,
        error_message: deleteError.message,
      })
      return c.json(...internalServerError(c.req.path, 'Failed to remove follow'))
    }

    logger.info('Follow removed successfully', {
      follow_id: id,
      target_type: existingFollow.target_type_code,
      target_id: existingFollow.target_id,
      orphaned_items: orphanedCount,
    })

    // ========================================================================
    // Build response
    // ========================================================================
    const response: {
      success: boolean
      message: string
      orphaned_pull_items?: number
    } = {
      success: true,
      message: 'Follow removed',
    }

    if (include_orphan_count && orphanedCount !== undefined) {
      response.orphaned_pull_items = orphanedCount
    }

    return c.json(...ok(response, 200))

  } catch (error) {
    logger.fatal('Unhandled error in unfollow handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    return c.json(...internalServerError(c.req.path))
  }
}

export default Handler