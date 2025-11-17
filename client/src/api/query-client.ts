import { QueryClient, DefaultOptions } from "@tanstack/react-query";

const queryConfig: DefaultOptions = {
  queries: {
    // Data is considered fresh for 30 seconds
    staleTime: 1000 * 30,
    // Cache data for 5 minutes
    gcTime: 1000 * 60 * 5,
    // Retry failed requests 1 time
    retry: 1,
    // Refetch on window focus for real-time data
    refetchOnWindowFocus: true,
    // Refetch on reconnect
    refetchOnReconnect: true,
  },
  mutations: {
    // Retry failed mutations 0 times (don't retry by default)
    retry: 0,
  },
};

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// Error handler for React Query errors
export function handleQueryError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}
