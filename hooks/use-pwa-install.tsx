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
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if PWA features are supported
    const checkSupport = () => {
      const hasServiceWorker = "serviceWorker" in navigator
      const hasManifest = "manifest" in document.createElement("link")
      const hasBeforeInstallPrompt = "onbeforeinstallprompt" in window

      setIsSupported(hasServiceWorker && hasManifest)
      return hasServiceWorker && hasManifest
    }

    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://")

      if (isStandalone) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    if (!checkSupport()) {
      console.log("PWA features not supported")
      return
    }

    if (checkIfInstalled()) {
      console.log("App is already installed")
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event received")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      console.log("App installed event received")
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) {
      console.log("No deferred prompt available")
      return false
    }

    try {
      console.log("Showing install prompt")
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      console.log(`Install prompt outcome: ${outcome}`)

      setDeferredPrompt(null)
      setIsInstallable(false)

      return outcome === "accepted"
    } catch (error) {
      console.error("Installation failed:", error)
      return false
    }
  }

  return {
    isInstallable: isInstallable && !isInstalled,
    isInstalled,
    isSupported,
    installApp,
    canInstall: isInstallable && !isInstalled && isSupported,
  }
}
