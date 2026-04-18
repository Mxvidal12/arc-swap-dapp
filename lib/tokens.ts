import type { Address } from "viem"
import { zeroAddress } from "viem"

export const NATIVE_TOKEN_ADDRESS = zeroAddress

export type Token = {
  symbol: string
  name: string
  address: Address
  decimals: number
  logo: string
  isNative?: boolean
}

function normalizeTokenAddress(raw?: string): Address {
  const value = raw?.trim()
  if (value && /^0x[a-fA-F0-9]{40}$/.test(value) && value.toLowerCase() !== zeroAddress.toLowerCase()) {
    return value as Address
  }
  return zeroAddress
}

const TOKEN_ENV = {
  USDC: normalizeTokenAddress(process.env.NEXT_PUBLIC_TOKEN_USDC),
  EURC: normalizeTokenAddress(process.env.NEXT_PUBLIC_TOKEN_EURC),
  WBTC: normalizeTokenAddress(process.env.NEXT_PUBLIC_TOKEN_WBTC),
  DAI: normalizeTokenAddress(process.env.NEXT_PUBLIC_TOKEN_DAI),
  ARC: normalizeTokenAddress(process.env.NEXT_PUBLIC_TOKEN_ARC),
}

export const TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    address: TOKEN_ENV.USDC,
    decimals: 6,
    logo: "/tokens/usdc.svg",
  },
  {
    symbol: "EURC",
    name: "Euro Coin",
    address: TOKEN_ENV.EURC,
    decimals: 6,
    logo: "/tokens/eurc.svg",
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    address: TOKEN_ENV.WBTC,
    decimals: 8,
    logo: "/tokens/wbtc.svg",
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: TOKEN_ENV.DAI,
    decimals: 18,
    logo: "/tokens/dai.svg",
  },
  {
    symbol: "ARC",
    name: "ARC Token",
    address: TOKEN_ENV.ARC,
    decimals: 18,
    logo: "/tokens/arc.svg",
  },
]

export function isNativeToken(token: Token | Address | string | undefined | null): boolean {
  if (!token) return false
  if (typeof token === "string") {
    return token.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
  }
  return Boolean(token.isNative) && token.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
}

export function isTokenConfigured(token: Token): boolean {
  return isNativeToken(token) || token.address.toLowerCase() !== zeroAddress.toLowerCase()
}

export const AVAILABLE_TOKENS = TOKENS.filter(isTokenConfigured)

export function getDefaultSwapTokens(): { tokenIn: Token; tokenOut: Token } {
  const usdc = AVAILABLE_TOKENS.find((t) => t.symbol === "USDC")
  const eurc = AVAILABLE_TOKENS.find((t) => t.symbol === "EURC")

  const tokenIn = usdc ?? AVAILABLE_TOKENS[0] ?? TOKENS[0]
  const tokenOut = eurc ?? AVAILABLE_TOKENS.find((t) => t.symbol !== tokenIn.symbol) ?? tokenIn

  return { tokenIn, tokenOut }
}
