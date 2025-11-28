// endpoints/update/definition.ts
/**
 * Update Follow Preferences Endpoint
 * 
 * PATCH /follows/:id
 * {
 *   "preferences": { "auto_pull": false, "notifications": { "new_issue": false } }
 * }
 * 
 * Updates follow preferences using deep merge semantics.
 * Only the specified keys are updated; unspecified keys remain unchanged.
 */

import type { EndpointDefinition } from '@platform/backend/server/types.ts'

import { makeSuccessResponseSchema } from '@platform/backend/response/schemas.ts'
import { BaseJsonSchema, BaseParamSchema } from '@platform/backend/server/schemas.ts'
import { FollowPreferencesSchema, FollowItemSchema } from '../../../utils/_schemas.ts'
import { z } from 'zod'

// ============================================================================
// INPUT SCHEMA
// ============================================================================

export const ParamSchema = BaseParamSchema.extend({
  id: z.uuid('id must be a valid UUID'),
})

/**
 * Update request body
 * 
 * Uses deep merge semantics:
 * - Top-level keys replace existing values
 * - `notifications` object is merged (not replaced)
 * 
 * @example
 * // Existing: { auto_pull: true, notifications: { new_issue: true, price_drop: true } }
 * // Request:  { notifications: { new_issue: false } }
 * // Result:   { auto_pull: true, notifications: { new_issue: false, price_drop: true } }
 */
export const JsonSchema = z.object({
  preferences: FollowPreferencesSchema,
}).and(BaseJsonSchema)

// ============================================================================
// OUTPUT SCHEMA
// ============================================================================

/**
 * Returns the updated follow with merged preferences
 */
export const OutputSchema = makeSuccessResponseSchema(FollowItemSchema)

// ============================================================================
// ENDPOINT DEFINITION
// ============================================================================

export default {
  Name: 'update-follow',
  Route: '/follows/update/:id',
  Methods: ['PATCH'] as const,
  Input: ParamSchema.and(JsonSchema),
  Output: OutputSchema,
  Schemas: {
    Param: ParamSchema,
    Json: JsonSchema,
  },
} as const satisfies EndpointDefinition

export type UpdateFollowInput = z.infer<typeof ParamSchema> & z.infer<typeof JsonSchema>
export type UpdateFollowOutput = z.infer<typeof OutputSchema>