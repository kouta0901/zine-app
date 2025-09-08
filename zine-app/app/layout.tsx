import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
})

export const metadata: Metadata = {
  title: "ZINE - Creative Magazine Platform",
  description: "Create and explore immersive digital magazines",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Create consistent class string to avoid hydration mismatch
  const htmlClassName = [inter.variable, playfair.variable].join(' ')
  
  return (
    <html lang="en" className={htmlClassName} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background dark" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
