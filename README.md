# Backend Utilities Monorepo

High quality backend utilities and patterns for building robust APIs with TypeScript, Deno, and Node.js.

---

## Project Architecture

### High-Level Structure

```
┌───────────────────────────────────────────────────────────────┐
│                    BACKEND-UTILS MONOREPO                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   packages/  │  │  supabase/   │  │    Root      │        │
│  │   backend    │  │  functions   │  │   Scripts    │        │
│  │              │  │              │  │              │        │
│  │  Query DSL   │  │ Edge Runtime │  │  Node.js +   │        │
│  │  Response    │◀─│  (Deno 2)    │  │   pnpm       │        │
│  │  Utilities   │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         ▲                  │                                  │
│         │                  ▼                                  │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │   packages/  │  │  supabase/   │                          │
│  │    shared    │  │  migrations  │                          │
│  │              │  │              │                          │
│  │  Types from  │  │  PostgreSQL  │                          │
│  │  Database    │  │   Schema     │                          │
│  └──────────────┘  └──────────────┘                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘

Runtime Context          Language        Package Manager
─────────────────        ────────        ───────────────
Edge Functions     →     Deno 2     →    JSR imports
Root Scripts       →     Node 22    →    pnpm workspaces
Database Types     →     Generated  →    From PostgreSQL
```

### Mental Model: Request Flow

```
HTTP Request                  Edge Function              Database
────────────                  ─────────────              ────────

┌──────────┐                 ┌──────────┐              ┌──────────┐
│  Client  │────request─────▶│  Hono    │─────query───▶│Postgres  │
│          │                 │  Router  │              │          │
└──────────┘                 └──────────┘              └──────────┘
     │                            │                         │
     │                            ▼                         │
     │                    ┌──────────────┐                 │
     │                    │  Middleware  │                 │
     │                    │  • Auth      │                 │
     │                    │  • Validate  │                 │
     │                    │  • Correlate │                 │
     │                    └──────────────┘                 │
     │                            │                         │
     │                            ▼                         │
     │                    ┌──────────────┐                 │
     │                    │   Handler    │                 │
     │                    │  • Parse     │◀────results─────┘
     │                    │  • Execute   │
     │                    │  • Transform │
     │                    └──────────────┘
     │                            │
     │                            ▼
     │                    ┌──────────────┐
     │◀────response───────│  RFC 7807    │
                          │  Response    │
                          └──────────────┘
```

---

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

## Testing Edge Functions

### Mental Model: Local Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL TESTING WORKFLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Start Supabase    2. Create User    3. Sign In             │
│     ┌──────────┐         ┌─────────┐       ┌────────┐          │
│     │ Services │────────▶│ Profile │──────▶│  JWT   │          │
│     │ Running  │         │ Created │       │ Token  │          │
│     └──────────┘         └─────────┘       └────────┘          │
│          │                    │                 │               │
│          │                    │                 ▼               │
│          │                    │         ┌──────────────┐        │
│          │                    │         │ Test Edge    │        │
│          │                    │         │ Functions    │        │
│          │                    │         └──────────────┘        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│  Port 54321 (API)     Port 54324 (Email)                        │
│  Port 54323 (Studio)                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Option 1: Quick Test with Service Role (Development Only)

For quick local testing without authentication:

```bash
# Get keys from Supabase status
SERVICE_ROLE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')

# Test endpoint (bypasses RLS and authentication)
curl "http://127.0.0.1:54321/functions/v1/social/likes/list" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**⚠️ Warning:** Service role bypasses Row Level Security. Only use for local development.

### Option 2: Test with Real User Authentication (Recommended)

This mirrors production behavior and tests RLS policies properly.

#### Step 1: Create a Test User

**Method A: Via Supabase Studio UI**

1. Open http://127.0.0.1:54323
2. Go to **Authentication** → **Users**
3. Click **Add User**
4. Enter email/password, click **Create User**

**Method B: Via Script**

```bash
# Create test-user.ts
cat > test-user.ts << 'EOF'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SECRET_KEY')!

const supabase = createClient(
  'http://127.0.0.1:54321',
  SERVICE_ROLE_KEY,
)

// Create test user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'test@example.com',
  password: 'test-password-123',
  email_confirm: true, // Skip email confirmation for local testing
})

if (error) {
  console.error('Error:', error)
  Deno.exit(1)
}

console.log('✅ User created:', data.user.id)
console.log('📧 Email:', data.user.email)
EOF

# Run it
deno run --allow-net --allow-env test-user.ts
```

#### Step 2: Sign In and Get JWT

**Method A: Via curl**

```bash
# Get anon key
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

