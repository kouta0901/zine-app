"use client"

import { useState, useEffect } from "react"
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion"
import { Search, Plus, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ZineGallery } from "@/components/zine-gallery"
import { ZineViewer } from "@/components/zine-viewer"
import { ZineCreator } from "@/components/zine-creator"
import { CustomCursor } from "@/components/custom-cursor"

const mockZines = [
  {
    id: "1",
    title: "Urban Dreams",
    author: "Alex Chen",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 12,
    genre: "Photography",
    createdAt: "2024-01-15",
    isOwned: true,
  },
  {
    id: "2",
    title: "Analog Memories",
    author: "Sarah Kim",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 8,
    genre: "Art",
    createdAt: "2024-01-10",
    isOwned: true,
  },
  {
    id: "3",
    title: "Digital Fragments",
    author: "Maya Rodriguez",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 16,
    genre: "Digital Art",
    createdAt: "2024-01-08",
    isOwned: false,
  },
  {
    id: "4",
    title: "Nature's Whisper",
    author: "Tom Wilson",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 20,
    genre: "Nature",
    createdAt: "2024-01-05",
    isOwned: false,
  },
  {
    id: "5",
    title: "Midnight Stories",
    author: "Luna Park",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 14,
    genre: "Fiction",
    createdAt: "2024-01-03",
    isOwned: false,
  },
  {
    id: "6",
    title: "Geometric Visions",
    author: "David Lee",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 10,
    genre: "Design",
    createdAt: "2024-01-01",
    isOwned: false,
  },
]

type ViewMode = "gallery" | "viewer" | "creator"

export default function ZineApp() {
  const [viewMode, setViewMode] = useState<ViewMode>("gallery")
  const [selectedZine, setSelectedZine] = useState<(typeof mockZines)[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("All")

  // Disable mouse-driven motion to prevent subtle UI movement
  const enableMouseMotion = false
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  useEffect(() => {
    if (typeof window === "undefined" || !enableMouseMotion) return
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY, enableMouseMotion])

  const filteredZines = mockZines.filter((zine) => {
    const matchesSearch =
      zine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      zine.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === "All" || zine.genre === selectedGenre
    return matchesSearch && matchesGenre
  })

  const genres = ["All", ...Array.from(new Set(mockZines.map((zine) => zine.genre)))]

  const handleZineSelect = (zine: (typeof mockZines)[0]) => {
    setSelectedZine(zine)
    setViewMode("viewer")
  }

  const handleBackToGallery = () => {
    setViewMode("gallery")
    setSelectedZine(null)
  }

  const handleCreateNew = () => {
    setViewMode("creator")
  }

  return (
    <div className="min-h-screen overflow-hidden relative" style={{
      background: `linear-gradient(135deg, 
        #f7f1e8 0%, 
        #f5ede1 25%, 
        #f3e9d4 50%, 
        #f1e5c7 75%, 
        #ede0ba 100%
      )`,
      color: "#4a3c28"
    }}>
      {enableMouseMotion && <CustomCursor mouseX={springX} mouseY={springY} />}

      {/* Library atmosphere overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(101, 67, 33, 0.08) 0%, transparent 50%)`,
        }} />
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "gallery" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <motion.header
              className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
              style={{
                background: "rgba(245, 237, 225, 0.85)",
                borderColor: "rgba(139, 119, 95, 0.2)"
              }}
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  <motion.div
                    className="flex items-center gap-3"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                      background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                    }}>
                      <BookOpen className="w-4 h-4 text-amber-50" />
                    </div>
                    <h1 className="text-2xl font-bold" style={{
                      background: "linear-gradient(135deg, #4a3c28 0%, #6b5b47 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}>
                      TaleZine
                    </h1>
                  </motion.div>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "#8b7355" }} />
                      <Input
                        placeholder="Search ZINEs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border rounded-lg focus:outline-none focus:ring-2"
                        style={{
                          background: "rgba(255, 253, 250, 0.8)",
                          borderColor: "rgba(139, 115, 85, 0.3)",
                          color: "#4a3c28"
                        }}
                      />
                    </div>
                    {/* Removed category toggle and Create button per request */}
                  </div>
                </div>
              </div>
            </motion.header>

            <div className="pt-24">
              <ZineGallery
                zines={filteredZines}
                onZineSelect={handleZineSelect}
                onCreateNew={handleCreateNew}
                mouseX={enableMouseMotion ? mouseX : undefined}
                mouseY={enableMouseMotion ? mouseY : undefined}
              />
            </div>
          </motion.div>
        )}

        {viewMode === "viewer" && selectedZine && (
          <ZineViewer key="viewer" zine={selectedZine} onBack={handleBackToGallery} />
        )}

        {viewMode === "creator" && <ZineCreator key="creator" onBack={handleBackToGallery} />}
      </AnimatePresence>
    </div>
  )
}
