"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, X, BookOpen, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NovelViewerProps {
  novelData: {
    id: string
    title: string
    author: string
    novelContent?: string
    novelPages?: string[]
    coverImageUrl?: string
    createdAt?: string
  }
  onClose: () => void
}

export function NovelViewer({ novelData, onClose }: NovelViewerProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const pages = novelData.novelPages || []
  const hasCover = !!novelData.coverImageUrl

  // Include cover as first page if it exists
  const totalPages = hasCover ? pages.length + 1 : pages.length
  const isOnCover = hasCover && currentPage === 0
  const contentPageIndex = hasCover ? currentPage - 1 : currentPage

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
      if (e.key === "Escape") onClose()
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentPage, totalPages])

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
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="text-white">
            <h2 className="text-xl font-bold">{novelData.title}</h2>
            <p className="text-sm opacity-70">by {novelData.author}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-white">
          <span className="text-sm opacity-70">
            {currentPage + 1} / {totalPages}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full max-w-4xl h-[80vh] flex items-center justify-center">
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
                    src={novelData.coverImageUrl}
                    alt={novelData.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Cover image failed to load:", novelData.coverImageUrl)
                      e.currentTarget.src = "/placeholder.svg?height=600&width=400"
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-end p-8">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg p-6 w-full">
                    <h1 className="text-3xl font-bold text-white mb-2">{novelData.title}</h1>
                    <p className="text-white/80">by {novelData.author}</p>
                    {novelData.createdAt && (
                      <p className="text-white/60 text-sm mt-2">
                        {new Date(novelData.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
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
              <div className="bg-white rounded-lg shadow-2xl p-12 max-w-3xl w-full max-h-[70vh] overflow-y-auto">
                <div className="prose prose-lg max-w-none" style={{ color: "#4a3c28" }}>
                  <div className="whitespace-pre-wrap font-serif leading-relaxed text-lg">
                    {pages[contentPageIndex] || "ページ内容が見つかりません"}
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