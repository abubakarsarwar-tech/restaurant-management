"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api, ApiError } from "@/services/api-client";

/**
 * Client session hook (TanStack Query).
 * `/api/auth/me` is the single source of truth; a 401 is DATA ("signed out"),
 * not an exception — components branch on `session === null`.
 */

export type SessionData =
  | {
      type: "user";
      user: {
        id: string;
        fullName: string;
        email: string;
        isPlatformAdmin: boolean;
      };
      restaurantId: string | null;
      restaurant: { id: string; name: string; slug: string } | null;
      roles: string[];
      permissions: string[];
      branchIds: string[];
    }
  | {
      type: "customer";
      customer: {
        id: string;
        fullName: string;
        phone: string;
        email: string | null;
        loyaltyPoints: number;
      };
      restaurantId: string;
      restaurant: { id: string; name: string; slug: string } | null;
    }
  | null;

export function useSession() {
  return useQuery<SessionData>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.get<Exclude<SessionData, null>>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 15_000,
    retry: false,
  });
}

/** Permission shorthand for staff sessions. */
export function useCan(permission: string): boolean {
  const { data } = useSession();
  if (data?.type !== "user") return false;
  if (data.user.isPlatformAdmin) return true;
  return data.permissions.includes(permission);
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      toast.success("Signed out. See you soon!");
      router.push("/login");
      router.refresh();
    },
    onError: () => {
      // Even if the request failed, local state must not trap the user.
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
  });
}
