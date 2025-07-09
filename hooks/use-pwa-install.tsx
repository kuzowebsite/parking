"use client"

import { useState, useEffect } from "react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration)
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error)
        })
    }

    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true)
        return true
      }
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    if (checkIfInstalled()) {
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      console.log("App installed")
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        console.log("Showing install prompt")
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log("User choice:", outcome)

        setDeferredPrompt(null)
        setIsInstallable(false)

        if (outcome === "accepted") {
          setIsInstalled(true)
        }

        return outcome === "accepted"
      } catch (error) {
        console.error("Installation failed:", error)
        return false
      }
    }
    return false
  }

  return {
    isInstallable,
    isInstalled,
    installApp,
    canInstall: isInstallable && !isInstalled,
  }
}
