import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { type UserRole } from "../../../generated/prisma";
import { db } from "~/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      role: UserRole;
      mustChangePassword: boolean;
      structureId: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    username?: string;
    role?: UserRole;
    mustChangePassword?: boolean;
    structureId?: string | null;
  }
}

const credentialsSchema = z.object({
  username: z.string(),
  password: z.string().min(1),
});

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const username = parsed.data.username?.toLowerCase()?.trim();

        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: username },
              { username: username },
            ],
          },
        });
        if (!user?.password) return null;
        if (user.deletedAt) return null;

        const isHashed = user.password.startsWith("$2");
        const valid = isHashed
          ? await bcrypt.compare(parsed.data.password, user.password)
          : parsed.data.password === user.password;
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          structureId: user.structureId,
        };
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user, trigger, session: sessionUpdate }) {
      const t = token as typeof token & {
        id?: string;
        username?: string;
        role?: UserRole;
        mustChangePassword?: boolean;
        structureId?: string | null;
      };
      if (user) {
        t.id = user.id;
        t.username = user.username;
        t.role = user.role;
        t.mustChangePassword = user.mustChangePassword;
        t.structureId = user.structureId;
      }
      if (trigger === "update" && sessionUpdate) {
        const upd = sessionUpdate as { mustChangePassword?: boolean };
        if (typeof upd.mustChangePassword === "boolean") {
          t.mustChangePassword = upd.mustChangePassword;
        }
      }
      return t;
    },
    session({ session, token }) {
      const t = token as typeof token & {
        id?: string;
        username?: string;
        role?: UserRole;
        mustChangePassword?: boolean;
        structureId?: string | null;
      };
      session.user.id = t.id ?? "";
      session.user.username = t.username ?? "";
      session.user.role = t.role ?? "STUDENTE";
      session.user.mustChangePassword = t.mustChangePassword ?? false;
      session.user.structureId = t.structureId ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/auth/tipo",
  },
} satisfies NextAuthConfig;
