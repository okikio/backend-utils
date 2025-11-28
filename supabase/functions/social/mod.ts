// Import all endpoint definitions
import CreateLikeDef from './endpoints/likes/like/definition.ts'
import ListLikesDef from './endpoints/likes/list/definition.ts'
import CheckLikeDef from './endpoints/likes/check/definition.ts'
import UnlikeDef from './endpoints/likes/unlike/definition.ts'

import CreateFollowDef from './endpoints/follows/follow/definition.ts'
import ListFollowsDef from './endpoints/follows/list/definition.ts'
import CheckFollowDef from './endpoints/follows/check/definition.ts'
import UnfollowDef from './endpoints/follows/unfollow/definition.ts'
import UpdateFollowDef from './endpoints/follows/update/definition.ts'

/**
 * Endpoint definitions registry
 */
export const EndpointDefinitions = {
  CreateLike: CreateLikeDef,
  ListLikes: ListLikesDef,
  CheckLike: CheckLikeDef,
  Unlike: UnlikeDef,

  CreateFollow: CreateFollowDef,
  ListFollows: ListFollowsDef,
  CheckFollow: CheckFollowDef,
  Unfollow: UnfollowDef,
  UpdateFollow: UpdateFollowDef,
} as const

// ============================================================================
// Type exports for consuming services
// ============================================================================

export type CreateLikeInput = typeof CreateLikeDef.Input
export type CreateLikeOutput = typeof CreateLikeDef.Output

export type ListLikesInput = typeof ListLikesDef.Input
export type ListLikesOutput = typeof ListLikesDef.Output

export type CheckLikeInput = typeof CheckLikeDef.Input
export type CheckLikeOutput = typeof CheckLikeDef.Output

export type UnlikeInput = typeof UnlikeDef.Input
export type UnlikeOutput = typeof UnlikeDef.Output

export type CreateFollowInput = typeof CreateFollowDef.Input
export type CreateFollowOutput = typeof CreateFollowDef.Output

export type ListFollowsInput = typeof ListFollowsDef.Input
export type ListFollowsOutput = typeof ListFollowsDef.Output

export type CheckFollowInput = typeof CheckFollowDef.Input
export type CheckFollowOutput = typeof CheckFollowDef.Output

export type UnfollowInput = typeof UnfollowDef.Input
export type UnfollowOutput = typeof UnfollowDef.Output

export type UpdateFollowInput = typeof UpdateFollowDef.Input
export type UpdateFollowOutput = typeof UpdateFollowDef.Output

// Default export
export default EndpointDefinitions