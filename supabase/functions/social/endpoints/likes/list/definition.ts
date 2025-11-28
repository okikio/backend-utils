// endpoint/likes/list/definition.ts
import type { FilterRegistry } from '@platform/backend/query/schemas.ts'
import type { EndpointDefinition } from '@platform/backend/server/types.ts'

import { makePaginationResultSchema } from '@platform/backend/response/schemas.ts'
import { createEndpointQuerySchema } from '@platform/backend/query/query.ts'

import { BaseQuerySchema } from '@platform/backend/server/schemas.ts'
import { CURSOR_SECRET } from './_env.ts'
import { z } from 'zod'

// ============================================================================
// REGISTRY CONFIGURATION
// ============================================================================

/**
 * Filter registry for likes table
 * Defines which fields can be filtered and with which operators
 */
const filterRegistry: FilterRegistry = {
  target_type_code: {
    operators: ['eq', 'in'] as const,
    type: 'string' as const,
  },
  created_at: {
    operators: ['gt', 'gte', 'lt', 'lte'] as const,
    type: 'date' as const,
  },
  target_id: {
    operators: ['eq', 'in'] as const,
    type: 'string' as const,
  },
} as const

// ============================================================================
// QUERY SCHEMA (using composite utilities)
// ============================================================================

/**
 * Query schema for listing authenticated user's likes
 * 
 * Always scoped to authenticated user (required). Optional filters allow refinement:
 * - Filtering: ?filter[target_type_code]=collection&filter[created_at][gte]=2024-01-01
 * - Sorting: ?sort=created_at:desc,target_id:asc
 * - Pagination: ?cursor=abc&limit=50 OR ?page=1&per_page=20
 * - Field selection: ?fields=user_id,target_id,created_at
 * 
 * Tiebreaker uses target_id (part of composite PK) for stable pagination.
 */
export const EndpointQuerySchema = createEndpointQuerySchema({
  filters: {
    registry: filterRegistry,
    limits: { maxFilters: 10 },
  },
  fields: {
    allowedFields: ['user_id', 'target_type_code', 'target_id', 'created_at'],
    disabled: true
  },
  sorts: {
    tiebreaker: 'target_id',  // Part of composite PK, ensures deterministic ordering
    allowedFields: ['created_at', 'target_id', 'user_id'],
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
  // Parse base query spec
  const baseResult = EndpointQuerySchema.parse(input)

  // Merge at output level
  return baseResult
})

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

/**
 * Individual like item in response
 * 
 * Note: Maps target_type_code → target_type for API consistency.
 * No `id` field - composite key identifies the like.
 */
export const LikeItemSchema = z.object({
  user_id: z.uuid(),
  target_type: z.string(),
  target_id: z.string(),
  created_at: z.coerce.date(),
})

/**
 * Paginated response with RFC 8288 compliant pagination metadata
 */
export const OutputSchema = makePaginationResultSchema(z.array(LikeItemSchema))

// ============================================================================
// ENDPOINT DEFINITION
// ============================================================================

export default {
  Name: 'list-likes',
  Route: '/likes/list',
  Methods: ['GET'] as const,
  Input: QuerySchema,
  Output: OutputSchema,
  Schemas: {
    Query: QuerySchema,
  },
} as const satisfies EndpointDefinition

export type ListLikesInput = z.infer<typeof QuerySchema>
export type ListLikesOutput = z.infer<typeof OutputSchema>