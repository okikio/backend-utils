// endpoints/follows/unfollow/definition.ts
/**
 * Unfollow Endpoint
 * 
 * DELETE /follows/:id
 * 
 * Removes a follow relationship by its ID.
 * 
 * Note: Unlike likes (which use composite key in URL), follows use the standalone
 * `id` field. This is cleaner and works well because:
 * 1. The `id` is returned from check/create/list operations
 * 2. `pull_list_items.follow_id` references this id (with ON DELETE SET NULL)
 */

import type { EndpointDefinition } from '@platform/backend/server/types.ts'

import { makeSuccessResponseSchema } from '@platform/backend/response/schemas.ts'
import { BaseQuerySchema, BaseParamSchema } from '@platform/backend/server/schemas.ts'
import { z } from 'zod'

// ============================================================================
// INPUT SCHEMA
// ============================================================================

export const ParamSchema = BaseParamSchema.extend({
  id: z.uuid('id must be a valid UUID'),
})

/**
 * Optional query param to include orphaned pull list item count
 * Useful for UI to show "This will remove 5 items from your pull list"
 */
export const QuerySchema = BaseQuerySchema.extend({
  include_orphan_count: z.coerce.boolean().optional().default(false),
})

// ============================================================================
// OUTPUT SCHEMA
// ============================================================================

/**
 * Unfollow response
 * 
 * Includes optional orphaned_pull_items count when include_orphan_count=true.
 * This helps UI show impact: "Unfollowed Batman. 3 pull list items now unlinked."
 */
export const OutputSchema = makeSuccessResponseSchema(
  z.object({
    success: z.boolean(),
    message: z.string(),

    // Only present if include_orphan_count=true was requested
    orphaned_pull_items: z.number().int().min(0).optional(),
  })
)

// ============================================================================
// ENDPOINT DEFINITION
// ============================================================================

export default {
  Name: 'unfollow',
  Route: '/follows/unfollow/:id',
  Methods: ['DELETE'] as const,
  Input: ParamSchema.and(QuerySchema),
  Output: OutputSchema,
  Schemas: {
    Param: ParamSchema,
    Query: QuerySchema,
  },
} as const satisfies EndpointDefinition

export type UnfollowInput = z.infer<typeof ParamSchema> & z.infer<typeof QuerySchema>
export type UnfollowOutput = z.infer<typeof OutputSchema>