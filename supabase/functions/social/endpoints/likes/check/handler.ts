// endpoint/check/handler.ts
import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '@platform/backend/server/types.ts'

import { authUserMiddleware, type AuthUserVariables } from '@platform/backend/middleware/auth.ts'
import { createValidator } from '@platform/backend/middleware/validation.ts'

import { ok, internalServerError } from '@platform/backend/response/index.ts'
import { getLogger } from '@platform/backend/middleware/correlation.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('query', Definition.Schemas.Query),
]

/**
 * GET /likes/check - Check if user has liked something
 * 
 * Determines whether the authenticated user has liked a specific target.
 * Useful for rendering like state in UI (filled/unfilled heart).
 * 
 * @query target_type - Type of entity
 * @query target_id - ID of entity
 * @returns Like status and creation time if liked
 * @throws 400 if target_type or target_id missing
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

    logger.info('Checking like status', {
      user_id: user.id,
      target_type,
      target_id,
    })

    // Check if like exists
    const { data: like, error: likeError } = await supabase
      .from('likes')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('target_type_code', target_type)
      .eq('target_id', target_id)
      .maybeSingle()

    if (likeError) {
      logger.error('Database error checking like', {
        error_code: likeError.code,
        error_message: likeError.message,
      })
      const [err, status, headers] = internalServerError(
        c.req.path,
        'Failed to check like status'
      )
      return c.json(err, status, headers)
    }

    logger.info('Like status checked', {
      user_id: user.id,
      is_liked: !!like,
    })

    const response = {
      is_liked: !!like,
      created_at: like?.created_at ?? null,
    }

    return c.json(...ok(response, 200))
  } catch (error) {
    logger.fatal('Unhandled error in check handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    const [err, status, headers] = internalServerError(c.req.path)
    return c.json(err, status, headers)
  }
}

export default Handler