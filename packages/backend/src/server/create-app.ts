/**
 * Hono App Factory for Supabase Edge Functions
 * 
 * Creates a pre-configured Hono instance with:
 * - Base path routing (function name prefix)
 * - Global middleware (security headers, CORS, logging, etc.)
 * - Request ID tracking for tracing
 * - Timing middleware for performance monitoring
 * - Standard health check endpoint
 * - Type-safe context with app variables
 * - RFC 7807 Problem Details error handling
 */

import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AuthUserVariables, AuthAdminVariables } from '../middleware/auth.ts'

import { showRoutes } from 'hono/dev'
import { HTTPException } from 'hono/http-exception'

import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { logger as honoLogger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

import { timing, type TimingVariables } from 'hono/timing'
import { requestId, type RequestIdVariables } from 'hono/request-id'
import { secureHeaders, type SecureHeadersVariables } from 'hono/secure-headers'
import { correlationMiddleware, getLogger, type CorrelationVariables } from '../middleware/correlation.ts'

import { err, internalServerError } from '../response/index.ts'

/**
 * Context variables available throughout the request lifecycle.
 * Extended by middleware to add typed values like authenticated Supabase client.
 */
export interface AppVariables extends
  RequestIdVariables,
  CorrelationVariables,
  Partial<TimingVariables>,
  Partial<SecureHeadersVariables>,
  Partial<AuthUserVariables>,
  Partial<AuthAdminVariables> {
  /** Release date for API versioning */
  releaseDate?: string
  /** Resolved API version */
  apiVersion?: string
}

/**
 * Hono environment type with typed variables
 */
export interface AppEnv {
  Variables: AppVariables
}

/**
 * Configuration options for creating a Hono app
 */
export interface CreateAppOptions {
  /**
   * Enable or configure CORS
   * @default true (allows all origins)
   */
  cors?: boolean | {
    origin?: string | string[]
    allowMethods?: string[]
    allowHeaders?: string[]
    exposeHeaders?: string[]
    credentials?: boolean
    maxAge?: number
  }

  /**
   * Enable request/response logging
   * @default true
   */
  logger?: boolean

  /**
   * Enable pretty JSON formatting in responses
   * @default true in development
   */
  prettyJson?: boolean

  /**
   * Enable security headers middleware
   * @default true
   */
  securityHeaders?: boolean

  /**
   * Enable request timing middleware (sets x-response-time header)
   * @default true
   */
  timing?: boolean

  /**
   * Enable automatic health check endpoint
   * @default true
   */
  healthCheck?: boolean

  /**
   * Custom health check path
   * @default '/health'
   */
  healthCheckPath?: string

  /**
   * Display all routes in verbose mode on startup
   * @default false
   */
  showRoutes?: boolean

  /**
   * Service name to use for logging
   */
  serviceName?: string
}

/**
 * Default configuration optimized for production
 */
const DEFAULT_OPTIONS: CreateAppOptions = {
  cors: true,
  logger: true,
  prettyJson: true,
  securityHeaders: true,
  timing: true,
  healthCheck: true,
  healthCheckPath: '/health',
  showRoutes: false,
  serviceName: 'api-service',
}

/**
 * Creates a configured Hono app instance for Supabase Edge Functions.
 * 
 * Middleware execution order (important!):
 * 1. secureHeaders - Set security headers early
 * 2. requestId - Generate request ID for tracing
 * 3. cors - Handle CORS before auth
 * 4. logger - Log all requests
 * 5. timing - Measure request duration
 * 6. prettyJSON - Format responses
 * 
 * Handler-specific middleware (auth, validation) runs before route handlers.
 * 
 * @param functionName - Name of the edge function (used as base path)
 * @param options - Configuration options
 * @returns Configured Hono app instance
 * 
 * @example
 * ```ts
 * // Basic usage
 * const app = createApp('likes');
 * 
 * // Custom configuration
 * const app = createApp('auth', {
 *   cors: {
 *     origin: ['https://app.example.com'],
 *     credentials: true
 *   },
 *   logger: true,
 *   healthCheckPath: '/healthz'
 * });
 * ```
 */
export function createApp(
  functionName: string,
  options: CreateAppOptions = {}
): Hono<AppEnv> {
  const config = { ...DEFAULT_OPTIONS, serviceName: functionName, ...options }

  // Create app with base path matching function name
  const app = new Hono<AppEnv>().basePath(`/${functionName}`)

  // 1. Security headers first (before everything else touches the response)
  if (config.securityHeaders) {
    app.use('*', secureHeaders())
  }

  // 2. Correlation & logging context (early, before handlers)
  app.use('*', correlationMiddleware(config.serviceName))

  // 3. Request ID (standard Hono)
  app.use('*', requestId())

  // 4. CORS (must be early, before auth)
  if (config.cors) {
    const corsConfig = typeof config.cors === 'boolean'
      ? { origin: '*' }
      : Object.assign({ origin: '*' }, config.cors)

    app.use('*', cors(corsConfig))
  }

  // 5. Logging
  if (config.logger) {
    app.use('*', honoLogger())
  }

  // 6. Timing (for performance monitoring)
  if (config.timing) {
    app.use('*', timing())
  }

  // 7. Pretty JSON formatting
  if (config.prettyJson) {
    app.use('*', prettyJSON())
  }

  // Health check endpoint
  if (config.healthCheck) {
    const healthPath = config.healthCheckPath || '/health'

    app.get(healthPath, (c) => {
      return c.json({
        status: 'ok',
        service: functionName,
        timestamp: new Date().toISOString(),
        uptime: performance.now(),
      })
    })

    // Support OPTIONS for CORS preflight
    app.options(healthPath, (c) => c.text('', 204 as ContentfulStatusCode))
  }

  // Global error handler (catches HTTPException and other errors)
  app.onError((_err, c) => {
    const logger = getLogger(c)

    // HTTPException with pre-formatted RFC 7807 response
    if (_err instanceof HTTPException && _err.res) {
      return _err.res
    }

    // HTTPException with status/message but no response
    if (_err instanceof HTTPException) {
      const status = _err.status
      logger.error('HTTP exception', { status, message: _err.message })
      
      const [error, actualStatus, headers] = err(status, c.req.path, _err.message)
      return c.json(error, actualStatus, headers)
    }

    // Unexpected errors
    logger.fatal('Unhandled error', {
      error_type: _err?.constructor?.name,
      message: _err instanceof Error ? _err.message : 'Unknown error',
      stack: _err instanceof Error ? _err.stack : undefined,
    })

    return c.json(...internalServerError(
      c.req.path,
      'Internal server error'
    ))
  })

  // Display routes on startup
  if (config.showRoutes) {
    showRoutes(app, {
      verbose: true,
    })
  }

  return app
}

/**
 * Type helper for extracting app type
 */
export type AppType<T extends Hono<any>> = T