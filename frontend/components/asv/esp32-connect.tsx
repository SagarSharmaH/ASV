"use client"

/**
 * ESP32Connect — Tactical Monochrome & Brutalist Connection Interface.
 * Non-scrolling layout fitting 100% in viewport.
 */
import { motion, AnimatePresence } from "framer-motion"
import { Bluetooth, Usb, Loader2, Check, Play } from "lucide-react"
import { useWebSerial } from "@/hooks/use-web-serial"
import { useBLE } from "@/hooks/use-ble"
import { asvApi, type ModelStatus } from "@/lib/asv-api"
import { useEffect, useRef, useState } from "react"

type ConnectTab = "ble" | "usb"

interface ESP32ConnectProps {
  onConnected: (
    mode: "live" | "replay",
    transport: "ble" | "usb" | "demo",
    serial?: ReturnType<typeof useWebSerial>,
    ble?: ReturnType<typeof useBLE>,
  ) => void
}

export function ESP32Connect({ onConnected }: ESP32ConnectProps) {
  const [tab, setTab] = useState<ConnectTab>("ble")
  const [model, setModel] = useState<ModelStatus | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  // USB serial
  const liveBuf = useRef<number[]>([])
  const serial = useWebSerial({
    onSample: (mv) => {
      const b = liveBuf.current
      b.push(Math.abs(mv))
      if (b.length > 860 * 6) b.shift()
    },
  })

  // BLE
  const ble = useBLE()

  // Check backend
  useEffect(() => {
    const ac = new AbortController()
    ;(async () => {
      try {
        await asvApi.health(ac.signal)
        const ms = await asvApi.modelStatus(ac.signal)
        setModel(ms)
        setBackendOk(ms.loaded)
      } catch {
        setBackendOk(false)
      }
    })()
    return () => ac.abort()
  }, [])

  // Auto-advance USB
  useEffect(() => {
    if (serial.status === "streaming") {
      const t = setTimeout(() => onConnected("live", "usb", serial, undefined), 800)
      return () => clearTimeout(t)
    }
  }, [serial.status, serial, onConnected])

  // Auto-advance BLE
  useEffect(() => {
    if (ble.status === "connected") {
      const t = setTimeout(() => onConnected("replay", "ble", undefined, ble), 800)
      return () => clearTimeout(t)
    }
  }, [ble.status, ble, onConnected])

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-transparent text-black border-2 border-black">
      {/* Top Header Bar */}
      <div className="relative z-10 flex h-[52px] items-center justify-between border-b-2 border-black px-4 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-hero text-xl font-extrabold italic tracking-tight">ASV</span>
          <span className="font-mono text-[9px] bg-black text-white px-1.5 py-0.5 uppercase tracking-widest font-bold">
            CONNECT
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 ${backendOk ? "bg-black animate-liveblink" : "bg-[#525252]"}`} />
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#525252]">
            {backendOk ? "API READY" : "CHECKING API"}
          </span>
        </div>
      </div>

      {/* Main Body Content — Static Non-Scrolling */}
      <div className="relative z-10 flex flex-1 flex-col justify-between px-4 py-3 bg-white/40">
        <div>
          {/* Eyebrow */}
          <div className="mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#525252] font-semibold">
              — HARDWARE INTERFACE
            </span>
          </div>

          <h2 className="font-hero text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            Device Connection.
          </h2>

          {/* Brutalist Tab Selector */}
          <div className="mb-3 grid grid-cols-2 gap-0 border-2 border-black bg-black p-0.5">
            <button
              onClick={() => setTab("ble")}
              className={`flex items-center justify-center gap-1.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                tab === "ble"
                  ? "bg-white text-black"
                  : "bg-black text-white hover:bg-white/10"
              }`}
            >
              <Bluetooth className="h-3.5 w-3.5" />
              BLUETOOTH (BLE)
            </button>
            <button
              onClick={() => setTab("usb")}
              className={`flex items-center justify-center gap-1.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                tab === "usb"
                  ? "bg-white text-black"
                  : "bg-black text-white hover:bg-white/10"
              }`}
            >
              <Usb className="h-3.5 w-3.5" />
              USB SERIAL
            </button>
          </div>

          {/* Interface Cards */}
          <AnimatePresence mode="wait">
            {tab === "ble" ? (
              <motion.div
                key="ble"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="space-y-3"
              >
                <div className="border-2 border-black bg-white/95 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-black">
                        {ble.deviceName ?? "ASV-Device"}
                      </p>
                      <p className="font-mono text-[9px] text-[#525252]">
                        UUID: 6E6B0001
                      </p>
                    </div>
                    <div className="border border-black bg-white px-1.5 py-0.5">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                        {ble.status === "connected" ? "CONNECTED" : "DISCONNECTED"}
                      </span>
                    </div>
                  </div>

                  {ble.status === "connected" && ble.packet ? (
                    <div className="grid grid-cols-2 gap-1.5 border-2 border-black bg-black p-2 text-white font-mono text-[10px] mb-2">
                      <div>
                        <span className="text-white/50 block">RATE</span>
                        <span className="font-bold">{ble.packet.rateHz.toFixed(1)} HZ</span>
                      </div>
                      <div>
                        <span className="text-white/50 block">SAMPLES</span>
                        <span className="font-bold">{ble.packet.sampleCount.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="font-body text-xs text-[#525252] mb-3">
                      Connect via Web Bluetooth to pair with wireless ASV neckband device.
                    </p>
                  )}

                  {ble.status !== "connected" ? (
                    <button
                      onClick={ble.connect}
                      disabled={!ble.supported || ble.status === "connecting"}
                      className="btn-primary w-full py-2.5 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    >
                      {ble.status === "connecting" ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          SEARCHING BLE…
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Bluetooth className="h-3.5 w-3.5" />
                          CONNECT VIA BLUETOOTH
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => onConnected("replay", "ble", undefined, ble)}
                      className="btn-primary w-full py-2.5 text-xs bg-black text-white"
                    >
                      <span className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        PROCEED TO SYSTEM
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="usb"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="space-y-3"
              >
                <div className="border-2 border-black bg-white/95 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-black">
                        ESP32 DIRECT USB
                      </p>
                      <p className="font-mono text-[9px] text-[#525252]">
                        BAUD: 921600 · 860 HZ
                      </p>
                    </div>
                    <div className="border border-black bg-white px-1.5 py-0.5">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                        {serial.status === "streaming" ? "STREAMING" : "IDLE"}
                      </span>
                    </div>
                  </div>

                  <p className="font-body text-xs text-[#525252] mb-3">
                    Delivers continuous 860 Hz single-channel EMG signal for real-time 4.0s classification.
                  </p>

                  {serial.status !== "streaming" ? (
                    <button
                      onClick={serial.connect}
                      disabled={!serial.supported || serial.status === "connecting"}
                      className="btn-primary w-full py-2.5 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    >
                      {serial.status === "connecting" ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          OPENING COM PORT…
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Usb className="h-3.5 w-3.5" />
                          CONNECT VIA USB SERIAL
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => onConnected("live", "usb", serial, undefined)}
                      className="btn-primary w-full py-2.5 text-xs bg-black text-white"
                    >
                      <span className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        PROCEED TO LIVE SYSTEM
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Demo Mode / Standalone Section */}
        <div className="pt-3 border-t-2 border-black">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black">
              DEMO / OFFLINE MODE
            </span>
            <span className="font-mono text-[8px] text-[#525252]">STANDALONE</span>
          </div>

          <button
            onClick={() => onConnected("replay", "demo")}
            className="btn-ghost w-full py-2.5 border-2 border-black bg-white/90 hover:bg-black hover:text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all text-xs"
          >
            <span className="flex items-center justify-center gap-1.5">
              <Play className="h-3.5 w-3.5" />
              RUN DEMO MODE (STORED RECORDINGS)
            </span>
          </button>

          {/* Model Status info pill */}
          <div className="mt-2 border border-black bg-black p-2 text-white font-mono text-[9px]">
            <div className="flex items-center justify-between">
              <span>MODEL STATUS:</span>
              <span className="font-bold text-white">
                {model?.loaded ? `READY (${model.labels.length} LABELS)` : "CHECKING..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
