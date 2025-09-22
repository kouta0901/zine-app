"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreatorMode } from "@/types/zine"
import { EditModeSelector } from "./EditModeSelector"

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
  onEdit?: (mode: CreatorMode) => void
}

export function NovelViewer({ novelData, onClose, onEdit }: NovelViewerProps) {
  const [currentSpreadPage, setCurrentSpreadPage] = useState(1) // 1-indexed for spread view
  const [showCover, setShowCover] = useState(!!novelData.coverImageUrl)

  const novelPages = novelData.novelPages || []
  const hasCover = !!novelData.coverImageUrl

  // Calculate total spread pages (each spread shows 2 pages)
  const totalSpreadPages = Math.max(1, Math.ceil(novelPages.length / 2))

  // For backward compatibility with existing navigation
  const totalPages = hasCover ? totalSpreadPages + 1 : totalSpreadPages
  const currentPage = showCover ? 0 : currentSpreadPage

  const goToPrevPage = () => {
    if (!showCover && currentSpreadPage > 1) {
      setCurrentSpreadPage(currentSpreadPage - 1)
    } else if (!showCover && currentSpreadPage === 1 && hasCover) {
      // Go back to cover from first spread page
      setShowCover(true)
    }
  }

  const goToNextPage = () => {
    if (showCover) {
      setShowCover(false)
      setCurrentSpreadPage(1)
    } else if (currentSpreadPage < totalSpreadPages) {
      setCurrentSpreadPage(currentSpreadPage + 1)
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
          {onEdit && (
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
          {showCover ? (
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
                {/* Cover info moved below image */}
                <div className="mt-6 p-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{novelData.title}</h1>
                  <p className="text-gray-600">by {novelData.author}</p>
                  {novelData.createdAt && (
                    <p className="text-gray-500 text-sm mt-2">
                      {new Date(novelData.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            // Spread View - Left and Right Pages
            <motion.div
              key={`spread-${currentSpreadPage}`}
              className="w-full h-full flex items-center justify-center"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative w-full max-w-6xl aspect-[1.6/1] mx-auto">
                {/* Book container with styling */}
                <div
                  className="relative w-full h-full rounded-xl"
                  style={{
                    background: `
                      linear-gradient(135deg,
                        rgba(255,253,250,0.9) 0%,
                        rgba(255,253,250,0.9) 20%,
                        rgba(250,245,230,0.85) 50%,
                        rgba(245,240,225,0.9) 80%,
                        rgba(248,243,230,0.95) 100%
                      ),
                      #FFFEF9
                    `,
                    boxShadow: `
                      0 0 0 2px rgba(139,105,20,0.2),
                      0 0 0 4px rgba(74,60,40,0.1),
                      0 25px 50px -15px rgba(0,0,0,0.4),
                      inset 0 2px 0 rgba(255,253,250,0.4),
                      inset 0 -2px 0 rgba(139,115,85,0.1)
                    `,
                    zIndex: 1,
                  }}
                >
                  {/* Page aging/vintage effect */}
                  <div className="absolute inset-0 opacity-[0.03] rounded-xl" style={{
                    background: `
                      radial-gradient(circle at 20% 80%, rgba(139,69,19,0.8) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(160,82,45,0.6) 0%, transparent 50%),
                      radial-gradient(circle at 40% 40%, rgba(101,67,33,0.4) 0%, transparent 30%)
                    `
                  }}></div>

                  {/* Enhanced center binding with stitching effect */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 w-2 transform -translate-x-1/2 z-30 rounded-xl"
                    style={{
                      background: `linear-gradient(180deg,
                        rgba(139,105,20,0.4) 0%,
                        rgba(74,60,40,0.2) 20%,
                        rgba(139,115,85,0.1) 50%,
                        rgba(74,60,40,0.2) 80%,
                        rgba(139,105,20,0.4) 100%
                      )`,
                      boxShadow: `
                        -3px 0 6px rgba(139,69,19,0.3),
                        3px 0 6px rgba(139,69,19,0.3),
                        inset 0 0 2px rgba(218,165,32,0.2)
                      `,
                    }}
                  >
                    {/* Stitching pattern */}
                    <div className="absolute left-1/2 top-4 bottom-4 w-0 border-l border-dashed transform -translate-x-1/2" style={{
                      borderColor: "rgba(139,105,20,0.3)"
                    }}></div>
                  </div>

                  {/* Fixed page numbers at the bottom */}
                  <div className="absolute bottom-6 w-full flex justify-between px-6 z-40">
                    <div className="w-1/2 text-center">
                      <span className="text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>
                        {currentSpreadPage * 2 - 1}
                      </span>
                    </div>
                    <div className="w-1/2 text-center">
                      <span className="text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>
                        {currentSpreadPage * 2}
                      </span>
                    </div>
                  </div>

                  {/* Page content container */}
                  <div className="flex h-full relative z-10">
                    {/* Left page */}
                    <div className="w-1/2 pr-4 relative">
                      <div className="absolute top-6 left-6 text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>
                        {novelData.title}
                      </div>
                      <div className="px-12 py-20 h-full pb-20">
                        <div
                          className="text-lg leading-8 whitespace-pre-wrap cursor-text h-full"
                          style={{
                            color: "#4a3c28",
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            lineHeight: "2.2",
                            textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          {novelPages[(currentSpreadPage - 1) * 2] || ""}
                        </div>
                      </div>
                    </div>

                    {/* Right page */}
                    <div className="w-1/2 pl-4 relative">
                      <div className="px-12 py-20 h-full pb-20">
                        <div
                          className="text-lg leading-8 whitespace-pre-wrap cursor-text h-full"
                          style={{
                            color: "#4a3c28",
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            lineHeight: "2.2",
                            textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          {novelPages[(currentSpreadPage - 1) * 2 + 1] || ""}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle Side Navigation Areas */}
        <div
          onClick={goToPrevPage}
          className={`absolute left-0 top-0 bottom-0 w-24 flex items-center justify-start pl-4 cursor-pointer group z-20 ${
            showCover ? "pointer-events-none" : ""
          }`}
        >
          <div className={`p-3 rounded-full transition-all duration-300 ${
            showCover
              ? "opacity-0"
              : "opacity-20 group-hover:opacity-100 bg-black/20 group-hover:bg-black/40 backdrop-blur-sm"
          }`}>
            <ChevronLeft className="w-6 h-6 text-white/80 group-hover:text-white" />
          </div>
        </div>

        <div
          onClick={goToNextPage}
          className={`absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-4 cursor-pointer group z-20 ${
            (!showCover && currentSpreadPage >= totalSpreadPages) ? "pointer-events-none" : ""
          }`}
        >
          <div className={`p-3 rounded-full transition-all duration-300 ${
            (!showCover && currentSpreadPage >= totalSpreadPages)
              ? "opacity-0"
              : "opacity-20 group-hover:opacity-100 bg-black/20 group-hover:bg-black/40 backdrop-blur-sm"
          }`}>
            <ChevronRight className="w-6 h-6 text-white/80 group-hover:text-white" />
          </div>
        </div>
      </div>

      {/* Footer with page indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
        {hasCover && (
          <button
            onClick={() => {
              setShowCover(true)
              setCurrentSpreadPage(1)
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              showCover
                ? "bg-white w-8"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        )}
        {Array.from({ length: Math.min(totalSpreadPages, 10) }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setShowCover(false)
              setCurrentSpreadPage(i + 1)
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              !showCover && (i + 1) === currentSpreadPage
                ? "bg-white w-8"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
        {totalSpreadPages > 10 && (
          <span className="text-white/50 text-xs ml-2">+{totalSpreadPages - 10}</span>
        )}
      </div>
    </motion.div>
  )
}