# Sign in and get token
curl -s 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test-password-123"
  }' | jq -r '.access_token'
```

**Method B: Via Script**

```bash
# Create get-token.ts
cat > get-token.ts << 'EOF'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANON_KEY = Deno.env.get('SUPABASE_PUBLIC_KEY')!

const supabase = createClient(
  'http://127.0.0.1:54321',
  ANON_KEY,
)

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test-password-123',
})

if (error) {
  console.error('Error:', error)
  Deno.exit(1)
}

console.log('✅ Signed in')
console.log('📝 Access Token:')
console.log(data.session?.access_token)
EOF

# Run it
deno run --allow-net --allow-env get-token.ts
```

#### Step 3: Test Your Endpoint

```bash
# Save the token from Step 2
ACCESS_TOKEN="<token-from-step-2>"

# Test authenticated endpoint
curl "http://127.0.0.1:54321/functions/v1/social/likes/list?limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Authentication Test Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                 AUTHENTICATION TEST FLOW                       │
└────────────────────────────────────────────────────────────────┘

User Creation                Sign In                  API Request
─────────────                ────────                 ───────────

┌──────────┐               ┌──────────┐              ┌──────────┐
│ Studio   │               │  Auth    │              │  Edge    │
│   UI     │──create──────▶│  Server  │──JWT────────▶│ Function │
│    or    │               │          │   token      │          │
│ Script   │               │  POST    │              │  Hono    │
└──────────┘               │  /token  │              │  Router  │
     │                     └──────────┘              └──────────┘
     │                          │                         │
     ▼                          ▼                         ▼
[email/password]            Returns:                 Validates:
[email_confirm:true]        • access_token          • JWT signature
                            • refresh_token         • JWT expiry
                            • user metadata         • RLS policies
                                                    Returns data
```

### Complete Test Script

Save this as `test-endpoint.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Testing Edge Function with Authentication"

# Get credentials from Supabase
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
BASE_URL="http://127.0.0.1:54321"

# Sign in
echo "🔐 Signing in as test@example.com..."
RESPONSE=$(curl -s "${BASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test-password-123"
  }')

# Extract token
TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Error: Failed to get access token"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Got access token"

# Test endpoint
echo ""
echo "📡 Testing endpoint..."
curl -i "${BASE_URL}/functions/v1/social/likes/list?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Make it executable and run:

```bash
chmod +x test-endpoint.sh
./test-endpoint.sh
```

### Testing Different Scenarios

```bash
# Test with different query parameters
ACCESS_TOKEN="your-token-here"

# Pagination
curl "http://127.0.0.1:54321/functions/v1/social/likes/list?limit=20&offset=40" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Filtering
curl "http://127.0.0.1:54321/functions/v1/social/likes/list?filter[user_id][eq]=123" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Sorting
curl "http://127.0.0.1:54321/functions/v1/social/likes/list?sort=created_at:desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Field selection
curl "http://127.0.0.1:54321/functions/v1/social/likes/list?fields=id,user_id,created_at" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

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

### Function Architecture

The Deno-based functions are built with Hono and Zod v4:

| Function | Auth | Description |
|----------|------|-------------|
| `social` | Yes | User likes & follows |

### Directory Structure

Each function follows the same pattern:

```
supabase/functions/my-function/
├── deno.json           # Import map extending _shared
├── index.ts            # App entry point (Hono)
├── mod.ts              # Endpoint definitions registry
├── utils/              # Function-specific utilities
│   └── _schemas.ts
└── endpoints/
    └── my-endpoint/
        ├── _env.ts         # Environment variables
        ├── definition.ts   # Schema + route config
        └── handler.ts      # Request handler
```

### Shared Utilities

`supabase/functions/_shared/` provides:

```
_shared/
├── middleware/
│   ├── auth.ts         # JWT validation, user context
│   ├── correlation.ts  # Logging & Request ID tracking
│   └── validation.ts   # Zod schema validation
├── query/
│   └── execution/
│       └── supabase.ts # QuerySpec → Supabase queries
├── server/
│   ├── create-app.ts   # Hono app factory
│   └── types.ts        # Shared TypeScript types
└── supabase.ts         # Supabase client factory
```

Backend utilities in `packages/backend/src/`:

```
backend/
├── endpoint/
│   ├── definitions.ts  # Endpoint definition types
│   └── schemas.ts      # Common endpoint schemas
├── query/
│   ├── fields.ts       # Field selection parsing
│   ├── filtering.ts    # Filter parsing and validation
│   ├── pagination.ts   # Cursor/offset pagination
│   ├── query.ts        # QuerySpec builder
│   ├── schemas.ts      # Zod schemas for queries
│   └── sorting.ts      # Sort parsing and validation
└── response/
    ├── errors.ts       # RFC 7807 error responses
    ├── index.ts        # Main exports
    ├── schemas.ts      # Response schemas
    ├── status-codes.ts # HTTP status codes
    └── success.ts      # Success response builders
