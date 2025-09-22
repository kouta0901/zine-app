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
import { NotificationContainer } from "@/components/notification"
import { getZineWithDetails, getZines, deleteZine } from "@/lib/api"
import { SavedZineData, CreatorMode } from "@/types/zine"

const mockZines = [
  {
    id: "1",
    title: "Urban Dreams",
    author: "Alex Chen",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 12,
    createdAt: "2024-01-15",
    isOwned: true,
  },
  {
    id: "2",
    title: "Analog Memories",
    author: "Sarah Kim",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 8,
    createdAt: "2024-01-10",
    isOwned: true,
  },
  {
    id: "3",
    title: "Digital Fragments",
    author: "Maya Rodriguez",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 16,
    createdAt: "2024-01-08",
    isOwned: false,
  },
  {
    id: "4",
    title: "Nature's Whisper",
    author: "Tom Wilson",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 20,
    createdAt: "2024-01-05",
    isOwned: false,
  },
  {
    id: "5",
    title: "Midnight Stories",
    author: "Luna Park",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 14,
    createdAt: "2024-01-03",
    isOwned: false,
  },
  {
    id: "6",
    title: "Geometric Visions",
    author: "David Lee",
    cover: "/placeholder.svg?height=400&width=300",
    pages: 10,
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
        
        // 🔥 Filter published books (status: "published") and convert to My Books format
        const publishedDataMap = new Map()
        
        // 🔥 Debug: Log all zines and their statuses
        console.log("📚 All zines from API:")
        response.zines.forEach((zine: any) => {
          console.log(`  - "${zine.title}": status="${zine.status}", isComplete=${zine.isComplete}, coverImageUrl=${!!zine.coverImageUrl}`)
        })

        // 🔄 Auto-migrate existing works with covers to published status
        const worksToUpdate: any[] = []
        response.zines.forEach((zine: any) => {
          // Check if work has content and cover but is still marked as draft
          const hasContent = (zine.novelContent && zine.novelContent.trim()) || 
                           (zine.pages && zine.pages.length > 0 && zine.pages.some((page: any) => page.elements && page.elements.length > 0))
          const hasCover = !!zine.coverImageUrl
          const isDraft = zine.status === "draft"
          
          if (hasContent && hasCover && isDraft) {
            console.log(`🔄 Auto-migrating "${zine.title}" from draft to published (has content + cover)`)
            worksToUpdate.push({
              ...zine,
              status: "published",
              isComplete: true,
              publishedDate: zine.publishedDate || new Date().toISOString()
            })
          }
        })

        // Update works that need migration
        for (const work of worksToUpdate) {
          try {
            await saveZine(work)
            console.log(`✅ Successfully migrated "${work.title}" to published status`)
          } catch (error) {
            console.error(`❌ Failed to migrate "${work.title}":`, error)
          }
        }

        // Reload data if any migrations occurred
        if (worksToUpdate.length > 0) {
          console.log(`🔄 Reloading data after migrating ${worksToUpdate.length} works...`)
          const updatedResponse = await getZines()
          response = updatedResponse
        }
        
        const published = response.zines
          .filter((zine: any) => {
            const isPublished = zine.status === "published"
            if (!isPublished) {
              console.log(`🚫 Filtered out "${zine.title}" from My Books (status: ${zine.status})`)
            }
            return isPublished
          })
          .map((zine: any) => {
            // Store full data for viewer
            publishedDataMap.set(zine.id, zine)
            
            return {
              id: zine.id,
              title: zine.title,
              author: zine.author || "You",
              cover: zine.coverImageUrl || zine.thumbnail || zine.cover || "/placeholder.svg?height=400&width=300",
              pages: zine.novelPages?.length || zine.pages?.length || 1,
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

  const handleZineSelect = async (zine: (typeof mockZines)[0]) => {
    console.log('🎯 ZineSelect called with:', zine)
    
    // Check if this is a published book
    if ('isPublished' in zine && zine.isPublished) {
      console.log('📚 Published book detected:', zine.id)
      const fullData = publishedBooksData.get(zine.id)
      console.log('📦 Full data from map:', fullData)
      
      if (fullData) {
        console.log('🔍 Analyzing fullData mode and content:')
        console.log('  - currentMode:', fullData.currentMode)
        console.log('  - has novelPages:', !!fullData.novelPages, 'length:', fullData.novelPages?.length || 0)
        console.log('  - has pages:', !!fullData.pages, 'length:', fullData.pages?.length || 0)
        
        // Mode-based routing: prioritize currentMode over data presence
        if (fullData.currentMode === "novel" && fullData.novelPages && fullData.novelPages.length > 0) {
          console.log('📖 Opening novel viewer based on currentMode for:', fullData.title)
          // Open novel viewer for published novels
          setSelectedNovel(fullData)
          setViewMode("novel-viewer")
          return
        } else if (fullData.currentMode === "zine" && fullData.pages) {
          console.log('📄 Opening ZINE viewer based on currentMode. Page count:', fullData.pages?.length)
          // Load full ZINE data for ZINE viewer
          try {
            const zineData = await getZineWithDetails(zine.id)
            console.log('🔄 Loaded ZINE data:', zineData)
            
            if (zineData) {
              console.log('✅ ZINE data loaded successfully:')
              console.log('  - Title:', zineData.title)
              console.log('  - Pages count:', zineData.pages?.length)
              console.log('  - Cover URL:', zineData.coverImageUrl)
              console.log('  - Page details:', zineData.pages?.map(p => ({ id: p.id, elementsCount: p.elements?.length })))
              
              // Pass the full ZINE data to viewer
              setSelectedWorkData(zineData)
              setSelectedZine(zine)
              setViewMode("viewer")
              return
            } else {
              console.warn('⚠️ No ZINE data returned from getZineWithDetails')
            }
          } catch (error) {
            console.error('❌ Failed to load ZINE data for viewer:', error)
            // Try to use local data as fallback
            if (fullData.pages && fullData.pages.length > 0) {
              console.log('🔄 Using cached fullData as fallback for ZINE viewer')
              setSelectedWorkData(fullData)
              setSelectedZine(zine)
              setViewMode("viewer")
              return
            }
          }
        } else {
          console.log('🔄 No mode match or missing data, trying fallback logic:')
          
          // Fallback: try original logic for backward compatibility
          if (fullData.novelPages && fullData.novelPages.length > 0) {
            console.log('📖 Fallback: Opening novel viewer due to novelPages')
            setSelectedNovel(fullData)
            setViewMode("novel-viewer")
            return
          } else if (fullData.pages && fullData.pages.length > 0) {
            console.log('📄 Fallback: Opening ZINE viewer due to pages')
            try {
              const zineData = await getZineWithDetails(zine.id)
              if (zineData) {
                setSelectedWorkData(zineData)
                setSelectedZine(zine)
                setViewMode("viewer")
                return
              }
            } catch (error) {
              console.error('❌ Fallback ZINE loading failed:', error)
              // Use cached data as last resort
              if (fullData.pages && fullData.pages.length > 0) {
                console.log('🔄 Using cached fullData as final fallback')
                setSelectedWorkData(fullData)
                setSelectedZine(zine)
                setViewMode("viewer")
                return
              }
            }
          } else {
            console.log('🤷 No usable content found in fullData')
          }
        }
      } else {
        console.warn('⚠️ No fullData found for published book:', zine.id)
      }
    } else {
      console.log('📑 Mock/non-published book detected')
    }
    
    // Default behavior for other zines (mock data)
    console.log('🎭 Using mock data for:', zine.title)
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

  const handleEditWork = (mode: CreatorMode) => {
    // Edit function for ZineViewer
    if (viewMode === "viewer" && selectedWorkData) {
      console.log('📝 Editing ZINE in', mode, 'mode:', selectedWorkData.title)
      // Set the mode in the data before passing to creator
      setSelectedWorkData({ ...selectedWorkData, currentMode: mode })
      setViewMode("creator")
    } 
    // Edit function for NovelViewer
    else if (viewMode === "novel-viewer" && selectedNovel) {
      console.log('📝 Editing Novel in', mode, 'mode:', selectedNovel.title)
      // Set the mode in the data before passing to creator
      setSelectedWorkData({ ...selectedNovel, currentMode: mode })
      setViewMode("creator")
    }
  }

  // Refresh published books after completion
  const refreshPublishedBooks = async () => {
    try {
      const response = await getZines()
      const publishedDataMap = new Map()
      
      // 🔥 Debug: Log refresh data
      console.log("🔄 Refreshing published books:")
      response.zines.forEach((zine: any) => {
        console.log(`  - "${zine.title}": status="${zine.status}", isComplete=${zine.isComplete}`)
      })
      
      const published = response.zines
        .filter((zine: any) => {
          const isPublished = zine.status === "published"
          if (!isPublished) {
            console.log(`🚫 Refresh: Filtered out "${zine.title}" from My Books (status: ${zine.status})`)
          }
          return isPublished
        })
        .map((zine: any) => {
          // Store full data for viewer
          publishedDataMap.set(zine.id, zine)
          
          // 🔍 デバッグ用ログ: 表紙データの状態確認
          const coverSources = {
            coverImageUrl: zine.coverImageUrl,
            thumbnail: zine.thumbnail,
            cover: zine.cover
          }
          const finalCover = zine.coverImageUrl || zine.thumbnail || zine.cover || "/placeholder.svg?height=400&width=300"
          console.log(`📖 ZINE "${zine.title}" cover sources:`, coverSources, "→ Final:", finalCover)
          
          return {
            id: zine.id,
            title: zine.title,
            author: zine.author || "You",
            cover: finalCover,
            pages: zine.novelPages?.length || zine.pages?.length || 1,
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

  // Handle ZINE deletion (published books)
  const handleZineDelete = async (zine: any) => {
    try {
      console.log("Deleting ZINE:", zine.title, zine.id)
      await deleteZine(zine.id)
      
      // Remove from local state
      setPublishedBooks(prev => prev.filter(book => book.id !== zine.id))
      setPublishedBooksData(prev => {
        const newMap = new Map(prev)
        newMap.delete(zine.id)
        return newMap
      })
      
      console.log("ZINE deleted successfully:", zine.title)
    } catch (error) {
      console.error("Failed to delete ZINE:", error)
      // TODO: Show error notification to user
    }
  }

  // Handle work deletion (works in progress)
  const handleWorkDelete = async (work: any) => {
    try {
      console.log("Deleting work:", work.title, work.id)
      
      if (work.type === 'zine') {
        await deleteZine(work.id)
      }
      // For novels, we only have localStorage for now
      else if (work.type === 'novel') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`novel_${work.id}`)
          window.dispatchEvent(new Event('localStorageUpdate'))
        }
      }
      
      console.log("Work deleted successfully:", work.title)
    } catch (error) {
      console.error("Failed to delete work:", error)
      // For localStorage-only items, try to remove them anyway
      if (typeof window !== 'undefined') {
        const key = work.type === 'zine' ? `zine_${work.id}` : `novel_${work.id}`
        localStorage.removeItem(key)
        window.dispatchEvent(new Event('localStorageUpdate'))
      }
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
      <NotificationContainer />
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
                        placeholder="Search Books..."
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
                onZineDelete={handleZineDelete}
                onWorkDelete={handleWorkDelete}
                mouseX={enableMouseMotion ? mouseX : undefined}
                mouseY={enableMouseMotion ? mouseY : undefined}
              />
            </div>
          </motion.div>
        )}

        {viewMode === "viewer" && selectedZine && (
          <ZineViewer key="viewer" zine={selectedZine} zineData={selectedWorkData} onBack={handleBackToGallery} onEdit={handleEditWork} />
        )}

        {viewMode === "creator" && <ZineCreator key="creator" onBack={handleBackToGallery} initialData={selectedWorkData} onPublishedBooksUpdate={refreshPublishedBooks} />}

        {viewMode === "novel-viewer" && selectedNovel && (
          <NovelViewer key="novel-viewer" novelData={selectedNovel} onClose={handleBackToGallery} onEdit={handleEditWork} />
        )}
      </AnimatePresence>
    </div>
  )
}
