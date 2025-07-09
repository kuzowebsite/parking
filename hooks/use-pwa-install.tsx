"use client"

import { useState, useEffect, useCallback } from "react"

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
  const [isReady, setIsReady] = useState(false)

  // Check if device is iOS
  const checkIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  }, [])

  // Check if app is already installed/running in standalone mode
  const checkInstalled = useCallback(() => {
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
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        console.log("✅ Service Worker registered successfully:", registration.scope)
        return registration
      } catch (error) {
        console.error("❌ Service Worker registration failed:", error)
        return null
      }
    }
    return null
  }, [])

  useEffect(() => {
    const initializePWA = async () => {
      console.log("🚀 Initializing PWA install hook...")

      // Register service worker first
      await registerServiceWorker()

      const iosDevice = checkIOS()
      const standaloneMode = checkInstalled()

      setIsIOS(iosDevice)
      setIsStandalone(standaloneMode)
      setIsInstalled(standaloneMode)

      console.log("📱 Device info:", {
        isIOS: iosDevice,
        isStandalone: standaloneMode,
        userAgent: navigator.userAgent.substring(0, 100),
      })

      // Don't show install prompt if already installed
      if (standaloneMode) {
        console.log("✅ App is already installed or running in standalone mode")
        setIsReady(true)
        return
      }

      // For iOS devices, always show install option with instructions
      if (iosDevice) {
        setCanInstall(true)
        setIsReady(true)
        console.log("🍎 iOS device detected - showing manual install instructions")
        return
      }

      // For non-iOS devices, set up beforeinstallprompt listener
      const handleBeforeInstallPrompt = (e: Event) => {
        console.log("🎯 beforeinstallprompt event fired!")
        e.preventDefault()
        const promptEvent = e as BeforeInstallPromptEvent
        setDeferredPrompt(promptEvent)
        setCanInstall(true)
        console.log("✅ Install prompt captured and ready")
      }

      const handleAppInstalled = () => {
        console.log("🎉 App installed successfully!")
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
      }

      // Add event listeners
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.addEventListener("appinstalled", handleAppInstalled)

      // Wait a bit for the beforeinstallprompt event
      setTimeout(() => {
        if (!deferredPrompt && !iosDevice) {
          console.log("⏳ No beforeinstallprompt event yet, checking PWA criteria...")

          // Check basic PWA requirements
          const hasServiceWorker = "serviceWorker" in navigator
          const isHTTPS = window.location.protocol === "https:" || window.location.hostname === "localhost"
          const hasManifest = document.querySelector('link[rel="manifest"]') !== null

          console.log("🔍 PWA Requirements check:", {
            hasServiceWorker,
            isHTTPS,
            hasManifest,
          })

          if (hasServiceWorker && isHTTPS && hasManifest) {
            setCanInstall(true)
            console.log("✅ PWA requirements met - enabling install option")
          } else {
            console.log("❌ PWA requirements not fully met")
          }
        }
        setIsReady(true)
      }, 3000)

      // Cleanup function
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        window.removeEventListener("appinstalled", handleAppInstalled)
      }
    }

    initializePWA()
  }, [checkIOS, checkInstalled, registerServiceWorker])

  const installApp = useCallback(async (): Promise<boolean> => {
    console.log("🔄 Install app called", {
      deferredPrompt: !!deferredPrompt,
      isIOS,
      canInstall,
      isReady,
    })

    setInstallError("")

    // Handle iOS installation
    if (isIOS) {
      try {
        const isInSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

        if (!isInSafari) {
          alert(`iOS дээр суулгахын тулд Safari browser ашиглана уу:
1. Safari дээр энэ хуудсыг нээнэ үү
2. Хуваалцах товч (⎋) дарна уу  
3. "Add to Home Screen" (➕) сонгоно уу`)
        } else {
          alert(`Апп-г суулгахын тулд:
1. Хуваалцах товч (⎋) дарна уу  
2. "Add to Home Screen" (➕) сонгоно уу
3. "Add" товч дарж баталгаажуулна уу`)
        }
        return true
      } catch (error) {
        console.error("❌ iOS install error:", error)
        setInstallError("iOS дээр суулгахад алдаа гарлаа")
        return false
      }
    }

    // Handle Android/Desktop installation with deferred prompt
    if (deferredPrompt) {
      try {
        console.log("🎯 Showing native install prompt...")
        await deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice

        console.log("👤 User choice:", choiceResult.outcome)

        if (choiceResult.outcome === "accepted") {
          console.log("✅ User accepted the install prompt")
          setIsInstalled(true)
          setCanInstall(false)
          setDeferredPrompt(null)
          return true
        } else {
          console.log("❌ User dismissed the install prompt")
          return false
        }
      } catch (error) {
        console.error("❌ Error during installation:", error)
        setInstallError("Суулгахад алдаа гарлаа. Дахин оролдоно уу.")
        return false
      }
    }

    // Fallback for browsers that support PWA but don't have deferred prompt
    console.log("⚠️ No deferred prompt available, trying alternative methods...")

    try {
      // Check if we're in a PWA-capable browser
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent)
      const isEdge = /Edg/.test(navigator.userAgent)
      const isFirefox = /Firefox/.test(navigator.userAgent)
      const isSamsung = /SamsungBrowser/.test(navigator.userAgent)

      if (isChrome || isEdge || isFirefox || isSamsung) {
        // Show browser-specific instructions
        let instructions = "Апп-г суулгахын тулд:\n\n"

        if (isChrome) {
          instructions += "1. Хаягийн мөрний баруун талд суулгах icon (⬇️) хайна уу\n"
          instructions += "2. Эсвэл Menu (⋮) > 'Install app' сонгоно уу"
        } else if (isEdge) {
          instructions += "1. Хаягийн мөрний баруун талд суулгах icon хайна уу\n"
          instructions += "2. Эсвэл Menu (⋯) > 'Apps' > 'Install this site as an app' сонгоно уу"
        } else if (isFirefox) {
          instructions += "1. Menu (☰) нээнэ үү\n"
          instructions += "2. 'Install' эсвэл 'Add to Home Screen' сонгоно уу"
        } else if (isSamsung) {
          instructions += "1. Menu дарна уу\n"
          instructions += "2. 'Add page to' > 'Home screen' сонгоно уу"
        }

        alert(instructions)
        return true
      } else {
        // Unknown browser
        setInstallError("Энэ browser дээр автомат суулгах боломжгүй байна")
        return false
      }
    } catch (error) {
      console.error("❌ Fallback install method error:", error)
      setInstallError("Суулгах боломжгүй байна")
      return false
    }
  }, [deferredPrompt, isIOS, canInstall, isReady])

  return {
    canInstall: canInstall && !isInstalled && isReady,
    installApp,
    isInstalled,
    isIOS,
    isStandalone,
    deferredPrompt: !!deferredPrompt,
    installError,
    isReady,
  }
}