```

### Creating Functions

```bash
pnpm supabase functions new my-function
```

This creates `supabase/functions/my-function/index.ts` and adds config to `config.toml`.

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

Output: `packages/shared/src/types/database.types.ts`

---

## Working with Deno and Node

### Runtime Context

| Context | Runtime | Package Manager |
|---------|---------|-----------------|
| Edge Functions | Deno 2 | JSR imports |
| Seed scripts | Deno 2 | JSR imports |
| Root scripts | Node.js | pnpm |

### Import Maps

`deno.jsonc` defines shared dependencies:

```jsonc
{
  "imports": {
    "hono": "jsr:@hono/hono@4",
    "zod": "jsr:@zod/zod@4",
    "#shared/": "./supabase/functions/_shared/"
  }
}
```

Edge Functions import from JSR (Deno's registry). The `#shared/` alias provides access to common utilities.

---

## Schema-First Endpoints

### Mental Model: Definition → Execution → Response

```
definition.ts          handler.ts             Response
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ • Filter rules │ ──▶ │ • Validation   │ ──▶ │ • RFC 7807     │
│ • Sort options │     │ • Execution    │     │ • Pagination   │
│ • Pagination   │     │ • Transform    │     │ • Metadata     │
│ • Output shape │     │                │     │                │
└────────────────┘     └────────────────┘     └────────────────┘
        │                      │                       │
        ▼                      ▼                       ▼
   Type Safety          Runtime Validation      Standardized
   + Documentation      + Error Handling        + Consistent
```

### Endpoint Structure

```
endpoints/my-endpoint/
├── _env.ts           # Environment variables (secrets, config)
├── definition.ts     # Schema and route config (the contract)
└── handler.ts        # Request handler (the implementation)
```

### definition.ts — The Contract

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

export const QuerySchema = BaseQuerySchema.transform(value => 
  EndpointQuerySchema.parse(value)
)

// 3. Define output shape
export const NewReleaseItemSchema = z.object({
  uri: z.string(),
  slug: z.string(),
  title: z.string(),
  issue_number: z.string(),
  release_date: z.string(),
  publisher: z.string(),
  cover_image_url: z.string().nullable(),
})

export const OutputSchema = makePaginationResultSchema(
  z.array(NewReleaseItemSchema)
)

// 4. Export definition
export default {
  Name: 'search-comics',
  Route: '/search',
  Methods: ['GET'],
  Input: QuerySchema,
  Output: OutputSchema,
  Schemas: { Query: QuerySchema },
} as const satisfies EndpointDefinition
```

### handler.ts — The Implementation

```typescript
import type { 
  EndpointHandler, 
  EndpointMiddlewareHandler, 
  FunctionAppEnv 
} from '#shared/server/types.ts'

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

### Mental Model: Parse → Spec → Execute

```
HTTP Query String          QuerySpec             Backend Query
─────────────────          ─────────             ─────────────

filter[price][lte]=5.99    { filters: [          SELECT * FROM comics
sort=title:asc         ──▶   { field: 'price',   WHERE price <= 5.99
limit=20                      operator: 'lte',   ORDER BY title ASC
                              value: 5.99 }      LIMIT 20
                            ],
                            sorts: [...],
                            pagination: {...}
                          }
```

### QuerySpec Structure

```typescript
interface QuerySpec {
  pagination: {
    type: 'cursor' | 'offset'
    limit: number
    // ... cursor or offset specific fields
  }
  filters: Array<{
    field: string
    operator: 'eq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | ...
    value: any
  }>
  sorts: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>
  fields: {
    type: 'simple'
    fields: string[]
  } | null
}
```

### Backend Translation

Executors translate QuerySpec to backend-specific queries:

**Supabase (PostgreSQL):**
```typescript
supabase
  .from('comics')
  .lte('price', 5.99)
  .order('title', { ascending: true })
  .limit(20)
```

**Typesense (Search):**
```typescript
{
  filter_by: "price:<=5.99",
  sort_by: "title:asc",
  per_page: 20
}
```

