import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasAdminRole } from "@/lib/admin/roles";

/**
 * Guards /admin/*: refreshes the Supabase session cookies and redirects to
 * /admin/login without an admin session. This is the optimistic check; every
 * Server Action and data read re-verifies the role (src/lib/admin/auth.ts).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isLogin = request.nextUrl.pathname === "/admin/login";
  if (!url || !anonKey) {
    return isLogin ? NextResponse.next() : redirectTo(request, "/admin/login");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Validates the JWT (and refreshes it when expired, writing new cookies).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isAdmin = hasAdminRole(claims?.app_metadata);

  if (isLogin) {
    return isAdmin ? withCookies(redirectTo(request, "/admin"), response) : response;
  }
  if (!isAdmin) {
    const login = redirectTo(request, "/admin/login", claims ? { error: "sin-permiso" } : undefined);
    return withCookies(login, response);
  }
  return response;
}

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  for (const [k, v] of Object.entries(params ?? {})) target.searchParams.set(k, v);
  return NextResponse.redirect(target);
}

/** Keeps refreshed session cookies when answering with a redirect. */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
