// endpoint/likes/unlike/definition.ts
import { z } from 'zod'
import type { EndpointDefinition } from '#shared/server/types.ts'
import { BaseQuerySchema, BaseParamSchema } from '@platform/backend/endpoint/schemas.ts'

export const Route = '/likes/:target_id';
export const ParamSchema = BaseParamSchema.extend({
  target_id: z.string().min(1, 'target_id is required'),
})

export const QuerySchema = BaseQuerySchema.extend({
  target_type: z.string().min(1, 'target_type is required'),
})

export const InputSchema = ParamSchema.and(QuerySchema)
export const OutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export default {
  Name: 'unlike',
  Route: '/likes/unlike/:target_id',
  Methods: ['DELETE'] as const,
  Input: InputSchema,
  Output: OutputSchema,
  Schemas: {
    Param: ParamSchema,
    Query: QuerySchema,
  },
} as const satisfies EndpointDefinition

export type UnlikeInput = z.infer<typeof InputSchema>
export type UnlikeOutput = z.infer<typeof OutputSchema>