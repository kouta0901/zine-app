"use client"

import { motion, type MotionValue, useTransform } from "framer-motion"
import { useState } from "react"
import { User, Calendar, BookOpen, Plus } from "lucide-react"
import { format } from "date-fns"
import { WorksInProgressWrapper } from "./works-in-progress-wrapper"

interface Zine {
  id: string
  title: string
  author: string
  cover: string
  pages: number
  genre: string
  createdAt: string
  isOwned?: boolean
}

interface ZineGalleryProps {
  zines: Zine[]
  onZineSelect: (zine: Zine) => void
  onCreateNew: () => void
  onWorkSelect?: (work: any) => void
  mouseX?: MotionValue<number>
  mouseY?: MotionValue<number>
}

export function ZineGallery({ zines, onZineSelect, onCreateNew, onWorkSelect, mouseX, mouseY }: ZineGalleryProps) {
  const myBooks = zines.filter((zine) => zine.isOwned)
  const otherBooks = zines.filter((zine) => !zine.isOwned)

  // Parallax effect based on mouse position (optional)
  const hasMotion = Boolean(mouseX) && Boolean(mouseY)
  const parallaxX = hasMotion
    ? useTransform(mouseX as MotionValue<number>, [0, typeof window !== "undefined" ? window.innerWidth : 1920], [-20, 20])
    : undefined
  const parallaxY = hasMotion
    ? useTransform(mouseY as MotionValue<number>, [0, typeof window !== "undefined" ? window.innerHeight : 1080], [-10, 10])
    : undefined

  return (
    <div className="relative min-h-screen px-6 py-8">
      <motion.div
        className="max-w-7xl mx-auto"
        style={{
          x: parallaxX ?? 0,
          y: parallaxY ?? 0,
        }}
      >
        {/* Works in Progress Section */}
        {onWorkSelect && <WorksInProgressWrapper onWorkSelect={onWorkSelect} />}

        <motion.section
          className="mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold" style={{ color: "#4a3c28" }}>My Books</h2>
            <motion.button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #8b6914 0%, #a0751f 50%, #b8860b 100%)"
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-cursor-hover
            >
              <Plus className="w-5 h-5" />
              本を新規作成
            </motion.button>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
          >
            {myBooks.map((zine, index) => (
              <ZineCard key={zine.id} zine={zine} index={index} onSelect={() => onZineSelect(zine)} isOwned />
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: "#4a3c28" }}>Discover</h2>
            <p style={{ color: "#8b7355" }}>Explore amazing ZINEs created by the community</p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
          >
            {otherBooks.map((zine, index) => (
              <ZineCard key={zine.id} zine={zine} index={index} onSelect={() => onZineSelect(zine)} />
            ))}
          </motion.div>
        </motion.section>
      </motion.div>
    </div>
  )
}

interface ZineCardProps {
  zine: Zine
  index: number
  onSelect: () => void
  isOwned?: boolean
}

function ZineCard({ zine, index, onSelect, isOwned }: ZineCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="group cursor-pointer"
      data-cursor-hover
      initial={{ opacity: 0, y: 50, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -10,
        rotateX: 5,
        rotateY: 5,
        scale: 1.02,
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      style={{ perspective: 1000 }}
    >
      <div
        className="relative rounded-2xl overflow-hidden backdrop-blur-sm border transition-all duration-500 group-hover:shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(247, 241, 232, 0.9) 0%, rgba(241, 229, 199, 0.8) 100%)",
          borderColor: isOwned ? "rgba(139, 105, 20, 0.4)" : "rgba(139, 115, 85, 0.3)",
          boxShadow: isHovered ? "0 25px 50px -12px rgba(139, 105, 20, 0.25)" : "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
        }}
      >
        {isOwned && (
          <div className="absolute top-2 left-2 z-10">
            <div className="w-3 h-3 rounded-full border-2" style={{
              backgroundColor: "#8b6914",
              borderColor: "rgba(255, 253, 250, 0.6)"
            }}></div>
          </div>
        )}

        {/* Cover Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <motion.img
            src={zine.cover}
            alt={zine.title}
            className="w-full h-full object-cover"
            animate={{
              scale: isHovered ? 1.1 : 1,
              filter: isHovered ? "brightness(1.1) contrast(1.1)" : "brightness(1) contrast(1)",
            }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          />

          {/* Hover overlay with wave effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
            animate={{
              opacity: isHovered ? 1 : 0.7,
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Distortion effect on hover */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br mix-blend-overlay ${
              isOwned ? "from-purple-500/30 to-pink-500/30" : "from-purple-500/20 to-pink-500/20"
            }`}
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1.05 : 1,
            }}
            transition={{ duration: 0.4 }}
          />

          {/* Genre badge */}
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 text-xs font-medium backdrop-blur-sm rounded-full border" style={{
              backgroundColor: "rgba(139, 105, 20, 0.8)",
              color: "#fffdf7",
              borderColor: "rgba(255, 253, 250, 0.3)"
            }}>
              {zine.genre}
            </span>
          </div>

          {/* Pages indicator */}
          <div className="absolute bottom-3 right-3">
            <div className="flex items-center gap-1 px-2 py-1 text-xs backdrop-blur-sm rounded-full border" style={{
              backgroundColor: "rgba(139, 105, 20, 0.8)",
              color: "#fffdf7",
              borderColor: "rgba(255, 253, 250, 0.3)"
            }}>
              <BookOpen className="w-3 h-3" />
              {zine.pages}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <motion.h3
            className="font-bold text-lg mb-1 line-clamp-1"
            animate={{
              color: isHovered ? "#8b6914" : "#4a3c28",
            }}
            transition={{ duration: 0.3 }}
          >
            {zine.title}
          </motion.h3>

          <div className="flex items-center gap-2 text-sm mb-2" style={{ color: "#8b7355" }}>
            <User className="w-3 h-3" />
            <span>{zine.author}</span>
          </div>

          <div className="flex items-center gap-2 text-xs" style={{ color: "#a0896c" }}>
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(zine.createdAt), "yyyy/MM/dd")}</span>
          </div>
        </div>

        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-transparent"
          animate={{
            borderColor: isHovered ? "rgba(139, 105, 20, 0.6)" : "transparent",
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  )
}
