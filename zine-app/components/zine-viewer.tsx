"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SavedZineData, Element, CreatorMode } from "@/types/zine"
import { EditModeSelector } from "./EditModeSelector"

interface Zine {
  id: string
  title: string
  author: string
  cover: string
  pages: number
  createdAt: string
}

interface ZineViewerProps {
  zine: Zine
  zineData?: SavedZineData | null
  onBack: () => void
  onEdit?: (mode: CreatorMode) => void
}

// Render a ZINE element with book-like styling
const renderZineElement = (element: Element, index: number) => {
  switch (element.type) {
    case 'text':
      return (
        <motion.div
          key={element.id}
          className="mb-4 p-3 bg-white/50 rounded border-l-4 border-amber-600"
          style={{
            color: element.color || '#4a3c28',
            fontSize: `${Math.max((element.fontSize || 16) * 0.9, 14)}px`,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
        >
          <div className="font-serif leading-relaxed whitespace-pre-wrap">
            {element.content}
          </div>
        </motion.div>
      )

    case 'image':
      return (
        <motion.div
          key={element.id}
          className="mb-6 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
        >
          <img
            src={element.src}
            alt="ZINE illustration"
            className="max-w-full h-auto rounded-lg shadow-md border border-gray-200"
            style={{
              maxHeight: '300px',
              objectFit: 'contain',
            }}
            onError={(e) => {
              console.log("ZINE image load failed:", element.src)
              e.currentTarget.src = "/placeholder.svg?height=200&width=300"
            }}
          />
        </motion.div>
      )

    case 'shape':
      return (
        <motion.div
          key={element.id}
          className="mb-4 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
        >
          <div
            className="border border-gray-300"
            style={{
              backgroundColor: element.color || '#ddd',
              borderRadius: element.content === 'circle' ? '50%' : '8px',
              width: '100px',
              height: '100px',
            }}
          />
        </motion.div>
      )

    default:
      return null
  }
}

// Mock page content
const generatePageContent = (pageNumber: number, zine: Zine) => {
  const contents = [
    {
      type: "cover",
      image: zine.cover,
      title: zine.title,
      author: zine.author,
    },
    {
      type: "text",
      title: "Chapter One",
      content:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      image: "/placeholder.svg?height=300&width=400",
    },
    {
      type: "image",
      image: "/placeholder.svg?height=500&width=400",
      caption: "Visual storytelling through imagery",
    },
    {
      type: "mixed",
      title: "Creative Process",
      content: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      image: "/placeholder.svg?height=250&width=300",
    },
  ]

  return contents[pageNumber % contents.length]
}

export function ZineViewer({ zine, zineData, onBack, onEdit }: ZineViewerProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Use actual zine data if available, otherwise use mock data
  const actualPages = zineData?.pages || []
  const hasCover = !!zineData?.coverImageUrl || !!zine.cover

  // Include cover as first page if it exists
  const totalPages = hasCover ? actualPages.length + 1 : actualPages.length
  const isOnCover = hasCover && currentPage === 0
  const contentPageIndex = hasCover ? currentPage - 1 : currentPage

  // Debug logging
  console.log('🖥️ ZineViewer rendered with:')
  console.log('  - zine:', zine?.title)
  console.log('  - zineData:', !!zineData)
  console.log('  - actualPages count:', actualPages.length)
  console.log('  - totalPages:', totalPages)
  console.log('  - hasCover:', hasCover)
  console.log('  - currentPage:', currentPage)

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevPage()
      if (e.key === "ArrowRight") goToNextPage()
      if (e.key === "Escape") onBack()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentPage, totalPages])

  // Get current page data
  const currentPageData = actualPages[contentPageIndex]

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(10px)"
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-white">
            <h2 className="text-xl font-bold">{zine.title}</h2>
            <p className="text-sm opacity-70">by {zine.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-white">
          {onEdit && zineData && (
            <EditModeSelector
              onSelectMode={(mode) => onEdit(mode)}
              onClose={() => {}}
            />
          )}
          <span className="text-sm opacity-70">
            {currentPage + 1} / {totalPages}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full max-w-7xl h-[90vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isOnCover ? (
            // Cover Page
            <motion.div
              key="cover"
              className="relative w-full h-full flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative max-w-md w-full">
                <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={zineData?.coverImageUrl || zine.cover || "/placeholder.svg"}
                    alt={zine.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Cover image failed to load:", zineData?.coverImageUrl || zine.cover)
                      e.currentTarget.src = "/placeholder.svg?height=600&width=400"
                    }}
                  />
                </div>
                {/* Cover info moved below image */}
                <div className="mt-6 p-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{zine.title}</h1>
                  <p className="text-gray-600">by {zine.author}</p>
                  {zine.createdAt && (
                    <p className="text-gray-500 text-sm mt-2">
                      {new Date(zine.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (

            // Content Page
            <motion.div
              key={`page-${currentPage}`}
              className="w-full h-full flex items-center justify-center px-8"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-lg shadow-2xl p-12 max-w-5xl w-full max-h-[70vh] overflow-y-auto">
                <div className="prose prose-lg max-w-none" style={{ color: "#4a3c28" }}>
                  <div className="relative min-h-[400px]">
                    {/* Render all elements for current page */}
                    {currentPageData?.elements?.map((element, index) =>
                      renderZineElement(element, index)
                    )}

                    {/* Debug info for empty or missing data */}
                    {(!currentPageData || !currentPageData.elements || currentPageData.elements.length === 0) && (
                      <div className="flex items-center justify-center h-[400px] text-gray-500">
                        <div className="text-center">
                          <p className="text-lg font-serif">ページ内容が見つかりません</p>
                          <p className="text-sm mt-2">
                            Page: {currentPage + 1} |
                            Data: {currentPageData ? 'Found' : 'Missing'} |
                            Elements: {currentPageData?.elements?.length || 0}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <button
          onClick={goToPrevPage}
          className={`absolute left-4 p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all ${
            currentPage === 0 ? "opacity-30 cursor-not-allowed" : ""
          }`}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={goToNextPage}
          className={`absolute right-4 p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all ${
            currentPage === totalPages - 1 ? "opacity-30 cursor-not-allowed" : ""
          }`}
          disabled={currentPage === totalPages - 1}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Footer with page indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
        {Array.from({ length: Math.min(totalPages, 10) }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentPage
                ? "bg-white w-8"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
        {totalPages > 10 && (
          <span className="text-white/50 text-xs ml-2">+{totalPages - 10}</span>
        )}
      </div>
    </motion.div>
  )
}
