import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: {
            assignedProperties: { select: { buildingId: true } },
            manager: {
              include: { assignedProperties: { select: { buildingId: true } } },
            },
          },
        });

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // Roles that inherit their manager's buildings
        const INHERITS_MANAGER = ["APM", "LEASING_SPECIALIST", "ACCOUNTING"];
        let properties = user.assignedProperties.map((p) => p.buildingId);

        if (INHERITS_MANAGER.includes(user.role) && user.manager) {
          properties = user.manager.assignedProperties.map((p) => p.buildingId);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedProperties: properties,
          organizationId: user.organizationId || "org_default",
          managerId: user.managerId || null,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.assignedProperties = user.assignedProperties || [];
        token.organizationId = user.organizationId || "org_default";
        token.managerId = user.managerId || null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.assignedProperties = token.assignedProperties;
      session.user.organizationId = token.organizationId || "org_default";
      session.user.managerId = token.managerId || null;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
