// endpoints/follows/list/handler.ts
/**
 * List Follows Handler
 * 
 * GET /follows - List authenticated user's follows
 * 
 * Returns paginated list with comprehensive filtering, sorting, and field selection.
 * Uses the same query utilities as likes/list for consistency.
 */

import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '#shared/server/types.ts'

import { authUserMiddleware, type AuthUserVariables } from '#shared/middleware/auth.ts'
import { createValidator } from '#shared/middleware/validation.ts'

import { paginate, internalServerError, withMeta } from '@platform/backend/response/index.ts'
import { isErrorResponse } from '@platform/backend/response/errors.ts'
import { buildPaginationMeta } from '@platform/backend/query/index.ts'

import { queryCollectionWithCount } from '#shared/query/execution/supabase.ts'
import { getLogger } from '#shared/middleware/correlation.ts'

import { CURSOR_SECRET } from './_env.ts'
import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('query', Definition.Schemas.Query),
]

/**
 * GET /follows - List authenticated user's follows with advanced query support
 * 
 * Returns paginated list of follows with comprehensive filtering, sorting, and field selection.
 * Always scoped to authenticated user via RLS.
 * 
 * ## Query Parameters
 * 
 * ### Filtering (bracket notation)
 * - `filter[target_type_code]=story_work` - Filter by target type
 * - `filter[target_type_code][in]=story_work,character` - Multiple types
 * - `filter[created_at][gte]=2024-01-01` - Follows created after date
 * 
 * ### Sorting
 * - `sort=created_at:desc` - Sort by creation date descending (default)
 * - `sort=target_type_code:asc,created_at:desc` - Multi-field sorting
 * - Automatic tiebreaker: `id` is always added if not present
 * 
 * ### Pagination
 * - **Cursor-based** (recommended): `?cursor=<token>&limit=50`
 * - **Offset-based**: `?page=2&per_page=50` or `?offset=50&limit=50`
 * - Default limit: 50, max: 100
 * 
 * ## Response Format
 * 
 * ```json
 * {
 *   "data": [...],
 *   "links": { "self", "next", "prev" },
 *   "meta": {
 *     "pagination": { "hasMore", "count", "nextCursor" },
 *     "query": { "filters", "sorts", "fields" }
 *   }
 * }
 * ```
 */
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async function (c) {
  const logger = getLogger(c)
  const user = c.get('user')
  const supabase = c.get('supabase')

  try {
    const query = c.req.valid('query')

    logger.info('Listing follows', {
      user_id: user.id,
      filter_count: query.filters?.length ?? 0,
      sort_count: query.sorts?.length ?? 0,
      pagination_type: query.pagination.type,
      limit: query.pagination.limit,
    })

    // ========================================================================
    // Execute query using shared utilities
    // Note: RLS ensures user can only see their own follows
    // ========================================================================
    const result = await queryCollectionWithCount({
      supabase,
      table: 'user_follows',
      spec: query,
      countStrategy: 'exact',
      baseFilters: [
        { field: 'user_id', operator: 'eq', value: user.id },
      ],
    })

    if (isErrorResponse(result)) {
      const [error, status, headers] = result
      logger.error('Query execution failed', { error })
      return c.json(error, status, headers)
    }

    const [data] = result
    const { data: rows, meta: { total } } = data

    logger.info('Query executed', {
      rows_returned: rows.length,
      total_available: total,
    })

    // ========================================================================
    // Build pagination metadata
    // Note: Uses `id` as tiebreaker (standalone PK unlike likes)
    // ========================================================================
    const primarySort = query.sorts?.[0]
    const paginationMeta = buildPaginationMeta({
      rows,
      query,
      sortField: primarySort?.field ?? 'created_at',
      tiebreaker: 'id',
      direction: primarySort?.direction ?? 'desc',
      secret: CURSOR_SECRET,
      ttlSec: 3600,  // 1 hour cursor expiry
      total: total ?? undefined,
    })

    // ========================================================================
    // Transform rows: target_type_code → target_type
    // ========================================================================
    const transformedItems = paginationMeta.items.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      target_type: row.target_type_code,
      target_id: row.target_id,
      preferences: row.preferences,
      created_at: row.created_at,
    }))

    // ========================================================================
    // Build response with standard pattern
    // ========================================================================
    const url = new URL(c.req.url)
    url.protocol = c.req.raw.headers.get('x-forwarded-proto') ?? url.protocol
    url.host = c.req.raw.headers.get('x-forwarded-host') ?? url.host
    url.port = c.req.raw.headers.get('x-forwarded-port') ?? url.port
    url.pathname = c.req.raw.headers.get('x-forwarded-path') ?? url.pathname

    const response = withMeta(
      paginate(url.href, transformedItems, paginationMeta.pagination),
      { query: paginationMeta.query }
    )

    logger.info('Response built', {
      count: transformedItems.length,
      has_more: paginationMeta.pagination.hasMore,
    })

    return c.json(...response)

  } catch (error) {
    logger.fatal('Unhandled error in list handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
    })

    return c.json(...internalServerError(c.req.path))
  }
}

export default Handler