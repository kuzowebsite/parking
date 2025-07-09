import { NextResponse } from "next/server"
import { database } from "@/lib/firebase"
import { ref, get } from "firebase/database"

export async function GET() {
  try {
    // Firebase-ээс сайтын тохиргоог татах
    const siteConfigRef = ref(database, "siteConfig")
    const snapshot = await get(siteConfigRef)

    let siteName = "Зогсоолын систем"
    let siteLogo = "/images/logo.png"
    let siteDescription = "Зогсоолын удирдлагын систем"

    if (snapshot.exists()) {
      const config = snapshot.val()
      siteName = config.siteName || siteName
      siteLogo = config.siteLogo || siteLogo
      siteDescription = config.description || siteDescription
    }

    // Manifest объект үүсгэх
    const manifest = {
      name: siteName,
      short_name: siteName.length > 12 ? siteName.substring(0, 12) : siteName,
      description: siteDescription,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#10b981",
      orientation: "portrait",
      scope: "/",
      icons: [
        {
          src: siteLogo,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: siteLogo,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: siteLogo,
          sizes: "144x144",
          type: "image/png",
          purpose: "any",
        },
        {
          src: siteLogo,
          sizes: "96x96",
          type: "image/png",
          purpose: "any",
        },
        {
          src: siteLogo,
          sizes: "72x72",
          type: "image/png",
          purpose: "any",
        },
        {
          src: siteLogo,
          sizes: "48x48",
          type: "image/png",
          purpose: "any",
        },
      ],
      categories: ["business", "productivity", "utilities"],
      lang: "mn",
      dir: "ltr",
      prefer_related_applications: false,
      shortcuts: [
        {
          name: "Зогсоол бүртгэх",
          short_name: "Бүртгэх",
          description: "Шинэ зогсоолын бүртгэл үүсгэх",
          url: "/?action=register",
          icons: [
            {
              src: siteLogo,
              sizes: "96x96",
              type: "image/png",
            },
          ],
        },
        {
          name: "Тайлан харах",
          short_name: "Тайлан",
          description: "Зогсоолын тайлан харах",
          url: "/?action=report",
          icons: [
            {
              src: siteLogo,
              sizes: "96x96",
              type: "image/png",
            },
          ],
        },
      ],
    }

    // Manifest-ыг JSON хэлбэрээр буцаах
    return new NextResponse(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=300", // 5 минут кэш
      },
    })
  } catch (error) {
    console.error("Error generating manifest:", error)

    // Алдаа гарсан тохиолдолд default manifest буцаах
    const defaultManifest = {
      name: "Зогсоолын систем",
      short_name: "Зогсоол",
      description: "Зогсоолын удирдлагын систем",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#10b981",
      orientation: "portrait",
      icons: [
        {
          src: "/images/logo.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/images/logo.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
      categories: ["business", "productivity"],
      lang: "mn",
      dir: "ltr",
    }

    return new NextResponse(JSON.stringify(defaultManifest, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // 1 минут кэш алдааны үед
      },
    })
  }
}
