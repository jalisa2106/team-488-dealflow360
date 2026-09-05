"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export function useCurrentUser() {
  return useQuery<UserProfile | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const res = await apiClient<{ user: UserProfile }>("/api/auth/me");
        return res?.user || null;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiClient<{ user: UserProfile; message: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
      router.push("/dashboard");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      return apiClient<{ message: string }>("/api/auth/logout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      router.push("/login");
    },
  });
}
