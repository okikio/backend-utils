// utils/query/execution/supabase.ts
/**
 * Query execution utilities with proper error handling
 * 
 * Features:
 * - Type-safe Supabase query execution
 * - Proper error discrimination (cursor expiry, invalid cursor, database errors)
 * - Optional count strategies (exact, planned, estimated)
 * - Base filter support for security/scoping
 */

import type { BaseFiltersNormalized, CursorData, FieldSelectionNormalized, FiltersNormalized, PaginationNormalized, SortsNormalized } from '@platform/backend/query/schemas.ts'

import type { Database } from '@platform/shared/types/index.ts'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuerySpec } from '@platform/backend/query/schemas.ts'

import { ok } from '@platform/backend/response/success.ts'
import { badRequest, exception, internalServerError } from '@platform/backend/response/errors.ts'


// ============================================================================
// SUPABASE CLIENT TYPES
// ============================================================================

export type SupabaseClientType = SupabaseClient<Database>
export type SupabaseClientSelectType = ReturnType<ReturnType<SupabaseClientType['from']>['select']>

// ============================================================================
// EXECUTION OPTIONS
// ============================================================================

/**
 * Options for collection query execution
 */
export interface CollectionQueryOptions {
  /**
   * Whether to include total count in result
   * @default false
   */
  includeCount?: boolean

  /**
   * Count strategy when includeCount is true
   * - 'exact': Full COUNT(*) - slow for large tables
   * - 'planned': Postgres planner estimate - fast but approximate
   * - 'estimated': Table statistics - instant but can be very approximate
   * @default 'exact'
   */
  countStrategy?: 'exact' | 'planned' | 'estimated'

  /**
   * Base filters to apply before QuerySpec (for security/scoping)
   * These are applied first, before any user-provided filters
   * 
   * @example
   * baseFilters: [
   *   { field: 'tenant_id', value: currentUser.tenantId },
   *   { field: 'deleted_at', operator: 'is', value: null }
   * ]
   */
  baseFilters?: BaseFiltersNormalized
}

// ============================================================================
// SUPABASE APPLICATION (existing, mostly unchanged)
// ============================================================================

/**
 * Build Supabase SELECT clause from field selection
 * 
 * Converts normalized field selection into a comma-separated string
 * suitable for Supabase's .select() method.
 * 
 * @param selection Validated field selection (or null for all fields)
 * @param resourceType Optional resource type for JSON:API selection
 * @returns SELECT clause string (e.g., 'id,name,price' or '*')
 * 
 * @example
 * // Simple selection
 * const select = buildSelectClause({ 
 *   type: 'simple', 
 *   fields: ['id', 'name', 'price'] 
 * })
 * // => 'id,name,price'
 * 
 * // JSON:API selection
 * const select = buildSelectClause({ 
 *   type: 'jsonapi', 
 *   fields: { 
 *     products: ['id', 'name'], 
 *     categories: ['name'] 
 *   } 
 * }, 'products')
 * // => 'id,name'
 * 
 * // No selection (return all fields)
 * const select = buildSelectClause(null)
 * // => '*'
 * 
 * // Usage with Supabase
 * const query = supabase
 *   .from('products')
 *   .select(buildSelectClause(fieldSelection))
 */
export function buildSelectClause(
  selection: FieldSelectionNormalized | null,
  resourceType?: string
): string {
  if (!selection) return '*'
  if (selection.type === 'simple') {
    return selection.fields.join(',')
  }

  // JSON:API format - get fields for specific resource type
  const fields = resourceType
    ? selection.fields[resourceType]
    : Object.values(selection.fields)[0]

  return fields?.join(',') ?? '*'
}

/**
 * Apply sorts to Supabase query
 * Tiebreaker is added during validation, not here
 * 
 * @param query Supabase query builder
 * @param sorts Validated and normalized sorts array
 * @returns Query builder with sorts applied
 * 
 * @example
 * let query = supabase.from('posts').select('*')
 * query = applySorts(query, [
 *   { field: 'created_at', direction: 'desc' },
 *   { field: 'id', direction: 'asc' }
 * ])
 */
