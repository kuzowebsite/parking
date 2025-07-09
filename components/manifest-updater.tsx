"use client"

import { useEffect } from "react"

export default function ManifestUpdater() {
  useEffect(() => {
    // Manifest-ыг шинэчлэх функц
    const updateManifest = () => {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
      if (manifestLink) {
        // Cache busting-ын тулд timestamp нэмэх
        const timestamp = new Date().getTime()
        manifestLink.href = `/api/manifest?t=${timestamp}`
      }
    }

    // Хуудас ачаалагдсаны дараа manifest шинэчлэх
    updateManifest()

    // 5 минут тутамд manifest шинэчлэх
    const interval = setInterval(updateManifest, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}
