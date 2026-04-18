import { defineChain } from "viem"

/** Arc Testnet — see https://docs.arc.network/arc/references/connect-to-arc */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "ARC Testnet",
  /** Saldo nativo lido com `useBalance` / `eth_getBalance`. Na Arc oficial o gas pode ser USDC — ajuste aqui se quiser alinhar à doc (ex.: USDC, 6). */
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
})

export const ARC_EXPLORER_BASE = arcTestnet.blockExplorers.default.url

export function arcTxUrl(hash: string): string {
  return `${ARC_EXPLORER_BASE}/tx/${hash}`
}

export function arcAddressUrl(address: string): string {
  return `${ARC_EXPLORER_BASE}/address/${address}`
}

/** `wallet_addEthereumChain` / `wallet_switchEthereumChain` expect 0x-prefixed hex chainId */
export function arcChainIdHex(): `0x${string}` {
  return `0x${arcTestnet.id.toString(16)}` as `0x${string}`
}
