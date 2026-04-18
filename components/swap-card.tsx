"use client"

import { useState, useCallback, useMemo } from "react"
import { useWeb3, AVAILABLE_TOKENS, type Token } from "@/lib/web3-context"
import { useSwap } from "@/hooks/useSwap"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowDownUp, Settings, Info, Loader2, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { TokenSelector } from "@/components/token-selector"
import { TransactionModal, type TxModalStatus } from "@/components/transaction-modal"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const ZERO_WEI = BigInt(0)

export function SwapCard() {
  const {
    isConnected,
    connectWallet,
    getBalance,
    isCorrectChain,
    switchToARC,
    refetchBalances,
  } = useWeb3()

  const [tokenIn, setTokenIn] = useState<Token>(
    () => AVAILABLE_TOKENS.find((t) => t.symbol === "USDC") ?? AVAILABLE_TOKENS[0]!,
  )
  const [tokenOut, setTokenOut] = useState<Token>(
    () => AVAILABLE_TOKENS.find((t) => t.symbol === "WETH") ?? AVAILABLE_TOKENS.find((t) => t.symbol !== (AVAILABLE_TOKENS.find((x) => x.symbol === "USDC") ?? AVAILABLE_TOKENS[0]!).symbol) ?? AVAILABLE_TOKENS[0]!,
  )
  const [amountIn, setAmountIn] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false)
  const [selectingFor, setSelectingFor] = useState<"in" | "out">("in")
  const [showTxModal, setShowTxModal] = useState(false)
  const [modalStatus, setModalStatus] = useState<TxModalStatus>("idle")
  const [modalError, setModalError] = useState<string | undefined>()

  const swapEnabled = Boolean(isConnected && isCorrectChain)

  const {
    amountOutFormatted,
    needsApproval,
    isAllowanceLoading,
    isQuoteLoading,
    quoteError,
    configError,
    swapTxHash,
    errorMessage: swapHookError,
    sendApprove,
    sendSwap,
    resetFlow,
    amountInWei,
  } = useSwap({
    tokenIn,
    tokenOut,
    amountIn,
    slippagePercent: slippage,
    enabled: swapEnabled,
  })

  const amountOutDisplay = useMemo(() => {
    if (!amountIn || !amountInWei || amountInWei === ZERO_WEI) return ""
    if (isQuoteLoading) return "…"
    if (quoteError) return "—"
    return amountOutFormatted || ""
  }, [amountIn, amountInWei, isQuoteLoading, quoteError, amountOutFormatted])

  const handleSwapTokens = useCallback(() => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn("")
  }, [tokenIn, tokenOut])

  const handleSelectToken = (token: Token) => {
    if (selectingFor === "in") {
      if (token.symbol === tokenOut.symbol) {
        handleSwapTokens()
      } else {
        setTokenIn(token)
      }
    } else {
      if (token.symbol === tokenIn.symbol) {
        handleSwapTokens()
      } else {
        setTokenOut(token)
      }
    }
    setIsTokenSelectorOpen(false)
  }

  const openTokenSelector = (type: "in" | "out") => {
    setSelectingFor(type)
    setIsTokenSelectorOpen(true)
  }

  const handleSetMax = () => {
    const balance = getBalance(tokenIn)
    setAmountIn(balance)
  }

  const closeModal = useCallback(() => {
    setShowTxModal(false)
    setModalStatus("idle")
    setModalError(undefined)
    resetFlow()
    void refetchBalances()
  }, [resetFlow, refetchBalances])

  const handlePrimary = async () => {
    setModalError(undefined)
    if (!isConnected) {
      await connectWallet()
      return
    }
    if (!isCorrectChain) {
      await switchToARC()
      return
    }
    if (configError) {
      setModalError(configError)
      setModalStatus("error")
      setShowTxModal(true)
      return
    }
    if (!amountIn || amountInWei === ZERO_WEI) return

    if (needsApproval) {
      setShowTxModal(true)
      setModalStatus("approving")
      const ar = await sendApprove()
      await refetchBalances()
      if (ar.ok) {
        setShowTxModal(false)
        setModalStatus("idle")
        resetFlow()
      } else {
        setModalStatus("error")
        setModalError(ar.message)
      }
      return
    }

    setShowTxModal(true)
    setModalStatus("swapping")
    const sr = await sendSwap()
    await refetchBalances()
    if (sr.ok) {
      setModalStatus("success")
    } else {
      setModalStatus("error")
      setModalError(sr.message)
    }
  }

  const balanceIn = getBalance(tokenIn)
  const balanceOut = getBalance(tokenOut)
  const hasInsufficientBalance =
    isConnected &&
    isCorrectChain &&
    amountIn &&
    Number.parseFloat(amountIn) > Number.parseFloat(balanceIn || "0")

  const getExchangeRate = () => {
    const ain = Number.parseFloat(amountIn)
    const aout = Number.parseFloat(amountOutDisplay)
    if (!Number.isFinite(ain) || !Number.isFinite(aout) || ain <= 0 || aout <= 0) {
      return "—"
    }
    const rate = aout / ain
    const decimals = rate < 0.001 ? 8 : 6
    return `1 ${tokenIn.symbol} = ${rate.toFixed(decimals)} ${tokenOut.symbol}`
  }

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet"
    if (!isCorrectChain) return "Switch to ARC Testnet"
    if (configError) return "Configuration required"
    if (!amountIn || amountInWei === ZERO_WEI) return "Enter an amount"
    if (hasInsufficientBalance) return "Insufficient balance"
    if (isQuoteLoading || isAllowanceLoading) return "Loading quote…"
    if (quoteError) return "No quote for this pair"
    if (needsApproval) return `Approve ${tokenIn.symbol}`
    return "Swap"
  }

  const isButtonBusy = modalStatus === "approving" || modalStatus === "swapping"

  const isPrimaryDisabled = (() => {
    if (isButtonBusy) return true
    if (!isConnected) return false
    if (!isCorrectChain) return false
    if (configError) return false
    if (!amountIn || amountInWei === ZERO_WEI) return true
    if (hasInsufficientBalance) return true
    if (needsApproval) return isAllowanceLoading
    return isQuoteLoading || Boolean(quoteError) || !amountOutFormatted
  })()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="w-full max-w-[480px] overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="text-lg font-semibold text-foreground">Swap</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Transaction Settings</h3>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Slippage Tolerance</label>
                    <div className="flex gap-2">
                      {["0.1", "0.5", "1.0"].map((value) => (
                        <Button
                          key={value}
                          variant={slippage === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSlippage(value)}
                          className="flex-1"
                        >
                          {value}%
                        </Button>
                      ))}
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={slippage}
                          onChange={(e) => setSlippage(e.target.value)}
                          className="w-full h-8 px-2 pr-6 text-sm rounded-md border border-input bg-background text-right"
                          placeholder="0.5"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {configError && (
            <div className="px-4 pt-3 text-xs text-amber-500/90 leading-relaxed">{configError}</div>
          )}

          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">From</span>
              {isConnected && isCorrectChain && (
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Balance: <span className="text-foreground">{balanceIn}</span>
                  <span className="ml-1 text-primary text-xs font-medium">MAX</span>
                </button>
              )}
            </div>
            <div className="flex items-center justify-between bg-[#0B0F1A] rounded-xl px-4 py-3 w-full">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-white text-xl font-medium outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => openTokenSelector("in")}
                className="flex items-center gap-2 bg-[#111827] hover:bg-[#1a2236] px-3 py-1.5 rounded-lg shrink-0 transition-colors"
              >
                <TokenIcon symbol={tokenIn.symbol} />
                <span className="text-white text-sm font-medium">{tokenIn.symbol}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="relative h-0">
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSwapTokens}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-lg hover:bg-secondary transition-colors"
              >
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>

          <div className="p-4 pt-2 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">To</span>
              {isConnected && isCorrectChain && (
                <span className="text-muted-foreground">
                  Balance: <span className="text-foreground">{balanceOut}</span>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between bg-[#0B0F1A] rounded-xl px-4 py-3 w-full">
              <input
                type="text"
                value={amountOutDisplay}
                readOnly
                placeholder="0.00"
                className="bg-transparent text-white text-xl font-medium outline-none w-full"
              />
              <button
                type="button"
                onClick={() => openTokenSelector("out")}
                className="flex items-center gap-2 bg-[#111827] hover:bg-[#1a2236] px-3 py-1.5 rounded-lg shrink-0 transition-colors"
              >
                <TokenIcon symbol={tokenOut.symbol} />
                <span className="text-white text-sm font-medium">{tokenOut.symbol}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {amountIn && amountOutDisplay && amountOutDisplay !== "—" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4"
            >
              <div className="rounded-xl bg-secondary/30 border border-border/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="text-foreground font-mono">{getExchangeRate()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                        Slippage
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          The maximum price variation tolerance allowed for your transaction.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-foreground">{slippage}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                        Network fee
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Transaction fees are paid in the chain native token (ETH). Keep extra ETH for gas, especially
                          when approving and swapping in sequence.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-foreground">Paid in ETH</span>
                </div>
                {quoteError && (
                  <p className="text-xs text-destructive/90 pt-1">
                    {(quoteError as Error)?.message ?? "Could not fetch on-chain quote."}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          <div className="p-4 pt-0">
            <Button
              onClick={() => void handlePrimary()}
              disabled={isPrimaryDisabled}
              className={`w-full h-14 text-base font-semibold transition-all duration-300 ${
                hasInsufficientBalance
                  ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              }`}
            >
              {isButtonBusy ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {modalStatus === "approving" ? "Approving…" : "Swapping…"}
                </span>
              ) : (
                getButtonText()
              )}
            </Button>
          </div>
        </Card>
      </motion.div>

      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        onSelect={handleSelectToken}
        selectedToken={selectingFor === "in" ? tokenIn : tokenOut}
      />

      <TransactionModal
        isOpen={showTxModal}
        onClose={closeModal}
        status={modalStatus}
        txHash={swapTxHash}
        error={modalError ?? swapHookError}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        amountIn={amountIn}
        amountOut={amountOutDisplay === "…" || amountOutDisplay === "—" ? "" : amountOutDisplay}
      />
    </>
  )
}

function TokenIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    ETH: "#627EEA",
    USDC: "#2775CA",
    WETH: "#627EEA",
    WBTC: "#F7931A",
    DAI: "#F5AC37",
    ARC: "#00D4AA",
  }

  return (
    <div
      className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold"
      style={{ backgroundColor: colors[symbol] || "#6B7280" }}
    >
      {symbol.charAt(0)}
    </div>
  )
}
