// endpoints/follow/definition.ts
/**
 * Create Follow Endpoint
 * 
 * POST /follows
 * {
 *   "target_type": "story_work",
 *   "target_id": "http://okikio.dev/resource/story-works/batman",
 *   "preferences": { "auto_pull": true }  // optional
 * }
 * 
 * Creates a follow relationship with optional preferences.
 * If preferences not provided, type-appropriate defaults are applied.
 */

import type { EndpointDefinition } from '#shared/server/types.ts'

import { makeSuccessResponseSchema } from '@platform/backend/response/schemas.ts'
import { BaseJsonSchema } from '@platform/backend/endpoint/schemas.ts'
import { FollowPreferencesSchema, FollowItemSchema } from '../../../utils/_schemas.ts'
import { z } from 'zod'

// ============================================================================
// INPUT SCHEMA
// ============================================================================

/**
 * Follow creation request body
 * 
 * preferences is optional - if not provided, type-specific defaults are used:
 * - story_work: { auto_pull: true, formats: ['single_issue'], ... }
 * - character: { notifications: { new_appearance: true } }
 * - user: { notifications: { new_post: true, new_collection: true } }
 */
export const JsonSchema = z.object({
  target_type: z.string().min(1, 'target_type is required'),
  target_id: z.string().min(1, 'target_id is required'),
  preferences: FollowPreferencesSchema.optional(),
}).and(BaseJsonSchema)

// ============================================================================
// OUTPUT SCHEMA
// ============================================================================

/**
 * Created follow response
 * 
 * Includes the `id` for subsequent update/unfollow operations.
 * Unlike likes, follows have a standalone UUID primary key.
 */
export const OutputSchema = makeSuccessResponseSchema(FollowItemSchema)

// ============================================================================
// ENDPOINT DEFINITION
// ============================================================================

export default {
  Name: 'create-follow',
  Route: '/follows/follow',
  Methods: ['POST'] as const,
  Input: JsonSchema,
  Output: OutputSchema,
  Schemas: {
    Json: JsonSchema,
  },
} as const satisfies EndpointDefinition

export type CreateFollowInput = z.infer<typeof JsonSchema>
export type CreateFollowOutput = z.infer<typeof OutputSchema>