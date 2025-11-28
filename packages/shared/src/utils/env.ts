// @filename: shared/runtime.ts
/**
 * Runtime detection utilities
 * Determines whether code is running in Deno or Node.js
 */

export const isDeno = 'Deno' in globalThis;
export const isNode = !isDeno

/**
 * Cross-runtime environment variable access
 * Abstracts the difference between Deno.env.get() and process.env
 */
export function getEnv(key: string): string | undefined {
  if (isDeno) {
    // @ts-expect-error - Deno is available in Deno runtime
    return Deno.env.get(key)
  }
  return globalThis?.process?.env[key]
}

/**
 * Gets environment variable or throws if missing
 * Useful for required configuration
 */
export function requireEnv(key: string): string {
  const value = getEnv(key)
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}