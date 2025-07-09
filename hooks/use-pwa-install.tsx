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

    // For iOS devices, we can't use beforeinstallprompt
    if (iosDevice) {
      setCanInstall(true)
      console.log("iOS device detected - manual install instructions available")
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired")
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      console.log("App installed successfully")
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    // Add event listeners
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Check if prompt is available after a short delay
    setTimeout(() => {
      if (!deferredPrompt && !iosDevice && !standaloneMode) {
        console.log("beforeinstallprompt not available - checking browser support")
        // Some browsers might not support PWA installation
        // but we can still show manual instructions
        setCanInstall(true)
      }
    }, 2000)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const installApp = async (): Promise<boolean> => {
    console.log("Install app called", { deferredPrompt, isIOS, canInstall })

    // Handle iOS installation
    if (isIOS) {
      // Show iOS installation instructions
      alert(
        "iOS дээр суулгахын тулд:\n\n" +
          "1. Safari browser ашиглана уу\n" +
          "2. Доод хэсгийн 'Хуваалцах' товчийг дарна уу\n" +
          "3. 'Нүүр дэлгэцэнд нэмэх' сонголтыг дарна уу\n" +
          "4. 'Нэмэх' товчийг дарна уу",
      )
      return false
    }

    // Handle Android/Desktop installation
    if (!deferredPrompt) {
      console.log("No deferred prompt available")
      // Show manual installation instructions
      alert(
        "Суулгахын тулд:\n\n" +
          "1. Browser-ын цэсээс 'Апп суулгах' эсвэл 'Install' сонголтыг хайна уу\n" +
          "2. Эсвэл хаягийн мөрөн дэх суулгах товчийг дарна уу\n" +
          "3. Chrome: Цэс → Апп суулгах\n" +
          "4. Edge: Цэс → Апп → Энэ сайтыг апп болгон суулгах",
      )
      return false
    }

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

      // Fallback: show manual instructions
      alert(
        "Автомат суулгалт амжилтгүй боллоо.\n\n" +
          "Гараар суулгахын тулд:\n" +
          "1. Browser-ын цэсээс 'Апп суулгах' сонголтыг хайна уу\n" +
          "2. Эсвэл хаягийн мөрөн дэх суулгах товчийг дарна уу",
      )
      return false
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