export function applySorts(
  query: SupabaseClientSelectType,
  sorts: SortsNormalized | null
) {
  // No-op when sorting disabled
  if (!sorts || sorts.length === 0) {
    return query
  }

  let result = query

  for (const sort of sorts) {
    result = result.order(sort.field, {
      ascending: sort.direction === 'asc'
    })
  }

  return result
}

/**
 * Apply filters to Supabase query
 * 
 * @param query Supabase query builder
 * @param filters Validated and normalized filters array
 * @returns Query builder with filters applied
 * 
 * @example
 * let query = supabase.from('products').select('*')
 * query = applyFilters(query, [
 *   { field: 'category', operator: 'eq', value: 'electronics' },
 *   { field: 'price', operator: 'gte', value: 50 }
 * ])
 */
export function applyFilters(
  query: SupabaseClientSelectType,
  filters: FiltersNormalized | null
) {
  // No-op when filtering disabled
  if (!filters || filters.length === 0) return query

  let result = query

  for (const filter of filters) {
    switch (filter.operator) {
      case 'eq':
        result = result.eq(filter.field, filter.value as string)
        break
      case 'ne':
        result = result.neq(filter.field, filter.value)
        break
      case 'gt':
        result = result.gt(filter.field, filter.value)
        break
      case 'gte':
        result = result.gte(filter.field, filter.value)
        break
      case 'lt':
        result = result.lt(filter.field, filter.value)
        break
      case 'lte':
        result = result.lte(filter.field, filter.value)
        break
      case 'between': {
        // Value is guaranteed to be [min, max] from validation
        const [min, max] = filter.value as [number | string, number | string]
        result = result.gte(filter.field, min).lte(filter.field, max)
        break
      }
      case 'in': {
        const values = Array.isArray(filter.value)
          ? filter.value
          : String(filter.value).split(',').map(v => v.trim())
        result = result.in(filter.field, values)
        break
      }
      case 'nin': {
        const values = Array.isArray(filter.value)
          ? filter.value
          : String(filter.value).split(',').map(v => v.trim())
        result = result.not(filter.field, 'in', values)
        break
      }
      case 'contains':
        result = result.like(filter.field, `%${filter.value}%`)  // case-sensitive
        break
      case 'icontains':
        result = result.ilike(filter.field, `%${filter.value}%`) // case-insensitive
        break
      case 'startswith':
        result = result.like(filter.field, `${filter.value}%`)
        break
      case 'endswith':
        result = result.like(filter.field, `%${filter.value}`)
        break
      case 'is_null':
        result = result.is(filter.field, null)
        break
      case 'is_not_null':
        result = result.not(filter.field, 'is', null)
        break
      default: {
        const _exhaustive: never = filter.operator;
        throw exception(badRequest(JSON.stringify(filter), `Unknown operator: ${filter.operator}`))
      }
    }
  }

  return result
}

