// endpoint/list/handler.ts
import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '#shared/server/types.ts'

import { authUserMiddleware, type AuthUserVariables } from '#shared/middleware/auth.ts'
import { createValidator } from '#shared/middleware/validation.ts'

import { paginate, internalServerError, withMeta } from '@platform/backend/response/index.ts'
import { getLogger } from '#shared/middleware/correlation.ts'
import { buildPaginationMeta } from '@platform/backend/query/index.ts'

import { queryCollectionWithCount } from '#shared/query/execution/supabase.ts'
import { isErrorResponse } from '@platform/backend/response/errors.ts'
import { CURSOR_SECRET } from './_env.ts'

import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv<AuthUserVariables>

export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  authUserMiddleware,
  createValidator('query', Definition.Schemas.Query),
]

/**
 * GET /list - List authenticated user's likes with advanced query support
 * 
 * Returns paginated list of likes with comprehensive filtering, sorting, and field selection.
 * Always scoped to authenticated user via RLS.
 * 
 * ## Query Parameters
 * 
 * ### Filtering (bracket notation)
 * - `filter[target_type_code]=collection` - Filter by target type
 * - `filter[target_type_code][in]=collection,product` - Multiple target types
 * - `filter[created_at][gte]=2024-01-01` - Likes created after date
 * - `filter[created_at][lte]=2024-12-31` - Likes created before date
 * - `filter[target_id][in]=id1,id2,id3` - Specific target IDs
 * 
 * ### Sorting
 * - `sort=created_at:desc` - Sort by creation date descending (default)
 * - `sort=created_at:asc,target_id:asc` - Multi-field sorting
 * - Automatic tiebreaker: `target_id` is always added if not present
 * 
 * ### Pagination
 * - **Cursor-based** (recommended): `?cursor=<token>&limit=50`
 *   - Constant performance regardless of offset
 *   - Prevents duplicates/skips when data changes
 * - **Offset-based**: `?page=2&per_page=50` or `?offset=50&limit=50`
 *   - Easier page jumping but slower for deep pages
 * - Default limit: 50, max: 100
 * 
 * ### Field Selection (sparse fieldsets)
 * - `fields=user_id,target_id,created_at` - Return only specified fields
 * - `fields=*` - Return all fields
 * - Default: all fields returned
 * 
 * ## Response Format
 * 
 * ```json
 * {
 *   "data": [
 *     {
 *       "user_id": "123e4567-e89b-12d3-a456-426614174001",
 *       "target_type": "collection",
 *       "target_id": "abc-123",
 *       "created_at": "2024-01-15T10:30:00Z"
 *     }
 *   ],
 *   "meta": {
 *     "pagination": {
 *       "hasMore": true,
 *       "limit": 50,
 *       "count": 50,
 *       "nextCursor": "eyJzb3J0RmllbGQi...",
 *       "prevCursor": null,
 *       "expiresAt": "2024-01-16T10:30:00Z"
 *     }
 *   }
 * }
 * ```
 * 
 * Response includes RFC 8288 Link headers for pagination:
 * - `Link: <url>; rel="next"` - Next page cursor
 * - `Link: <url>; rel="prev"` - Previous page cursor
 * 
 * For offset pagination, additional headers:
 * - `X-Total-Count` - Total number of items
 * - `X-Per-Page` - Items per page
 * - `X-Page` - Current page number
 * - `Content-Range` - Range of items in response
 * 
 * @throws 400 if query parameters invalid (bad operators, unknown fields, etc)
 * @throws 401 if not authenticated
 * @throws 410 if cursor has expired
 * @throws 500 if database error
 */
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async function (c) {
  const logger = getLogger(c)
  const user = c.get('user')
  const supabase = c.get('supabase')

  try {
    // Get validated query spec (already parsed by middleware)
    const parsed = c.req.valid('query')

    logger.info('Listing likes with query spec', {
      user_id: user.id,
      pagination_type: parsed.pagination.type,
      filter_count: parsed.filters?.length,
      sort_count: parsed.sorts?.length,
      pagination_limit: parsed.pagination.limit,
      has_field_selection: parsed.fields !== null,
    })

    // Execute query with base filters for RLS
    const result = await queryCollectionWithCount({
      supabase,
      table: 'likes',
      spec: parsed,
      countStrategy: 'estimated',
      baseFilters: [
        { field: 'user_id', value: user.id },
      ]
    })

    if (isErrorResponse(result)) {
      const [error, status, headers] = result;
      return c.json(error, status, headers)
    }

    // Transform database rows to API response format
    const [{ data: likes, meta: { total } }] = result;
    const items = likes.map(like => ({
      user_id: like.user_id,
      target_type: like.target_type_code, // Map DB column to API field
      target_id: like.target_id,
      created_at: like.created_at,
    }))

    // Determine the *primary* sort:
    // - If client provided sorts, use the first entry
    // - Else fall back to config defaults
    const tiebreakerSort = parsed.sorts?.find(s => !s?.tiebreaker);
    const primarySort = parsed.sorts?.[0] ?? tiebreakerSort

    // Build pagination metadata with cursors
    const paginationMeta = buildPaginationMeta({
      rows: items,
      query: parsed,
      sortField: primarySort?.field || 'created_at',
      tiebreaker: tiebreakerSort?.field || 'target_id', // Part of composite PK
      direction: primarySort?.direction || 'desc',
      secret: CURSOR_SECRET!,
      ttlSec: 3600, // 1 hour cursor expiry
      total: total ?? undefined,
    })

    logger.info('Likes fetched successfully', {
      user_id: user.id,
      count: paginationMeta.items.length,
      has_more: paginationMeta.pagination.hasMore,
      pagination_type: parsed.pagination.type,
      total: total ?? 0,
    })

    // Reconstruct URL with forwarded headers for proper pagination links
    const url = new URL(c.req.url)
    url.protocol =
      c.req.raw.headers.get('x-forwarded-proto') ?? url.protocol
    url.host = c.req.raw.headers.get('x-forwarded-host') ?? url.host
    url.port = c.req.raw.headers.get('x-forwarded-port') ?? url.port
    url.pathname = c.req.raw.headers.get('x-forwarded-path') ?? url.pathname

    const response = withMeta(
      paginate(
        url.href,
        paginationMeta.items,
        paginationMeta.pagination
      ),
      { query: paginationMeta.query }
    );

    // Return with pagination envelope and Link headers
    return c.json(...response)
  } catch (error) {
    logger.fatal('Unhandled error in list handler', {
      error_type: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
      user_id: user.id,
    })

    return c.json(...internalServerError(
      c.req.path,
      'An unexpected error occurred while fetching likes'
    ))
  }
}

export default Handler