"use client"

/**
 * useBLE — connect to the ASV ESP32 over Web Bluetooth.
 *
 * The firmware advertises "ASV-Device" with a custom 128-bit service and two
 * notify/write characteristics:
 *
 *   STATUS (notify, 20 Hz) — asv_ble.cpp::asvBleNotify
 *     [0]      0xA5 magic
 *     [1]      flags: bit0 streaming, bit1 adc_ok, bit2 lead_off_p, bit3 lead_off_n
 *     [2-3]    rate_hz x 10          (LE uint16)
 *     [4-7]    sample_count          (LE uint32)
 *     [8-9]    dropped               (LE uint16)
 *     [10-11]  baseline_counts       (LE int16)
 *     [12-13]  pp_counts             (LE uint16)  <- envelope we plot
 *     [14-15]  last_value            (LE int16)
 *
 *   WORD (notify, on recognition) — asv_ble.cpp::asvBleNotifyWord
 *     [0]      0xC3 magic
 *     [1]      confidence 0-100
 *     [2]      text length n (<= 16)
 *     [3..]    ASCII word
 *
 *   CMD (write) — single serial-menu letters ('s' start, 'x' stop, ...)
 *
 * Web Bluetooth requires Chrome/Edge on desktop or Android, over HTTPS or
 * localhost. Firefox, Safari and iOS have no support at all.
 */
import { useCallback, useEffect, useRef, useState } from "react"

const SERVICE_UUID     = "6e6b0001-b5a3-f393-e0a9-e50e24dcca9e"
const STATUS_CHAR_UUID = "6e6b0002-b5a3-f393-e0a9-e50e24dcca9e"
const CMD_CHAR_UUID    = "6e6b0003-b5a3-f393-e0a9-e50e24dcca9e"
const WORD_CHAR_UUID   = "6e6b0004-b5a3-f393-e0a9-e50e24dcca9e"

const STATUS_MAGIC = 0xa5
const WORD_MAGIC   = 0xc3

/** ~6 s of history at the firmware's 20 Hz status cadence. */
export const ENVELOPE_POINTS = 120

export type BleStatus = "unsupported" | "idle" | "connecting" | "connected" | "error"

export interface AsvBlePacket {
  streaming: boolean
  adcOk: boolean
  leadOffP: boolean
  leadOffN: boolean
  rateHz: number
  sampleCount: number
  dropped: number
  baselineCounts: number
  ppCounts: number
  lastValue: number
}

export interface AsvWordEvent {
  word: string
  confidence: number
  at: Date
}

type AnyBT = any // eslint-disable-line @typescript-eslint/no-explicit-any

