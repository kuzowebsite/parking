"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { signInWithEmailAndPassword, onAuthStateChanged, type User } from "firebase/auth"
import { ref, get } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface SiteConfig {
  siteName: string
  siteLogo: string
  siteBackground: string
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Site configuration states
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: "Зогсоолын систем",
    siteLogo: "",
    siteBackground: "",
  })
  const [configSource, setConfigSource] = useState<"database" | "default" | "error">("default")
  const [configLoading, setConfigLoading] = useState(true)

  const router = useRouter()

  // Load site configuration
  const loadSiteConfig = async () => {
    setConfigLoading(true)
    try {
      console.log("🔄 Loading site config from database...")

      const siteRef = ref(database, "siteConfig")
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
      } else {
        console.log("⚠️ No site config found in database, using defaults")
        setConfigSource("default")
      }
    } catch (error) {
      console.error("❌ Error loading site config from database:", error)
      setConfigSource("error")

      // Use default config on error
      setSiteConfig({
        siteName: "Зогсоолын систем",
        siteLogo: "",
        siteBackground: "",
      })
    }
    setConfigLoading(false)
  }

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        // Check user role and redirect accordingly
        try {
          const userRef = ref(database, `users/${user.uid}`)
          const snapshot = await get(userRef)
          const userData = snapshot.val()

          if (userData) {
            if (userData.role === "manager") {
              router.push("/manager")
            } else if (userData.role === "driver") {
              router.push("/driver")
            } else if (userData.role === "employee") {
              router.push("/employee")
            } else {
              router.push("/")
            }
          } else {
            router.push("/")
          }
        } catch (error) {
          console.error("Error checking user role:", error)
          router.push("/")
        }
      }
      setCheckingAuth(false)
    })

    return unsubscribe
  }, [router])

  // Load site config on component mount
  useEffect(() => {
    loadSiteConfig()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Get user profile to check role
      const userRef = ref(database, `users/${user.uid}`)
      const snapshot = await get(userRef)
      const userData = snapshot.val()

      if (userData) {
        // Redirect based on role
        if (userData.role === "manager") {
          router.push("/manager")
        } else if (userData.role === "driver") {
          router.push("/driver")
        } else if (userData.role === "employee") {
          router.push("/employee")
        } else {
          router.push("/")
        }
      } else {
        setError("Хэрэглэгчийн мэдээлэл олдсонгүй")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      if (error.code === "auth/user-not-found") {
        setError("Хэрэглэгч олдсонгүй")
      } else if (error.code === "auth/wrong-password") {
        setError("Нууц үг буруу байна")
      } else if (error.code === "auth/invalid-email") {
        setError("И-мэйл хаяг буруу байна")
      } else if (error.code === "auth/too-many-requests") {
        setError("Хэт олон удаа оролдлоо. Түр хүлээнэ үү")
      } else {
        setError("Нэвтрэхэд алдаа гарлаа")
      }
    }
    setLoading(false)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Шалгаж байна...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {siteConfig.siteBackground ? (
          <Image
            src={siteConfig.siteBackground || "/placeholder.svg"}
            alt="Background"
            fill
            className="object-cover"
            priority
            onError={(e) => {
              console.log("Background image failed to load, using fallback")
              e.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <Image src="/images/background.webp" alt="Background" fill className="object-cover" priority />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              {siteConfig.siteLogo ? (
                <Image
                  src={siteConfig.siteLogo || "/placeholder.svg"}
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  onError={(e) => {
                    console.log("Logo failed to load, using fallback")
                    e.currentTarget.style.display = "none"
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                  <Shield className="w-10 h-10 text-primary-foreground" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">{siteConfig.siteName}</CardTitle>
            <CardDescription className="text-gray-600">Системд нэвтрэх</CardDescription>

            {/* Config Status Indicator */}
            {!configLoading && (
              <div className="mt-2">
                {configSource === "database" && (
                  <div className="text-xs text-green-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Өгөгдлийн сангаас ачаалсан
                  </div>
                )}
                {configSource === "default" && (
                  <div className="text-xs text-yellow-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                    Анхдагш тохиргоо
                  </div>
                )}
                {configSource === "error" && (
                  <div className="text-xs text-red-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                    Алдаа гарсан, анхдагш тохиргоо
                  </div>
                )}
              </div>
            )}
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
                  placeholder="example@email.com"
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
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Нэвтэрч байна...
                  </>
                ) : (
                  "Нэвтрэх"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
