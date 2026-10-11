import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client for Server Components and route handlers. Reads and writes the
// shared session cookie. Note: @supabase/ssr session cookies are not httpOnly by
// design — the browser client reads them via document.cookie to refresh.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies; middleware refreshes them.
          }
        },
      },
    },
  );
}
