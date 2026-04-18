"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { wagmiConfig } from "@/lib/wagmi-config"
import { Web3Provider } from "@/lib/web3-context"

export function Web3Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 12_000,
            refetchOnWindowFocus: true,
          },
        },
      }),
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Web3Provider>{children}</Web3Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
