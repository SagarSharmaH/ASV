"use client"

/**
 * SpeakScreen — the heart of ASV.
 *
 * A word mouthed silently arrives from the band, lands in the ring as text,
 * and is spoken aloud. Words accumulate into a sentence the user can send as
 * one natural phrase, because "water" and "I would like some water" are very
 * different things to say to a nurse.
 */
import { AnimatePresence, motion } from "framer-motion"
import {
  Bluetooth,
  BluetoothOff,
  Delete,
  Sparkles,
  Volume2,
  Waves,
} from "lucide-react"
import { VOCAB, type VocabWord } from "@/lib/asv-vocab"
import type { useBLE } from "@/hooks/use-ble"
import type { useSpeech } from "@/hooks/use-speech"

interface HeardWord {
  word: VocabWord
  confidence: number
  at: Date
}

interface SpeakScreenProps {
  ble: ReturnType<typeof useBLE>
  speech: ReturnType<typeof useSpeech>
  heard: HeardWord | null
  sentence: VocabWord[]
  onWordRecognised: (token: string, confidence: number) => void
  onSpeakSentence: () => void
  onBackspace: () => void
  onClearSentence: () => void
  onOpenConnect: () => void
}

export function SpeakScreen({
  ble,
  speech,
  heard,
  sentence,
  onWordRecognised,
  onSpeakSentence,
  onBackspace,
  onClearSentence,
  onOpenConnect,
}: SpeakScreenProps) {
  const connected = ble.status === "connected"
  const level = connected ? ble.level : 0
  const sentenceText = sentence.map((w) => w.display).join(" ")

  return (
    <div className="flex h-full flex-col">
      <ConnectionStrip ble={ble} onOpenConnect={onOpenConnect} />

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
        <VoiceRing heard={heard} level={level} speaking={speech.speaking} live={connected} />

        <SignalTrace envelope={ble.envelope} live={connected} />

        {/* Sentence being built */}
        <div className="mt-5 card-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Saying
            </span>
            {sentence.length > 0 && (
              <button
                onClick={onClearSentence}
                className="min-h-0 text-xs font-medium text-muted-foreground underline underline-offset-4"
              >
                Clear
              </button>
            )}
          </div>

          {sentence.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Words you mouth will gather here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {sentence.map((w, i) => (
                  <motion.span
                    key={`${w.token}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="rounded-full bg-secondary px-4 py-2 text-base font-semibold"
                  >
                    {w.glyph} {w.display}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={onSpeakSentence}
              disabled={sentence.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] voice-gradient px-5 py-4 text-base font-bold text-[#2a1c0c] disabled:opacity-35"
            >
              <Volume2 className="h-5 w-5" />
              Say it out loud
            </button>
            <button
              onClick={onBackspace}
              disabled={sentence.length === 0}
              aria-label="Remove last word"
              className="flex w-14 items-center justify-center rounded-[var(--radius-md)] border border-border bg-card disabled:opacity-35"
            >
              <Delete className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {sentenceText && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              &ldquo;{sentenceText}&rdquo;
            </p>
          )}
        </div>

        {/* Manual vocabulary — works with or without the band */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {connected ? "Or tap a word" : "Tap a word to try it"}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {VOCAB.map((w) => (
              <motion.button
                key={w.token}
                whileTap={{ scale: 0.92 }}
                onClick={() => onWordRecognised(w.token, 1)}
                className={`flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border px-1 py-3 ${
                  w.urgent
                    ? "border-destructive/35 bg-destructive/8"
                    : "border-border bg-card"
                }`}
              >
                <span className="text-xl leading-none">{w.glyph}</span>
                <span className="text-[0.7rem] font-semibold leading-none">{w.display}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectionStrip({
  ble,
  onOpenConnect,
}: {
  ble: ReturnType<typeof useBLE>
  onOpenConnect: () => void
}) {
  const connected = ble.status === "connected"
  const contactWarning = connected && !ble.electrodesOk

  return (
    <button
      onClick={onOpenConnect}
      className="mx-5 mb-3 mt-4 flex min-h-0 items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 text-left"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {connected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--link-teal)] opacity-70" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            connected ? "bg-[var(--link-teal)]" : "bg-muted-foreground/50"
          }`}
        />
      </span>

      <span className="flex-1 truncate text-sm font-medium">
        {connected ? ble.deviceName ?? "ASV band" : "Band not connected"}
      </span>

      {contactWarning ? (
        <span className="rounded-full bg-destructive/12 px-2.5 py-1 text-[0.68rem] font-semibold text-destructive">
          Check electrodes
        </span>
      ) : connected ? (
        <span className="text-[0.68rem] font-medium tabular-nums text-muted-foreground">
          {Math.round(ble.packet?.rateHz ?? 0)} Hz
        </span>
      ) : null}

      {connected ? (
        <Bluetooth className="h-4 w-4 shrink-0 text-[var(--link-teal)]" />
      ) : (
        <BluetoothOff className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

function VoiceRing({
  heard,
  level,
  speaking,
  live,
}: {
  heard: HeardWord | null
  level: number
  speaking: boolean
  live: boolean
}) {
  // Muscle activity swells the ring in real time; speaking pins it wide open so
  // the person opposite can see the app is talking for you.
  const swell = speaking ? 1 : 0.35 + level * 0.65

  return (
    <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
      <motion.span
        className="absolute rounded-full voice-gradient opacity-20"
        animate={{ width: `${52 + swell * 48}%`, height: `${52 + swell * 48}%` }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
      />
      <motion.span
        className="absolute rounded-full voice-gradient opacity-30"
        animate={{ width: `${44 + swell * 30}%`, height: `${44 + swell * 30}%` }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
      />
      {speaking && (
        <span className="absolute h-40 w-40 rounded-full border-2 border-[var(--voice-warm)] animate-ripple" />
      )}

      <div className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full bg-card px-4 text-center voice-glow">
        {heard ? (
          <motion.div
            key={`${heard.word.token}-${heard.at.getTime()}`}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col items-center"
          >
            <span className="text-3xl leading-none">{heard.word.glyph}</span>
            <span className="font-display mt-2 text-3xl font-bold leading-none">
              {heard.word.display}
            </span>
            <span className="mt-2 text-[0.7rem] font-medium tabular-nums text-muted-foreground">
              {Math.round(heard.confidence * 100)}% sure
            </span>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center">
            <Waves
              className={`h-9 w-9 text-muted-foreground ${live ? "animate-breathe" : ""}`}
              strokeWidth={1.4}
            />
            <span className="mt-3 px-2 text-sm leading-snug text-muted-foreground">
              {live ? "Listening to your muscles" : "Waiting for the band"}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function SignalTrace({ envelope, live }: { envelope: number[]; live: boolean }) {
  const w = 300
  const h = 44
  const step = w / Math.max(1, envelope.length - 1)
  const points = envelope
    .map((v, i) => `${(i * step).toFixed(1)},${(h - Math.min(1, v) * (h - 4) - 2).toFixed(1)}`)
    .join(" ")

  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-border bg-card px-3 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Muscle activity
        </span>
        <span className="text-[0.65rem] text-muted-foreground">
          {live ? "live" : "no signal"}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={live ? "var(--link-teal)" : "currentColor"}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={live ? "" : "text-muted-foreground/30"}
        />
      </svg>
    </div>
  )
}