**SPARQL (Graph):**
```sparql
SELECT * WHERE {
  ?comic a :Comic .
  ?comic :price ?price .
  FILTER(?price <= 5.99)
}
ORDER BY ?title
LIMIT 20
```

---

## Response Utilities

### Success Responses

```typescript
import { paginate, ok, created } from '@platform/backend/response/index.ts'

// Collection with pagination
return c.json(...paginate(url, items, paginationMeta))

// Single item
return c.json(...ok(item))

// Created resource
return c.json(...created(item))
```

### Error Responses (RFC 7807)

```typescript
import { 
  badRequest, 
  notFound, 
  internalServerError 
} from '@platform/backend/response/index.ts'

// 400 Bad Request
return c.json(...badRequest(path, 'Invalid filter'))

// 404 Not Found
return c.json(...notFound(path, 'Comic not found'))

// 500 Internal Server Error
return c.json(...internalServerError(path, 'Database connection failed'))
```

### Response Format

All responses follow RFC 7807 for errors and consistent structure for success:

```typescript
// Success
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}

// Error
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid filter operator 'contains' for field 'price'",
  "instance": "/functions/v1/social/likes/list"
}
```

---

## Creating a New Endpoint

### Step-by-Step Guide

**1. Create the structure:**

```bash
mkdir -p supabase/functions/my-function/endpoints/my-endpoint
touch supabase/functions/my-function/endpoints/my-endpoint/{_env.ts,definition.ts,handler.ts}
```

**2. Define environment variables** (`_env.ts`):

```typescript
export const CURSOR_SECRET = Deno.env.get('CURSOR_SECRET') ?? 'dev-secret'
```

**3. Define the contract** (`definition.ts`):

- Declare filter registry (which fields, which operators)
- Configure pagination (cursor/offset, limits)
- Configure sorting (allowed fields, defaults, tiebreaker)
- Define output schema (response shape)

**4. Implement the handler** (`handler.ts`):

- Add validation middleware
- Execute query against backend
- Return formatted response

**5. Register in `mod.ts`:**

```typescript
import MyEndpoint from './endpoints/my-endpoint/definition.ts'

export const Endpoints = [
  MyEndpoint,
  // ... other endpoints
] as const
```

**6. Wire up in `index.ts`:**

```typescript
import { Endpoints } from './mod.ts'
import { registerEndpoints } from '#shared/server/create-app.ts'

const app = createApp()
registerEndpoints(app, Endpoints)
```

### Reference Implementation

See `supabase/functions/social/` for a complete reference with:
- Multiple endpoints (likes, follows)
- Different HTTP methods (GET, POST, DELETE)
- Filter/sort/pagination configurations
- Proper error handling

---

## Deployment

### Supabase (Managed)

```bash
# Link to your project
pnpm supabase link --project-ref <your-project-ref>

# Push database migrations
pnpm supabase db push

# Deploy all functions
pnpm supabase functions deploy

# Deploy specific function
pnpm supabase functions deploy social
```

### Environment Variables in Production

Set secrets via Supabase CLI:

```bash
# Set individual secret
supabase secrets set MY_SECRET=value

# Set from .env file
supabase secrets set --env-file .env.production

# List secrets
supabase secrets list
```

---

## Troubleshooting

### Port Conflicts

```bash
# Check what's using Supabase ports
lsof -i :54321   # Supabase API
lsof -i :54323   # Supabase Studio
lsof -i :54324   # Email testing (Mailpit)

# Kill process if needed
kill -9 <PID>
```

### Supabase Won't Start

```bash
# Stop and clean up
pnpm supabase stop --no-backup

# Restart
pnpm start:supabase
```

### Type Generation Fails

Ensure Supabase is running:

```bash
# Check status
pnpm supabase status

# If running, regenerate types
pnpm db:types
```

### Edge Function Errors

```bash
# View logs
pnpm supabase functions logs <function-name> --tail

# View logs for all functions
pnpm supabase functions logs --tail

# Test locally first
curl -i "http://127.0.0.1:54321/functions/v1/<function-name>" \
  -H "Authorization: Bearer <token>"
```

### Authentication Issues

```bash
# Verify user exists
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "SELECT id, email, created_at FROM auth.users;"

# Check JWT secret
supabase status | grep "JWT secret"

# Verify token is valid
# Use jwt.io to decode and check claims
```

### Database Connection Issues

```bash
# Check database is running
pnpm supabase status

# Test connection
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT version();"

# Reset database (WARNING: destroys data)
pnpm supabase db reset
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
- [Deno](https://deno.land/)
- [RFC 7807 (Problem Details)](https://tools.ietf.org/html/rfc7807)