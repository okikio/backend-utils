import type { Database } from '@platform/shared/types/index.ts'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@platform/shared/utils/config.ts'
import { requireEnv } from '@platform/shared/utils/env.ts'

export function createAdminClient() {
  const config = getSupabaseConfig({
    secretKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  });

  return createClient<Database>(
    config.url,
    config.secretKey!,
  )
}

export function createUserClient(authHeader: string) {
  const config = getSupabaseConfig({
    publicKey: requireEnv('SUPABASE_ANON_KEY')
  });

  return createClient<Database>(
    config.url,
    config.publicKey!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  )
}
