// endpoints/follows/list/definition.ts
/**
 * List Follows Endpoint
 * 
 * GET /follows
 * GET /follows?filter[target_type_code]=story_work
 * GET /follows?sort=created_at:desc&limit=20
 * 
 * Returns paginated list of user's follows with filtering, sorting, and pagination.
 * Always scoped to authenticated user.
 */

import type { FilterRegistry } from '@platform/backend/query/schemas.ts'
import type { EndpointDefinition } from '#shared/server/types.ts'

import { makePaginationResultSchema } from '@platform/backend/response/schemas.ts'
import { createEndpointQuerySchema } from '@platform/backend/query/query.ts'

import { BaseQuerySchema } from '#shared/server/schemas.ts'
import { FollowItemSchema } from '../../../utils/_schemas.ts'
import { CURSOR_SECRET } from './_env.ts'
import { z } from 'zod'

// ============================================================================
// REGISTRY CONFIGURATION
// ============================================================================

/**
 * Filter registry for user_follows table
 * 
 * Note: Unlike likes, follows has an `id` field and `preferences` JSONB.
 * We expose target_type_code, target_id, and created_at for filtering.
 * Preferences filtering could be added later via JSONB operators.
 */
const filterRegistry: FilterRegistry = {
  target_type_code: {
    operators: ['eq', 'in'] as const,
    type: 'string' as const,
  },
  target_id: {
    operators: ['eq', 'in'] as const,
    type: 'string' as const,
  },
  created_at: {
    operators: ['gt', 'gte', 'lt', 'lte'] as const,
    type: 'date' as const,
  },
} as const

// ============================================================================
// QUERY SCHEMA
// ============================================================================

/**
 * Query schema for listing authenticated user's follows
 * 
 * Examples:
 * - ?filter[target_type_code]=story_work - Only series follows
 * - ?filter[target_type_code][in]=story_work,character - Series and character follows
 * - ?sort=created_at:desc - Newest first (default)
 * - ?cursor=abc&limit=20 - Cursor pagination
 * - ?page=2&per_page=20 - Offset pagination
 * 
 * Note: Tiebreaker uses `id` (standalone PK) unlike likes which use composite.
 */
export const EndpointQuerySchema = createEndpointQuerySchema({
  filters: {
    registry: filterRegistry,
    limits: { maxFilters: 10 },
  },
  fields: {
    allowedFields: ['id', 'user_id', 'target_type_code', 'target_id', 'preferences', 'created_at'],
    disabled: true,  // Return all fields by default
  },
  sorts: {
    tiebreaker: 'id',  // Standalone PK, ensures deterministic ordering
    allowedFields: ['created_at', 'target_type_code', 'id'],
    limits: { maxSorts: 3 },
    defaults: [
      { field: 'created_at', direction: 'desc' },
    ],
  },
  pagination: {
    cursorSecret: CURSOR_SECRET,
    limits: {
      defaultLimit: 50,
      maxLimit: 100,
    },
  },
})

export const QuerySchema = BaseQuerySchema.transform((input) => {
  const baseResult = EndpointQuerySchema.parse(input)
  return baseResult
})

// ============================================================================
// OUTPUT SCHEMA
// ============================================================================

/**
 * Paginated response with RFC 8288 compliant pagination metadata
 */
export const OutputSchema = makePaginationResultSchema(z.array(FollowItemSchema))

// ============================================================================
// ENDPOINT DEFINITION
// ============================================================================

export default {
  Name: 'list-follows',
  Route: '/follows/list',
  Methods: ['GET'] as const,
  Input: QuerySchema,
  Output: OutputSchema,
  Schemas: {
    Query: QuerySchema,
  },
} as const satisfies EndpointDefinition

export type ListFollowsInput = z.infer<typeof QuerySchema>
export type ListFollowsOutput = z.infer<typeof OutputSchema>