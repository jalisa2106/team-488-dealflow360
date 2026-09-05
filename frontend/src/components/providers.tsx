"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error: any) => {
              // Never retry 401s or 403s
              if (error?.status === 401 || error?.status === 403) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
            staleTime: 1000 * 30, // 30 seconds
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
