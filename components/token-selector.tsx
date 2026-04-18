"use client"

import { useState } from "react"
import { AVAILABLE_TOKENS, type Token, useWeb3 } from "@/lib/web3-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, Check } from "lucide-react"
import { motion } from "framer-motion"

interface TokenSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  selectedToken: Token
}

const tokenColors: Record<string, string> = {
  ETH: "#627EEA",
  USDC: "#2775CA",
  WETH: "#627EEA",
  WBTC: "#F7931A",
  DAI: "#F5AC37",
  ARC: "#00D4AA",
}

export function TokenSelector({ isOpen, onClose, onSelect, selectedToken }: TokenSelectorProps) {
  const [search, setSearch] = useState("")
  const { getBalance, isConnected } = useWeb3()

  const filteredTokens = AVAILABLE_TOKENS.filter(
    (token) =>
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.symbol.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-border/50 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Select Token</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or symbol"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        {/* Popular Tokens */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Popular Tokens
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TOKENS.slice(0, 4).map((token) => (
              <button
                key={token.symbol}
                onClick={() => onSelect(token)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                  selectedToken.symbol === token.symbol
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-secondary/50 hover:bg-secondary text-foreground"
                }`}
              >
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: tokenColors[token.symbol] || "#6B7280" }}
                >
                  {token.symbol.charAt(0)}
                </div>
                <span className="text-sm font-medium">{token.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Token List */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto -mx-2 px-2">
          {filteredTokens.map((token, index) => {
            const isSelected = selectedToken.symbol === token.symbol
            const balance = getBalance(token)

            return (
              <motion.button
                key={token.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelect(token)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-secondary/50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: tokenColors[token.symbol] || "#6B7280" }}
                  >
                    {token.symbol.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">{token.symbol}</p>
                    <p className="text-sm text-muted-foreground">{token.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isConnected && (
                    <div className="text-right">
                      <p className="font-mono text-sm text-foreground">{balance}</p>
                    </div>
                  )}
                  {isSelected && <Check className="h-5 w-5 text-primary" />}
                </div>
              </motion.button>
            )
          })}

          {filteredTokens.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No tokens found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