export function useBLE(onWord?: (w: AsvWordEvent) => void) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<BleStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [packet, setPacket] = useState<AsvBlePacket | null>(null)
  const [envelope, setEnvelope] = useState<number[]>(() => Array(ENVELOPE_POINTS).fill(0))
  const [hasWordChannel, setHasWordChannel] = useState(false)

  const deviceRef = useRef<AnyBT>(null)
  const cmdCharRef = useRef<AnyBT>(null)
  const onWordRef = useRef(onWord)
  onWordRef.current = onWord
  // Adaptive full-scale for the plot. EMG amplitude varies hugely between
  // electrode placements, so a fixed axis is either flat or clipped.
  const peakRef = useRef(1)

  useEffect(() => {
    const ok = typeof navigator !== "undefined" && "bluetooth" in navigator
    setSupported(ok)
    setStatus(ok ? "idle" : "unsupported")
  }, [])

  const handleStatus = useCallback((dv: DataView) => {
    if (dv.byteLength < 16 || dv.getUint8(0) !== STATUS_MAGIC) return
    const flags = dv.getUint8(1)
    const pp = dv.getUint16(12, true)
    setPacket({
      streaming: !!(flags & 0x01),
      adcOk: !!(flags & 0x02),
      leadOffP: !!(flags & 0x04),
      leadOffN: !!(flags & 0x08),
      rateHz: dv.getUint16(2, true) / 10,
      sampleCount: dv.getUint32(4, true),
      dropped: dv.getUint16(8, true),
      baselineCounts: dv.getInt16(10, true),
      ppCounts: pp,
      lastValue: dv.getInt16(14, true),
    })
    peakRef.current = Math.max(pp, peakRef.current * 0.995, 1)
    setEnvelope((prev) => [...prev.slice(1), pp / peakRef.current])
  }, [])

  const handleWord = useCallback((dv: DataView) => {
    if (dv.byteLength < 3 || dv.getUint8(0) !== WORD_MAGIC) return
    const conf = dv.getUint8(1) / 100
    const len = Math.min(dv.getUint8(2), dv.byteLength - 3)
    if (len <= 0) return
    let word = ""
    for (let i = 0; i < len; i++) word += String.fromCharCode(dv.getUint8(3 + i))
    onWordRef.current?.({ word: word.trim(), confidence: conf, at: new Date() })
  }, [])

  const connect = useCallback(async () => {
    if (!supported) return
    setError(null)
    setStatus("connecting")
    try {
      const device: AnyBT = await (navigator as AnyBT).bluetooth.requestDevice({
        filters: [{ name: "ASV-Device" }, { services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      })
      deviceRef.current = device
      setDeviceName(device.name ?? "ASV-Device")

      device.addEventListener("gattserverdisconnected", () => {
        setStatus("idle")
        setPacket(null)
        setDeviceName(null)
        setHasWordChannel(false)
      })

      const server: AnyBT = await device.gatt.connect()
      const service = await server.getPrimaryService(SERVICE_UUID)

      const statusChar = await service.getCharacteristic(STATUS_CHAR_UUID)
      await statusChar.startNotifications()
      statusChar.addEventListener("characteristicvaluechanged", (ev: AnyBT) =>
        handleStatus(ev.target.value),
      )

      // Word and command channels are optional: older firmware still connects.
      try {
        const wordChar = await service.getCharacteristic(WORD_CHAR_UUID)
        await wordChar.startNotifications()
        wordChar.addEventListener("characteristicvaluechanged", (ev: AnyBT) =>
          handleWord(ev.target.value),
        )
        setHasWordChannel(true)
      } catch {
        setHasWordChannel(false)
      }

      try {
        cmdCharRef.current = await service.getCharacteristic(CMD_CHAR_UUID)
      } catch {
        cmdCharRef.current = null
      }

      setStatus("connected")
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "NotFoundError") {
        setStatus("idle") // user dismissed the chooser
      } else {
        setError(e instanceof Error ? e.message : String(e))
        setStatus("error")
      }
    }
  }, [supported, handleStatus, handleWord])

  const disconnect = useCallback(() => {
    try {
      deviceRef.current?.gatt?.disconnect()
    } catch {
      /* already gone */
    }
    deviceRef.current = null
    cmdCharRef.current = null
    setStatus(supported ? "idle" : "unsupported")
    setPacket(null)
    setDeviceName(null)
    setHasWordChannel(false)
  }, [supported])

  /** Send one firmware command letter, e.g. 's' to start streaming. */
  const sendCmd = useCallback(async (cmd: string) => {
    if (!cmdCharRef.current) return
    await cmdCharRef.current.writeValueWithoutResponse(new TextEncoder().encode(cmd))
  }, [])

  useEffect(() => () => disconnect(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const level = packet ? Math.min(1, packet.ppCounts / peakRef.current) : 0
  const electrodesOk = packet ? !packet.leadOffP && !packet.leadOffN : false

  return {
    supported,
    status,
    error,
    deviceName,
    packet,
    envelope,
    level,
    electrodesOk,
    hasWordChannel,
    connect,
    disconnect,
    sendCmd,
  }
}
