import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Зогсоолын систем",
  description: "Зогсоолын удирдлагын систем",
  themeColor: "#10b981",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Зогсоолын систем",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="mn">
      <head>
        {/* Динамик manifest линк */}
        <link rel="manifest" href="/api/manifest" />
        <meta name="theme-color" content="#10b981" />

        {/* Apple PWA мета тагууд */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Зогсоолын систем" />
        <link rel="apple-touch-icon" href="/images/logo.png" />

        {/* Microsoft PWA мета тагууд */}
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Бусад PWA мета тагууд */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Зогсоолын систем" />

        {/* Favicon */}
        <link rel="icon" href="/images/logo.png" />
        <link rel="shortcut icon" href="/images/logo.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
