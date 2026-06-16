import type { DefaultSession, NextAuthConfig } from "next-auth";

// Edge-safe slice of the auth config: no database adapter, no bcrypt, no `pg`.
// `middleware.ts` uses this to read the JWT session at the edge; `auth.ts`
// spreads it and adds the Node-only pieces (adapter + provider authorize logic).

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Providers that need Node APIs are added in auth.ts; the edge instance only
  // verifies the existing session cookie.
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = String(token.id);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
