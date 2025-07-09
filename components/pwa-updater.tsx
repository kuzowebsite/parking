"use client"

import { useEffect } from "react"
import { ref, onValue } from "firebase/database"
import { database } from "@/lib/firebase"

export function PWAUpdater() {
  useEffect(() => {
    const updatePWAMetadata = (siteConfig: any) => {
      try {
        // Update page title
        document.title = siteConfig.siteName || "Зогсоолын систем"

        // Update meta tags
        const updateMetaTag = (name: string, content: string) => {
          let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
          if (!meta) {
            meta = document.createElement("meta")
            meta.setAttribute("name", name)
            document.head.appendChild(meta)
          }
          meta.setAttribute("content", content)
        }

        updateMetaTag("apple-mobile-web-app-title", siteConfig.siteName || "Зогсоолын систем")
        updateMetaTag("application-name", siteConfig.siteName || "Зогсоолын систем")

        // Update apple touch icon
        let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
        if (!appleIcon) {
          appleIcon = document.createElement("link")
          appleIcon.rel = "apple-touch-icon"
          document.head.appendChild(appleIcon)
        }
        appleIcon.href = siteConfig.siteLogo || "/images/logo.png"

        // Update favicon
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
        if (!favicon) {
          favicon = document.createElement("link")
          favicon.rel = "icon"
          document.head.appendChild(favicon)
        }
        favicon.href = siteConfig.siteLogo || "/images/logo.png"

        // Force manifest refresh by updating the link
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
        if (manifestLink) {
          const currentHref = manifestLink.href
          const newHref = `/api/manifest?t=${Date.now()}`
          manifestLink.href = newHref

          // Trigger a reload of the manifest
          setTimeout(() => {
            manifestLink.href = "/api/manifest"
          }, 100)
        }
      } catch (error) {
        console.error("Error updating PWA metadata:", error)
      }
    }

    // Listen for site config changes
    const siteRef = ref(database, "siteConfig")
    const unsubscribe = onValue(siteRef, (snapshot) => {
      if (snapshot.exists()) {
        const siteConfig = snapshot.val()
        updatePWAMetadata(siteConfig)
      }
    })

    return () => unsubscribe()
  }, [])

  return null
}