/**
 * Apply **cursor pagination** (a.k.a. “keyset pagination”) to a PostgREST/Supabase-style query.
 *
 * # What this does (in one sentence)
 * It adds a **WHERE** filter that selects rows **strictly before/after** a known row (the “cursor”),
 * using a primary sort column + a **tiebreaker** column, and sets the page size to `limit + 1` so
 * we can detect `hasMore` without extra COUNTs.
 *
 * ---
 *
 * # Why two columns?
 * Many rows can share the same `sortField` (e.g., many items have the same `created_at` second).
 * To make ordering **strict** and deterministic, we combine:
 * - **Primary sort**: `sortField` (e.g., `created_at`)
 * - **Tiebreaker**: `tiebreaker` (e.g., `id` that is unique and monotonically increasing)
 *
 * This pair defines a **total order** so we can say “fetch rows *after* (or *before*) this cursor.”
 *
 * ---
 *
 * # The core predicate (human explanation)
 *
 * Given a decoded cursor `{ sortField, sortValue, tiebreaker, tiebreakerValue, direction }`:
 *
 * - If `direction === "desc"` (newest first), “next page” means **older** than the cursor:
 *
 *   ```
 *   (sortField < sortValue)
 *   OR
 *   (sortField = sortValue AND tiebreaker < tiebreakerValue)
 *   ```
 *
 * - If `direction === "asc"` (oldest first), “next page” means **newer** than the cursor:
 *
 *   ```
 *   (sortField > sortValue)
 *   OR
 *   (sortField = sortValue AND tiebreaker > tiebreakerValue)
 *   ```
 *
 * That’s the entire trick. The rest is just building this predicate in your query builder.
 *
 * ---
 *
 * # How the `.or(...)` string is built (Supabase/PostgREST)
 *
 * PostgREST encodes boolean logic in a string. Commas mean **OR**, `and(...)` groups an **AND** block.
 * Comparators are suffixes on the column: `.lt.`, `.gt.`, `.eq.` etc.
 *
 * For the **descending** case, we build:
 *
 * ```txt
 * ${sortField}.lt.${sortValue},
 * and(${sortField}.eq.${sortValue},${tiebreaker}.lt.${tiebreakerValue})
 * ```
 *
 * Read aloud: “`sortField < sortValue` **OR** (`sortField = sortValue` **AND** `tiebreaker < tiebreakerValue`).”
 *
 * For the **ascending** case, we swap `.lt.` for `.gt.`:
 *
 * ```txt
 * ${sortField}.gt.${sortValue},
 * and(${sortField}.eq.${sortValue},${tiebreaker}.gt.${tiebreakerValue})
 * ```
 *
 * **Important:** Your client library will URL-encode values. If your values contain commas/parentheses,
 * always pass raw values and let the client encode them—don’t pre-encode by hand.
 *
 * ---
 *
 * # Limit + 1 (probe row) and `hasMore`
 *
 * We always request **`limit + 1`** rows. After fetching:
 * - If we received **`limit + 1`** → there **is** another page (`hasMore = true`). We drop the last row (the probe).
 * - Otherwise → this is the **last** page (`hasMore = false`).
 *
 * This avoids `COUNT(*)` and keeps paging snappy and cheap.
 *
 * ---
 *
 * # Pre-conditions (what you must also do)
 *
 * - Apply a **matching ORDER BY**:
 *   - For `desc` pages: `ORDER BY sortField DESC, tiebreaker DESC`
 *   - For `asc` pages:  `ORDER BY sortField ASC,  tiebreaker ASC`
 * - Ensure a **composite index** on `(sortField, tiebreaker)` for performance.
 * - Avoid `NULL`s in `sortField`/`tiebreaker`, or normalize them (e.g., `COALESCE`) so ordering is well-defined.
 * - Make sure the `tiebreaker` column is **unique** or at least strictly ordered to break ties.
 *
 * ---
 *
 * # Parameters
 * @param query
 * A Supabase/PostgREST-style query builder (anything supporting `.or(string)` and `.limit(n)`).
 *
 * @param cursor
 * Decoded cursor describing the boundary row and the paging direction.
 * - `sortField`:  primary sort column name (e.g., `"created_at"`)
 * - `sortValue`:  the value from the cursor row (e.g., `"2025-11-10T20:15:36.123Z"`)
 * - `tiebreaker`: secondary column for strict ordering (e.g., `"id"`)
 * - `tiebreakerValue`: value from the cursor row (e.g., `"9f1c..."`
 * - `direction`: `"asc"` or `"desc"` — must match your `ORDER BY`
 *
 * @param limit
 * Page size (we internally request `limit + 1` to probe for `hasMore`).
 *
 * @returns
 * The same query builder with an added `.or(...)` filter and `.limit(limit + 1)`.
 *
 * ---
 *
 * # Examples
 *
 * ## Example 1 — Descending (newest first)
 * We’re on `/posts?limit=20&cursor=...` and want the **next** page (older posts).
 *
 * Cursor row:
 * - `sortField = "created_at"`
 * - `sortValue = "2025-11-10T20:15:36.123Z"`
 * - `tiebreaker = "id"`
 * - `tiebreakerValue = "6b2a2f..."` (a ULID/UUID)
 * - `direction = "desc"`
 *
 * The filter we add is:
 *
 * ```txt
 * created_at.lt.2025-11-10T20:15:36.123Z,
 * and(created_at.eq.2025-11-10T20:15:36.123Z,id.lt.6b2a2f...)
 * ```
 *
 * Read as: “rows **older** than the cursor OR same timestamp but smaller id.”
 *
 * We also call `.limit(21)`. After fetching 21 rows, we return 20 and set `hasMore = true` if row 21 exists.
 *
 * ## Example 2 — Ascending (oldest first)
 * Same columns, but `direction = "asc"` (we want **newer** rows).
 *
 * The filter becomes:
 *
 * ```txt
 * created_at.gt.2025-11-10T20:15:36.123Z,
 * and(created_at.eq.2025-11-10T20:15:36.123Z,id.gt.6b2a2f...)
 * ```
 *
 * Read as: “rows **newer** than the cursor OR same timestamp but larger id.”
 *
 * ## Example 3 — Different columns
 * Sorting by a score and breaking ties by a numeric `serial`:
 *
 * - Descending: `score.lt.98,and(score.eq.98,serial.lt.4312)`
 * - Ascending:  `score.gt.98,and(score.eq.98,serial.gt.4312)`
 *
 * ## Example 4 — Putting it all together
 * ```ts
 * // 1) ensure ORDER BY matches cursor direction
 * const ordered = db
 *   .from('posts')
 *   .select('*')
 *   .order('created_at', { ascending: false }) // direction === 'desc'
 *   .order('id',         { ascending: false })
 *
 * // 2) apply cursor predicate + limit+1
 * const pageQ = applyCursorPagination(ordered, {
 *   sortField: 'created_at',
 *   sortValue: '2025-11-10T20:15:36.123Z',
 *   tiebreaker: 'id',
 *   tiebreakerValue: '6b2a2f...',
 *   direction: 'desc'
 * }, 20)
 *
 * // 3) execute and then slice(0, limit) to compute hasMore
 * const rows = await pageQ
 * const items = rows.slice(0, 20)
 * const hasMore = rows.length > 20
 * ```
 */
