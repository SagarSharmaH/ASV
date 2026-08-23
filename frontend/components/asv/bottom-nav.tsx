"use client"

import { Activity, Usb, History, Home } from "lucide-react"

interface BottomNavProps {
  currentScreen: string
  onNavigate: (screen: string) => void
}

const navItems = [
  { id: "splash", code: "00", label: "HERO", icon: Home },
  { id: "connect", code: "01", label: "CONNECT", icon: Usb },
  { id: "detection", code: "02", label: "DETECT", icon: Activity },
  { id: "history", code: "03", label: "LOGS", icon: History },
]

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md h-[54px] bg-black border-t-2 border-black flex items-center justify-around font-mono">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = currentScreen === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-1 h-full flex-col items-center justify-center gap-0.5 border-r border-white/10 last:border-r-0 transition-colors ${
              isActive
                ? "bg-white/12 text-white border-b-2 border-b-white font-bold"
                : "text-white/45 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold">{item.code}</span>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[7px] tracking-[1.5px] uppercase">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
