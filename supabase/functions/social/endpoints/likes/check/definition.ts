// endpoint/likes/check/definition.ts
import type { EndpointDefinition } from '#shared/server/types.ts'

import { BaseQuerySchema } from '@platform/backend/endpoint/schemas.ts'
import { z } from 'zod'

export const QuerySchema = BaseQuerySchema.extend({
  target_type: z.string().min(1, 'target_type is required'),
  target_id: z.string().min(1, 'target_id is required'),
})

export const OutputSchema = z.object({
  is_liked: z.boolean(),
  created_at: z.coerce.date().nullable(),
})

export default {
  Name: 'check-like',
  Route: '/likes/check',
  Methods: ['GET'] as const,
  Input: QuerySchema,
  Output: OutputSchema,
  Schemas: {
    Query: QuerySchema,
  },
} as const satisfies EndpointDefinition

export type CheckLikeInput = z.infer<typeof QuerySchema>
export type CheckLikeOutput = z.infer<typeof OutputSchema>