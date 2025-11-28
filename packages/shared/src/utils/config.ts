// @filename: shared/config.ts
import { getEnv, requireEnv } from './env.ts'

/**
 * Shared configuration that works across runtimes
 * Falls back to environment variables automatically
 */
export interface SupabaseConfig {
  url: string
  publicKey: string
  secretKey?: string
}

export function getSupabaseConfig(override?: Partial<SupabaseConfig>): SupabaseConfig {
  return {
    url: override?.url ?? requireEnv('SUPABASE_URL'),
    publicKey: override?.publicKey ?? requireEnv('SUPABASE_PUBLIC_KEY'),
    secretKey: override?.secretKey ?? getEnv('SUPABASE_SECRET_KEY'),
  }
}