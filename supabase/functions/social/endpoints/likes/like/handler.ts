// endpoint/like/handler.ts
import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '@platform/backend/server/types.ts'

import { authUserMiddleware, type AuthUserVariables } from '@platform/backend/middleware/auth.ts'
import { createValidator } from '@platform/backend/middleware/validation.ts'

import { badRequest, conflict, created, internalServerError } from '@platform/backend/response/index.ts'
import { getLogger } from '@platform/backend/middleware/correlation.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('json', Definition.Schemas.Json),
]

/**
 * POST /likes - Create a like for a target
 * 
 * Creates a like relationship between the authenticated user and a target entity.
 * 
 * @param target_type - Type of entity (collection, product, review, etc)
 * @param target_id - ID of the entity to like
 * @returns Created like object with timestamps
 * @throws 400 if target_type or target_id invalid
 * @throws 401 if not authenticated
 * @throws 409 if already liked
 * @throws 500 if database error
 */
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async function (c) {
  const logger = getLogger(c)
  const user = c.get('user')
  const supabase = c.get('supabase')

  try {
    // Validation middleware already parsed body, get from context
    const { target_type, target_id } = c.req.valid('json')

    logger.info('Creating like', {
      user_id: user.id,
      target_type,
      target_id,
    })

    // Verify entity type exists
    const { data: entityType, error: entityTypeError } = await supabase
      .from('entity_types')
      .select('code')
      .eq('code', target_type)
      .single()

    if (entityTypeError || !entityType) {
      logger.warn('Invalid entity type', { target_type })
      const [err, status, headers] = badRequest(
        c.req.path,
        `Invalid target_type: ${target_type}`
      )
      return c.json(err, status, headers)
    }

    // Create like
    const { data: like, error: likeError } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        target_type_code: target_type,
        target_id,
      })
      .select()
      .single()

    if (likeError) {
      // Check if it's a duplicate (already liked)
      if (likeError.code === '23505') {
        logger.info('Duplicate like attempt', {
          user_id: user.id,
          target_type,
          target_id,
        })

        return c.json(...conflict(
          c.req.path,
          'Item already liked'
        ))
      }

      logger.error('Database error creating like', {
        error_code: likeError.code,
        error_message: likeError.message,
      })

      return c.json(...internalServerError(
        c.req.path,
        'Failed to process like'
      ))
    }

    logger.info('Like created successfully', {
      target_id: like.target_id,
      user_id: user.id,
    })

    // Transform response: target_type_code → target_type
    const response = {
      user_id: like.user_id,
      target_type: like.target_type_code,
      target_id: like.target_id,
      created_at: like.created_at,
    }

    return c.json(...created(response))
  } catch (error) {
    logger.fatal('Unhandled error in like handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    const [err, status, headers] = internalServerError(c.req.path)
    return c.json(err, status, headers)
  }
}

export default Handler