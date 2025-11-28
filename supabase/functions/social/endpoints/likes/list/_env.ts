import { getEnv } from '@platform/shared/utils/env.ts'

export const CURSOR_SECRET = getEnv('CURSOR_SECRET') ?? 'default-secret-change-in-production'