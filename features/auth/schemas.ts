import { z } from "zod";

/**
 * Validation schemas shared by the client forms AND the API handlers —
 * identical rules on both sides, drift-proof.
 */

/** Email (staff) or phone (customer) — one identifier field. */
export const identifierSchema = z
  .string()
  .trim()
  .min(3, "Enter your email or phone number")
  .max(320)
  .refine((v) => z.email().safeParse(v).success || /^\+?\d{7,15}$/.test(v), {
    message: "Enter a valid email address or phone number",
  });

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const customerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(160),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{7,15}$/, "Enter a valid phone number (digits, optional '+')"),
  email: z.email("Enter a valid email address").max(320).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(128)
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/\d/, "Include at least one number"),
});

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
