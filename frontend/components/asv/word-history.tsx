"use client"

/**
 * WordHistory — Tactical Monochrome & Brutalist Session History Log.
 * Static non-scrolling page shell with inner scrollable history list.
 */
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, Trash2, Clock } from "lucide-react"

export interface HistoryEntry {
  word: string
  confidence: number
  timestamp: Date
  ranking: { word: string; prob: number }[]
}

interface WordHistoryProps {
  entries: HistoryEntry[]
  onBack: () => void
  onClear: () => void
}

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function WordHistory({ entries, onBack, onClear }: WordHistoryProps) {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-transparent text-black border-2 border-black">
      {/* Top Header Bar */}
      <div className="relative z-10 flex h-[52px] items-center justify-between border-b-2 border-black px-4 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="border-2 border-black bg-white p-1.5 hover:bg-black hover:text-white transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-hero text-xl font-extrabold italic">ASV</span>
          <span className="font-mono text-[9px] bg-black text-white px-1.5 py-0.5 uppercase tracking-widest font-bold">
            HISTORY LOG
          </span>
        </div>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="border-2 border-black bg-white p-1.5 hover:bg-black hover:text-white transition-colors"
            title="Clear History"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Main Content Body */}
      <div className="relative z-10 flex flex-1 flex-col justify-between p-4 overflow-hidden bg-white/40">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#525252] font-semibold">
            — SESSION RECORD
          </span>
          <h1 className="font-hero text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 mb-1">
            Classification History.
          </h1>
          <p className="font-mono text-[10px] text-[#525252]">
            {entries.length} CLASSIFIED UTTERANCE{entries.length !== 1 ? "S" : ""} RECORDED
          </p>
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center border-2 border-dashed border-black bg-white/95 p-6 text-center my-4">
            <Clock className="h-8 w-8 text-[#525252] mb-2" />
            <p className="font-hero text-lg font-bold">No Detections Yet.</p>
            <p className="font-body text-xs text-[#525252] mt-0.5">
              Captured utterances from live EMG or demo mode will appear in this log.
            </p>
          </div>
        )}

        {/* Entries List — Internal Scroll Container */}
        {entries.length > 0 && (
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 my-3">
            <AnimatePresence>
              {[...entries].reverse().map((entry, idx) => {
                const pct = Math.round(entry.confidence * 100)
                return (
                  <motion.div
                    key={`${entry.word}-${entry.timestamp.getTime()}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-2 border-black bg-white/95 p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center justify-between border-b border-black pb-1.5 mb-1.5">
                      <span className="font-hero text-xl font-extrabold uppercase tracking-tight text-black">
                        {entry.word}
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-black text-white px-1.5 py-0.5">
                        {pct}% CONFIDENCE
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[9px] text-[#525252]">
                      <span>TIMESTAMP: {fmt(entry.timestamp)}</span>
                      <span>VOCAB RANK 1</span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full bg-[#EBEBEB] border border-black p-0.5">
                      <div className="h-full bg-black" style={{ width: `${pct}%` }} />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Back Button */}
        <div className="pt-2 border-t-2 border-black">
          <button onClick={onBack} className="btn-ghost w-full py-2.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-all text-xs">
            RETURN TO DETECTION INTERFACE
          </button>
        </div>
      </div>
    </div>
  )
}
