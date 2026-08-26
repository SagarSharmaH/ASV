"use client"

/**
 * ConnectScreen — pairing with the ASV headset over Web Bluetooth.
 *
 * Deliberately does not block the rest of the app: someone who cannot speak
 * still needs the phrasebook when the hardware is charging, out of range, or
 * simply not worn today. "Continue without the headset" is a first-class path,
 * not a fallback.
 */
import { motion } from "framer-motion"
import { Bluetooth, ChevronRight, ShieldAlert, Zap } from "lucide-react"
import type { useBLE } from "@/hooks/use-ble"

interface ConnectScreenProps {
  ble: ReturnType<typeof useBLE>
  onSkip: () => void
  onConnected: () => void
}

export function ConnectScreen({ ble, onSkip, onConnected }: ConnectScreenProps) {
  const connecting = ble.status === "connecting"
  const connected = ble.status === "connected"

  return (
    <div className="flex h-full w-full flex-col px-6 pb-6 pt-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* Beacon */}
        <div className="relative mb-10 flex h-40 w-40 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[var(--link-teal)]/25 animate-ripple" />
          <span
            className="absolute inset-0 rounded-full bg-[var(--link-teal)]/20 animate-ripple"
            style={{ animationDelay: "1.3s" }}
          />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-card link-glow">
            <Bluetooth className="h-11 w-11 text-[var(--link-teal)]" strokeWidth={1.6} />
          </div>
        </div>

        <h1 className="font-display text-4xl font-bold leading-tight">
          Let&apos;s find{" "}
          <span className="voice-text">your voice</span>
        </h1>
        <p className="mt-4 max-w-xs text-[0.95rem] leading-relaxed text-muted-foreground">
          Put on the ASV band and pair it. The sensors read the muscles you move when you
          mouth a word — nothing needs to be heard.
        </p>

        {!ble.supported && (
          <div className="mt-8 flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 p-4 text-left">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              This browser can&apos;t use Bluetooth. Open ASV in{" "}
              <strong className="text-foreground">Chrome or Edge</strong> on Android or a
              computer. Everything below still works without it.
            </p>
          </div>
        )}

        {ble.error && (
          <p className="mt-6 text-sm text-destructive">{ble.error}</p>
        )}
      </div>

      <div className="space-y-3">
        <motion.button
          whileTap={{ scale: 0.975 }}
          onClick={connected ? onConnected : ble.connect}
          disabled={!ble.supported || connecting}
          className="flex w-full items-center justify-center gap-3 rounded-[var(--radius)] voice-gradient px-6 py-5 text-lg font-semibold text-[#2a1c0c] voice-glow disabled:opacity-40"
        >
          {connecting ? (
            <>
              <Zap className="h-5 w-5 animate-pulse" />
              Searching for the band…
            </>
          ) : connected ? (
            <>
              Start speaking
              <ChevronRight className="h-5 w-5" />
            </>
          ) : (
            <>
              <Bluetooth className="h-5 w-5" />
              Pair the ASV band
            </>
          )}
        </motion.button>

        <button
          onClick={onSkip}
          className="w-full rounded-[var(--radius)] border border-border bg-card px-6 py-4 text-base font-medium text-muted-foreground"
        >
          Continue without the band
        </button>

        <p className="px-2 pt-1 text-center text-xs leading-relaxed text-muted-foreground/80">
          The phrasebook works offline and speaks out loud on its own.
        </p>
      </div>
    </div>
  )
}
