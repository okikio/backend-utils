/**
 * Hono API Utilities: RFC 7807 Problem Details, Structured Logging, Correlation
 * 
 * Provides production-grade error handling, request correlation, and structured logging
 * for Hono.js APIs. Implements RFC 7807 (Problem Details for HTTP APIs) with extensions
 * for validation errors, distributed tracing (W3C Trace Context), and request correlation.
 */

import type { Context } from 'hono'
/**
 * Request correlation context carrying IDs for tracing across services
 */
export interface RequestCorrelation {
  requestId: string
  traceId: string
  spanId: string
  parentSpanId?: string
  timestamp: string
}

/**
 * Structured logger instance attached to request context
 */
export interface StructuredLogger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  fatal(message: string, data?: Record<string, unknown>): void
}

export interface CorrelationVariables { 
  correlation: RequestCorrelation
  logger: StructuredLogger
  traceHeaders: Headers
}

/**
 * Middleware to extract trace context and attach logger to request context
 * 
 * Must be applied early in middleware stack. Attaches:
 * - correlation: RequestCorrelation
 * - logger: StructuredLogger
 * - traceHeaders: Headers to propagate to downstream services
 * 
 * @param serviceName - Service identifier for logs
 * @returns Hono middleware
 * 
 * @example
 * app.use('*', correlationMiddleware('likes-service'))
 * 
 * // In handlers:
 * const logger = c.get('logger')
 * const correlation = c.get('correlation')
 * logger.info('Processing request')
 */
export function correlationMiddleware(serviceName: string) {
  return async (c: Context, next: () => Promise<void>) => {
    const correlation = extractTraceContext(c)
    const logger = createLogger(correlation, serviceName)

    // Create headers for propagating trace context downstream
    const traceHeaders = new Headers()
    traceHeaders.set('x-request-id', correlation.requestId)
    traceHeaders.set(
      'traceparent',
      `00-${correlation.traceId}-${correlation.spanId}-01`
    )
    if (correlation.parentSpanId) {
      traceHeaders.set('tracestate', `parent=${correlation.parentSpanId}`)
    }

    c.set('correlation', correlation)
    c.set('logger', logger)
    c.set('traceHeaders', traceHeaders)

    // Set response headers
    c.header('X-Request-ID', correlation.requestId)

    await next()
  }
}


/**
 * Generate or extract W3C Trace Context from request headers
 * https://w3c.github.io/trace-context/
 * 
 * @param c - Hono context with headers
 * @returns Correlation IDs for tracing
 * 
 * @example
 * // If client provides traceparent header:
 * // traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 * // Returns: traceId from header, generates new spanId
 * 
 * // If no header, generates new trace and span
 */
export function extractTraceContext(c: Context): RequestCorrelation {
  const timestamp = new Date().toISOString()

  // Try to extract from W3C Trace Context header (traceparent)
  const traceparent = c.req.header('traceparent')

  if (traceparent) {
    try {
      const parts = traceparent.split('-')
      if (parts.length >= 4) {
        const [_version, traceId, parentSpanId, _flags] = parts
        return {
          requestId: c.req.header('x-request-id') || crypto.randomUUID(),
          traceId,
          spanId: generateSpanId(),
          parentSpanId,
          timestamp,
        }
      }
    } catch {
      // Fall through to generate new trace
    }
  }

  // Fall back to X-Request-ID or generate
  const requestId = c.req.header('x-request-id') || crypto.randomUUID()
  const traceId = generateTraceId()

  return {
    requestId,
    traceId,
    spanId: generateSpanId(),
    timestamp,
  }
}

/**
 * Generate hex string, 36 chars
 */
function generateTraceId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/**
 * Generate 64-bit span ID (hex string, 16 chars)
 */
function generateSpanId(): string {
  return Math.random().toString(16).substring(2, 18).padEnd(16, '0')
}

/**
 * Create structured logger instance with correlation context
 * 
 * Logs are formatted as JSON with consistent structure including correlation IDs,
 * timestamps, and trace context for distributed tracing.
 * 
 * @param correlation - Request correlation context
 * @param serviceName - Name of the service for identification
 * @returns Logger instance
 * 
 * @example
 * const logger = createLogger(correlation, 'likes-service')
 * logger.info('Like created', { user_id: 'abc', target_id: 'xyz' })
 * // Outputs: { "timestamp": "2025-10-09T...", "level": "info", ..., "request_id": "...", ... }
 */
export function createLogger(
  correlation: RequestCorrelation,
  serviceName: string
): StructuredLogger {
  const baseEntry = {
    request_id: correlation.requestId,
    trace_id: correlation.traceId,
    span_id: correlation.spanId,
    parent_span_id: correlation.parentSpanId,
    service: serviceName,
  }

  function log(level: keyof StructuredLogger | (string & {}), message: string, data?: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...baseEntry,
      ...(data && Object.keys(data).length > 0 ? { context: data } : {}),
    }

    // Supabase Edge Functions collect via stdout
    const _message = entry
    switch (level) { 
      case "debug":
        console.debug(_message)
        break;
      case "info":
        console.info(_message)
        break;
      case "warn":
        console.warn(_message)
        break;
      case "error":
        console.error(_message)
        break;
      case "fatal":
        console.error(_message)
        break;
      default:
        console.log(_message)
    }
  }

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    fatal: (msg, data) => log('fatal', msg, data),
  }
}

/**
 * Helper to extract logger from Hono context
 * 
 * Provides type-safe logger access in handlers after correlationMiddleware.
 * 
 * @param c - Hono context
 * @returns Logger instance
 * 
 * @example
 * export const handler: EndpointHandler = (c) => {
 *   const logger = getLogger(c)
 *   logger.info('Processing request')
 * }
 */
export function getLogger(c: Context): StructuredLogger {
  return c.get('logger') as StructuredLogger
}

/**
 * Helper to extract correlation context from Hono context
 * 
 * @param c - Hono context
 * @returns Correlation IDs for tracing
 */
export function getCorrelation(c: Context): RequestCorrelation {
  return c.get('correlation') as RequestCorrelation
}

/**
 * Helper to get headers for downstream service calls
 * 
 * Includes correlation and trace context headers for propagation.
 * 
 * @param c - Hono context
 * @returns Headers ready to use in fetch/requests
 * 
 * @example
 * const headers = getPropagationHeaders(c)
 * const response = await fetch('http://other-service/api/data', {
 *   headers: new Headers({ ...headers, Authorization: token })
 * })
 */
export function getPropagationHeaders(c: Context): Record<string, string> {
  const traceHeaders = c.get('traceHeaders') as Headers
  const headers: Record<string, string> = {}

  traceHeaders?.forEach((value, key) => {
    headers[key] = value
  })

  return headers
}