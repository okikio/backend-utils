import type { AppEnv as SharedAppEnv } from './create-app.ts'
import type { Handler, MiddlewareHandler, ValidationTargets, Input } from 'hono'
import type { FormValue, HandlerResponse, ParsedFormValue } from 'hono/types'
import type z from 'zod'

/**
 * Schema accepting input type I, producing any output
 * 
 * No structural constraints - accepts:
 * - Plain objects: z.object({ ... })
 * - Pipes: z.object({ ... }).pipe(...)
 * - Transforms: z.object({ ... }).transform(...)
 * - Unions, intersections, etc.
 * 
 * Use this when you need input type safety but want to allow transformations.
 */
export type SchemaFor<Input, Output = any> = z.ZodType<Output, Input>

/**
 * Helper to normalize record types for compatibility checking
 * 
 * Converts Record<K, V> to { [key: string]: V } to allow index signature
 * schemas to satisfy specific key union requirements.
 * 
 * This enables: z.object({}).catchall(z.string()) to satisfy
 * RecordSchemaFor<Record<RequestHeader, string>>
 */
type NormalizedRecordInput<T> =
  T extends Record<infer K, infer V>
  ? K extends string
  ? { [key: string]: V }
  : T
  : T

/**
 * Schema with record-shaped input
 * 
 * Accepts schemas with index signatures that can parse the expected record type.
 * This allows catchall schemas to satisfy specific key union requirements.
 * 
 * @example
 * // ✓ This works - catchall accepts any string keys
 * const schema = z.object({}).catchall(z.string())
 *   satisfies RecordSchemaFor<Record<RequestHeader, string>>
 */
export type RecordSchemaFor<Input extends Record<string, any>, Output = any> =
  SchemaFor<NormalizedRecordInput<Input>, Output>

/**
 * @deprecated Use SchemaFor<I> instead - allows transformations
 */
export type AnySchemaFor<I> = SchemaFor<I>

/**
 * Validation schemas for each input source
 * 
 * Each schema must accept the raw input type from its source:
 * - Query: Record<string, string | string[]>
 * - Form: Record<string, FormValue | FormValue[]>
 * - Json: any
 * - Param: Record<P, string | undefined>
 * - Header: Record<RequestHeader | CustomHeader, string>
 * - Cookie: Record<string, string>
 * 
 * Schemas can transform to any output type (pipes/transforms allowed).
 */
export type EndpointDefinitionSchemas<T extends FormValue = ParsedFormValue, P extends string = string> = {
  [K in keyof ValidationTargets as Capitalize<K>]?:
  ValidationTargets[K] extends Record<any, any>
  ? RecordSchemaFor<ValidationTargets<T, P>[K]>
  : SchemaFor<ValidationTargets<T, P>[K]>
}

// Endpoint definition contract
export type EndpointDefinition = {
  Name: string
  Route: string
  Description?: string
  Methods: readonly ('GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH')[]
  Input: z.ZodType
  Output: z.ZodType
  Schemas: EndpointDefinitionSchemas
}

/**
 * FunctionAppEnv with specific variable requirements.
 * Extends the shared AppEnv and narrows Variables to specific middleware guarantees.
 */
export interface FunctionAppEnv<Variables extends object = {}> extends SharedAppEnv {
  Variables: SharedAppEnv['Variables'] & Variables
}

export type BuildInput<Schemas extends Partial<EndpointDefinitionSchemas> = {}> = Input & {
  in: {
    [K in keyof Schemas as Lowercase<K & string>]:
      K extends keyof Schemas ? z.input<Schemas[K]> : never
  }
  out: {
    [K in keyof Schemas as Lowercase<K & string>]:
      K extends keyof Schemas ? z.output<Schemas[K]> : never
  }
}

export interface EndpointHandler<
  Env extends FunctionAppEnv = FunctionAppEnv,
  Definition extends Partial<EndpointDefinition> = object,
  _Route extends string = (Definition['Route'] extends string ? Definition['Route'] : string),
  _Input extends Input = Definition['Schemas'] extends EndpointDefinitionSchemas ? BuildInput<Definition['Schemas']> : Input,
  _HandlerResponse extends HandlerResponse<any> = Definition['Output'] extends z.ZodType ? HandlerResponse<z.infer<Definition['Output']>> : HandlerResponse<any>
> extends Handler<Env, _Route, _Input, _HandlerResponse> { }

export interface EndpointMiddlewareHandler<Env extends FunctionAppEnv = FunctionAppEnv> extends MiddlewareHandler<Env> { }

/**
 * Handler module contract for polymorphic handlers.
 * 
 * Handlers may have different middleware requirements (and thus different Env types).
 * We accept any middleware handler array without enforcing Env compatibility,
 * since Hono can handle handlers with compatible-but-different env types at runtime.
 * 
 * The contravariance of middleware makes it impossible to enforce strict typing here
 * while still allowing different handlers with different variable requirements.
 */
export interface EndpointHandlerModule {
  Middleware?: EndpointMiddlewareHandler<any>[],
  default: EndpointHandler<any>
} 