"use client"

/**
 * ASVApp — application shell.
 *
 * Owns the three things every screen needs: the BLE link to the band, the
 * speech engine that makes words audible, and the sentence currently being
 * built. Screens below are presentational.
 */
import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Clock, Mic, Settings } from "lucide-react"
import { ConnectScreen } from "./connect-screen"
import { SpeakScreen } from "./speak-screen"
import { PhrasebookScreen } from "./phrasebook-screen"
import { HistoryScreen } from "./history-screen"
import { SettingsScreen } from "./settings-screen"
import { useBLE, type AsvWordEvent } from "@/hooks/use-ble"
import { useSpeech } from "@/hooks/use-speech"
import { resolveWord, type SpokenEntry, type VocabWord } from "@/lib/asv-vocab"

type Screen = "connect" | "speak" | "phrases" | "history" | "settings"

interface HeardWord {
  word: VocabWord
  confidence: number
  at: Date
}

const TABS = [
  { id: "speak", label: "Speak", Icon: Mic },
  { id: "phrases", label: "Phrases", Icon: BookOpen },
  { id: "history", label: "History", Icon: Clock },
  { id: "settings", label: "Voice", Icon: Settings },
] as const

export function ASVApp() {
  const [screen, setScreen] = useState<Screen>("connect")
  const [heard, setHeard] = useState<HeardWord | null>(null)
  const [sentence, setSentence] = useState<VocabWord[]>([])
  const [history, setHistory] = useState<SpokenEntry[]>([])
  const [largeText, setLargeText] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const speech = useSpeech()

  const record = useCallback(
    (text: string, source: SpokenEntry["source"], confidence?: number) => {
      setHistory((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, text, at: new Date(), source, confidence },
      ])
    },
    [],
  )

  const say = useCallback(
    (text: string, source: SpokenEntry["source"], confidence?: number) => {
      speech.speak(text)
      record(text, source, confidence)
    },
    [speech, record],
  )

  /** A word arrived — from the band, or from a tap on the vocabulary grid. */
  const handleWord = useCallback(
    (token: string, confidence: number) => {
      const word = resolveWord(token)
      setHeard({ word, confidence, at: new Date() })
      setSentence((prev) => [...prev, word])
      if (speech.settings.autoSpeak) say(word.spoken, "emg", confidence)
    },
    [speech.settings.autoSpeak, say],
  )

  const handleBleWord = useCallback(
    (e: AsvWordEvent) => handleWord(e.word, e.confidence),
    [handleWord],
  )

  const ble = useBLE(handleBleWord)


  const speakSentence = useCallback(() => {
    if (sentence.length === 0) return
    // Join the natural phrasings, not the display labels: "I need help" reads as
    // a sentence, "Help" reads as a button.
    const text = sentence.map((w) => w.spoken).join(", ")
    say(text, "sentence")
    setSentence([])
  }, [sentence, say])

  // Accessibility preferences drive real document state, so every screen and
  // any portal-rendered UI picks them up.
  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", largeText ? "1.15" : "1")
  }, [largeText])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
  }, [darkMode])

  const showNav = screen !== "connect"

  return (
    <div
      onPointerDownCapture={speech.prime}
      className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background"
    >
      <div className="relative flex-1 overflow-hidden">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0"
        >
          {screen === "connect" && (
            <ConnectScreen
              ble={ble}
              onSkip={() => setScreen("speak")}
              onConnected={() => setScreen("speak")}
            />
          )}

          {screen === "speak" && (
            <SpeakScreen
              ble={ble}
              speech={speech}
              heard={heard}
              sentence={sentence}
              onWordRecognised={handleWord}
              onSpeakSentence={speakSentence}
              onBackspace={() => setSentence((p) => p.slice(0, -1))}
              onClearSentence={() => setSentence([])}
              onOpenConnect={() => setScreen("connect")}
            />
          )}

          {screen === "phrases" && (
            <PhrasebookScreen
              onSpeak={(text) => say(text, "phrase")}
              speakingText={speech.spokenText}
              isSpeaking={speech.speaking}
            />
          )}

          {screen === "history" && (
            <HistoryScreen
              entries={history}
              onReplay={(text) => speech.speak(text)}
              onClear={() => setHistory([])}
            />
          )}

          {screen === "settings" && (
            <SettingsScreen
              speech={speech}
              ble={ble}
              largeText={largeText}
              onLargeTextChange={setLargeText}
              darkMode={darkMode}
              onDarkModeChange={setDarkMode}
            />
          )}
        </motion.div>
      </div>

      {/* Speaking indicator — visible from across a table, so the listener knows
          the app is talking and waits instead of speaking over it. */}
      {speech.speaking && (
        <motion.div
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`pointer-events-none absolute inset-x-5 z-20 ${showNav ? "bottom-24" : "bottom-6"}`}
        >
          <div className="flex items-center gap-3 rounded-full voice-gradient px-5 py-3 voice-glow">
            <span className="flex items-end gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-[#2a1c0c]"
                  animate={{ height: [6, 16, 6] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </span>
            <span className="truncate text-sm font-bold text-[#2a1c0c]">
              {speech.spokenText}
            </span>
          </div>
        </motion.div>
      )}

      {showNav && (
        <nav className="flex shrink-0 items-stretch border-t border-border bg-card px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {TABS.map(({ id, label, Icon }) => {
            const on = id === screen
            return (
              <button
                key={id}
                onClick={() => setScreen(id)}
                className="flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] py-2"
              >
                <Icon
                  className={`h-5 w-5 ${on ? "text-[var(--voice-deep)]" : "text-muted-foreground"}`}
                  strokeWidth={on ? 2.4 : 1.8}
                />
                <span
                  className={`text-[0.68rem] font-semibold ${
                    on ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
