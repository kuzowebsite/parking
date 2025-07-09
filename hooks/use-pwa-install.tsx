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

    // Handle iOS installation - trigger native share menu
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
          // Fallback: Try to trigger iOS add to home screen
          // This creates a custom event that might trigger the add to home screen banner
          const event = new CustomEvent("beforeinstallprompt")
          window.dispatchEvent(event)

          // Show a brief instruction overlay
          const overlay = document.createElement("div")
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            text-align: center;
            padding: 20px;
          `

          overlay.innerHTML = `
            <div style="max-width: 300px;">
              <div style="font-size: 24px; margin-bottom: 20px;">📱</div>
              <div style="font-size: 18px; margin-bottom: 10px;">Апп суулгах</div>
              <div style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">
                Доод хэсгийн "Хуваалцах" товчийг дараад "Нүүр дэлгэцэнд нэмэх" сонгоно уу
              </div>
              <button onclick="this.parentElement.parentElement.remove()" 
                      style="background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px;">
                Ойлголоо
              </button>
            </div>
          `

          document.body.appendChild(overlay)

          // Auto remove after 5 seconds
          setTimeout(() => {
            if (overlay.parentElement) {
              overlay.remove()
            }
          }, 5000)

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
      // Try to trigger browser's native install prompt
      try {
        // Check if browser supports installation
        if ("serviceWorker" in navigator) {
          // Show browser-specific install hint
          const overlay = document.createElement("div")
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: system-ui, sans-serif;
            text-align: center;
            padding: 20px;
          `

          overlay.innerHTML = `
            <div style="max-width: 350px;">
              <div style="font-size: 24px; margin-bottom: 20px;">💻</div>
              <div style="font-size: 18px; margin-bottom: 10px;">Апп суулгах</div>
              <div style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">
                Browser-ын цэсээс "Апп суулгах" эсвэл хаягийн мөрөн дэх суулгах товчийг дарна уу
              </div>
              <button onclick="this.parentElement.parentElement.remove()" 
                      style="background: #0066CC; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px;">
                Ойлголоо
              </button>
            </div>
          `

          document.body.appendChild(overlay)

          // Auto remove after 5 seconds
          setTimeout(() => {
            if (overlay.parentElement) {
              overlay.remove()
            }
          }, 5000)
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
