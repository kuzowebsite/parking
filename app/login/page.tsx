"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth"
import { ref, get, onValue } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Shield, AlertCircle, Database, Globe, Users, Car } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [imagesPreloaded, setImagesPreloaded] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)

  // Site configuration states
  const [siteConfig, setSiteConfig] = useState({
    siteName: "Зогсоолын систем",
    siteLogo: "",
    siteBackground: "",
  })
  const [configSource, setConfigSource] = useState<"database" | "default" | "error">("default")
  const [configError, setConfigError] = useState("")

  const router = useRouter()

  // Load site configuration from database
  const loadSiteConfig = async () => {
    try {
      console.log("🔄 Loading site config from database...")
      const siteRef = ref(database, "siteConfig")

      // Try to get data once first
      const snapshot = await get(siteRef)

      if (snapshot.exists()) {
        const data = snapshot.val()
        console.log("✅ Site config loaded from database:", data)
        setSiteConfig({
          siteName: data.siteName || "Зогсоолын систем",
          siteLogo: data.siteLogo || "",
          siteBackground: data.siteBackground || "",
        })
        setConfigSource("database")

        // Also listen for real-time updates
        onValue(siteRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            setSiteConfig({
              siteName: data.siteName || "Зогсоолын систем",
              siteLogo: data.siteLogo || "",
              siteBackground: data.siteBackground || "",
            })
          }
        })
      } else {
        console.log("⚠️ No site config found in database, using defaults")
        setConfigSource("default")
      }
    } catch (error: any) {
      console.error("❌ Error loading site config from database:", error.message)
      setConfigError(error.message)
      setConfigSource("error")
      // Keep default config on error
    }
  }

  // Preload images function
  const preloadImages = async () => {
    const imagesToPreload = [
      "/images/background.webp",
      "/images/logo.png",
      siteConfig.siteBackground,
      siteConfig.siteLogo,
    ].filter(Boolean)

    let loadedCount = 0
    const totalImages = imagesToPreload.length

    if (totalImages === 0) {
      setImagesPreloaded(true)
      setPreloadProgress(100)
      return
    }

    const loadPromises = imagesToPreload.map((src) => {
      return new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          loadedCount++
          setPreloadProgress((loadedCount / totalImages) * 100)
          resolve()
        }
        img.onerror = () => {
          loadedCount++
          setPreloadProgress((loadedCount / totalImages) * 100)
          resolve()
        }
        img.src = src
      })
    })

    await Promise.all(loadPromises)
    setImagesPreloaded(true)
  }

  useEffect(() => {
    const initializePage = async () => {
      // Load site config first
      await loadSiteConfig()

      // Check if user is already logged in
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Check user role and redirect accordingly
          try {
            const userRef = ref(database, `users/${user.uid}`)
            const snapshot = await get(userRef)
            if (snapshot.exists()) {
              const userData = snapshot.val()

              // Check if user is active
              if (userData.active === false) {
                console.log("User is inactive, staying on login page")
                setPageLoading(false)
                return
              }

              // Redirect based on role
              if (userData.role === "manager") {
                router.push("/manager")
                return
              } else if (userData.role === "employee" || userData.role === "driver") {
                router.push("/")
                return
              }
            }
          } catch (error) {
            console.error("Error checking user role:", error)
          }
        }
        setPageLoading(false)
      })

      return unsubscribe
    }

    initializePage()
  }, [router])

  // Preload images after site config is loaded
  useEffect(() => {
    if (configSource !== "default") {
      preloadImages()
    }
  }, [siteConfig, configSource])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Check user data in database
      const userRef = ref(database, `users/${user.uid}`)
      const snapshot = await get(userRef)

      if (snapshot.exists()) {
        const userData = snapshot.val()

        // Check if user is active
        if (userData.active === false) {
          setError("Таны эрх хаагдсан байна. Менежертэй холбогдоно уу.")
          await auth.signOut()
          setLoading(false)
          return
        }

        // Redirect based on role
        switch (userData.role) {
          case "manager":
            router.push("/manager")
            break
          case "employee":
          case "driver":
            router.push("/")
            break
          default:
            setError("Тодорхойгүй хэрэглэгчийн төрөл")
            await auth.signOut()
        }
      } else {
        setError("Хэрэглэгчийн мэдээлэл олдсонгүй")
        await auth.signOut()
      }
    } catch (error: any) {
      console.error("Login error:", error)

      // Handle different error types
      switch (error.code) {
        case "auth/user-not-found":
          setError("И-мэйл хаяг олдсонгүй")
          break
        case "auth/wrong-password":
          setError("Нууц үг буруу байна")
          break
        case "auth/invalid-email":
          setError("И-мэйл хаяг буруу байна")
          break
        case "auth/too-many-requests":
          setError("Хэт олон удаа оролдлоо. Түр хүлээнэ үү")
          break
        case "auth/user-disabled":
          setError("Энэ хэрэглэгчийн эрх хаагдсан байна")
          break
        case "auth/invalid-credential":
          setError("И-мэйл эсвэл нууц үг буруу байна")
          break
        default:
          setError("Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.")
      }
    }

    setLoading(false)
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  // Show loading screen while images are preloading
  if (!imagesPreloaded && configSource !== "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-muted-foreground">Зураг ачааллаж байна...</p>
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${preloadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground">{Math.round(preloadProgress)}%</p>
          </div>
        </div>
      </div>
    )
  }

  const backgroundImage = siteConfig.siteBackground || "/images/background.webp"
  const logoImage = siteConfig.siteLogo || "/images/logo.png"

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url("${backgroundImage}")`,
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Config status indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Badge
          variant={configSource === "database" ? "default" : configSource === "error" ? "destructive" : "secondary"}
          className="flex items-center space-x-1"
        >
          {configSource === "database" && <Database className="w-3 h-3" />}
          {configSource === "default" && <Globe className="w-3 h-3" />}
          {configSource === "error" && <AlertCircle className="w-3 h-3" />}
          <span>
            {configSource === "database" && "Database"}
            {configSource === "default" && "Default"}
            {configSource === "error" && "Error"}
          </span>
        </Badge>
      </div>

      {/* Login form */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {logoImage ? (
                  <img
                    src={logoImage || "/placeholder.svg"}
                    alt="Logo"
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      console.error("Logo failed to load, using fallback")
                      e.currentTarget.style.display = "none"
                      e.currentTarget.nextElementSibling?.classList.remove("hidden")
                    }}
                  />
                ) : null}
                <Shield className={`w-12 h-12 text-primary ${logoImage ? "hidden" : ""}`} />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">{siteConfig.siteName}</CardTitle>
              <CardDescription className="text-gray-600 mt-2">Системд нэвтрэх</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">И-мэйл хаяг</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Нууц үг</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {configError && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Config алдаа: {configError}. Default тохиргоо ашиглаж байна.</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Нэвтэрч байна...</span>
                  </div>
                ) : (
                  "Нэвтрэх"
                )}
              </Button>
            </form>

            {/* User Role Information */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Хэрэглэгчийн төрөл:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>
                    <strong>Менежер:</strong> Бүх системийн удирдлага
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Users className="w-4 h-4 text-green-600" />
                  <span>
                    <strong>Ажилчин:</strong> Зогсоолын бүртгэл хийх
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Car className="w-4 h-4 text-orange-600" />
                  <span>
                    <strong>Жолооч:</strong> Зогсоолын бүртгэл хийх
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug info */}
        <div className="mt-4 text-center">
          <div className="text-xs text-white/80 space-y-1">
            <p>Config: {configSource}</p>
            <p>Images: {imagesPreloaded ? "✅ Loaded" : "⏳ Loading"}</p>
            {configSource === "database" && <p className="text-green-300">✅ Database тохиргоо ачаалагдлаа</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
