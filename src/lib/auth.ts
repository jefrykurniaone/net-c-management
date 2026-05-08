import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch full user record for role and profile status
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            isProfileComplete: true,
            phone: true,
            isActive: true,
          },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.isProfileComplete = dbUser.isProfileComplete;
          session.user.phone = dbUser.phone ?? undefined;
          session.user.isActive = dbUser.isActive;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});

export { Role };
