import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  // useState (not a module-level singleton) so each SSR request / test gets its
  // own client, while the client still only gets created once per mount.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