export function applyCursorPagination(
  query: SupabaseClientSelectType,
  cursor: CursorData,
  limit: number
) {
  const { sortField, sortValue, tiebreaker, tiebreakerValue, direction } = cursor

  /**
   * Branch 1: The "primary sort field" comparison.
   *
   * If direction is "desc", we want rows where sortField < sortValue.
   *   Example: Suppose sortField = "created_at", sortValue = "2025-01-01".
   *   Then branch1 = "created_at.lt.2025-01-01"
   *   → This matches rows created *before* Jan 1, 2025.
   *
   * If direction is "asc", we want rows where sortField > sortValue.
   *   Example: sortField = "created_at", sortValue = "2025-01-01".
   *   Then branch1 = "created_at.gt.2025-01-01"
   *   → This matches rows created *after* Jan 1, 2025.
   *
   * This branch handles the "normal" case where the primary sort field alone
   * determines whether a row comes after the cursor.
   */
  const branch1 =
    direction === "desc"
      ? `${sortField}.lt.${sortValue}`
      : `${sortField}.gt.${sortValue}`

  /**
   * Branch 2: The "tie-breaker" comparison.
   *
   * If the primary sort field equals the cursor value, we need a secondary
   * comparison to break ties. This ensures stable ordering.
   *
   * For descending order:
   *   Example: sortField = "created_at", sortValue = "2025-01-01"
   *            tiebreaker = "id", tiebreakerValue = 100
   *   Then branch2 = "and(created_at.eq.2025-01-01,id.lt.100)"
   *   → This matches rows created exactly on Jan 1, 2025,
   *     but with an id less than 100.
   *
   * For ascending order:
   *   Example: sortField = "created_at", sortValue = "2025-01-01"
   *            tiebreaker = "id", tiebreakerValue = 100
   *   Then branch2 = "and(created_at.eq.2025-01-01,id.gt.100)"
   *   → This matches rows created exactly on Jan 1, 2025,
   *     but with an id greater than 100.
   *
   * This branch ensures that when multiple rows share the same sortField value,
   * we can still paginate deterministically.
   */
  const branch2 =
    direction === "desc"
      ? `and(${sortField}.eq.${sortValue},${tiebreaker}.lt.${tiebreakerValue})`
      : `and(${sortField}.eq.${sortValue},${tiebreaker}.gt.${tiebreakerValue})`

  /**
   * Combine Branch 1 and Branch 2 with OR logic.
   *
   * The final predicate says:
   *   "Either the row’s sortField is beyond the cursor (branch1),
   *    OR the row’s sortField equals the cursor but the tiebreaker is beyond it (branch2)."
   *
   * Example (descending):
   *   predicate = "created_at.lt.2025-01-01,
   *                and(created_at.eq.2025-01-01,id.lt.100)"
   *
   * This matches:
   *   - Any row created before Jan 1, 2025
   *   - OR rows created exactly on Jan 1, 2025 with id < 100
   *
   * Together, this implements cursor pagination: we only fetch rows that come
   * "after" the cursor in the sorted order.
   */
  return query.or(`${branch1},${branch2}`).limit(limit + 1)
}

