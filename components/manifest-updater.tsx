"use client"

import { useEffect } from "react"
import { ref, onValue } from "firebase/database"
import { database } from "@/lib/firebase"

export function ManifestUpdater() {
  useEffect(() => {
    const updateManifest = (siteConfig: any) => {
      try {
        // Create dynamic manifest
        const manifest = {
          name: siteConfig.siteName || "Зогсоолын систем",
          short_name: siteConfig.siteName?.substring(0, 12) || "Зогсоол",
          description: "Зогсоолын удирдлагын систем",
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#10b981",
          orientation: "portrait-primary",
          scope: "/",
          icons: [
            {
              src: siteConfig.siteLogo || "/images/logo.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable any",
            },
            {
              src: siteConfig.siteLogo || "/images/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable any",
            },
          ],
          categories: ["business", "productivity"],
          lang: "mn",
          dir: "ltr",
        }

        // Update manifest link
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
          type: "application/json",
        })
        const manifestURL = URL.createObjectURL(manifestBlob)

        // Remove existing manifest link
        const existingLink = document.querySelector('link[rel="manifest"]')
        if (existingLink) {
          existingLink.remove()
        }

        // Add new manifest link
        const link = document.createElement("link")
        link.rel = "manifest"
        link.href = manifestURL
        document.head.appendChild(link)

        // Update meta tags
        const updateMetaTag = (name: string, content: string) => {
          let meta = document.querySelector(`meta[name="${name}"]`)
          if (!meta) {
            meta = document.createElement("meta")
            meta.setAttribute("name", name)
            document.head.appendChild(meta)
          }
          meta.setAttribute("content", content)
        }

        updateMetaTag("apple-mobile-web-app-title", siteConfig.siteName || "Зогсоолын систем")

        // Update apple touch icon
        let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
        if (!appleIcon) {
          appleIcon = document.createElement("link")
          appleIcon.rel = "apple-touch-icon"
          document.head.appendChild(appleIcon)
        }
        appleIcon.href = siteConfig.siteLogo || "/images/logo.png"

        // Update page title
        document.title = siteConfig.siteName || "Зогсоолын систем"
      } catch (error) {
        console.error("Error updating manifest:", error)
      }
    }

    // Listen for site config changes
    const siteRef = ref(database, "siteConfig")
    const unsubscribe = onValue(siteRef, (snapshot) => {
      if (snapshot.exists()) {
        const siteConfig = snapshot.val()
        updateManifest(siteConfig)
      }
    })

    return () => unsubscribe()
  }, [])

  return null
}
