/**
 * Likes Function: Main Entry Point
 * 
 * Demonstrates complete setup with:
 * - Versioning middleware
 * - Correlation/logging
 * - Error handling
 * - All endpoints registered
 */

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import type { EndpointHandlerModule } from '@platform/backend/server/types.ts'

import { createApp } from '@platform/backend/server/create-app.ts'

// Import all endpoint handlers
import * as CreateLikeHandler from './endpoints/likes/like/handler.ts'
import * as ListLikesHandler from './endpoints/likes/list/handler.ts'
import * as CheckLikeHandler from './endpoints/likes/check/handler.ts'
import * as UnlikeHandler from './endpoints/likes/unlike/handler.ts'

import * as CreateFollowHandler from './endpoints/follows/follow/handler.ts'
import * as ListFollowsHandler from './endpoints/follows/list/handler.ts'
import * as CheckFollowHandler from './endpoints/follows/check/handler.ts'
import * as UnfollowHandler from './endpoints/follows/unfollow/handler.ts'
import * as UpdateFollowHandler from './endpoints/follows/update/handler.ts'

import { EndpointDefinitions } from './mod.ts'
import { showRoutes } from 'hono/dev'

/**
 * Registry of all endpoint handlers
 * 
 * Each handler is a module with optional Middleware array and default Handler export
 */
export const EndpointHandlers = {
  [EndpointDefinitions.CreateLike.Name]: CreateLikeHandler,
  [EndpointDefinitions.ListLikes.Name]: ListLikesHandler,
  [EndpointDefinitions.CheckLike.Name]: CheckLikeHandler,
  [EndpointDefinitions.Unlike.Name]: UnlikeHandler,

  [EndpointDefinitions.CreateFollow.Name]: CreateFollowHandler,
  [EndpointDefinitions.ListFollows.Name]: ListFollowsHandler,
  [EndpointDefinitions.CheckFollow.Name]: CheckFollowHandler,
  [EndpointDefinitions.Unfollow.Name]: UnfollowHandler,
  [EndpointDefinitions.UpdateFollow.Name]: UpdateFollowHandler,
} as const satisfies Record<string, EndpointHandlerModule>


// ============================================================================
// Create and configure app
// ============================================================================

/**
 * Create base app with all global middleware:
 * 1. Security headers
 * 2. Correlation & logging (W3C Trace Context)
 * 3. Request ID generation
 * 4. CORS
 * 5. HTTP logging
 * 6. Timing
 * 7. Pretty JSON
 */
const app = createApp('social', {
  serviceName: 'social-service',
  cors: {
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Release-Date'],
    exposeHeaders: ['X-Request-ID', 'X-API-Major', 'X-API-Effective-Release-Date'],
  },
})

// ============================================================================
// Register endpoints dynamically
// ============================================================================

/**
 * Register all endpoints from definitions
 * 
 * For each endpoint:
 * 1. Extract route and methods from definition
 * 2. Get middleware from handler module
 * 3. Wire up: app.on(methods, route, ...middleware, handler)
 */
Object.values(EndpointDefinitions).forEach((endpoint) => {
  const route = endpoint.Route
  const methods = Array.from(new Set(endpoint.Methods)) as Array<
    'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'
  >

  const handlerModule = EndpointHandlers[endpoint.Name] as EndpointHandlerModule

  const middleware = handlerModule.Middleware ?? []
  const handler = handlerModule.default

  if (!handler) {
    console.warn(`No handler found for endpoint: ${endpoint.Name}`)
    return
  }

  // Register the endpoint with all its middleware
  app.on(methods, route, ...middleware, handler)
})

// Start Server
showRoutes(app, {
  verbose: true,
})

// ============================================================================
// Export for Supabase
// ============================================================================

export { app }
export default app
