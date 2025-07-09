const fs = require("fs")
const path = require("path")

// Firebase Admin SDK ашиглах
const admin = require("firebase-admin")

// Firebase тохиргоо
const firebaseConfig = {
  apiKey: "AIzaSyDReM6qjmJb7EZCDoIoR5j1HsVLmiCRD9s",
  authDomain: "ajlitannurtgl.firebaseapp.com",
  databaseURL: "https://ajlitannurtgl-default-rtdb.firebaseio.com",
  projectId: "ajlitannurtgl",
  messagingSenderId: "1061708931334",
  appId: "1:1061708931334:web:661148d945845e1d7f3e87",
  measurementId: "G-ZRDQBCVXVF",
}

// Firebase app инициализ хийх
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: firebaseConfig.databaseURL,
  })
}

async function generateManifest() {
  try {
    console.log("🔄 Firebase-ээс сайтын тохиргоо татаж байна...")

    // Firebase Realtime Database-ээс өгөгдөл татах
    const db = admin.database()
    const siteConfigRef = db.ref("siteConfig")
    const snapshot = await siteConfigRef.once("value")

    // Default утгууд
    let siteData = {
      siteName: "Зогсоолын систем",
      siteLogo: "/images/logo.png",
      description: "Зогсоолын удирдлагын систем",
      themeColor: "#10b981",
      backgroundColor: "#ffffff",
    }

    // Firebase-ээс өгөгдөл байвал ашиглах
    if (snapshot.exists()) {
      const firebaseData = snapshot.val()
      siteData = {
        siteName: firebaseData.siteName || siteData.siteName,
        siteLogo: firebaseData.siteLogo || siteData.siteLogo,
        description: firebaseData.description || siteData.description,
        themeColor: firebaseData.themeColor || siteData.themeColor,
        backgroundColor: firebaseData.backgroundColor || siteData.backgroundColor,
      }
      console.log("✅ Firebase-ээс өгөгдөл амжилттай татагдлаа")
    } else {
      console.log("⚠️  Firebase дээр сайтын тохиргоо олдсонгүй, default утга ашиглана")
    }

    // Manifest объект үүсгэх
    const manifest = {
      name: siteData.siteName,
      short_name: siteData.siteName.length > 12 ? siteData.siteName.substring(0, 12) : siteData.siteName,
      description: siteData.description,
      start_url: "/",
      display: "standalone",
      background_color: siteData.backgroundColor,
      theme_color: siteData.themeColor,
      orientation: "portrait",
      scope: "/",
      icons: [
        {
          src: siteData.siteLogo,
          sizes: "48x48",
          type: "image/png",
          purpose: "any",
        },
        {
          src: siteData.siteLogo,
          sizes: "72x72",
          type: "image/png",
          purpose: "any",
        },
        {
          src: siteData.siteLogo,
          sizes: "96x96",
          type: "image/png",
          purpose: "any",
        },
        {
          src: siteData.siteLogo,
          sizes: "144x144",
          type: "image/png",
          purpose: "any",
        },
        {
          src: siteData.siteLogo,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: siteData.siteLogo,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
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
              src: siteData.siteLogo,
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
              src: siteData.siteLogo,
              sizes: "96x96",
              type: "image/png",
            },
          ],
        },
      ],
    }

    // public/manifest.json файл үүсгэх
    const publicDir = path.join(process.cwd(), "public")
    const manifestPath = path.join(publicDir, "manifest.json")

    // public директор байгаа эсэхийг шалгах
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Manifest файл бичих
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8")

    console.log("🎉 Manifest.json файлыг Firebase-ээс өгөгдөл авч амжилттай үүсгэлээ!")
    console.log(`📁 Файлын байршил: ${manifestPath}`)
    console.log(`📱 Апп нэр: ${manifest.name}`)
    console.log(`🎨 Өнгө: ${manifest.theme_color}`)
    console.log(`🖼️  Лого: ${siteData.siteLogo}`)
  } catch (error) {
    console.error("❌ Manifest үүсгэхэд алдаа гарлаа:", error)

    // Алдаа гарсан тохиолдолд default manifest үүсгэх
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

    const publicDir = path.join(process.cwd(), "public")
    const manifestPath = path.join(publicDir, "manifest.json")

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    fs.writeFileSync(manifestPath, JSON.stringify(defaultManifest, null, 2), "utf8")
    console.log("⚠️  Default manifest файл үүсгэгдлээ")
  }
}

// Script ажиллуулах
if (require.main === module) {
  generateManifest()
    .then(() => {
      console.log("✅ Manifest үүсгэх процесс дууслаа")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Script алдаа:", error)
      process.exit(1)
    })
}

module.exports = generateManifest
