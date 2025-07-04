"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth"
import { ref, onValue, get } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface SiteConfig {
  siteName: string
  siteLogo: string
  siteBackground: string
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Default configuration - used as fallback and initial state
  const defaultConfig: SiteConfig = {
    siteName: "ТАВТАЙ МОРИЛНО УУ",
    siteLogo: "/images/logo.png",
    siteBackground: "/images/background.webp",
  }

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(defaultConfig)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [databaseConfigExists, setDatabaseConfigExists] = useState(false)
  const [configSource, setConfigSource] = useState<"default" | "database" | "error">("default")

  // Preload images function
  const preloadImages = (config: SiteConfig): Promise<void> => {
    return new Promise((resolve) => {
      let loadedCount = 0
      const totalImages = 2 // logo and background

      console.log(`🖼️ Preloading images:`)
      console.log(`   Logo: ${config.siteLogo}`)
      console.log(`   Background: ${config.siteBackground}`)

      const checkComplete = () => {
        loadedCount++
        const progress = (loadedCount / totalImages) * 100
        setLoadingProgress(progress)

        if (loadedCount === totalImages) {
          setImagesLoaded(true)
          console.log("✅ All images preloaded successfully")
          resolve()
        }
      }

      // Preload logo
      const logoImg = new Image()
      logoImg.crossOrigin = "anonymous"
      logoImg.onload = () => {
        console.log("✅ Logo loaded successfully")
        checkComplete()
      }
      logoImg.onerror = (error) => {
        console.warn("❌ Logo failed to load:", error)
        checkComplete()
      }
      logoImg.src = config.siteLogo

      // Preload background
      const bgImg = new Image()
      bgImg.crossOrigin = "anonymous"
      bgImg.onload = () => {
        console.log("✅ Background loaded successfully")
        checkComplete()
      }
      bgImg.onerror = (error) => {
        console.warn("❌ Background failed to load:", error)
        checkComplete()
      }
      bgImg.src = config.siteBackground
    })
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/")
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    // Load site configuration - with proper error handling for unauthenticated access
    const loadSiteConfig = async () => {
      console.log("🔍 Loading site configuration...")

      // Start with default config
      setSiteConfig(defaultConfig)
      setConfigSource("default")
      setConfigLoaded(true)

      // Preload default images first
      try {
        await preloadImages(defaultConfig)
        console.log("✅ Default images preloaded")
      } catch (error) {
        console.warn("⚠️ Error preloading default images:", error)
        setImagesLoaded(true) // Still proceed
      }

      // Try to load from database (this might fail due to auth rules)
      try {
        console.log("🔍 Attempting to load from database...")
        const configRef = ref(database, "siteConfig")

        // Try to get data once
        const snapshot = await get(configRef)

        if (snapshot.exists()) {
          const dbConfig = snapshot.val()
          console.log("📦 Database config found:", dbConfig)

          // Use database config
          const config: SiteConfig = {
            siteName: dbConfig.siteName || defaultConfig.siteName,
            siteLogo: dbConfig.siteLogo || defaultConfig.siteLogo,
            siteBackground: dbConfig.siteBackground || defaultConfig.siteBackground,
          }

          console.log("🎯 Using database configuration:")
          console.log("   Site Name:", config.siteName)
          console.log("   Logo:", config.siteLogo)
          console.log("   Background:", config.siteBackground)

          setSiteConfig(config)
          setDatabaseConfigExists(true)
          setConfigSource("database")

          // Preload database images
          try {
            await preloadImages(config)
            console.log("✅ Database images preloaded")
          } catch (imageError) {
            console.warn("⚠️ Error preloading database images:", imageError)
          }

          // Set up real-time listener for future updates (only if initial read succeeded)
          onValue(
            configRef,
            (snapshot) => {
              if (snapshot.exists()) {
                const updatedDbConfig = snapshot.val()
                const updatedConfig: SiteConfig = {
                  siteName: updatedDbConfig.siteName || defaultConfig.siteName,
                  siteLogo: updatedDbConfig.siteLogo || defaultConfig.siteLogo,
                  siteBackground: updatedDbConfig.siteBackground || defaultConfig.siteBackground,
                }

                console.log("🔄 Site config updated from database:", updatedConfig)
                setSiteConfig(updatedConfig)
              }
            },
            (error) => {
              console.warn("⚠️ Real-time listener error:", error)
              // Don't change config source, just log the error
            },
          )
        } else {
          console.log("⚠️ No site config found in database")
          setDatabaseConfigExists(false)
          setConfigSource("default")
        }
      } catch (error) {
        console.warn("⚠️ Cannot access database (likely due to auth rules):", error.message)
        console.log("🔄 Using default configuration")

        setDatabaseConfigExists(false)
        setConfigSource("error")

        // Ensure default config is still loaded
        setSiteConfig(defaultConfig)
        setConfigLoaded(true)

        if (!imagesLoaded) {
          try {
            await preloadImages(defaultConfig)
          } catch (imageError) {
            console.warn("⚠️ Error preloading default images:", imageError)
            setImagesLoaded(true)
          }
        }
      }
    }

    loadSiteConfig()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoginLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // After successful login, try to reload config from database
      console.log("✅ Login successful, will reload config after redirect")
    } catch (error) {
      console.error("Login error:", error)
      alert("И-мэйл эсвэл нууц үг буруу байна")
    }
    setLoginLoading(false)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, imageType: "logo" | "background") => {
    const target = e.target as HTMLImageElement
    console.warn(`❌ ${imageType} image failed to load:`, target.src)

    if (imageType === "logo" && target.src !== defaultConfig.siteLogo) {
      console.log("🔄 Falling back to default logo")
      target.src = defaultConfig.siteLogo
    }
  }

  const getConfigStatusText = () => {
    switch (configSource) {
      case "database":
        return "Өгөгдлийн сангаас ачаалсан"
      case "error":
        return "Өгөгдлийн санд хандах боломжгүй"
      case "default":
      default:
        return "Анхдагш тохиргоо ашиглаж байна"
    }
  }

  const getConfigStatusColor = () => {
    switch (configSource) {
      case "database":
        return "bg-emerald-400"
      case "error":
        return "bg-red-400"
      case "default":
      default:
        return "bg-yellow-400"
    }
  }

  // Show loading screen until everything is ready
  if (loading || !configLoaded || !imagesLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-16 w-24 h-24 bg-cyan-400 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-emerald-400 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center space-y-8">
          {/* Logo */}
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <img
                src={siteConfig.siteLogo || "/placeholder.svg"}
                alt="Logo"
                className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 opacity-80"
                onError={(e) => handleImageError(e, "logo")}
              />
            </div>
            <div className="absolute inset-0 w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-blue-400 rounded-2xl md:rounded-3xl blur-xl opacity-30 animate-pulse"></div>
          </div>

          {/* App Name */}
          <div className="text-center space-y-2 md:space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              <span className="text-cyan-400">ЗОГСООЛ</span>
              <span className="text-white">НЫ СИСТЕМ</span>
            </h1>
            <p className="text-blue-200 text-lg">{siteConfig.siteName}</p>
          </div>

          {/* Loading Progress */}
          <div className="w-64 md:w-80 lg:w-96 space-y-4">
            <div className="relative">
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300 ease-out relative"
                  style={{ width: `${loadingProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div
                className="absolute top-0 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-sm opacity-50 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-200">
                {!configLoaded
                  ? "Тохиргоо ачааллаж байна..."
                  : !imagesLoaded
                    ? "Зураг ачааллаж байна..."
                    : "Бэлэн болсон"}
              </span>
              <span className="text-white font-mono font-bold">{Math.round(loadingProgress)}%</span>
            </div>
          </div>

          {/* Config Status */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getConfigStatusColor()}`}></div>
                <span className="text-white/60">{getConfigStatusText()}</span>
              </div>
            </div>
          </div>

          {/* Loading Dots */}
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-2 text-blue-300 text-xs">
            <div className="w-1 h-1 bg-blue-300 rounded-full animate-ping"></div>
            <span>Түр хүлээн үү...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{
          backgroundImage: `url('${siteConfig.siteBackground}')`,
        }}
        onError={(e) => {
          console.warn("❌ Background image failed to load:", siteConfig.siteBackground)
        }}
      >
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm md:max-w-md lg:max-w-lg mx-4 animate-in fade-in duration-500">
        {/* Logo and Welcome */}
        <div className="text-center mb-12 md:mb-16">
          <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mx-auto mb-6 md:mb-8 flex items-center justify-center">
            <img
              src={siteConfig.siteLogo || "/placeholder.svg"}
              alt="Logo"
              className="w-12 h-12 md:w-16 md:h-16 lg:w-18 lg:h-18 object-contain transition-all duration-300"
              onError={(e) => handleImageError(e, "logo")}
            />
          </div>
          <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-semibold transition-all duration-300">
            {siteConfig.siteName}
          </h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-white/70 text-sm">И-мэйл хаяг</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="И-мэйл хаягаа оруулна уу"
                className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-white/70 text-sm">Нууц үг</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Нууц үгээ оруулна уу"
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878a3 3 0 00-.007 4.243m4.242-4.242L15.536 15.536M14.122 14.122a3 3 0 01-4.243-.007m4.243.007l1.414 1.414M14.122 14.122L8.464 8.464"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-4 bg-emerald-400 hover:bg-emerald-500 text-black font-semibold rounded-2xl transition-colors disabled:opacity-50"
          >
            {loginLoading ? "Нэвтэрч байна..." : "Нэвтрэх"}
          </button>
        </form>

        {/* Config Status Display */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getConfigStatusColor()}`}></div>
              <span className="text-white/40">{getConfigStatusText()}</span>
            </div>
          </div>

          {/* Show current config details */}
          <div className="mt-2 text-xs text-white/30">
            {configSource === "database" && <span>✅ Database: {siteConfig.siteName}</span>}
            {configSource === "error" && <span>⚠️ Нэвтэрсний дараа database-аас ачаалагдана</span>}
            {configSource === "default" && <span>📁 Default config ашиглаж байна</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
