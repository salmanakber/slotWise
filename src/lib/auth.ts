import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? Role.WORKSPACE_OWNER;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

export function isPlatformRole(role?: Role | string | null) {
  return role === Role.PLATFORM_OWNER || role === Role.PLATFORM_OPS;
}

export function canAccessSiteAdmin(role?: Role | string | null) {
  return (
    role === Role.PLATFORM_OWNER ||
    role === Role.PLATFORM_OPS ||
    role === Role.WORKSPACE_OWNER ||
    role === Role.WORKSPACE_MANAGER ||
    role === Role.STAFF
  );
}
