import { createConfig, http, injected } from "wagmi"
import { arcTestnet } from "@/lib/arcChain"

const arcRpc =
  process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || "https://rpc.testnet.arc.network"

/**
 * Config mínima sem `cookieStorage`/`ssr: true`: evita erros na pré-renderização do App Router
 * e problemas de hidratação quando `document` não existe no servidor.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcRpc),
  },
})
