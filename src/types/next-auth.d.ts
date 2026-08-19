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
      /**
       * Whether an Admin has let this person into the community
       * (`User.admittedAt` is set). False means Applicant: signed in, waiting at
       * the door, and entitled to nothing but `/pending`.
       */
      isAdmitted: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    isProfileComplete?: boolean;
    phone?: string;
    isActive?: boolean;
    isAdmitted?: boolean;
  }
}
