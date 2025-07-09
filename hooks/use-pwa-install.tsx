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
  const [installError, setInstallError] = useState<string>("")

  useEffect(() => {
    // Register service worker first
    const registerServiceWorker = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          })
          console.log("Service Worker registered successfully:", registration)
        } catch (error) {
          console.error("Service Worker registration failed:", error)
        }
      }
    }

    registerServiceWorker()

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

    console.log("PWA Install Hook initialized:", {
      isIOS: iosDevice,
      isStandalone: standaloneMode,
      isInstalled: standaloneMode,
    })

    // Don't show install prompt if already installed
    if (standaloneMode) {
      console.log("App is already installed or running in standalone mode")
      return
    }

    // For non-iOS devices, listen for beforeinstallprompt
    if (!iosDevice) {
      const handleBeforeInstallPrompt = (e: Event) => {
        console.log("beforeinstallprompt event fired")
        e.preventDefault()
        const promptEvent = e as BeforeInstallPromptEvent
        setDeferredPrompt(promptEvent)
        setCanInstall(true)
        console.log("Install prompt available")
      }

      const handleAppInstalled = () => {
        console.log("App installed successfully")
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
      }

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.addEventListener("appinstalled", handleAppInstalled)

      // Check if we can install immediately
      setTimeout(() => {
        if (!deferredPrompt) {
          console.log("No install prompt available yet, checking PWA criteria...")
          // Check if all PWA requirements are met
          if ("serviceWorker" in navigator && window.location.protocol === "https:") {
            setCanInstall(true)
            console.log("PWA requirements met, showing install option")
          }
        }
      }, 2000)

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        window.removeEventListener("appinstalled", handleAppInstalled)
      }
    } else {
      // For iOS, always show install option
      setCanInstall(true)
    }
  }, [])

  const installApp = async (): Promise<boolean> => {
    console.log("Install app called", {
      deferredPrompt: !!deferredPrompt,
      isIOS,
      canInstall,
      userAgent: navigator.userAgent,
    })

    setInstallError("")

    // Handle iOS installation
    if (isIOS) {
      try {
        // For iOS, show instructions since we can't programmatically install
        alert(`iOS дээр суулгахын тулд:
1. Safari browser ашиглана уу
2. Хуваалцах товч (⎋) дарна уу  
3. "Add to Home Screen" (➕) сонгоно уу`)
        return true
      } catch (error) {
        console.error("iOS install error:", error)
        setInstallError("iOS дээр суулгахад алдаа гарлаа")
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
          console.log("User accepted the install prompt")
          setIsInstalled(true)
          setCanInstall(false)
          setDeferredPrompt(null)
          return true
        } else {
          console.log("User dismissed the install prompt")
          return false
        }
      } catch (error) {
        console.error("Error during installation:", error)
        setInstallError("Суулгахад алдаа гарлаа")
        return false
      }
    } else {
      // No deferred prompt available
      console.log("No deferred prompt available")

      // Try alternative methods
      try {
        // Check if browser supports installation
        if ("BeforeInstallPromptEvent" in window) {
          console.log("Browser supports PWA installation but no prompt available")
          setInstallError("Суулгах боломжгүй. Browser дэмжихгүй байна.")
        } else {
          console.log("Browser does not support PWA installation")
          // Show manual instructions
          const isChrome = /Chrome/.test(navigator.userAgent)
          const isEdge = /Edg/.test(navigator.userAgent)
          const isFirefox = /Firefox/.test(navigator.userAgent)

          let instructions = "Суулгахын тулд:\n"

          if (isChrome || isEdge) {
            instructions +=
              "1. Browser-ын хаягийн мөрөнд суулгах icon хайна уу\n2. Эсвэл Menu (⋮) > 'Install app' сонгоно уу"
          } else if (isFirefox) {
            instructions += "1. Menu (☰) нээнэ үү\n2. 'Install' эсвэл 'Add to Home Screen' сонгоно уу"
          } else {
            instructions += "1. Browser-ын menu нээнэ үү\n2. 'Install' эсвэл 'Add to Home Screen' хайна уу"
          }

          alert(instructions)
        }
        return false
      } catch (error) {
        console.error("Alternative install method error:", error)
        setInstallError("Суулгах боломжгүй")
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
    installError,
  }
}
