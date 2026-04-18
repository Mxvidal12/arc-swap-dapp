"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { waitForTransactionReceipt } from "wagmi/actions"
import { formatUnits, parseUnits, UserRejectedRequestError, zeroAddress } from "viem"
import { erc20Abi, simpleSwapVaultAbi } from "@/lib/abis"
import { getSwapContractAddress } from "@/lib/swap-contract"
import type { Token } from "@/lib/tokens"
import { isTokenConfigured } from "@/lib/tokens"
import { wagmiConfig } from "@/lib/wagmi-config"

const ZERO = 0n
const TEN_THOUSAND = 10000n
const MOCK_SWAP_MODE = false

export type SwapFlowState = "idle" | "approving" | "swapping" | "success" | "error"

function formatErrorMessage(err: unknown): string {
  if (err instanceof UserRejectedRequestError) {
    return "Transaction rejected in wallet."
  }
  if (err instanceof Error) return err.message
  return "Something went wrong. Please try again."
}

function slippageBps(slippagePercent: string): number {
  const n = Number.parseFloat(slippagePercent)
  if (!Number.isFinite(n) || n < 0 || n > 50) return 50
  return Math.round(n * 100)
}

export function useSwap(params: {
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  slippagePercent: string
  enabled: boolean
}) {
  const { tokenIn, tokenOut, amountIn, slippagePercent, enabled } = params
  const { address, chainId } = useAccount()
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()

  const swapAddress = getSwapContractAddress()
  const safeSwapAddress = swapAddress ?? zeroAddress

  const amountInWei = useMemo(() => {
    if (!amountIn || !enabled) return ZERO

    try {
      const trimmed = amountIn.trim()
      if (!trimmed || Number.parseFloat(trimmed) <= 0) return ZERO
      return parseUnits(trimmed, tokenIn.decimals)
    } catch {
      return ZERO
    }
  }, [amountIn, enabled, tokenIn.decimals])

  const canRead = Boolean(
    enabled &&
      address &&
      swapAddress &&
      amountInWei > ZERO &&
      isTokenConfigured(tokenIn) &&
      isTokenConfigured(tokenOut) &&
      tokenIn.address !== tokenOut.address &&
      tokenIn.address !== zeroAddress
  )

  const {
    data: allowance = ZERO,
    refetch: refetchAllowance,
    isFetching: isAllowanceLoading,
  } = useReadContract({
    chainId,
    address: tokenIn.address,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && swapAddress
        ? ([address, safeSwapAddress] as const)
        : ([zeroAddress, zeroAddress] as const),
    query: {
      enabled: Boolean(
        !MOCK_SWAP_MODE &&
          address &&
          swapAddress &&
          isTokenConfigured(tokenIn) &&
          tokenIn.address !== zeroAddress
      ),
    },
  })

  const {
    data: realAmountOutWei,
    error: quoteError,
    refetch: refetchQuote,
    isFetching: isQuoteLoading,
  } = useReadContract({
    chainId,
    address: safeSwapAddress,
    abi: simpleSwapVaultAbi,
    functionName: "getAmountOut",
    args: canRead
      ? ([tokenIn.address, tokenOut.address, amountInWei] as const)
      : ([zeroAddress, zeroAddress, ZERO] as const),
    query: {
      enabled: Boolean(!MOCK_SWAP_MODE && swapAddress && canRead),
    },
  })

  const amountOutWei = useMemo(() => {
    if (MOCK_SWAP_MODE) {
      if (!canRead || amountInWei <= ZERO) return ZERO

      try {
        const amountInFloat = Number.parseFloat(amountIn)
        if (!Number.isFinite(amountInFloat) || amountInFloat <= 0) return ZERO
        return parseUnits(amountInFloat.toString(), tokenOut.decimals)
      } catch {
        return ZERO
      }
    }

    return typeof realAmountOutWei === "bigint" ? realAmountOutWei : ZERO
  }, [amountIn, amountInWei, canRead, realAmountOutWei, tokenOut.decimals])

  const needsApproval = useMemo(() => {
    if (!canRead) return false
    if (MOCK_SWAP_MODE) return false
    return Boolean(swapAddress && allowance < amountInWei)
  }, [canRead, allowance, amountInWei, swapAddress])

  const minAmountOut = useMemo(() => {
    if (typeof amountOutWei !== "bigint" || amountOutWei <= ZERO) return ZERO
    const bps = slippageBps(slippagePercent)
    return (amountOutWei * BigInt(10000 - bps)) / TEN_THOUSAND
  }, [amountOutWei, slippagePercent])

  const amountOutFormatted =
    typeof amountOutWei === "bigint" ? formatUnits(amountOutWei, tokenOut.decimals) : ""

  const [flowState, setFlowState] = useState<SwapFlowState>("idle")
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [swapTxHash, setSwapTxHash] = useState<`0x${string}` | undefined>()
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>()

  const invalidateReads = useCallback(async () => {
    await queryClient.invalidateQueries()
  }, [queryClient])

  const sendApprove = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!address || amountInWei <= ZERO) {
      return { ok: false, message: "Wallet or amount not ready." }
    }

    setErrorMessage(undefined)
    setFlowState("approving")
    setApproveTxHash(undefined)

    if (MOCK_SWAP_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      setApproveTxHash(
        "0xmockapprove000000000000000000000000000000000000000000000000000000" as `0x${string}`
      )
      setFlowState("idle")
      return { ok: true }
    }

    try {
      const hash = await writeContractAsync({
        chainId,
        address: tokenIn.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [safeSwapAddress, amountInWei],
      })

      setApproveTxHash(hash)
      await waitForTransactionReceipt(wagmiConfig, { hash })
      await refetchAllowance()
      await invalidateReads()
      setFlowState("idle")

      return { ok: true }
    } catch (e) {
      const message = formatErrorMessage(e)
      setErrorMessage(message)
      setFlowState("error")
      return { ok: false, message }
    }
  }, [
    address,
    amountInWei,
    writeContractAsync,
    chainId,
    tokenIn.address,
    safeSwapAddress,
    refetchAllowance,
    invalidateReads,
  ])

  const sendSwap = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!address || !swapAddress || amountInWei <= ZERO) {
      return { ok: false, message: "Wallet or amount not ready." }
    }

    if (typeof amountOutWei !== "bigint" || amountOutWei <= ZERO) {
      return { ok: false, message: "No valid quote for this swap." }
    }

    setErrorMessage(undefined)
    setFlowState("swapping")
    setSwapTxHash(undefined)

    if (MOCK_SWAP_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSwapTxHash(
        "0xmockswap00000000000000000000000000000000000000000000000000000000" as `0x${string}`
      )
      setFlowState("success")
      return { ok: true }
    }

    try {
      const hash = await writeContractAsync({
        chainId,
        address: safeSwapAddress,
        abi: simpleSwapVaultAbi,
        functionName: "swap",
        args: [tokenIn.address, tokenOut.address, amountInWei],
      })

      setSwapTxHash(hash)
      await waitForTransactionReceipt(wagmiConfig, { hash })
      await invalidateReads()
      await refetchAllowance()
      await refetchQuote()
      setFlowState("success")

      return { ok: true }
    } catch (e) {
      const message = formatErrorMessage(e)
      setErrorMessage(message)
      setFlowState("error")
      return { ok: false, message }
    }
  }, [
    address,
    swapAddress,
    safeSwapAddress,
    amountInWei,
    amountOutWei,
    writeContractAsync,
    chainId,
    tokenIn.address,
    tokenOut.address,
    invalidateReads,
    refetchAllowance,
    refetchQuote,
  ])

  const resetFlow = useCallback(() => {
    setFlowState("idle")
    setErrorMessage(undefined)
    setSwapTxHash(undefined)
    setApproveTxHash(undefined)
  }, [])

  const configError = useMemo(() => {
    if (!swapAddress) return "Swap contract not configured (NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS)."
    if (!isTokenConfigured(tokenIn) || !isTokenConfigured(tokenOut)) {
      return "Token addresses missing in .env (NEXT_PUBLIC_TOKEN_*)."
    }
    if (tokenIn.address === tokenOut.address) {
      return "Choose two different tokens."
    }
    return undefined
  }, [swapAddress, tokenIn, tokenOut])

  return {
    swapAddress,
    amountInWei,
    amountOutWei,
    amountOutFormatted,
    minAmountOut,
    allowance,
    needsApproval,
    isAllowanceLoading: MOCK_SWAP_MODE ? false : isAllowanceLoading,
    isQuoteLoading: MOCK_SWAP_MODE ? false : isQuoteLoading,
    quoteError: MOCK_SWAP_MODE ? undefined : quoteError,
    flowState,
    errorMessage,
    configError,
    swapTxHash,
    approveTxHash,
    sendApprove,
    sendSwap,
    resetFlow,
    refetchQuote,
    refetchAllowance,
    invalidateReads,
  }
}