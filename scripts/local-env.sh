#!/usr/bin/env bash
# Exports the app's environment pointing at the local Supabase stack
# (`npx supabase start`). Process variables take precedence over
# .env.local, so the cloud project is never touched.
set -euo pipefail
eval "$(npx supabase status -o env 2>/dev/null | sed 's/^/LOCAL_/')"
export NEXT_PUBLIC_SUPABASE_URL="$LOCAL_API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$LOCAL_PUBLISHABLE_KEY"
export SUPABASE_SECRET_KEY="$LOCAL_SECRET_KEY"
export DATABASE_URL="$LOCAL_DB_URL"
export DIRECT_URL="$LOCAL_DB_URL"
export APP_URL="http://localhost:${PORT:-3000}"
