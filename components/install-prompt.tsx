"use client"

import { useState, useEffect } from "react"
import { ref, get } from "firebase/database"
import { database } from "@/lib/firebase"
import { usePWAInstall } from "@/hooks/use-pwa-install"
import { Button } from "@/components/ui/button"
import { X, Download, Smartphone } from "lucide-react"

interface InstallPromptProps {
  onClose: () => void
}

export default function InstallPrompt({ onClose }: InstallPromptProps) {
  const { canInstall, installApp, isInstalled } = usePWAInstall()
  const [installing, setInstalling] = useState(false)
  const [siteConfig, setSiteConfig] = useState({
    siteName: "Зогсоолын систем",
    siteLogo: "/images/logo.png",
  })

  useEffect(() => {
    // Load site config from database
    const loadSiteConfig = async () => {
      try {
        const configRef = ref(database, "siteConfig")
        const snapshot = await get(configRef)
        if (snapshot.exists()) {
          const config = snapshot.val()
          setSiteConfig({
            siteName: config.siteName || "Зогсоолын систем",
            siteLogo: config.siteLogo || "/images/logo.png",
          })
        }
      } catch (error) {
        console.error("Error loading site config:", error)
      }
    }

    loadSiteConfig()
  }, [])

  // Don't show if already installed
  if (isInstalled) {
    onClose()
    return null
  }

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const success = await installApp()
      // Close the prompt regardless of success
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error("Installation failed:", error)
      onClose()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="text-center space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <img
              src={siteConfig.siteLogo || "/placeholder.svg"}
              alt="Logo"
              className="w-16 h-16 rounded-lg object-contain"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{siteConfig.siteName}</h3>
              <p className="text-gray-600">Апп-г өөрийн төхөөрөмж дээр суулгаарай</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-emerald-50/50">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-gray-900">Хурдан хандалт</h4>
                <p className="text-sm text-gray-600">Нүүр дэлгэцээсээ шууд нээх</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-blue-50/50">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-gray-900">Offline ажиллах</h4>
                <p className="text-sm text-gray-600">Интернет байхгүй үед ч ашиглах</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 py-3 rounded-lg font-medium bg-transparent"
              disabled={installing}
            >
              Болих
            </Button>
            <Button
              onClick={handleInstall}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-colors"
              disabled={installing}
            >
              {installing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Суулгаж байна...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Суулгах</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
