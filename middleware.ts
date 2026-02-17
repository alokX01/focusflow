import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const AUTH_PREFIX = "/auth";
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/analytics",
  "/history",
];

function shouldDisableCache(pathname: string) {
  return (
    pathname.startsWith(AUTH_PREFIX) ||
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const isAuthenticated = !!token;
    const isAuthPage = pathname.startsWith(AUTH_PREFIX);

    if (pathname === "/" && isAuthenticated) {
      const res = NextResponse.redirect(new URL("/dashboard", req.url));
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
      return res;
    }

    if (isAuthPage && isAuthenticated) {
      const res = NextResponse.redirect(new URL("/dashboard", req.url));
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
      return res;
    }

    const res = NextResponse.next();
    if (shouldDisableCache(pathname)) {
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
    }

    return res;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const isProtected = PROTECTED_PREFIXES.some((prefix) =>
          pathname.startsWith(prefix)
        );
        if (isProtected && !token) return false;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
