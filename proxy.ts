import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// This Next.js fork deprecates middleware.ts in favor of a proxy.ts
// convention at the repo root (see AGENTS.md) — construct.shaoor-ai.com
// already used this; Pets is migrating to match as part of the
// auth/subscription architecture unification.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
