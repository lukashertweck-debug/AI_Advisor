import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { pool } from "@/lib/pg";
import { db } from "@/lib/db";

// Full (Node runtime) auth config used by route handlers and server components.

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const user = await db.getUserForLogin(email);
      if (!user || !user.password) return null;

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return null;

      return { id: String(user.id), email: user.email, name: user.name ?? undefined };
    },
  }),
];

// Only offer Google when it's actually configured, so the app builds/runs
// without OAuth credentials.
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
  providers,
  events: {
    // Seed starter data when a brand-new (OAuth) user is created.
    async createUser({ user }) {
      if (user.id) await db.seedForUser(user.id);
    },
  },
});
