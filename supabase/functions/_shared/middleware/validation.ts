/**
 * Validation middleware with RFC 7807 compliant error responses
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { MiddlewareHandler, ValidationTargets } from 'hono'
import type { ValidationErrorDetail } from '@platform/backend/response/schemas.ts'

import { sValidator } from '@hono/standard-validator'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

import { getLogger } from './correlation.ts'
import { internalServerError, validationFailed } from '@platform/backend/response/index.ts'

import { getDotPath } from '@standard-schema/utils'

/**
 * Validation middleware that returns RFC 7807 compliant errors for all validation failures.
 *
 * It handles:
 * - Standard Schema validation failures via `result.success === false`
 * - Thrown ZodError instances (e.g. from transforms or inner zod schemas)
 *
 * In both cases it returns a 422 with an `errors` array.
 */
export function createValidator<
  T extends StandardSchemaV1,
  Target extends keyof ValidationTargets = keyof ValidationTargets
>(
  target: Target,
  schema: T,
): MiddlewareHandler {
  // Inner validator provided by @hono/standard-validator
  const validator = sValidator(target, schema, (result, c) => {
    if (!result.success) {
      const logger = getLogger(c)

      // Transform Standard Schema issues to validation error details
      const errors = toErrs(result.error)

      logger.warn('Validation failed', {
        target: String(target),
        path: c.req.path,
        error_count: errors.length,
        errors: errors.map((e) => `${e.field}: ${e.message}`),
      })

      // RFC 7807 validation error array
      return c.json(...validationFailed(c.req.path, errors))
    }
  })

  // Wrap the validator to catch thrown ZodErrors and convert them to 422s
  return async (c, next) => {
    try {
      // Important: await so we catch async rejections
      await validator(c, next)
    } catch (err) {
      // If we already turned it into an HTTPException, let it bubble
      if (err instanceof HTTPException) {
        throw err
      }

      const logger = getLogger(c)

      // If a raw ZodError leaked out from inside a schema, treat it as a validation failure
      if (err instanceof ZodError) {
        const errors = err?.issues?.map(issue => ({
          field: (issue.path?.length ?? 0) > 0 ? issue.path.join('.') : '_root',
          message: issue.message,
        })) ?? []

        logger.warn('Validation failed (ZodError)', {
          target: String(target),
          path: c.req.path,
          error_count: errors.length,
          errors: errors.map((e) => `${e.field}: ${e.message}`),
        })

        return c.json(...validationFailed(c.req.path, errors))
      }

      // Anything else is a genuine server error → 500
      logger.error('Unexpected error in validation middleware', {
        path: c.req.path,
        target: String(target),
        error_name: err?.constructor?.name,
        message: err instanceof Error ? err.message : String(err),
      })

      return c.json(...internalServerError(c.req.path))
    }
  }
}

/** Convert Standard Schema issues → ValidationErrorDetail[]. */
export function toErrs(
  issues: StandardSchemaV1.Issue[] | readonly StandardSchemaV1.Issue[],
): ValidationErrorDetail[] {
  return issues.map<ValidationErrorDetail>((issue) => ({
    field: getDotPath(issue) ?? '_root',
    message: issue.message,
  }))
}
