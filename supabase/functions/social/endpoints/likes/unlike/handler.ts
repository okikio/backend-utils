// endpoint/unlike/handler.ts
import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '#shared/server/types.ts'

import { authUserMiddleware, type AuthUserVariables } from '#shared/middleware/auth.ts'
import { createValidator } from '#shared/middleware/validation.ts'
import { ok, notFound, internalServerError } from '@platform/backend/response/index.ts'
import { getLogger } from '#shared/middleware/correlation.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('param', Definition.Schemas.Param),
  createValidator('query', Definition.Schemas.Query),
]

/**
 * DELETE /likes/:target_id - Remove a like
 * 
 * Deletes the like relationship between authenticated user and target.
 * Idempotent: calling multiple times has same effect.
 * 
 * @param target_id - ID of entity to unlike
 * @query target_type - Type of entity
 * @returns Success confirmation
 * @throws 400 if target_id or target_type invalid
 * @throws 401 if not authenticated
 * @throws 404 if like doesn't exist
 * @throws 500 if database error
 */
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async function (c) {
  const logger = getLogger(c)
  const user = c.get('user')
  const supabase = c.get('supabase')

  try {
    const params = c.req.valid('param')
    const query = c.req.valid('query')

    const targetId = decodeURIComponent(params.target_id)
    const targetType = query.target_type

    logger.info('Removing like', {
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
    })

    // Delete like
    const { error: deleteError, count } = await supabase
      .from('likes')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('target_type_code', targetType)
      .eq('target_id', targetId)

    if (deleteError) {
      logger.error('Database error deleting like', {
        error_code: deleteError.code,
        error_message: deleteError.message,
      })
      const [err, status, headers] = internalServerError(
        c.req.path,
        'Failed to remove like'
      )
      return c.json(err, status, headers)
    }

    // Check if any rows were deleted
    if (count === 0) {
      logger.info('Like not found for deletion', {
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      })
      const [err, status, headers] = notFound(
        c.req.path,
        'Like not found'
      )
      return c.json(err, status, headers)
    }

    logger.info('Like removed successfully', {
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
    })

    const response = {
      success: true,
      message: 'Like removed',
    }

    return c.json(...ok(response, 200))
  } catch (error) {
    logger.fatal('Unhandled error in unlike handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    const [err, status, headers] = internalServerError(c.req.path)
    return c.json(err, status, headers)
  }
}

export default Handler