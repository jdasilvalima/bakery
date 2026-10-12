// Read at runtime (not NEXT_PUBLIC_*), so one Docker image works against any
// Supabase project. All Supabase calls happen on the server.
export function supabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set (see .env.example)');
  }
  return { url, key };
}
