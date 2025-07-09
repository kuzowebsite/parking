"use client"

import { useState, useEffect } from "react"
import { ref, get } from "firebase/database"
import { database } from "@/lib/firebase"
import { usePWAInstall } from "@/hooks/use-pwa-install"
import { Button } from "@/components/ui/button"
import { X, Download, Smartphone, Share, Plus } from "lucide-react"

interface InstallPromptProps {
  onClose: () => void
}

export default function InstallPrompt({ onClose }: InstallPromptProps) {
  const { canInstall, installApp, isIOS, isInstalled } = usePWAInstall()
  const [showConfirm, setShowConfirm] = useState(false)
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

  const handleInstallClick = () => {
    setShowConfirm(true)
  }

  const handleConfirmInstall = async () => {
    setInstalling(true)
    try {
      const success = await installApp()
      if (success) {
        console.log("Installation successful")
        onClose()
      }
    } catch (error) {
      console.error("Installation failed:", error)
    } finally {
      setInstalling(false)
    }
  }

  const handleCancel = () => {
    if (showConfirm) {
      setShowConfirm(false)
    } else {
      onClose()
    }
  }

  if (!showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex items-center justify-between mb-6 pr-8">
            <div className="flex items-center space-x-3">
              <img
                src={siteConfig.siteLogo || "/placeholder.svg"}
                alt="Logo"
                className="w-12 h-12 rounded-lg object-contain"
              />
              <div>
                <h3 className="font-semibold text-gray-900">Апп суулгах</h3>
                <p className="text-sm text-gray-600">{siteConfig.siteName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Хурдан хандалт</h4>
                <p className="text-sm text-gray-600">Нүүр дэлгэцээсээ шууд нээх</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Offline ажиллах</h4>
                <p className="text-sm text-gray-600">Интернет байхгүй үед ч ашиглах</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleInstallClick}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Суулгах
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex flex-col items-center space-y-3">
            <img
              src={siteConfig.siteLogo || "/placeholder.svg"}
              alt="Logo"
              className="w-16 h-16 rounded-lg object-contain"
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{siteConfig.siteName} суулгах</h3>
              {isIOS ? (
                <div className="text-left space-y-2 text-sm text-gray-600">
                  <p className="font-medium">iOS дээр суулгахын тулд:</p>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Share className="w-4 h-4" />
                      <span>1. Доод хэсгийн "Хуваалцах" товчийг дарна уу</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>2. "Нүүр дэлгэцэнд нэмэх" сонгоно уу</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>3. "Нэмэх" товчийг дарна уу</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700">Апп-г өөрийн төхөөрөмж дээр суулгахдаа итгэлтэй байна уу?</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 py-3 rounded-lg font-medium bg-transparent"
            disabled={installing}
          >
            Болих
          </Button>
          <Button
            onClick={handleConfirmInstall}
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
                <span>{isIOS ? "Ойлголоо" : "Суулгах"}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
