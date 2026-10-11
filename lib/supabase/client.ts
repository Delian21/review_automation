import { createBrowserClient } from "@supabase/ssr";

// Browser client. Holds only the public anon key (NEXT_PUBLIC_*), which is
// public by design — row-level security, not key secrecy, protects the data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
