import { z } from "zod";

const email = z.string().trim().email("Barua pepe si sahihi");
const password = z
  .string()
  .min(8, "Nywila iwe angalau herufi 8")
  .regex(/[a-zA-Z]/, "Nywila iwe na angalau herufi moja")
  .regex(/[0-9]/, "Nywila iwe na angalau namba moja");

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, "Weka nywila"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const salesLoginSchema = adminLoginSchema;
export type SalesLoginInput = z.infer<typeof salesLoginSchema>;

export const adminSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Jina liwe na angalau herufi 2"),
    email,
    password,
    confirmPassword: z.string(),
    inviteSecret: z.string().min(1, "Weka admin invite code"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Nywila hazifanani",
    path: ["confirmPassword"],
  });
export type AdminSignupInput = z.infer<typeof adminSignupSchema>;

export const salesSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Jina liwe na angalau herufi 2"),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Nywila hazifanani",
    path: ["confirmPassword"],
  });
export type SalesSignupInput = z.infer<typeof salesSignupSchema>;
