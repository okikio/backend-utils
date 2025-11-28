import type { AppEnv as SharedAppEnv } from './create-app.ts'
import type { Handler, MiddlewareHandler, Input } from 'hono'
import type { HandlerResponse } from 'hono/types'
import type z from 'zod'

import type { EndpointDefinition, EndpointDefinitionSchemas } from '@platform/backend/endpoint/definitions.ts'
export type * from '@platform/backend/endpoint/definitions.ts'


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