"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, ExternalLink, ArrowRight, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Token } from "@/lib/web3-context"
import { arcTxUrl } from "@/lib/arcChain"

export type TxModalStatus = "idle" | "approving" | "swapping" | "success" | "error"

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  status: TxModalStatus
  txHash?: string
  error?: string
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  amountOut: string
}

const tokenColors: Record<string, string> = {
  ETH: "#627EEA",
  USDC: "#2775CA",
  WETH: "#627EEA",
  WBTC: "#F7931A",
  DAI: "#F5AC37",
  ARC: "#00D4AA",
}

export function TransactionModal({
  isOpen,
  onClose,
  status,
  txHash,
  error,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
}: TransactionModalProps) {
  const explorerUrl = txHash ? arcTxUrl(txHash) : "#"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm border-border/50 bg-card/95 backdrop-blur-xl p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {(status === "approving" || status === "swapping") && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-10 px-6 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-6"
              >
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 h-20 w-20 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                  <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {status === "approving" ? "Approving token" : "Processing swap"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {status === "approving"
                  ? `Confirm the approval in your wallet. Gas is paid in the chain native token (ETH) — keep a small ETH buffer for fees.`
                  : "Please wait while your swap is confirmed on-chain..."}
              </p>

              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B0F1A] border border-border/30 w-full justify-center">
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: tokenColors[tokenIn.symbol] }}
                  >
                    {tokenIn.symbol.charAt(0)}
                  </div>
                  <span className="font-mono text-sm">
                    {amountIn} {tokenIn.symbol}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: tokenColors[tokenOut.symbol] }}
                  >
                    {tokenOut.symbol.charAt(0)}
                  </div>
                  <span className="font-mono text-sm">
                    {amountOut} {tokenOut.symbol}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-success/10 via-transparent to-transparent pointer-events-none" />

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 50, x: Math.random() * 100 - 50 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: -100,
                      x: Math.random() * 200 - 100,
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.2,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    className="absolute top-1/2 left-1/2"
                  >
                    <Sparkles className="h-4 w-4 text-success/60" />
                  </motion.div>
                ))}
              </div>

              <div className="py-10 px-6 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mb-6"
                >
                  <motion.div
                    className="h-24 w-24 rounded-full bg-success/20 flex items-center justify-center relative"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(34, 197, 94, 0.4)",
                        "0 0 0 20px rgba(34, 197, 94, 0)",
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                    >
                      <CheckCircle2 className="h-12 w-12 text-success" />
                    </motion.div>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-2xl font-bold text-foreground mb-2">Swap Successful!</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your transaction has been confirmed on ARC Testnet.
                  </p>
                </motion.div>

                <motion.div
                  className="w-full space-y-3 mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0B0F1A] border border-border/30">
                    <span className="text-sm text-muted-foreground">You sent</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: tokenColors[tokenIn.symbol] }}
                      >
                        {tokenIn.symbol.charAt(0)}
                      </div>
                      <span className="font-mono text-sm text-foreground font-medium">
                        {amountIn} {tokenIn.symbol}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0B0F1A] border border-success/30">
                    <span className="text-sm text-muted-foreground">You received</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: tokenColors[tokenOut.symbol] }}
                      >
                        {tokenOut.symbol.charAt(0)}
                      </div>
                      <span className="font-mono text-sm text-success font-medium">
                        +{amountOut} {tokenOut.symbol}
                      </span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-full space-y-3"
                >
                  {txHash && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors py-2 px-4 rounded-lg bg-primary/10 hover:bg-primary/20 w-full"
                    >
                      View on ArcScan
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  <Button onClick={onClose} className="w-full h-12 text-base font-semibold">
                    Done
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-10 px-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mb-6"
              >
                <div className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-destructive" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Transaction Failed</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {error || "Something went wrong. Please try again."}
              </p>

              <div className="flex gap-3 w-full">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onClose} className="flex-1">
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
