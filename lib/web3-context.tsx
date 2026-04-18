"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useReadContracts,
} from "wagmi"
import { formatUnits, zeroAddress } from "viem"
import { arcChainIdHex, arcTestnet } from "@/lib/arcChain"
import { erc20Abi } from "@/lib/abis"
import { TOKENS, AVAILABLE_TOKENS, isNativeToken, type Token } from "@/lib/tokens"

export type { Token }
export { TOKENS, AVAILABLE_TOKENS }

/** MetaMask `wallet_addEthereumChain` payload */
export const ARC_NETWORK_PARAMS = {
  chainId: arcChainIdHex(),
  chainName: arcTestnet.name,
  nativeCurrency: {
    name: arcTestnet.nativeCurrency.name,
    symbol: arcTestnet.nativeCurrency.symbol,
    decimals: arcTestnet.nativeCurrency.decimals,
  },
  rpcUrls: [...arcTestnet.rpcUrls.default.http],
  blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
}

interface Web3ContextType {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  isCorrectChain: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchToARC: () => Promise<void>
  getBalance: (token: Token | string) => string
  refetchBalances: () => Promise<unknown>
}

const Web3Context = createContext<Web3ContextType | null>(null)

export function Web3Provider({ children }: { children: ReactNode }) {
  const { address, isConnected, status, chainId } = useAccount()
  const { connectAsync, connectors, isPending: isConnectPending } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()

  const nativeQueryEnabled = Boolean(
    address && chainId === arcTestnet.id,
  )

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: arcTestnet.id,
    query: {
      enabled: nativeQueryEnabled,
    },
  })

  const tokenContracts = useMemo(() => {
    if (!address) return []
    return TOKENS.filter((t) => !isNativeToken(t) && t.address !== zeroAddress).map((t) => ({
      chainId: arcTestnet.id,
      address: t.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address],
    }))
  }, [address])

  const { data: balanceResults, refetch: refetchErc20Balances } = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: Boolean(address && tokenContracts.length > 0),
    },
  })

  const refetchBalances = useCallback(async () => {
    const tasks: Promise<unknown>[] = []
    if (tokenContracts.length > 0) {
      tasks.push(refetchErc20Balances())
    }
    if (nativeQueryEnabled) {
      tasks.push(refetchNativeBalance())
    }
    await Promise.all(tasks)
  }, [
    tokenContracts.length,
    refetchErc20Balances,
    refetchNativeBalance,
    nativeQueryEnabled,
  ])

  const balanceByAddress = useMemo(() => {
    const map: Record<string, string> = {}
    if (!balanceResults || !address) return map
    let i = 0
    for (const t of TOKENS) {
      if (t.address === zeroAddress) continue
      const row = balanceResults[i]
      i += 1
      if (row?.status === "success" && typeof row.result === "bigint") {
        map[t.address.toLowerCase()] = formatUnits(row.result, t.decimals)
      } else {
        map[t.address.toLowerCase()] = "0"
      }
    }
    return map
  }, [balanceResults, address])

  const getBalance = useCallback(
    (tokenOrAddress: Token | string) => {
      const token = typeof tokenOrAddress === "string"
        ? TOKENS.find((item) => item.address.toLowerCase() === tokenOrAddress.toLowerCase())
        : tokenOrAddress

      if (token && isNativeToken(token)) {
        if (!nativeQueryEnabled || !nativeBalance?.value) return "0"
        return formatUnits(nativeBalance.value, arcTestnet.nativeCurrency.decimals)
      }

      const key = typeof tokenOrAddress === "string"
        ? tokenOrAddress.toLowerCase()
        : tokenOrAddress.address.toLowerCase()

      if (key === zeroAddress.toLowerCase()) return "0"
      return balanceByAddress[key] ?? "0"
    },
    [balanceByAddress, nativeBalance, nativeQueryEnabled],
  )

  const isConnecting =
    status === "connecting" || isConnectPending

  const isCorrectChain = chainId === arcTestnet.id

  const switchToARC = useCallback(async () => {
    if (typeof window === "undefined") return
    try {
      await switchChainAsync?.({ chainId: arcTestnet.id })
    } catch {
      const eth = (
        window as unknown as {
          ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
        }
      ).ethereum
      if (!eth?.request) return
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ARC_NETWORK_PARAMS.chainId }],
        })
      } catch (e: unknown) {
        const code = (e as { code?: number })?.code
        if (code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [ARC_NETWORK_PARAMS],
          })
        }
      }
    }
  }, [switchChainAsync])

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return
    const connector =
      connectors.find((c) => c.id === "injected" || c.type === "injected") ??
      connectors[0]
    if (!connector) {
      window.open("https://metamask.io/download/", "_blank")
      return
    }
    try {
      await connectAsync({ connector, chainId: arcTestnet.id })
    } catch {
      try {
        await connectAsync({ connector })
        await switchToARC()
      } catch (err) {
        console.error("connectWallet:", err)
      }
    }
  }, [connectAsync, connectors, switchToARC])

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnectAsync()
    } catch (e) {
      console.error("disconnectWallet:", e)
    }
  }, [disconnectAsync])

  const value = useMemo<Web3ContextType>(
    () => ({
      address: address ?? null,
      isConnected,
      isConnecting,
      chainId: chainId ?? null,
      isCorrectChain,
      connectWallet,
      disconnectWallet,
      switchToARC,
      getBalance,
      refetchBalances,
    }),
    [
      address,
      isConnected,
      isConnecting,
      chainId,
      isCorrectChain,
      connectWallet,
      disconnectWallet,
      switchToARC,
      getBalance,
      refetchBalances,
    ],
  )

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}

export function useWeb3() {
  const ctx = useContext(Web3Context)
  if (!ctx) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return ctx
}
