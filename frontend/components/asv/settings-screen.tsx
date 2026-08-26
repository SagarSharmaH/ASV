"use client"

/**
 * SettingsScreen — choosing the voice that will speak for you.
 *
 * This is not a preferences page in the usual sense. For someone who uses ASV
 * daily, the voice picked here is the voice other people will associate with
 * them, so it gets a preview button and top billing.
 */
import { Bluetooth, Check, Volume2 } from "lucide-react"
import type { useSpeech } from "@/hooks/use-speech"
import type { useBLE } from "@/hooks/use-ble"

interface SettingsScreenProps {
  speech: ReturnType<typeof useSpeech>
  ble: ReturnType<typeof useBLE>
  largeText: boolean
  onLargeTextChange: (v: boolean) => void
  darkMode: boolean
  onDarkModeChange: (v: boolean) => void
}

const PREVIEW = "Hello, I am using ASV to speak with you."

export function SettingsScreen({
  speech,
  ble,
  largeText,
  onLargeTextChange,
  darkMode,
  onDarkModeChange,
}: SettingsScreenProps) {
  // Long voice lists (some desktops ship 100+) are unusable on a phone; English
  // voices are what this vocabulary is written for.
  const voices = speech.voices.filter((v) => v.lang.toLowerCase().startsWith("en"))
  const listed = voices.length > 0 ? voices : speech.voices

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-4 pt-6">
        <h1 className="font-display text-3xl font-bold">Your voice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How ASV sounds when it speaks for you.
        </p>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto no-scrollbar px-5 pb-4">
        {!speech.supported && (
          <p className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 p-4 text-sm leading-relaxed text-muted-foreground">
            This browser has no speech synthesis, so nothing can be spoken aloud. Chrome,
            Edge and Safari all support it.
          </p>
        )}

        <section className="card-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Voice
            </span>
            <button
              onClick={() => speech.speak(PREVIEW)}
              className="flex min-h-0 items-center gap-1.5 rounded-full voice-gradient px-3 py-1.5 text-xs font-bold text-[#2a1c0c]"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>

          <div className="max-h-56 space-y-1.5 overflow-y-auto no-scrollbar">
            {listed.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Loading voices…
              </p>
            ) : (
              listed.map((v) => {
                const on = v.voiceURI === speech.settings.voiceURI
                return (
                  <button
                    key={v.voiceURI}
                    onClick={() => speech.update({ voiceURI: v.voiceURI })}
                    className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left ${
                      on ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{v.name}</span>
                      <span className="block text-xs text-muted-foreground">{v.lang}</span>
                    </span>
                    {on && <Check className="h-4 w-4 shrink-0 text-[var(--voice-deep)]" />}
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="card-soft space-y-5 p-4">
          <Slider
            label="Speed"
            value={speech.settings.rate}
            min={0.5}
            max={1.6}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(rate) => speech.update({ rate })}
          />
          <Slider
            label="Pitch"
            value={speech.settings.pitch}
            min={0.5}
            max={1.8}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(pitch) => speech.update({ pitch })}
          />
          <Slider
            label="Volume"
            value={speech.settings.volume}
            min={0.1}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(volume) => speech.update({ volume })}
          />
        </section>

        <section className="card-soft divide-y divide-border">
          <Toggle
            label="Speak words as they arrive"
            hint="Each recognised word is spoken immediately, not only when you send the sentence."
            value={speech.settings.autoSpeak}
            onChange={(autoSpeak) => speech.update({ autoSpeak })}
          />
          <Toggle
            label="Larger text"
            hint="Scales the whole app up for easier reading at a distance."
            value={largeText}
            onChange={onLargeTextChange}
          />
          <Toggle
            label="Dark theme"
            hint="Easier on the eyes in a hospital room at night."
            value={darkMode}
            onChange={onDarkModeChange}
          />
        </section>

        <section className="card-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Band
          </span>
          <div className="mt-3 flex items-center gap-3">
            <Bluetooth
              className={`h-5 w-5 ${
                ble.status === "connected" ? "text-[var(--link-teal)]" : "text-muted-foreground"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {ble.status === "connected" ? ble.deviceName ?? "ASV band" : "Not connected"}
              </p>
              {ble.packet && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {ble.packet.rateHz.toFixed(0)} Hz · {ble.packet.sampleCount.toLocaleString()}{" "}
                  samples · {ble.packet.dropped} dropped
                </p>
              )}
            </div>
            {ble.status === "connected" && (
              <button
                onClick={ble.disconnect}
                className="min-h-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                Disconnect
              </button>
            )}
          </div>
          {ble.status === "connected" && !ble.hasWordChannel && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This band reports signal quality but is not sending recognised words yet — the
              model has not been trained. Tap words on the Speak screen in the meantime.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--voice-deep)]"
      />
    </label>
  )
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-4 p-4 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          value ? "voice-gradient" : "bg-secondary"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-all ${
            value ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  )
}
