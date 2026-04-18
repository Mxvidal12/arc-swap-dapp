"use client"

import { Web3Providers } from "@/components/web3-providers"
import { Navbar } from "@/components/navbar"
import { SwapCard } from "@/components/swap-card"
import { motion } from "framer-motion"

export default function Home() {
  return (
    <Web3Providers>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Gradient orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-12">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 max-w-2xl mx-auto"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
              Swap tokens on{" "}
              <span className="text-primary">ARC Network</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg text-pretty">
              Trade tokens with predictable dollar-based fees, instant settlement, and native USDC integration.
            </p>
          </motion.div>

          {/* Stats Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-10"
          >
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono">$0.001</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Avg. Fee</p>
            </div>
            <div className="h-8 w-px bg-border/50 hidden sm:block" />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono">{"<"}1s</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Finality</p>
            </div>
            <div className="h-8 w-px bg-border/50 hidden sm:block" />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-primary font-mono">ETH</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Native balance</p>
            </div>
          </motion.div>

          {/* Swap Card */}
          <SwapCard />

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>ARC Testnet</span>
            </div>
            <a
              href="https://docs.arc.network"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </a>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Get Testnet USDC
            </a>
          </motion.div>
        </main>
      </div>
    </Web3Providers>
  )
}
