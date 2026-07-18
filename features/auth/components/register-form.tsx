"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api, ApiError } from "@/services/api-client";
import {
  customerRegisterSchema,
  type CustomerRegisterInput,
} from "@/features/auth/schemas";

type RegisterResponse = {
  identity: { displayName: string };
  redirectTo: string;
};

/** Customer self-registration — password strength shown live (additive UX). */
export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CustomerRegisterInput>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "" },
    mode: "onBlur",
  });

  const password = form.watch("password");
  const strength =
    password.length === 0
      ? null
      : [
          password.length >= 8,
          /[a-zA-Z]/.test(password) && /\d/.test(password),
          password.length >= 12 && /[^a-zA-Z\d]/.test(password),
        ].filter(Boolean).length;

  async function onSubmit(values: CustomerRegisterInput) {
    try {
      const query = new URLSearchParams();
      if (next) query.set("next", next);
      const res = await api.post<RegisterResponse>(
        `/auth/register${query.size ? `?${query}` : ""}`,
        values,
      );
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(
        `Welcome, ${res.identity.displayName.split(" ")[0]}! Your account is ready.`,
      );
      router.push(res.redirectTo);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          form.setError("phone", { message: error.message });
        }
        toast.error(error.message);
      } else {
        toast.error("Could not create your account. Please try again.");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground text-sm">
          Order faster, save addresses &amp; earn loyalty points.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Sara Ahmed"
                    autoComplete="name"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1 555 000 1234"
                    autoComplete="tel"
                    inputMode="tel"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Used for sign-in &amp; order updates.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="8+ characters, letters & numbers"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                {strength !== null && (
                  <div className="flex items-center gap-1.5 pt-1" aria-hidden>
                    {[1, 2, 3].map((level) => (
                      <span
                        key={level}
                        className={`h-1 w-10 rounded-full transition-colors duration-300 ${
                          strength >= level
                            ? level === 1
                              ? "bg-warning"
                              : level === 2
                                ? "bg-primary"
                                : "bg-success"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-foreground ml-auto text-xs"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Create account
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
