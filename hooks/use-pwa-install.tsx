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
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if device is iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    }

    // Check if app is already installed/running in standalone mode
    const checkInstalled = () => {
      // Check for standalone mode
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
        return true
      }
      // Check for iOS standalone
      if ((window.navigator as any).standalone === true) {
        return true
      }
      // Check for Android TWA
      if (document.referrer.includes("android-app://")) {
        return true
      }
      return false
    }

    const iosDevice = checkIOS()
    const standaloneMode = checkInstalled()

    setIsIOS(iosDevice)
    setIsStandalone(standaloneMode)
    setIsInstalled(standaloneMode)

    // Don't show install prompt if already installed
    if (standaloneMode) {
      console.log("App is already installed or running in standalone mode")
      return
    }

    // For all devices, show install option
    setCanInstall(true)

    // For non-iOS devices, listen for beforeinstallprompt
    if (!iosDevice) {
      const handleBeforeInstallPrompt = (e: Event) => {
        console.log("beforeinstallprompt event fired")
        e.preventDefault()
        const promptEvent = e as BeforeInstallPromptEvent
        setDeferredPrompt(promptEvent)
      }

      const handleAppInstalled = () => {
        console.log("App installed successfully")
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
      }

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.addEventListener("appinstalled", handleAppInstalled)

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        window.removeEventListener("appinstalled", handleAppInstalled)
      }
    }
  }, [])

  const installApp = async (): Promise<boolean> => {
    console.log("Install app called", { deferredPrompt, isIOS, canInstall })

    // Handle iOS installation - use Web Share API
    if (isIOS) {
      try {
        // Try to use Web Share API to trigger native share menu
        if (navigator.share) {
          await navigator.share({
            title: document.title,
            text: "Энэ апп-г суулгаж ашиглаарай",
            url: window.location.href,
          })
          return true
        } else {
          // Fallback: Try to programmatically trigger add to home screen
          // Create a temporary link and click it to potentially trigger iOS install
          const link = document.createElement("a")
          link.href = window.location.href
          link.setAttribute("data-turbo", "false")
          link.click()
          return false
        }
      } catch (error) {
        console.error("iOS install error:", error)
        return false
      }
    }

    // Handle Android/Desktop installation
    if (deferredPrompt) {
      try {
        console.log("Showing install prompt")
        await deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice

        console.log("User choice:", choiceResult.outcome)

        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true)
          setCanInstall(false)
          setDeferredPrompt(null)
          return true
        }
        return false
      } catch (error) {
        console.error("Error during installation:", error)
        return false
      }
    } else {
      // For browsers that don't support beforeinstallprompt
      // Try to trigger browser's native install functionality
      try {
        // Check if we can trigger browser install menu
        if ("serviceWorker" in navigator) {
          // Try to focus address bar to show install icon
          window.focus()

          // Try to trigger browser install via meta refresh
          const meta = document.createElement("meta")
          meta.httpEquiv = "refresh"
          meta.content = "0;url=" + window.location.href
          document.head.appendChild(meta)

          setTimeout(() => {
            document.head.removeChild(meta)
          }, 100)
        }
        return false
      } catch (error) {
        console.error("Browser install error:", error)
        return false
      }
    }
  }

  return {
    canInstall: canInstall && !isInstalled,
    installApp,
    isInstalled,
    isIOS,
    isStandalone,
    deferredPrompt: !!deferredPrompt,
  }
}
