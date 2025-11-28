// endpoint/likes/like/definition.ts
import type { EndpointDefinition } from '#shared/server/types.ts'

import { makeSuccessResponseSchema } from '@platform/backend/response/schemas.ts'
import { BaseJsonSchema } from '@platform/backend/endpoint/schemas.ts'
import { z } from 'zod'

export const JsonSchema = z.object({
  target_type: z.string().min(1, 'target_type is required'),
  target_id: z.string().min(1, 'target_id is required'),
}).and(BaseJsonSchema)

/**
 * Output schema for created like
 * 
 * Note: No `id` field - likes table uses composite PK (user_id, target_type_code, target_id)
 * This is intentional for natural deduplication and efficient indexing.
 */
export const OutputSchema = makeSuccessResponseSchema(
  z.object({
    user_id: z.uuid(),
    target_type: z.string(),
    target_id: z.string(),
    created_at: z.coerce.date(),
  })
)

export default {
  Name: 'like',
  Route: '/likes/like',
  Methods: ['POST'] as const,
  Input: JsonSchema,
  Output: OutputSchema,
  Schemas: {
    Json: JsonSchema,
  },
} as const satisfies EndpointDefinition

export type CreateLikeInput = z.infer<typeof JsonSchema>
export type CreateLikeOutput = z.infer<typeof OutputSchema>