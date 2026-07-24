import type { DefaultSession } from "next-auth";

type Role = "ADMIN" | "SALES_STAFF";
type UserStatus = "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED";

declare module "next-auth" {
  interface User {
    role: Role;
    status: UserStatus;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: UserStatus;
  }
}
