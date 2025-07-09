"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Smartphone, Check, AlertCircle } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installError, setInstallError] = useState("")
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://")

      setIsStandalone(isStandaloneMode)
      setIsInstalled(isStandaloneMode)
      return isStandaloneMode
    }

    if (checkStandalone()) {
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      setInstallError("")
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log("App installed successfully")
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      setIsInstalling(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Check if service worker is supported and register it
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setInstallError("Суулгах боломжгүй. Браузер дэмжихгүй байна.")
      return
    }

    setIsInstalling(true)
    setInstallError("")

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice

      console.log(`User response to the install prompt: ${outcome}`)

      if (outcome === "accepted") {
        console.log("User accepted the install prompt")
        // The appinstalled event will handle the rest
      } else {
        console.log("User dismissed the install prompt")
        setIsInstalling(false)
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null)
      setIsInstallable(false)
    } catch (error) {
      console.error("Error during installation:", error)
      setInstallError("Суулгахад алдаа гарлаа. Дахин оролдоно уу.")
      setIsInstalling(false)
    }
  }

  // Don't show install button if already installed or in standalone mode
  if (isInstalled || isStandalone) {
    return (
      <div className="w-full h-12 flex items-center justify-center bg-green-500/20 border border-green-400/50 rounded-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-green-300">
          <Check className="w-5 h-5" />
          <span className="text-base font-medium">Суулгагдсан</span>
        </div>
      </div>
    )
  }

  // Show install button only if installable
  if (!isInstallable && !deferredPrompt) {
    return (
      <div className="w-full h-12 flex items-center justify-center bg-gray-500/20 border border-gray-400/50 rounded-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-gray-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-base font-medium">Суулгах боломжгүй</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleInstall}
        variant="outline"
        className="w-full h-12 text-base font-medium bg-white/5 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-300 hover:scale-[1.02]"
        disabled={isInstalling || !isInstallable}
      >
        {isInstalling ? (
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Суулгаж байна...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5" />
            <span>Апп суулгах</span>
            <Download className="w-4 h-4" />
          </div>
        )}
      </Button>

      {installError && (
        <div className="text-red-300 text-sm text-center bg-red-500/20 border border-red-400/50 rounded-lg p-2">
          {installError}
        </div>
      )}
    </div>
  )
}
