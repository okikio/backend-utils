// endpoints/follows/follow/handler.ts
/**
 * Create Follow Handler
 * 
 * POST /follows
 * 
 * Creates a follow relationship between authenticated user and target.
 * Applies type-specific default preferences if not provided.
 */

import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '#shared/server/types.ts'
import type { Json } from '@platform/shared/types/index.ts'

import { authUserMiddleware, type AuthUserVariables } from '#shared/middleware/auth.ts'
import { createValidator } from '#shared/middleware/validation.ts'

import { badRequest, conflict, created, internalServerError } from '@platform/backend/response/index.ts'
import { getLogger } from '#shared/middleware/correlation.ts'

import {
  getDefaultPreferences,
  deepMergePreferences,
} from '../../../utils/_schemas.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('json', Definition.Schemas.Json),
]

/**
 * POST /follows - Create a follow
 * 
 * Creates a follow relationship between the authenticated user and a target entity.
 * If preferences are not provided, type-appropriate defaults are applied.
 * If preferences are provided, they are merged with defaults.
 * 
 * ## Nuances Handled
 * 
 * 1. **Target format validation** - UUID for users, URI for Neptune entities
 * 2. **Entity type validation** - Verifies target_type exists in entity_types
 * 3. **Default preferences** - Type-specific defaults applied if not provided
 * 4. **Preference merging** - Provided preferences merged with defaults
 * 5. **Duplicate handling** - 409 Conflict with existing follow data
 * 
 * @body target_type - Type of entity (story_work, character, creator, user, etc.)
 * @body target_id - ID of entity (UUID for users, URI for Neptune)
 * @body preferences - Optional follow preferences (merged with defaults)
 * @returns Created follow with id, preferences, timestamps
 * @throws 400 if target_type invalid or target_id malformed
 * @throws 401 if not authenticated
 * @throws 409 if already following (includes existing follow data)
 * @throws 500 if database error
 */
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async function (c) {
  const logger = getLogger(c)
  const user = c.get('user')
  const supabase = c.get('supabase')

  try {
    const { target_type, target_id, preferences: inputPreferences } = c.req.valid('json')

    logger.info('Creating follow', {
      user_id: user.id,
      target_type,
      target_id,
      has_preferences: !!inputPreferences,
    })

    // ========================================================================
    // NUANCE #5: Verify entity type exists
    // ========================================================================
    const { data: entityType, error: entityTypeError } = await supabase
      .from('entity_types')
      .select('code, is_neptune_entity')
      .eq('code', target_type)
      .single()

    if (entityTypeError || !entityType) {
      logger.warn('Invalid entity type', { target_type })
      return c.json(...badRequest(
        c.req.path,
        `Invalid target_type: ${target_type}`
      ))
    }

    // ========================================================================
    // NUANCE #7: Additional format validation for Neptune entities
    // ========================================================================
    if (entityType.is_neptune_entity && target_type !== 'user') {
      if (!target_id.startsWith('http://') && !target_id.startsWith('https://')) {
        logger.warn('Neptune entity requires URI', { target_type, target_id })
        return c.json(...badRequest(
          c.req.path,
          `target_id for Neptune entity '${target_type}' must be a URI`
        ))
      }
    }

    // ========================================================================
    // NUANCE #2: Merge input preferences with type-specific defaults
    // ========================================================================
    const defaultPrefs = getDefaultPreferences(target_type)
    const finalPreferences = inputPreferences
      ? deepMergePreferences(defaultPrefs, inputPreferences)
      : defaultPrefs

    // ========================================================================
    // Create follow
    // ========================================================================
    const { data: follow, error: followError } = await supabase
      .from('user_follows')
      .insert({
        user_id: user.id,
        target_type_code: target_type,
        target_id,
        preferences: finalPreferences as Json,
      })
      .select('id, user_id, target_type_code, target_id, preferences, created_at')
      .single()

    if (followError) {
      // ======================================================================
      // NUANCE #9: Handle duplicate (unique constraint violation)
      // ======================================================================
      if (followError.code === '23505') {
        logger.info('Duplicate follow attempt', {
          user_id: user.id,
          target_type,
          target_id,
        })

        // Fetch existing follow to return in 409 response
        const { data: existing } = await supabase
          .from('user_follows')
          .select('id, preferences, created_at')
          .eq('user_id', user.id)
          .eq('target_type_code', target_type)
          .eq('target_id', target_id)
          .single()

        return c.json(...conflict(
          c.req.path,
          'Already following this target',
          {
            existing_follow: existing ? {
              id: existing.id,
              preferences: existing.preferences,
              created_at: existing.created_at,
            } : undefined,
          }
        ))
      }

      // Check constraint violation (format mismatch)
      if (followError.code === '23514') {
        logger.warn('Check constraint violation', {
          error_message: followError.message,
        })
        return c.json(...badRequest(
          c.req.path,
          `Invalid target_id format for type '${target_type}'`
        ))
      }

      logger.error('Database error creating follow', {
        error_code: followError.code,
        error_message: followError.message,
      })

      return c.json(...internalServerError(
        c.req.path,
        'Failed to create follow'
      ))
    }

    logger.info('Follow created successfully', {
      follow_id: follow.id,
      user_id: user.id,
      target_type,
    })

    // ========================================================================
    // Transform response: target_type_code → target_type
    // ========================================================================
    const response = {
      id: follow.id,
      user_id: follow.user_id,
      target_type: follow.target_type_code,
      target_id: follow.target_id,
      preferences: follow.preferences,
      created_at: follow.created_at,
    }

    return c.json(...created(response))

  } catch (error) {
    logger.fatal('Unhandled error in follow handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    return c.json(...internalServerError(c.req.path))
  }
}

export default Handler