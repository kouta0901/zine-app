"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Share, Heart, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  onBack: () => void
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

export function ZineViewer({ zine, onBack }: ZineViewerProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const nextSpread = () => {
    if (currentPage === 0) {
      // From cover to first spread
      setCurrentPage(1)
    } else if (currentPage < zine.pages - 1) {
      // Move by 2 pages for spreads
      setCurrentPage(Math.min(currentPage + 2, zine.pages - 1))
    }
  }

  const prevSpread = () => {
    if (currentPage <= 1) {
      // Back to cover
      setCurrentPage(0)
    } else {
      // Move back by 2 pages for spreads
      setCurrentPage(Math.max(currentPage - 2, 1))
    }
  }

  const isSpreadView = currentPage > 0
  const leftPageContent = isSpreadView ? generatePageContent(currentPage, zine) : null
  const rightPageContent =
    isSpreadView && currentPage < zine.pages - 1 ? generatePageContent(currentPage + 1, zine) : null
  const coverContent = currentPage === 0 ? generatePageContent(0, zine) : null

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

      {/* Page Content */}
      <div className="pt-20 h-full flex items-center justify-center">
        <div className="relative max-w-6xl mx-auto px-6">
          <AnimatePresence mode="wait">
            {currentPage === 0 && coverContent && (
              <motion.div
                key="cover"
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
                <div className="aspect-[3/4] max-h-[80vh] relative">
                  <div className="relative h-full">
                    <img
                      src={coverContent.image || "/placeholder.svg"}
                      alt={coverContent.title}
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
                        {coverContent.title}
                      </motion.h1>
                      <motion.p
                        className="text-xl opacity-90"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                      >
                        by {coverContent.author}
                      </motion.p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {isSpreadView && (
              <motion.div
                key={`spread-${currentPage}`}
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
              disabled={currentPage === 0}
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
              disabled={currentPage >= zine.pages - 1}
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
        <span className="text-white text-sm">
          {currentPage === 0
            ? "Cover"
            : `${currentPage}${rightPageContent ? `-${currentPage + 1}` : ""} / ${zine.pages}`}
        </span>
        <div className="flex gap-1 ml-2">
          <button
            onClick={() => setCurrentPage(0)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentPage === 0 ? "bg-white" : "bg-white/30"
            }`}
          />
          {Array.from({ length: Math.ceil((zine.pages - 1) / 2) }).map((_, index) => {
            const pageNum = index * 2 + 1
            const isActive = currentPage >= pageNum && currentPage <= pageNum + 1
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? "bg-white" : "bg-white/30"}`}
              />
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