/**
 * Apply offset pagination to Supabase query
 */
export function applyOffsetPagination(
  query: SupabaseClientSelectType,
  offset: number,
  limit: number
) {
  return query.range(offset, offset + limit - 1)
}

/**
 * Apply pagination (auto-detects type)
 */
export function applyPagination(
  query: SupabaseClientSelectType,
  params: PaginationNormalized
) {
  if (params.type === 'cursor') {
    if (params.decodedCursor) {
      return applyCursorPagination(query, params.decodedCursor, params.limit)
    } else {
      return query.limit(params.limit + 1)
    }
  } else {
    return applyOffsetPagination(query, params.offset, params.limit)
  }
}

/**
 * Apply complete QuerySpec to Supabase query
 * 
 * This applies all aspects of a validated QuerySpec to a Supabase query builder
 * in the correct order:
 * 1. Filters (WHERE clauses) - skipped if null
 * 2. Sorts (ORDER BY clauses) - skipped if null
 * 3. Pagination (LIMIT/OFFSET or cursor-based) - always applied
 * 
 * NEW: Gracefully handles null values for disabled components
 * 
 * @param query Supabase query builder instance
 * @param spec Validated QuerySpec
 * @returns Modified query builder (chainable)
 * 
 * @example
 * // All features enabled
 * let query = supabase.from('posts').select('*')
 * query = applyQuerySpec(query, spec)
 * 
 * @example
 * // Some features disabled (null in spec)
 * const spec = {
 *   pagination: { type: 'offset', offset: 0, limit: 20 },
 *   filters: null,    // Filtering disabled
 *   sorts: null,      // Sorting disabled
 *   fields: null      // Field selection disabled
 * }
 * let query = supabase.from('posts').select('*')
 * query = applyQuerySpec(query, spec)
 * // Only pagination is applied
 */
export function applyQuerySpec(
  query: SupabaseClientSelectType,
  spec: QuerySpec
): SupabaseClientSelectType {
  // Apply filters only if enabled
  if (spec.filters !== null) {
    query = applyFilters(query, spec.filters)
  }

  // Apply sorts only if enabled
  if (spec.sorts !== null) {
    query = applySorts(query, spec.sorts)
  }

  // Always apply pagination (required)
  query = applyPagination(query, spec.pagination)

  return query
}

// ============================================================================
// QUERY EXECUTION
// ============================================================================

