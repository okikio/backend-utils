# Backend Utilities Monorepo

High quality backend utilities and patterns for building robust APIs with TypeScript, Deno, and Node.js.

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Frontend builds, scripts |
| pnpm | 10+ | Package management |
| Deno | 2+ | Edge Functions runtime |
| Docker | Latest | Infrastructure services |
| Supabase CLI | 2.62+ | Local backend |

### Install with mise (Recommended)

[mise](https://mise.jdx.dev/) manages all runtime versions from a single config file:

```bash
# Install mise
curl https://mise.run | sh

# Add to shell (zsh example)
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

# Install project runtimes
cd backend-utils
mise trust
mise install

# Verify
node -v   # 22.x
deno -v   # 2.x
pnpm -v   # 10.x
```

**Why mise?** This project uses two JavaScript runtimes: Node.js for the frontend apps and Deno for Edge Functions. mise ensures everyone uses matching versions without conflicts.

### IDE Setup

For VS Code, add mise shims to your shell profile so the IDE finds the correct runtimes:

```bash
# ~/.zshenv (loaded by VS Code)
if command -v mise &>/dev/null; then
  eval "$(mise activate zsh --shims)"
fi
```

Restart VS Code after adding this.

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/okiki/backend-utils.git
cd backend-utils
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Start Supabase first to get the keys:

```bash
pnpm start:supabase
```

Copy the output keys to `.env.local`:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLIC_KEY=<anon key from output>
SUPABASE_SECRET_KEY=<service_role key from output>
```

### 3. Start Services

**Terminal 1 — Backend:**
```bash
pnpm start:supabase
```

### 4. Access Points

| Service | URL |
|---------|-----|
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| Email Testing | http://127.0.0.1:54324 |

---

## Available Scripts

All scripts run from the repository root:

```bash
# Supabase
pnpm start:supabase   # Start Supabase + Edge Functions
pnpm stop:supabase    # Stop Supabase
pnpm db:types         # Regenerate TypeScript types from schema
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

### Required

```env
# Supabase (from `pnpm start:supabase` output)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLIC_KEY=<anon-key>
SUPABASE_SECRET_KEY=<service-role-key>
```

### OAuth (Optional)

```env
SUPABASE_AUTH_GITHUB_CLIENT_ID=...
SUPABASE_AUTH_GITHUB_CLIENT_SECRET=...
SUPABASE_AUTH_DISCORD_CLIENT_ID=...
SUPABASE_AUTH_DISCORD_CLIENT_SECRET=...
SUPABASE_AUTH_GOOGLE_CLIENT_ID=...
SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=...
```

---

## Edge Functions

Six Deno-based functions built with Hono and Zod v4:

| Function | Auth | Description |
|----------|------|-------------|
| `social` | Yes | User likes & follows |
| `accounts` | Yes | User management |
| `billing` | Yes | Stripe integration |
| `admin` | Yes | Admin operations |

### Testing Functions

```bash
# Authenticated endpoint (get token from Supabase Auth)
curl "http://127.0.0.1:54321/functions/v1/social/likes/list" \
  -H "Authorization: Bearer <access-token>"
```

### Creating Functions

```bash
pnpm supabase functions new my-function
```

This creates `supabase/functions/my-function/index.ts` and adds the config to `config.toml` automatically. Edit the generated files to implement your function.

### Function Architecture

Each function follows the same pattern:

```
supabase/functions/my-function/
├── deno.json           # Import map extending _shared
├── index.ts            # App entry point (Hono)
├── mod.ts              # Endpoint definitions registry
└── endpoints/
    └── my-endpoint/
        ├── definition.ts   # Schema + route config
        └── handler.ts      # Request handler
```

Shared utilities in `_shared/` provide:
- Query execution (pagination, filtering, sorting, field selection)

Backend utils are in `packages/shared/src/backend/`:
- QuerySpec generation and execution
- Response formatting (RFC 7807 errors, success wrappers)
- Middleware (auth, correlation IDs, validation)

---

## Database Workflow

### Migrations

```bash
# Create migration
pnpm supabase migration new add_my_table

# Apply migrations (resets local DB)
pnpm supabase db reset

# Push to remote
pnpm supabase db push
```

### Type Generation

After schema changes, regenerate TypeScript types:

```bash
pnpm db:types
```

This outputs to `packages/shared/src/types/database.types.ts`.

---

## Working with Deno and Node

This project uses both runtimes:

| Context | Runtime | Package Manager |
|---------|---------|-----------------|
| Edge Functions | Deno 2 | JSR imports |
| Seed scripts | Deno 2 | JSR imports |
| Root scripts | Node.js | pnpm |

**Import maps** in `deno.jsonc` define shared dependencies:

```jsonc
{
  "imports": {
    "hono": "jsr:@hono/hono@4",
    "zod": "jsr:@zod/zod@4",
    "#shared/": "./supabase/functions/_shared/"
  }
}
```

Edge Functions import from JSR (Deno's registry) rather than npm. The `#shared/` alias provides access to common utilities.

---

## Schema-First Endpoints

Every endpoint is defined by schemas that validate input, generate types, and document the API:

```
definition.ts          handler.ts             Response
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ • Filter rules │ ──▶ │ • Validation   │ ──▶ │ • RFC 7807     │
│ • Sort options │     │ • Execution    │     │ • Pagination   │
│ • Pagination   │     │ • Transform    │     │ • Metadata     │
│ • Output shape │     │                │     │                │
└────────────────┘     └────────────────┘     └────────────────┘
```

### Endpoint Structure

```
supabase/functions/my-function/endpoints/my-endpoint/
├── _env.ts           # Environment variables
├── definition.ts     # Schema and route config (the contract)
└── handler.ts        # Request handler (the implementation)
```

### definition.ts — Declaring the Contract

```typescript
import type { FilterRegistry } from '@platform/backend/query/schemas.ts'
import type { EndpointDefinition } from '#shared/server/types.ts'

import { makePaginationResultSchema } from '@platform/backend/response/schemas.ts'
import { createEndpointQuerySchema } from '@platform/backend/query/query.ts'

import { z } from 'zod'

import { CURSOR_SECRET } from './_env.ts'
import { BaseQuerySchema } from '#shared/endpoint/schemas.ts'


// 1. Declare which fields can be filtered and how
const filterRegistry: FilterRegistry = {
  publisher_name: { operators: ['eq', 'in'], type: 'string' },
  price: { operators: ['eq', 'gt', 'gte', 'lt', 'lte'], type: 'number' },
} as const

// 2. Create query schema with all rules
const EndpointQuerySchema = createEndpointQuerySchema({
  filters: { registry: filterRegistry, limits: { maxFilters: 20 } },
  sorts: {
    allowedFields: ['price', 'title', 'modified_ts'],
    tiebreaker: 'id',
    defaults: [{ field: 'modified_ts', direction: 'desc' }],
  },
  pagination: {
    cursorSecret: CURSOR_SECRET,
    limits: { defaultLimit: 20, maxLimit: 100 },
  },
})

export const QuerySchema = BaseQuerySchema.transform(value => EndpointQuerySchema.parse(value))

/**
 * Individual new release item in response
 */
export const NewReleaseItemSchema = z.object({
  uri: z.string(),
  slug: z.string(),
  title: z.string(),
  issue_number: z.string(),
  release_date: z.string(),
  publisher: z.string(),
  cover_image_url: z.string().nullable(),
})

/**
 * Paginated response with RFC 8288 compliant pagination metadata
 */
export const OutputSchema = makePaginationResultSchema(z.array(NewReleaseItemSchema))

// 3. Export definition
export default {
  Name: 'search-comics',
  Route: '/search',
  Methods: ['GET'],
  Input: QuerySchema,
  Output: OutputSchema,
  Schemas: { Query: QuerySchema },
} as const satisfies EndpointDefinition
```

### handler.ts — Implementing the Logic

```typescript
import type { EndpointHandler, EndpointMiddlewareHandler, FunctionAppEnv } from '#shared/server/types.ts'

import { createValidator } from '#shared/middleware/validation.ts'
import { paginate } from '@platform/backend/response/index.ts'
import Definition from './definition.ts'

export type AppEnv = FunctionAppEnv

// Middleware validates before handler runs
export const Middleware: EndpointMiddlewareHandler<AppEnv>[] = [
  createValidator('query', Definition.Schemas.Query),
]

// Handler receives typed, validated input
export const Handler: EndpointHandler<AppEnv, typeof Definition> = async (c) => {
  const input = c.req.valid('query')  // Fully typed QuerySpec
  
  // Execute query against backend
  const results = await executeQuery(input)
  
  // Return standardized response
  return c.json(...paginate(url, results, paginationMeta))
}

export default Handler
```

---

## QuerySpec: Universal Query Language

Input parsing produces a **QuerySpec** that all backends understand:

```typescript
interface QuerySpec {
  pagination: { type: 'cursor' | 'offset', limit: number, ... }
  filters: Array<{ field: string, operator: string, value: any }>
  sorts: Array<{ field: string, direction: 'asc' | 'desc' }>
  fields: { type: 'simple', fields: string[] } | null
}
```

Request:
```
GET /list?filter[price][lte]=5.99&sort=title:asc&limit=20
```

Becomes:
```typescript
{
  pagination: { type: 'cursor', limit: 20 },
  filters: [{ field: 'price', operator: 'lte', value: 5.99 }],
  sorts: [{ field: 'title', direction: 'asc' }],
  fields: null,
}
```

Executors translate this to backend-specific queries:
- **Supabase**: `.from('comics').lte('price', 5.99).order('title')`
- **Typesense**: `filter_by: "price:<=5.99", sort_by: "title:asc"`
- **SPARQL**: `FILTER(?price <= 5.99) ORDER BY ?title`

---

## Response Utilities

### Success

```typescript
import { paginate, ok, created } from '@platform/backend/response/index.ts'

return c.json(...paginate(url, items, paginationMeta))  // Collection
return c.json(...ok(item))                              // Single item
return c.json(...created(item))                         // Created
```

### Errors (RFC 7807)

```typescript
import { badRequest, notFound, internalServerError } from '@platform/backend/response/index.ts'

return c.json(...badRequest(path, 'Invalid filter'))
return c.json(...notFound(path, 'Comic not found'))
```

---

## Creating a New Endpoint

1. **Create the structure:**
```bash
mkdir -p supabase/functions/my-function/endpoints/my-endpoint
```

2. **Define the contract** (`definition.ts`):
   - Declare filter registry
   - Configure pagination, sorting, field selection
   - Define output schema

3. **Implement the handler** (`handler.ts`):
   - Add validation middleware
   - Execute query against backend
   - Return formatted response

4. **Register in `mod.ts`** and **wire up in `index.ts`**

See `supabase/functions/social/` for a complete reference implementation.

---

## Deployment

### Supabase (Managed)

```bash
pnpm supabase link --project-ref <your-project-ref>
pnpm supabase db push
pnpm supabase functions deploy
```

---

## Troubleshooting

### Port Conflicts

```bash
lsof -i :54321   # Supabase API
```

### Supabase Won't Start

```bash
pnpm supabase stop --no-backup
pnpm start:supabase
```

### Type Generation Fails

Ensure Supabase is running:

```bash
pnpm supabase status
pnpm db:types
```

### Edge Function Errors

```bash
pnpm supabase functions logs <function-name> --tail
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Edge Functions | Deno 2, Hono 4, Zod 4 |
| Database | PostgreSQL 17 (Supabase) |
| Auth | Supabase Auth (GitHub, Discord, Google) |
| Deployment | Supabase Cloud |
| Package Manager | pnpm 10 (workspaces) |
| Runtime Manager | mise |

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Hono](https://hono.dev)
- [Zod](https://zod.dev)
- [mise](https://mise.jdx.dev/)
- [pnpm](https://pnpm.io/)
