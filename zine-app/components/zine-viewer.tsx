"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Share, Heart, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SavedZineData, Element, CreatorMode } from "@/types/zine"
import { EditModeSelector } from "./EditModeSelector"

interface Zine {
  id: string
  title: string
  author: string
  cover: string
  pages: number
  genre: string
  createdAt: string
}

interface ZineViewerProps {
  zine: Zine
  zineData?: SavedZineData | null
  onBack: () => void
  onEdit?: (mode: CreatorMode) => void
}

// Render a ZINE element
const renderZineElement = (element: Element, index: number) => {
  const baseStyle = {
    position: 'absolute' as const,
    left: `${(element.x / 1400) * 100}%`,
    top: `${(element.y / 900) * 100}%`,
    width: `${(element.width / 1400) * 100}%`,
    height: `${(element.height / 900) * 100}%`,
  }

  switch (element.type) {
    case 'text':
      return (
        <motion.div
          key={element.id}
          style={{
            ...baseStyle,
            color: element.color || '#000',
            fontSize: `${(element.fontSize || 16) * 0.8}px`, // Scale down for viewer
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: '8px',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
        >
          {element.content}
        </motion.div>
      )
    
    case 'image':
      return (
        <motion.img
          key={element.id}
          src={element.src}
          alt="ZINE element"
          style={{
            ...baseStyle,
            objectFit: 'cover',
            borderRadius: '4px',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
        />
      )
    
    case 'shape':
      return (
        <motion.div
          key={element.id}
          style={{
            ...baseStyle,
            backgroundColor: element.color || '#000',
            borderRadius: element.content === 'circle' ? '50%' : '0',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
        />
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
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false) // Fixed
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showCover, setShowCover] = useState(true) // Start with cover display
  const [showEditSelector, setShowEditSelector] = useState(false)

  // Use actual zine data if available, otherwise use mock data
  const actualPages = zineData?.pages || []
  const totalPages = Math.max(actualPages.length, zine.pages)
  
  // Force cover display if no ZINE data
  useEffect(() => {
    if (!zineData || actualPages.length === 0) {
      setShowCover(true)
      console.log('🔧 Forcing cover display due to missing ZineData')
    }
  }, [zineData, actualPages.length])
  
  // Debug logging
  console.log('🖥️ ZineViewer rendered with:')
  console.log('  - zine:', zine?.title)
  console.log('  - zineData:', !!zineData)
  console.log('  - actualPages count:', actualPages.length)
  console.log('  - totalPages:', totalPages)
  console.log('  - showCover:', showCover)
  console.log('  - currentPageIndex:', currentPageIndex)

  const nextSpread = () => {
    console.log('➡️ Next button clicked. Current state:', { showCover, currentPageIndex, totalPages })
    
    if (showCover) {
      // From cover to first page
      setShowCover(false)
      setCurrentPageIndex(0)
      console.log('📖 Transitioning from cover to page 0')
    } else if (zineData) {
      // For actual ZINE data: move to next page
      if (currentPageIndex < totalPages - 1) {
        setCurrentPageIndex(currentPageIndex + 1)
        console.log('📄 Moving to page:', currentPageIndex + 1)
      }
    } else {
      // For mock data: original behavior
      if (currentPageIndex === 0) {
        setCurrentPageIndex(1)
      } else if (currentPageIndex < zine.pages - 1) {
        setCurrentPageIndex(Math.min(currentPageIndex + 2, zine.pages - 1))
      }
    }
  }

  const prevSpread = () => {
    console.log('⬅️ Previous button clicked. Current state:', { showCover, currentPageIndex })
    
    if (!showCover && currentPageIndex === 0) {
      // From first page back to cover
      setShowCover(true)
      console.log('📖 Transitioning from page to cover')
    } else if (zineData && !showCover) {
      // For actual ZINE data: move to previous page
      if (currentPageIndex > 0) {
        setCurrentPageIndex(currentPageIndex - 1)
        console.log('📄 Moving to page:', currentPageIndex - 1)
      }
    } else if (!zineData) {
      // For mock data: original behavior
      if (currentPageIndex <= 1) {
        setCurrentPageIndex(0)
      } else {
        setCurrentPageIndex(Math.max(currentPageIndex - 2, 1))
      }
    }
  }

  const isSpreadView = !showCover && zineData && actualPages.length > 0
  const isCoverView = showCover
  
  // Get current page data
  const currentPageData = actualPages[currentPageIndex]
  
  // For mock data fallback
  const leftPageContent = !isSpreadView ? generatePageContent(currentPageIndex, zine) : null
  const rightPageContent = !isSpreadView && currentPageIndex < zine.pages - 1 ? generatePageContent(currentPageIndex + 1, zine) : null
  const coverContent = isCoverView ? generatePageContent(0, zine) : null

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div>
                <h1 className="text-xl font-bold text-white">{zine.title}</h1>
                <p className="text-sm text-gray-400">by {zine.author}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && zineData && (
                <EditModeSelector
                  onSelectMode={(mode) => onEdit(mode)}
                  onClose={() => setShowEditSelector(false)}
                />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className={`text-white hover:bg-white/10 ${isLiked ? "text-red-500" : ""}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`text-white hover:bg-white/10 ${isBookmarked ? "text-yellow-500" : ""}`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
              </Button>

              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Share className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Debug Panel (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-20 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-40">
          <h3 className="font-bold mb-2">🐛 Debug Info</h3>
          <div className="space-y-1">
            <div>Zine: {zine?.title}</div>
            <div>ZineData: {zineData ? '✅ Found' : '❌ Missing'}</div>
            <div>ActualPages: {actualPages.length}</div>
            <div>TotalPages: {totalPages}</div>
            <div>ShowCover: {showCover ? '✅' : '❌'}</div>
            <div>CurrentPageIndex: {currentPageIndex}</div>
            <div>IsSpreadView: {isSpreadView ? '✅' : '❌'}</div>
            <div>CurrentPageData: {currentPageData ? '✅' : '❌'}</div>
            <div>Elements: {currentPageData?.elements?.length || 0}</div>
            {zineData && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <div>Cover URL: {zineData.coverImageUrl ? '✅' : '❌'}</div>
                <div>Mode: {zineData.currentMode || 'unknown'}</div>
                <div>Created: {zineData.createdAt?.slice(0, 10)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="pt-20 h-full flex items-center justify-center">
        <div className="relative max-w-6xl mx-auto px-6">
          <AnimatePresence mode="wait">
            {/* Cover Display */}
            {isCoverView && (
              <motion.div
                key="cover"
                className="bg-white rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
                initial={{ opacity: 0, rotateY: -15, z: -100 }}
                animate={{ opacity: 1, rotateY: 0, z: 0 }}
                exit={{ opacity: 0, rotateY: 15, z: -100 }}
                transition={{
                  duration: 0.8,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  perspective: 1000,
                  transformStyle: "preserve-3d",
                }}
                onClick={() => {
                  console.log('📖 Cover clicked, transitioning to pages')
                  setShowCover(false)
                  setCurrentPageIndex(0)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="aspect-[3/4] max-h-[80vh] relative">
                  <div className="relative h-full">
                    <img
                      src={zineData?.coverImageUrl || zine.cover || "/placeholder.svg"}
                      alt={zine.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-8 left-8 text-white">
                      <motion.h1
                        className="text-4xl font-bold mb-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                      >
                        {zine.title}
                      </motion.h1>
                      <motion.p
                        className="text-xl opacity-90"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                      >
                        by {zine.author}
                      </motion.p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actual ZINE Page Display */}
            {isSpreadView && currentPageData && (
              <motion.div
                key={`zine-page-${currentPageIndex}`}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
                initial={{ opacity: 0, rotateY: -15, z: -100 }}
                animate={{ opacity: 1, rotateY: 0, z: 0 }}
                exit={{ opacity: 0, rotateY: 15, z: -100 }}
                transition={{
                  duration: 0.8,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  perspective: 1000,
                  transformStyle: "preserve-3d",
                }}
              >
                <div 
                  className="relative"
                  style={{
                    width: '1000px',
                    height: '643px', // Maintain 1400:900 aspect ratio scaled down
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                  }}
                >
                  {/* Render all elements for current page */}
                  {currentPageData?.elements?.map((element, index) => 
                    renderZineElement(element, index)
                  )}
                  
                  {/* Debug info for empty or missing data */}
                  {(!currentPageData || !currentPageData.elements || currentPageData.elements.length === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <p className="text-lg">No content on this page</p>
                        <p className="text-sm mt-2">
                          Page: {currentPageIndex + 1} | 
                          Data: {currentPageData ? 'Found' : 'Missing'} | 
                          Elements: {currentPageData?.elements?.length || 0}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Page binding line */}
                  <div
                    className="absolute top-0 bottom-0 bg-gray-300"
                    style={{
                      left: '50%',
                      width: '2px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Mock data fallback for non-ZINE content */}
            {!zineData && !showCover && (leftPageContent || rightPageContent) && (
              <motion.div
                key={`spread-${currentPageIndex}`}
                className="flex gap-1 bg-white rounded-2xl shadow-2xl overflow-hidden"
                initial={{ opacity: 0, rotateY: -15, z: -100 }}
                animate={{ opacity: 1, rotateY: 0, z: 0 }}
                exit={{ opacity: 0, rotateY: 15, z: -100 }}
                transition={{
                  duration: 0.8,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  perspective: 1000,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Left Page */}
                <div className="flex-1 aspect-[3/4] max-h-[80vh] relative border-r border-gray-200">
                  {leftPageContent && (
                    <>
                      {leftPageContent.type === "text" && (
                        <div className="h-full p-8 flex flex-col justify-center">
                          <motion.h2
                            className="text-2xl font-bold text-gray-900 mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                          >
                            {leftPageContent.title}
                          </motion.h2>
                          <motion.p
                            className="text-base text-gray-700 leading-relaxed mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                          >
                            {leftPageContent.content}
                          </motion.p>
                          <motion.img
                            src={leftPageContent.image}
                            alt="Illustration"
                            className="w-full max-w-xs mx-auto rounded-lg shadow-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7, duration: 0.6 }}
                          />
                        </div>
                      )}

                      {leftPageContent.type === "image" && (
                        <div className="h-full relative">
                          <motion.img
                            src={leftPageContent.image}
                            alt="Full page image"
                            className="w-full h-full object-cover"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                          />
                          {leftPageContent.caption && (
                            <motion.div
                              className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5, duration: 0.6 }}
                            >
                              <p className="text-white text-sm text-center">{leftPageContent.caption}</p>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {leftPageContent.type === "mixed" && (
                        <div className="h-full p-6 flex flex-col justify-center">
                          <motion.h2
                            className="text-xl font-bold text-gray-900 mb-3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                          >
                            {leftPageContent.title}
                          </motion.h2>
                          <motion.p
                            className="text-sm text-gray-700 leading-relaxed mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                          >
                            {leftPageContent.content}
                          </motion.p>
                          <motion.img
                            src={leftPageContent.image}
                            alt="Supporting image"
                            className="w-full rounded-lg shadow-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7, duration: 0.6 }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Right Page */}
                <div className="flex-1 aspect-[3/4] max-h-[80vh] relative">
                  {rightPageContent && (
                    <>
                      {rightPageContent.type === "text" && (
                        <div className="h-full p-8 flex flex-col justify-center">
                          <motion.h2
                            className="text-2xl font-bold text-gray-900 mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                          >
                            {rightPageContent.title}
                          </motion.h2>
                          <motion.p
                            className="text-base text-gray-700 leading-relaxed mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                          >
                            {rightPageContent.content}
                          </motion.p>
                          <motion.img
                            src={rightPageContent.image}
                            alt="Illustration"
                            className="w-full max-w-xs mx-auto rounded-lg shadow-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8, duration: 0.6 }}
                          />
                        </div>
                      )}

                      {rightPageContent.type === "image" && (
                        <div className="h-full relative">
                          <motion.img
                            src={rightPageContent.image}
                            alt="Full page image"
                            className="w-full h-full object-cover"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                          {rightPageContent.caption && (
                            <motion.div
                              className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6, duration: 0.6 }}
                            >
                              <p className="text-white text-sm text-center">{rightPageContent.caption}</p>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {rightPageContent.type === "mixed" && (
                        <div className="h-full p-6 flex flex-col justify-center">
                          <motion.h2
                            className="text-xl font-bold text-gray-900 mb-3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                          >
                            {rightPageContent.title}
                          </motion.h2>
                          <motion.p
                            className="text-sm text-gray-700 leading-relaxed mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                          >
                            {rightPageContent.content}
                          </motion.p>
                          <motion.img
                            src={rightPageContent.image}
                            alt="Supporting image"
                            className="w-full rounded-lg shadow-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8, duration: 0.6 }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4">
            <Button
              variant="ghost"
              size="lg"
              onClick={prevSpread}
              disabled={showCover || (!zineData && currentPageIndex === 0)}
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 right-4">
            <Button
              variant="ghost"
              size="lg"
              onClick={nextSpread}
              disabled={
                (!showCover && zineData && currentPageIndex >= totalPages - 1) ||
                (!showCover && !zineData && currentPageIndex >= zine.pages - 1)
              }
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
        <span className="text-white text-sm">
          {showCover 
            ? "Cover"
            : (zineData 
                ? `Page ${currentPageIndex + 1} / ${totalPages}`
                : `${currentPageIndex}${rightPageContent ? `-${currentPageIndex + 1}` : ""} / ${zine.pages}`)
          }
        </span>
        <div className="flex gap-1 ml-2">
          {/* Cover indicator */}
          <button
            onClick={() => {
              setShowCover(true)
              setCurrentPageIndex(0)
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              showCover ? "bg-white" : "bg-white/30"
            }`}
          />
          
          {/* Page indicators */}
          {zineData && Array.from({ length: totalPages }).map((_, index) => {
            const isActive = !showCover && currentPageIndex === index
            
            return (
              <button
                key={index}
                onClick={() => {
                  setShowCover(false)
                  setCurrentPageIndex(index)
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? "bg-white" : "bg-white/30"}`}
              />
            )
          })}
          
          {/* Mock data page indicators */}
          {!zineData && Array.from({ length: Math.ceil((zine.pages - 1) / 2) }).map((_, index) => {
            const pageNum = index * 2 + 1
            const isActive = !showCover && currentPageIndex >= pageNum && currentPageIndex <= pageNum + 1
            
            return (
              <button
                key={index}
                onClick={() => {
                  setShowCover(false)
                  setCurrentPageIndex(pageNum)
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? "bg-white" : "bg-white/30"}`}
              />
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
