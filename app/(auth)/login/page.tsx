import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** searchParams is a Promise in Next 15 — typed & awaited at the edge. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>;
}) {
  const { next, as } = await searchParams;
  return <LoginForm next={next} as={as === "staff" ? "staff" : "customer"} />;
}
