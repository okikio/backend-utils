// endpoints/check/definition.ts
/**
 * Check Follow Status Endpoint
 * 
 * GET /follows/check?target_type=story_work&target_id=http://...
 * 
 * Returns follow status and full follow data if following.
 * Unlike likes/check which just returns boolean, follows/check returns
 * the full follow including `id` and `preferences` for subsequent operations.
 */

import type { EndpointDefinition } from '#shared/server/types.ts'

import { makeSuccessResponseSchema } from '@platform/backend/response/schemas.ts'
import { BaseQuerySchema } from '#shared/server/schemas.ts'
import { FollowPreferencesSchema } from '../../../utils/_schemas.ts'
import { z } from 'zod'

// ============================================================================
// INPUT SCHEMA
// ============================================================================

export const QuerySchema = BaseQuerySchema.extend({
  target_type: z.string().min(1, 'target_type is required'),
  target_id: z.string().min(1, 'target_id is required'),
})

// ============================================================================
// OUTPUT SCHEMA
// ============================================================================

/**
 * Check response includes full follow data when following
 * This enables immediate use of `id` for update/unfollow operations
 */
export const OutputSchema = makeSuccessResponseSchema(
  z.discriminatedUnion("is_following", [
    z.object({
      is_following: z.literal(false),

      // Only present if following
      id: z.null(),
      preferences: z.null(),
      created_at: z.null(),
    }),

    z.object({
      is_following: z.literal(true),

      // Only present if following
      id: z.uuid(),
      preferences: FollowPreferencesSchema,
      created_at: z.coerce.date(),
    })
  ])
)

// ============================================================================
// ENDPOINT DEFINITION
// ============================================================================

export default {
  Name: 'check-follow',
  Route: '/follows/check',
  Methods: ['GET'] as const,
  Input: QuerySchema,
  Output: OutputSchema,
  Schemas: {
    Query: QuerySchema,
  },
} as const satisfies EndpointDefinition

export type CheckFollowInput = z.infer<typeof QuerySchema>
export type CheckFollowOutput = z.infer<typeof OutputSchema>