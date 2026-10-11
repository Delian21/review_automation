import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Refreshes the Supabase session on every matched route and guards /setup:
// signed-out visitors are redirected to /login, signed-in users skip /login
// and /signup. Static assets are excluded so they stay cacheable.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
