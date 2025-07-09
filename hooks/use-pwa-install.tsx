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
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installError, setInstallError] = useState<string>("")

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then((registration) => {
          console.log("Service Worker registered:", registration)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }

    // Check if device is iOS
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iosDevice)

    // Check if app is already installed
    const isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    const isInstalled = isStandalone || isIOSStandalone

    setIsInstalled(isInstalled)

    if (isInstalled) {
      return // Don't show install if already installed
    }

    // For iOS, always show install option
    if (iosDevice) {
      setCanInstall(true)
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired")
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      console.log("App installed")
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Cleanup
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const installApp = async (): Promise<boolean> => {
    setInstallError("")

    // Handle iOS
    if (isIOS) {
      alert(`iOS дээр суулгахын тулд:
1. Safari browser ашиглана уу
2. Хуваалцах товч (⎋) дарна уу  
3. "Add to Home Screen" (➕) сонгоно уу`)
      return true
    }

    // Handle Android/Desktop with deferred prompt
    if (deferredPrompt) {
      try {
        console.log("Showing install prompt")
        await deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice

        if (choiceResult.outcome === "accepted") {
          console.log("User accepted install")
          setIsInstalled(true)
          setCanInstall(false)
          setDeferredPrompt(null)
          return true
        } else {
          console.log("User dismissed install")
          return false
        }
      } catch (error) {
        console.error("Install error:", error)
        setInstallError("Суулгахад алдаа гарлаа")
        return false
      }
    } else {
      // No deferred prompt - show browser specific instructions
      const isChrome = /Chrome/.test(navigator.userAgent)
      const isEdge = /Edg/.test(navigator.userAgent)

      if (isChrome || isEdge) {
        alert(`Апп суулгахын тулд:
1. Хаягийн мөрний баруун талд суулгах icon хайна уу
2. Эсвэл Menu (⋮) > "Install app" сонгоно уу`)
      } else {
        alert(`Апп суулгахын тулд:
1. Browser-ын menu нээнэ үү
2. "Install" эсвэл "Add to Home Screen" хайна уу`)
      }
      return false
    }
  }

  return {
    canInstall: canInstall && !isInstalled,
    installApp,
    isInstalled,
    isIOS,
    deferredPrompt: !!deferredPrompt,
    installError,
  }
}
