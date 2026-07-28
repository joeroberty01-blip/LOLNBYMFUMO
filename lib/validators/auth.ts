import { z } from "zod";

const email = z.string().trim().email("Invalid email");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const salesLoginSchema = adminLoginSchema;
export type SalesLoginInput = z.infer<typeof salesLoginSchema>;

export const adminSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email,
    password,
    confirmPassword: z.string(),
    inviteSecret: z.string().min(1, "Enter the admin invite code"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type AdminSignupInput = z.infer<typeof adminSignupSchema>;

export const salesSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SalesSignupInput = z.infer<typeof salesSignupSchema>;

/** Used by an already-logged-in admin to create another Admin or Sales Staff account directly
 * from the dashboard — no invite code needed (the admin session itself is the authorization),
 * and the account is active immediately rather than going through the public-signup pending
 * flow, since an admin is directly vouching for it. */
export const adminCreateUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email,
    password,
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "SALES_STAFF"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
