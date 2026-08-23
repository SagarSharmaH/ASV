"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Terminal } from "lucide-react"

interface SplashScreenProps {
  onComplete: () => void
  onNavigate: (screen: "connect" | "detection" | "history", transport?: "ble" | "usb" | "demo") => void
}

export function SplashScreen({ onComplete, onNavigate }: SplashScreenProps) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  // Tactical Initialising Progress sequence on opening
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          setTimeout(() => setLoading(false), 200)
          return 100
        }
        return prev + 10
      })
    }, 20)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-transparent text-black">
      {/* Dedicated Tactical 3D Viewport Loading Screen Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080a0d] text-white p-6"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.82) 100%)",
              }}
            />
            <div className="dark-grid" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-xs space-y-5">
              <h1 className="font-hero text-6xl font-extrabold italic tracking-tight text-white/85">
                ASV
              </h1>

              <div className="w-[240px] h-[1px] bg-white/20 relative overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="space-y-1">
                <p className="font-mono text-[9px] uppercase tracking-[4px] text-white/80 font-bold">
                  INITIALISING
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[3px] text-white/45">
                  INA128 · ESP32-S3 · ADS1299 · PCB
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <div className="relative z-10 flex h-[48px] items-center justify-between border-b-2 border-black px-4 bg-white/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-black animate-liveblink" />
          <span className="font-hero text-xl font-extrabold italic tracking-tight">ASV</span>
        </div>
        <div className="flex items-center gap-1.5 border border-black bg-white px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Terminal className="h-3 w-3" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black">
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Main Hero Content Body — Compact Non-Scrolling Fit */}
      <div className="relative z-10 flex flex-1 flex-col justify-between px-4 py-3 overflow-hidden">
        <div className="space-y-2 flex-shrink-0">
          {/* Eyebrow Tag */}
          <div>
            <span className="tag-badge">
              — SILENT SPEECH RECOGNITION
            </span>
          </div>

          {/* Hero Title SPEC */}
          <div>
            <h1 className="font-hero text-5xl font-black text-black leading-[0.92] tracking-[-0.04em]">
              <span className="block font-extrabold text-black">A Silent</span>
              <span className="block font-extrabold italic text-black mt-0.5">Voice.</span>
            </h1>
          </div>

          {/* Hero Subtitle */}
          <p className="font-body text-xs sm:text-sm leading-snug text-[#525252] max-w-sm">
            Transforming non-audible neuromuscular EMG signals from the vocal tract into instant text classification.
          </p>
        </div>

        {/* 2x2 Black Stat-Style Grid Layout for 4 Features (Quick Navigation) */}
        <div className="border-2 border-black bg-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] my-3 flex-grow flex flex-col justify-center max-h-[220px]">
          <div className="grid grid-cols-2 divide-x divide-y divide-white/10 text-white h-full">
            {/* Box 1: CONNECT */}
            <div
              onClick={() => onNavigate("connect")}
              className="p-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[9px] text-white/55">[ 01 ]</span>
                <span className="h-1.5 w-1.5 bg-white animate-liveblink" />
              </div>
              <div>
                <p className="font-hero text-2xl font-extrabold text-white">CONNECT</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-white/50 mt-0.5">BLE & USB HARDWARE</p>
              </div>
            </div>

            {/* Box 2: DETECT */}
            <div
              onClick={() => onNavigate("detection", "usb")}
              className="p-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[9px] text-white/55">[ 02 ]</span>
              </div>
              <div>
                <p className="font-hero text-2xl font-extrabold text-white">DETECT</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-white/50 mt-0.5">860 HZ REAL-TIME</p>
              </div>
            </div>

            {/* Box 3: REPLAY */}
            <div
              onClick={() => onNavigate("detection", "demo")}
              className="p-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[9px] text-white/55">[ 03 ]</span>
              </div>
              <div>
                <p className="font-hero text-2xl font-extrabold text-white">REPLAY</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-white/50 mt-0.5">DEMO STORED CSV</p>
              </div>
            </div>

            {/* Box 4: LOGS */}
            <div
              onClick={() => onNavigate("history")}
              className="p-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[9px] text-white/55">[ 04 ]</span>
              </div>
              <div>
                <p className="font-hero text-2xl font-extrabold text-white">LOGS</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-white/50 mt-0.5">SESSION HISTORY</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enter System Primary Button */}
        <div className="mt-1 flex-shrink-0">
          <button
            onClick={onComplete}
            className="btn-primary w-full py-3 text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <span className="flex items-center justify-center gap-2">
              ENTER SYSTEM INTERFACE
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="relative z-10 flex h-[44px] items-center justify-between border-t-2 border-black bg-[#F5F5F5] px-4 flex-shrink-0">
        <span className="font-hero text-xl font-extrabold italic tracking-tight text-black">
          ASV
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#525252]">
          VER 2.0 · HARDWARE REFINED
        </span>
      </div>
    </div>
  )
}
