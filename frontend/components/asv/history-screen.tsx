"use client"

/**
 * HistoryScreen — everything the app has said today, replayable.
 *
 * Replay matters: in a noisy room the first attempt is often missed, and asking
 * the user to mouth the whole sentence again is the exact friction ASV exists
 * to remove.
 */
import { motion } from "framer-motion"
import { RotateCcw, Trash2 } from "lucide-react"
import type { SpokenEntry } from "@/lib/asv-vocab"

interface HistoryScreenProps {
  entries: SpokenEntry[]
  onReplay: (text: string) => void
  onClear: () => void
}

const SOURCE_LABEL: Record<SpokenEntry["source"], string> = {
  emg: "from the band",
  phrase: "phrasebook",
  sentence: "sentence",
}

export function HistoryScreen({ entries, onReplay, onClear }: HistoryScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between px-5 pb-4 pt-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Said today</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {entries.length === 0
              ? "Nothing spoken yet."
              : `${entries.length} ${entries.length === 1 ? "thing" : "things"} spoken aloud`}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            aria-label="Clear history"
            className="flex w-11 items-center justify-center rounded-full border border-border bg-card"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
        {entries.length === 0 ? (
          <div className="mt-16 flex flex-col items-center px-8 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-3xl">
              💬
            </div>
            <p className="text-base font-semibold">Your words will live here</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every phrase ASV speaks for you is kept for the session, so you can say it
              again without repeating yourself.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...entries].reverse().map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className="card-soft flex items-center gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[1.05rem] font-semibold leading-snug">{e.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {" · "}
                    {SOURCE_LABEL[e.source]}
                    {e.confidence != null && ` · ${Math.round(e.confidence * 100)}%`}
                  </p>
                </div>
                <button
                  onClick={() => onReplay(e.text)}
                  aria-label={`Say "${e.text}" again`}
                  className="flex w-12 shrink-0 items-center justify-center rounded-full voice-gradient text-[#2a1c0c]"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
