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
  const [debugInfo, setDebugInfo] = useState("")

  useEffect(() => {
    console.log("🔧 PWA Install Hook initialized")

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ Service Worker registered:", registration)
          setDebugInfo("Service Worker бүртгэгдлээ")
        })
        .catch((error) => {
          console.log("❌ Service Worker registration failed:", error)
          setDebugInfo("Service Worker алдаа: " + error.message)
        })
    } else {
      console.log("❌ Service Worker not supported")
      setDebugInfo("Service Worker дэмжигдэхгүй")
    }

    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      const isIOSStandalone = (window.navigator as any).standalone === true

      console.log("📱 Install check:", { isStandalone, isIOSStandalone })

      if (isStandalone || isIOSStandalone) {
        setIsInstalled(true)
        setDebugInfo("Аппликешн аль хэдийн суулгагдсан")
        return true
      }
      return false
    }

    if (checkIfInstalled()) {
      return
    }

    // Force show install button for testing
    setTimeout(() => {
      if (!deferredPrompt) {
        console.log("🔄 No prompt yet, enabling install anyway")
        setIsInstallable(true)
        setDebugInfo("Суулгах боломжтой (forced)")
      }
    }, 2000)

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("🎯 beforeinstallprompt event fired")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      setDebugInfo("Install prompt бэлэн")
    }

    const handleAppInstalled = () => {
      console.log("✅ App installed")
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      setDebugInfo("Амжилттай суулгагдлаа")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    console.log("🚀 Install button clicked")
    console.log("📊 State:", { deferredPrompt: !!deferredPrompt, isInstallable, isInstalled })

    if (deferredPrompt) {
      try {
        console.log("📱 Showing install prompt")
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log("👤 User choice:", outcome)

        setDeferredPrompt(null)
        setIsInstallable(false)

        if (outcome === "accepted") {
          setIsInstalled(true)
          setDebugInfo("Хэрэглэгч зөвшөөрлөө")
        } else {
          setDebugInfo("Хэрэглэгч татгалзлаа")
        }

        return outcome === "accepted"
      } catch (error) {
        console.error("❌ Installation failed:", error)
        setDebugInfo("Суулгахад алдаа: " + (error as Error).message)
        return false
      }
    } else {
      // Manual instructions for browsers without prompt
      console.log("📖 Showing manual instructions")
      const userAgent = navigator.userAgent
      let instructions = ""

      if (userAgent.includes("Chrome")) {
        instructions = "Chrome: Хаягийн мөрөнд суулгах icon эсвэл Menu (⋮) > 'Install app'"
      } else if (userAgent.includes("Firefox")) {
        instructions = "Firefox: Menu (☰) > 'Install' эсвэл 'Add to Home Screen'"
      } else if (userAgent.includes("Safari")) {
        instructions = "Safari: Share button (⎋) > 'Add to Home Screen' (➕)"
      } else {
        instructions = "Browser menu-с 'Install' эсвэл 'Add to Home Screen' хайна уу"
      }

      alert(`Суулгахын тулд:\n\n${instructions}`)
      setDebugInfo("Гараар суулгах заавар үзүүллээ")
      return false
    }
  }

  return {
    isInstallable: true, // Заавал харуулах
    isInstalled,
    installApp,
    canInstall: !isInstalled, // Суулгагдаагүй бол харуулах
    debugInfo,
    hasDeferredPrompt: !!deferredPrompt,
  }
}
