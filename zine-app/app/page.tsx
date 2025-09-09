"use client"

import { useState, useEffect } from "react"
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion"
import { Search, Plus, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ZineGallery } from "@/components/zine-gallery"
import { ZineViewer } from "@/components/zine-viewer"
import { ZineCreator } from "@/components/zine-creator"
import { NovelViewer } from "@/components/novel-viewer"
import { CustomCursor } from "@/components/custom-cursor"
import { getZineWithDetails, getZines } from "@/lib/api"
import { SavedZineData } from "@/types/zine"

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

type ViewMode = "gallery" | "viewer" | "creator" | "novel-viewer"

export default function ZineApp() {
  const [viewMode, setViewMode] = useState<ViewMode>("gallery")
  const [selectedZine, setSelectedZine] = useState<(typeof mockZines)[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [selectedWorkData, setSelectedWorkData] = useState<SavedZineData | null>(null)
  const [publishedBooks, setPublishedBooks] = useState<any[]>([])
  const [publishedBooksData, setPublishedBooksData] = useState<Map<string, any>>(new Map())
  const [selectedNovel, setSelectedNovel] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Load published books from API
  useEffect(() => {
    const loadPublishedBooks = async () => {
      try {
        setLoading(true)
        const response = await getZines()
        
        // Filter published books (status: "published") and convert to My Books format
        const publishedDataMap = new Map()
        const published = response.zines
          .filter((zine: any) => zine.status === "published")
          .map((zine: any) => {
            // Store full data for viewer
            publishedDataMap.set(zine.id, zine)
            
            return {
              id: zine.id,
              title: zine.title,
              author: zine.author || "You",
              cover: zine.coverImageUrl || zine.thumbnail || "/placeholder.svg?height=400&width=300",
              pages: zine.novelPages?.length || zine.pages?.length || 1,
              genre: zine.category || "Fiction",
              createdAt: zine.publishedDate || zine.createdAt,
              isOwned: true,
              isPublished: true
            }
          })
        
        setPublishedBooksData(publishedDataMap)
        setPublishedBooks(published)
        console.log("Loaded published books:", published)
      } catch (error) {
        console.error("Failed to load published books:", error)
        setPublishedBooks([])
      } finally {
        setLoading(false)
      }
    }

    loadPublishedBooks()
  }, [])

  const handleWorkSelect = async (work: any) => {
    // Navigate to appropriate creator based on work type
    if (work.type === 'zine') {
      try {
        console.log('Loading ZINE data for:', work)
        const zineData = await getZineWithDetails(work.id)
        
        if (zineData) {
          console.log('Successfully loaded ZINE data:', zineData)
          setSelectedWorkData(zineData)
        } else {
          console.warn('No data found for ZINE:', work.id)
          setSelectedWorkData(null)
        }
        
        setViewMode("creator")
      } catch (error) {
        console.error('Failed to load ZINE data:', error)
        // Still navigate to creator but without data
        setSelectedWorkData(null)
        setViewMode("creator")
      }
    } else if (work.type === 'novel') {
      // TODO: Load novel data and navigate to novel creator
      console.log('Opening Novel:', work)
      // For now, we'll use the same creator - in the future this should be a different component
      setSelectedWorkData(null)
      setViewMode("creator")
    }
  }

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

  // Combine published books with mock discover books (but keep published books as isOwned: true)
  const allZines = [
    ...publishedBooks,
    ...mockZines.filter((zine) => !zine.isOwned) // Only include non-owned mock books for Discover section
  ]

  const filteredZines = allZines.filter((zine) => {
    const matchesSearch =
      zine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      zine.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === "All" || zine.genre === selectedGenre
    return matchesSearch && matchesGenre
  })

  const genres = ["All", ...Array.from(new Set(allZines.map((zine) => zine.genre)))]

  const handleZineSelect = (zine: (typeof mockZines)[0]) => {
    // Check if this is a published book with novel content
    if ('isPublished' in zine && zine.isPublished) {
      const fullData = publishedBooksData.get(zine.id)
      if (fullData && fullData.novelPages) {
        // Open novel viewer for published novels
        setSelectedNovel(fullData)
        setViewMode("novel-viewer")
        return
      }
    }
    
    // Default behavior for other zines
    setSelectedZine(zine)
    setViewMode("viewer")
  }

  const handleBackToGallery = () => {
    setViewMode("gallery")
    setSelectedZine(null)
    setSelectedWorkData(null)
    setSelectedNovel(null)
  }

  const handleCreateNew = () => {
    setSelectedWorkData(null) // Clear any existing work data for new creation
    setViewMode("creator")
  }

  // Refresh published books after completion
  const refreshPublishedBooks = async () => {
    try {
      const response = await getZines()
      const publishedDataMap = new Map()
      const published = response.zines
        .filter((zine: any) => zine.status === "published")
        .map((zine: any) => {
          // Store full data for viewer
          publishedDataMap.set(zine.id, zine)
          
          return {
            id: zine.id,
            title: zine.title,
            author: zine.author || "You",
            cover: zine.coverImageUrl || zine.thumbnail || "/placeholder.svg?height=400&width=300",
            pages: zine.novelPages?.length || zine.pages?.length || 1,
            genre: zine.category || "Fiction",
            createdAt: zine.publishedDate || zine.createdAt,
            isOwned: true,
            isPublished: true
          }
        })
      
      setPublishedBooksData(publishedDataMap)
      setPublishedBooks(published)
      console.log("Refreshed published books:", published)
    } catch (error) {
      console.error("Failed to refresh published books:", error)
    }
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
                onWorkSelect={handleWorkSelect}
                mouseX={enableMouseMotion ? mouseX : undefined}
                mouseY={enableMouseMotion ? mouseY : undefined}
              />
            </div>
          </motion.div>
        )}

        {viewMode === "viewer" && selectedZine && (
          <ZineViewer key="viewer" zine={selectedZine} onBack={handleBackToGallery} />
        )}

        {viewMode === "creator" && <ZineCreator key="creator" onBack={handleBackToGallery} initialData={selectedWorkData} onPublishedBooksUpdate={refreshPublishedBooks} />}

        {viewMode === "novel-viewer" && selectedNovel && (
          <NovelViewer key="novel-viewer" novelData={selectedNovel} onClose={handleBackToGallery} />
        )}
      </AnimatePresence>
    </div>
  )
}
