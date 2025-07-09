import { NextResponse } from "next/server"
import { ref, get } from "firebase/database"
import { database } from "@/lib/firebase"

export async function GET() {
    try {
        // Load site configuration from database
        const siteRef = ref(database, "siteConfig")
        const snapshot = await get(siteRef)

        let siteConfig = {
            siteName: "Зогсоолын систем",
            siteLogo: "/images/logo.png",
        }

        if (snapshot.exists()) {
            const data = snapshot.val()
            siteConfig = {
                siteName: data.siteName || "Зогсоолын систем",
                siteLogo: data.siteLogo || "/images/logo.png",
            }
        }

        // Create dynamic manifest
        const manifest = {
            name: siteConfig.siteName,
            short_name: siteConfig.siteName.length > 12 ? siteConfig.siteName.substring(0, 12) : siteConfig.siteName,
            description: "Зогсоолын удирдлагын систем",
            start_url: "/",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#10b981",
            orientation: "portrait-primary",
            scope: "/",
            icons: [
                {
                    src: siteConfig.siteLogo,
                    sizes: "192x192",
                    type: "image/png",
                    purpose: "maskable any",
                },
                {
                    src: siteConfig.siteLogo,
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "maskable any",
                },
            ],
            categories: ["business", "productivity"],
            lang: "mn",
            dir: "ltr",
        }

        return NextResponse.json(manifest, {
            headers: {
                "Content-Type": "application/manifest+json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        })
    } catch (error) {
        console.error("Error generating manifest:", error)

        // Fallback manifest
        const fallbackManifest = {
            name: "Зогсоолын систем",
            short_name: "Зогсоол",
            description: "Зогсоолын удирдлагын систем",
            start_url: "/",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#10b981",
            orientation: "portrait-primary",
            scope: "/",
            icons: [
                {
                    src: "/images/logo.png",
                    sizes: "192x192",
                    type: "image/png",
                    purpose: "maskable any",
                },
                {
                    src: "/images/logo.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "maskable any",
                },
            ],
            categories: ["business", "productivity"],
            lang: "mn",
            dir: "ltr",
        }

        return NextResponse.json(fallbackManifest, {
            headers: {
                "Content-Type": "application/manifest+json",
            },
        })
    }
}