/**
 * Execute a paginated collection query with proper error handling
 * 
 * This is the main entry point for executing database queries with
 * pagination, filtering, sorting, and field selection. It handles
 * all error cases properly including cursor expiry.
 * 
 * @param supabase Supabase client instance
 * @param table Table name from database schema
 * @param spec Validated QuerySpec from schema parsing
 * @param options Optional configuration for count and base filters
 * @returns Result with success/error discrimination
 * 
 * @example
 * // Basic usage
 * const result = await executeCollectionQuery(
 *   supabase,
 *   'posts',
 *   querySpec
 * )
 * 
 * if (result.success) {
 *   return c.json(...paginate(c.req.url, result.data, paginationMeta))
 * }
 * 
 * // Handle errors
 * switch (result.error) {
 *   case 'cursor_expired':
 *     return c.json(...gone(c.req.path, result.message))
 *   case 'cursor_invalid':
 *     return c.json(...badRequest(c.req.path, result.message))
 *   case 'database':
 *     return c.json(...internalServerError(c.req.path, result.message))
 * }
 * 
 * @example
 * // With count and base filters
 * const result = await executeCollectionQuery(
 *   supabase,
 *   'posts',
 *   querySpec,
 *   {
 *     includeCount: true,
 *     countStrategy: 'estimated',
 *     baseFilters: [
 *       { field: 'tenant_id', value: user.tenantId },
 *       { field: 'deleted_at', operator: 'is', value: null }
 *     ]
 *   }
 * )
 */
export async function executeCollectionQuery<
  TTable extends keyof Database['public']['Tables'],
  TData = Database['public']['Tables'][TTable]['Row']
>(
  supabase: SupabaseClientType,
  table: TTable,
  spec: QuerySpec,
  options?: CollectionQueryOptions
) {
  const {
    includeCount = false,
    countStrategy = 'exact',
    baseFilters,
  } = options ?? {}

  // Build SELECT clause from field selection
  const selectClause = buildSelectClause(spec.fields)

  // Create base query with optional count
  let query = supabase.from(table).select(selectClause, {
    count: includeCount ? countStrategy : undefined,
    head: false,
  }) as SupabaseClientSelectType

  // Apply base filters first (security/scoping)
  if (baseFilters && baseFilters.length > 0) {
    const filters = baseFilters.map(filter =>
      Object.assign({ operator: filter.operator ?? 'eq' }, filter)
    );

    // Apply base filters
    query = applyFilters(query, filters)
  }

  // Apply QuerySpec (filters, sorts, pagination)
  query = applyQuerySpec(query, spec)

  // Execute query
  const result = await query

  // Handle Supabase errors
  if (result.error) {
    return internalServerError("database", result.error.message)
  }

  // Success case
  return ok(
    (result.data as TData[]) ?? [],
    200,
    { total: result.count ?? null }
  )
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Execute collection query without count (most common case)
 * 
 * @example
 * const result = await queryCollection(supabase, 'posts', querySpec)
 */
export function queryCollection<TTable extends keyof Database['public']['Tables']>(
  supabase: SupabaseClientType,
  table: TTable,
  spec: QuerySpec,
  baseFilters?: CollectionQueryOptions['baseFilters']
) {
  return executeCollectionQuery(supabase, table, spec, {
    includeCount: false,
    baseFilters
  })
}

/**
 * Execute collection query with count
 * 
 * @example
 * const result = await queryCollectionWithCount({
 *   supabase, 
 *   table: 'posts', 
 *   spec: querySpec,
 *   countStrategy: 'estimated' // fast approximate count
 * })
 */
export function queryCollectionWithCount<TTable extends keyof Database['public']['Tables']>(opts: {
  supabase: SupabaseClientType,
  table: TTable,
  spec: QuerySpec,
  countStrategy: 'exact' | 'planned' | 'estimated',
  baseFilters?: CollectionQueryOptions['baseFilters']
}) {
  const { supabase, table, spec, countStrategy = 'exact', baseFilters } = opts;
  return executeCollectionQuery(supabase, table, spec, {
    includeCount: true,
    countStrategy,
    baseFilters
  })
}