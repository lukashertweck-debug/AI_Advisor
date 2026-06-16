import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge middleware: gate every page behind a session. Unauthenticated visitors
// are redirected to /login. API routes enforce auth themselves (returning 401),
// and the auth + login/register routes are excluded below.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};
