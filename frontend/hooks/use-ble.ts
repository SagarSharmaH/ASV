"use client"

/**
 * useBLE — connect to the ASV ESP32 over Web Bluetooth (BLE).
 *
 * The firmware advertises "ASV-Device" with a custom 128-bit service UUID.
 * It notifies at 20 Hz with a 20-byte status packet (see asv_ble.cpp):
 *
 *   pkt[0]       = 0xA5 (magic byte)
 *   pkt[1]       = flags  (bit0=streaming, bit1=adc_ok, bit2=lead_off_p, bit3=lead_off_n)
 *   pkt[2-3]     = rate_hz × 10 (LE uint16)
 *   pkt[4-7]     = sample_count (LE uint32)
 *   pkt[8-9]     = dropped (LE uint16)
 *   pkt[10-11]   = baseline_counts (LE int16)
 *   pkt[12-13]   = pp_counts (LE uint16)
 *   pkt[14-15]   = last_value (LE int16)
 *
 * Web Bluetooth works in Chrome/Edge on desktop + Android Chrome.
 * It does NOT work in Firefox, Safari, or iOS Chrome.
 */
import { useCallback, useEffect, useRef, useState } from "react"

const SERVICE_UUID       = "6e6b0001-b5a3-f393-e0a9-e50e24dcca9e"
const STATUS_CHAR_UUID   = "6e6b0002-b5a3-f393-e0a9-e50e24dcca9e"
const CMD_CHAR_UUID      = "6e6b0003-b5a3-f393-e0a9-e50e24dcca9e"
const MAGIC              = 0xA5

export type BleStatus = "unsupported" | "idle" | "connecting" | "connected" | "error"

export interface AsvBlePacket {
  streaming:    boolean
  adcOk:        boolean
  leadOffP:     boolean
  leadOffN:     boolean
  rateHz:       number   // rate_hz from firmware
  sampleCount:  number
  dropped:      number
  baselineCounts: number
  ppCounts:     number
  lastValue:    number
}

type AnyBT = any // eslint-disable-line @typescript-eslint/no-explicit-any

export function useBLE() {
  const [supported, setSupported] = useState(false)
  const [status, setStatus]       = useState<BleStatus>("idle")
  const [error, setError]         = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [packet, setPacket]       = useState<AsvBlePacket | null>(null)

  const deviceRef  = useRef<AnyBT>(null)
  const serverRef  = useRef<AnyBT>(null)
  const cmdCharRef = useRef<AnyBT>(null)

  useEffect(() => {
    const ok = typeof navigator !== "undefined" && "bluetooth" in navigator
    setSupported(ok)
    if (!ok) setStatus("unsupported")
  }, [])

  const parsePacket = useCallback((buf: DataView): AsvBlePacket | null => {
    if (buf.byteLength < 16) return null
    if (buf.getUint8(0) !== MAGIC) return null
    const flags      = buf.getUint8(1)
    const rate10     = buf.getUint16(2, true)
    const sampleCnt  = buf.getUint32(4, true)
    const dropped    = buf.getUint16(8, true)
    const baseline   = buf.getInt16(10, true)
    const pp         = buf.getUint16(12, true)
    const lastVal    = buf.getInt16(14, true)
    return {
      streaming:      !!(flags & 0x01),
      adcOk:          !!(flags & 0x02),
      leadOffP:       !!(flags & 0x04),
      leadOffN:       !!(flags & 0x08),
      rateHz:         rate10 / 10,
      sampleCount:    sampleCnt,
      dropped,
      baselineCounts: baseline,
      ppCounts:       pp,
      lastValue:      lastVal,
    }
  }, [])

  const connect = useCallback(async () => {
    if (!supported) return
    setError(null)
    setStatus("connecting")
    try {
      const bt = (navigator as AnyBT).bluetooth
      const device: AnyBT = await bt.requestDevice({
        filters: [
          { name: "ASV-Device" },
          { services: [SERVICE_UUID] },
        ],
        optionalServices: [SERVICE_UUID],
      })
      deviceRef.current = device
      setDeviceName(device.name ?? "ASV-Device")

      device.addEventListener("gattserverdisconnected", () => {
        setStatus("idle")
        setPacket(null)
        setDeviceName(null)
      })

      const server: AnyBT = await device.gatt.connect()
      serverRef.current = server

      const service = await server.getPrimaryService(SERVICE_UUID)

      // Subscribe to status notifications
      const statusChar = await service.getCharacteristic(STATUS_CHAR_UUID)
      await statusChar.startNotifications()
      statusChar.addEventListener("characteristicvaluechanged", (ev: AnyBT) => {
        const dv: DataView = ev.target.value
        const pkt = parsePacket(dv)
        if (pkt) setPacket(pkt)
      })

      // Hold cmd characteristic for sending commands
      try {
        cmdCharRef.current = await service.getCharacteristic(CMD_CHAR_UUID)
      } catch {
        cmdCharRef.current = null
      }

      setStatus("connected")
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "NotFoundError") {
        // User cancelled the picker — not an error
        setStatus("idle")
      } else {
        setError(e instanceof Error ? e.message : String(e))
        setStatus("error")
      }
    }
  }, [supported, parsePacket])

  const disconnect = useCallback(async () => {
    try {
      await deviceRef.current?.gatt?.disconnect()
    } catch { /* ignore */ }
    deviceRef.current = serverRef.current = cmdCharRef.current = null
    setStatus(supported ? "idle" : "unsupported")
    setPacket(null)
    setDeviceName(null)
  }, [supported])

  /** Send a single-byte command to the firmware (e.g. 's'=start, 'x'=stop). */
  const sendCmd = useCallback(async (cmd: string) => {
    if (!cmdCharRef.current) return
    await cmdCharRef.current.writeValueWithoutResponse(new TextEncoder().encode(cmd))
  }, [])

  useEffect(() => () => void disconnect(), []) // cleanup on unmount

  return { supported, status, error, deviceName, packet, connect, disconnect, sendCmd }
}
