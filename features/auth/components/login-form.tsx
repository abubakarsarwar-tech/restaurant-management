"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api, ApiError } from "@/services/api-client";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";

type LoginResponse = {
  identity: { kind: "staff" | "customer"; displayName: string };
  restaurantId: string | null;
  redirectTo: string;
};

/**
 * Unified sign-in — email (staff) or phone (customer) in one field.
 * `as=staff` tunes copy for the backoffice; `next` overrides the redirect.
 */
export function LoginForm({ next, as }: { next?: string; as?: "staff" | "customer" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    try {
      const query = new URLSearchParams();
      if (next) query.set("next", next);
      const res = await api.post<LoginResponse>(
        `/auth/login${query.size ? `?${query}` : ""}`,
        values,
      );

      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(`Welcome back, ${res.identity.displayName.split(" ")[0]}!`);
      router.push(res.redirectTo);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Could not sign you in. Please try again.");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {as === "staff" ? "Staff sign in" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {as === "staff"
            ? "Sign in with your work email to open the dashboard."
            : "Sign in to track orders, save favorites and checkout faster."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or phone</FormLabel>
                <FormControl>
                  <div className="relative">
                    <UserRound className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                    <Input
                      className="pl-10"
                      placeholder={
                        as === "staff" ? "you@restaurant.com" : "+1 555 000 1234"
                      }
                      autoComplete="username"
                      autoFocus
                      {...field}
                    />
                  </div>
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
                  <div className="relative">
                    <LockKeyhole className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                    <Input
                      className="px-10"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
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
            Sign in
          </Button>
        </form>
      </Form>

      {as !== "staff" && (
        <p className="text-muted-foreground text-center text-sm">
          New here?{" "}
          <Link
            href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      )}
    </div>
  );
}
