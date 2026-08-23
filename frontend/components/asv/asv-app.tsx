"use client"

/**
 * ASVApp — Tactical Monochrome & Brutalist Shell.
 * Fits strictly in a 100dvh zero-scroll mobile viewport with high-contrast grid.
 */
import { useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { SplashScreen } from "./splash-screen"
import { ESP32Connect } from "./esp32-connect"
import { LiveDetection } from "./live-detection"
import { WordHistory, type HistoryEntry } from "./word-history"
import { BottomNav } from "./bottom-nav"
import { useWebSerial } from "@/hooks/use-web-serial"
import { useBLE } from "@/hooks/use-ble"

type Screen = "splash" | "connect" | "detection" | "history"
type Transport = "ble" | "usb" | "demo"

export function ASVApp() {
  const [screen, setScreen] = useState<Screen>("splash")
  const [detectionMode, setDetectionMode] = useState<"live" | "replay">("replay")
  const [transport, setTransport] = useState<Transport>("demo")
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // USB Serial persistence
  const liveBuf = useRef<number[]>([])
  const serial = useWebSerial({
    onSample: (mv) => {
      const b = liveBuf.current
      b.push(Math.abs(mv))
      if (b.length > 860 * 6) b.shift()
    },
  })

  // BLE persistence
  const ble = useBLE()

  const handleConnected = (
    mode: "live" | "replay",
    t: Transport,
  ) => {
    setDetectionMode(mode)
    setTransport(t)
    setScreen("detection")
  }

  const handleAddHistory = (entry: HistoryEntry) => {
    setHistory((prev) => [...prev, entry])
  }

  const showNav = screen !== "splash"

  return (
    <div
      className="relative mx-auto h-[100dvh] w-full max-w-md overflow-hidden bg-white border-x-2 border-black shadow-2xl flex flex-col justify-between"
      style={{
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)",
        backgroundSize: "56px 56px"
      }}
    >
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <AnimatePresence mode="wait">
          {screen === "splash" && (
            <Slide key="splash">
              <SplashScreen 
                onComplete={() => setScreen("connect")}
                onNavigate={(s, t) => {
                  if (s === "connect") {
                    setScreen("connect")
                  } else if (s === "detection") {
                    setDetectionMode(t === "usb" ? "live" : "replay")
                    setTransport(t)
                    setScreen("detection")
                  } else if (s === "history") {
                    setScreen("history")
                  }
                }}
              />
            </Slide>
          )}

          {screen === "connect" && (
            <Slide key="connect">
              <ESP32Connect onConnected={handleConnected} />
            </Slide>
          )}

          {screen === "detection" && (
            <Slide key="detection">
              <LiveDetection
                mode={detectionMode}
                transport={transport}
                serial={transport === "usb" ? serial : undefined}
                ble={transport === "ble" ? ble : undefined}
                onNavigateHistory={() => setScreen("history")}
                onAddHistory={handleAddHistory}
                onDisconnect={() => setScreen("connect")}
              />
            </Slide>
          )}

          {screen === "history" && (
            <Slide key="history">
              <WordHistory
                entries={history}
                onBack={() => setScreen("detection")}
                onClear={() => setHistory([])}
              />
            </Slide>
          )}
        </AnimatePresence>
      </div>

      {showNav && (
        <BottomNav
          currentScreen={screen}
          onNavigate={(s) => setScreen(s as Screen)}
        />
      )}
    </div>
  )
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="w-full h-full absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}
