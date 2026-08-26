"use client"

/**
 * PhrasebookScreen — tap to speak, no hardware required.
 *
 * Urgent phrases sit first and stay first. When someone is in pain, they should
 * not have to scroll.
 */
import { useState } from "react"
import { motion } from "framer-motion"
import { Volume2 } from "lucide-react"
import { PHRASEBOOK } from "@/lib/asv-vocab"

interface PhrasebookScreenProps {
  onSpeak: (text: string) => void
  speakingText: string | null
  isSpeaking: boolean
}

const TONE_STYLES: Record<string, { chip: string; tile: string }> = {
  urgent: {
    chip: "bg-destructive text-destructive-foreground",
    tile: "border-destructive/35 bg-destructive/8",
  },
  need: {
    chip: "voice-gradient text-[#2a1c0c]",
    tile: "border-[var(--voice-warm)]/35 bg-[var(--voice-warm)]/8",
  },
  social: {
    chip: "bg-[var(--link-teal)] text-white",
    tile: "border-[var(--link-teal)]/35 bg-[var(--link-teal)]/8",
  },
  reply: {
    chip: "bg-foreground text-background",
    tile: "border-border bg-card",
  },
}

export function PhrasebookScreen({ onSpeak, speakingText, isSpeaking }: PhrasebookScreenProps) {
  const [activeId, setActiveId] = useState(PHRASEBOOK[0].id)
  const active = PHRASEBOOK.find((c) => c.id === activeId) ?? PHRASEBOOK[0]
  const tone = TONE_STYLES[active.tone]

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-display text-3xl font-bold">Phrasebook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap once — it speaks out loud for you.
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-4">
        {PHRASEBOOK.map((cat) => {
          const on = cat.id === active.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                on ? TONE_STYLES[cat.tone].chip : "border border-border bg-card text-muted-foreground"
              }`}
            >
              <span>{cat.glyph}</span>
              {cat.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {active.phrases.map((p) => {
            const nowSpeaking = isSpeaking && speakingText === p.text
            return (
              <motion.button
                key={p.text}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSpeak(p.text)}
                className={`flex min-h-[7.5rem] flex-col items-start justify-between rounded-[var(--radius-md)] border p-4 text-left ${tone.tile} ${
                  nowSpeaking ? "voice-glow" : ""
                }`}
              >
                <span className="text-2xl leading-none">{p.glyph}</span>
                <span className="mt-3 text-[0.95rem] font-semibold leading-snug">{p.text}</span>
                {nowSpeaking && (
                  <span className="mt-2 flex items-center gap-1 text-[0.68rem] font-medium text-muted-foreground">
                    <Volume2 className="h-3 w-3" /> speaking
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
