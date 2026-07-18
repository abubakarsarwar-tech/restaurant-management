import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "No access" };

/**
 * 403 — reached a permission-gated area without the right permission.
 * Distinct from 401 (middleware handles anonymous users with redirects).
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-10">
          <span className="bg-warning/10 text-warning flex size-14 items-center justify-center rounded-2xl">
            <ShieldAlert className="size-7" />
          </span>
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              This station isn&apos;t yours
            </h1>
            <p className="text-muted-foreground text-sm">
              Your role doesn&apos;t include this area. If you think that&apos;s a
              mistake, ask your restaurant owner to adjust your permissions.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
