import type { Address } from "viem"
import { zeroAddress } from "viem"

export function getSwapContractAddress(): Address | undefined {
  const raw = process.env.NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS?.trim()
  if (!raw) return undefined
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return undefined
  if (raw.toLowerCase() === zeroAddress.toLowerCase()) return undefined
  return raw as Address
}
