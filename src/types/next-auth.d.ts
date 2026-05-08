import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isProfileComplete: boolean;
      phone?: string;
      isActive: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    isProfileComplete?: boolean;
    phone?: string;
    isActive?: boolean;
  }
}
