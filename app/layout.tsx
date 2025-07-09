"use client"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { SiteConfig } from "@/types"
import Image from "next/image"

export default function Loading() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Fetch site configuration
    const siteConfigRef = ref(database, "siteConfig")
    const unsubscribe = onValue(siteConfigRef, (snapshot) => {
      if (snapshot.exists()) {
        setSiteConfig(snapshot.val())
      }
    })

    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: siteConfig?.backgroundColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-800/20"></div>
      
      <div className="relative z-10 text-center px-6 max-w-sm w-full">
        {/* Logo */}
        <div className="mb-8">
          {siteConfig?.siteLogo ? (
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <Image
                src={siteConfig.siteLogo || "/placeholder.svg"}
                alt="Site Logo"
                fill
                className="object-contain filter drop-shadow-lg"
              />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Site Name */}
        <h1 
          className="text-3xl font-bold mb-8 tracking-wider"
          style={{ 
            color: siteConfig?.primaryColor || '#ffffff',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          {siteConfig?.siteName || 'PARKYSPOT'}
        </h1>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-4 backdrop-blur-sm">
          <div
            className="h-2 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: siteConfig?.primaryColor || '#10b981'
            }}
          ></div>
        </div>

        {/* Loading Text */}
        <p className="text-white/90 text-sm mb-2">
          Ачааллаж байна... {Math.round(Math.min(progress, 100))}%
        </p>

        {/* Loading Dots */}
        <div className="flex justify-center space-x-1 mb-8">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: siteConfig?.primaryColor || '#10b981' }}
          ></div>
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              backgroundColor: siteConfig?.primaryColor || '#10b981',
              animationDelay: '0.2s'
            }}
          ></div>
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              backgroundColor: siteConfig?.primaryColor || '#10b981',
              animationDelay: '0.4s'
            }}
          ></div>
        </div>

        {/* Wait Text */}
        <p className="text-white/70 text-xs">
          Түр хүлээн үү...
        </p>
      </div>
    </div>
  )
}
