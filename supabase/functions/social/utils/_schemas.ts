// social/schemas.ts
/**
 * Shared Schemas for Social Function
 * 
 * Contains reusable schemas for follows, including:
 * - Follow preferences (type-aware)
 * - Entity type validation
 * - Target ID format validation
 */

import { z } from 'zod'

// ============================================================================
// NOTIFICATION PREFERENCES SCHEMA
// ============================================================================

/**
 * Base notification preferences (all follow types)
 */
export const BaseNotificationPrefsSchema = z.object({
  new_issue: z.boolean().optional(),
  new_format: z.boolean().optional(),
  variant_release: z.boolean().optional(),
  reprint: z.boolean().optional(),
  price_drop: z.boolean().optional(),
}).partial()

/**
 * User-specific notification preferences
 */
export const UserNotificationPrefsSchema = z.object({
  new_post: z.boolean().optional(),
  new_collection: z.boolean().optional(),
  new_review: z.boolean().optional(),
}).partial()

// ============================================================================
// FOLLOW PREFERENCES SCHEMAS
// ============================================================================

/**
 * Rich preferences for series/story work follows
 * These drive pull list automation
 */
export const SeriesFollowPrefsSchema = z.object({
  auto_pull: z.boolean().default(true),
  formats: z.array(z.string()).default(['single_issue']),
  variant_types: z.array(z.string()).default(['main', 'open_order']),
  notifications: BaseNotificationPrefsSchema.default({}),
  pull_quantity: z.number().int().min(1).max(10).default(1),
}).partial()

/**
 * Simple preferences for user follows
 */
export const UserFollowPrefsSchema = z.object({
  notifications: UserNotificationPrefsSchema.default({}),
}).partial()

/**
 * Medium preferences for creator/character follows
 */
export const EntityFollowPrefsSchema = z.object({
  notifications: z.object({
    new_appearance: z.boolean().optional(),
  }).partial().default({}),
}).partial()

/**
 * Union of all preference types
 * Permissive for input, typed for output
 */
export const FollowPreferencesSchema = z.object({
  auto_pull: z.boolean().optional(),
  formats: z.array(z.string()).optional(),
  variant_types: z.array(z.string()).optional(),
  notifications: z.record(z.string(), z.boolean()).optional(),
  pull_quantity: z.number().int().min(1).max(10).optional(),
}).loose()

export type FollowPreferences = z.infer<typeof FollowPreferencesSchema>

// ============================================================================
// FOLLOW ITEM SCHEMA (for responses)
// ============================================================================

/**
 * Complete follow item as returned from API
 */
export const FollowItemSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  target_type: z.string(),
  target_id: z.string(),
  preferences: FollowPreferencesSchema.nullable(),
  created_at: z.coerce.date(),
})

export type FollowItem = z.infer<typeof FollowItemSchema>

// ============================================================================
// DEFAULT PREFERENCES BY TYPE
// ============================================================================

/**
 * Get default preferences based on target type
 * Used when creating follows without explicit preferences
 */
export function getDefaultPreferences(targetType: string): FollowPreferences {
  switch (targetType) {
    case 'story_work':
    case 'story_expression':
      return {
        auto_pull: true,
        formats: ['single_issue'],
        variant_types: ['main', 'open_order'],
        notifications: {
          new_issue: true,
          new_format: true,
          variant_release: true,
          reprint: false,
          price_drop: true,
        },
        pull_quantity: 1,
      }

    case 'creator':
    case 'character':
      return {
        notifications: {
          new_appearance: true,
        },
      }

    case 'publisher':
      return {
        notifications: {
          new_issue: true,
        },
      }

    case 'user':
      return {
        notifications: {
          new_post: true,
          new_collection: true,
        },
      }

    default:
      return {}
  }
}

// ============================================================================
// DEEP MERGE UTILITY
// ============================================================================

/**
 * Deep merge preferences objects
 * Used for PATCH operations to partially update preferences
 * 
 * @example
 * base: { auto_pull: true, notifications: { new_issue: true, price_drop: true } }
 * update: { notifications: { new_issue: false } }
 * result: { auto_pull: true, notifications: { new_issue: false, price_drop: true } }
 */
export function deepMergePreferences(
  base: FollowPreferences | null,
  update: Partial<FollowPreferences>
): FollowPreferences {
  const result = { ...(base ?? {}) }

  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) continue

    if (
      key === 'notifications' &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Deep merge notifications
      result.notifications = {
        ...(result.notifications ?? {}),
        ...value,
      }
    } else {
      // Shallow assign other fields
      (result as Record<string, unknown>)[key] = value
    }
  }

  return result
}