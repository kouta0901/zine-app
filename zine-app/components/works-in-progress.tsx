"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { BookOpen, FileText, Calendar, Edit3 } from "lucide-react"
import { format } from "date-fns"
import { getZines, getNovels } from "@/lib/api"

interface WorkInProgress {
  id: string
  title: string
  type: "zine" | "novel"
  lastModified: string
  progress?: number
  cover?: string
}

interface WorksInProgressProps {
  onWorkSelect: (work: WorkInProgress) => void
}

export function WorksInProgress({ onWorkSelect }: WorksInProgressProps) {
  const [works, setWorks] = useState<WorkInProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Mount detection to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // Load saved works from Cloud Storage (primary) and localStorage (fallback)
    const loadSavedWorks = async () => {
      setIsLoading(true)
      const savedWorks: WorkInProgress[] = []

      // Try to load from Cloud Storage first
      try {
        console.log('Loading works from Cloud Storage...')
        const cloudData = await getZines()
        
        if (cloudData && cloudData.zines) {
          cloudData.zines.forEach((zine: any) => {
            if (zine.title || zine.id) {
              savedWorks.push({
                id: zine.id,
                title: zine.title || 'Untitled ZINE',
                type: 'zine',
                lastModified: zine.lastModified || zine.createdAt || new Date().toISOString(),
                cover: zine.coverImageUrl || zine.cover
              })
            }
          })
        }

        // Try to load novels from Cloud Storage
        try {
          const novelData = await getNovels()
          if (novelData && novelData.novels) {
            novelData.novels.forEach((novel: any) => {
              if (novel.title || novel.id) {
                savedWorks.push({
                  id: novel.id,
                  title: novel.title || 'Untitled Novel',
                  type: 'novel',
                  lastModified: novel.lastModified || novel.createdAt || new Date().toISOString(),
                  progress: novel.progress
                })
              }
            })
          }
        } catch (novelError) {
          console.warn('Failed to load novels from Cloud Storage:', novelError)
        }
        
        console.log('Loaded from Cloud Storage:', savedWorks.length, 'works')
      } catch (error) {
        console.warn('Failed to load from Cloud Storage, falling back to localStorage:', error)
        
        // Fallback to localStorage when Cloud Storage fails
        try {
          // Load saved ZINEs from localStorage
          const zines = Object.keys(localStorage).filter(key => key.startsWith('zine_'))
          zines.forEach(key => {
            const zineData = JSON.parse(localStorage.getItem(key) || '{}')
            if (zineData.title || zineData.id) {
              savedWorks.push({
                id: zineData.id || key,
                title: zineData.title || 'Untitled ZINE',
                type: 'zine',
                lastModified: zineData.lastModified || zineData.createdAt || new Date().toISOString(),
                cover: zineData.coverImageUrl || zineData.cover
              })
            }
          })

          // Load saved novels from localStorage
          const novels = Object.keys(localStorage).filter(key => key.startsWith('novel_'))
          novels.forEach(key => {
            const novelData = JSON.parse(localStorage.getItem(key) || '{}')
            if (novelData.title || novelData.id) {
              savedWorks.push({
                id: novelData.id || key,
                title: novelData.title || 'Untitled Novel',
                type: 'novel',
                lastModified: novelData.lastModified || novelData.createdAt || new Date().toISOString(),
                progress: novelData.progress
              })
            }
          })
          console.log('Loaded from localStorage fallback:', savedWorks.length, 'works')
        } catch (localError) {
          console.error('Error loading from localStorage fallback:', localError)
        }
      }

      // Sort by last modified date
      savedWorks.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      setWorks(savedWorks)
      setIsLoading(false)
      console.log('Final loaded works:', savedWorks)
    }

    loadSavedWorks()

    // Listen for storage changes (for localStorage fallback updates)
    const handleStorageChange = () => {
      console.log('Storage changed, reloading works')
      loadSavedWorks()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('localStorageUpdate', handleStorageChange)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localStorageUpdate', handleStorageChange)
      }
    }
  }, [isMounted])

  // Prevent rendering during SSR to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#4a3c28" }}>
            作成中の作品
          </h2>
          <p style={{ color: "#8b7355" }}>
            読み込み中...
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <motion.section
        className="mb-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#4a3c28" }}>
            作成中の作品
          </h2>
          <p style={{ color: "#8b7355" }}>
            読み込み中...
          </p>
        </div>
      </motion.section>
    )
  }

  if (works.length === 0) {
    return null
  }

  return (
    <motion.section
      className="mb-12"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#4a3c28" }}>
          作成中の作品
        </h2>
        <p style={{ color: "#8b7355" }}>
          保存した作品を続きから編集できます
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, staggerChildren: 0.1 }}
      >
        {works.map((work, index) => (
          <WorkCard key={work.id} work={work} index={index} onSelect={() => onWorkSelect(work)} />
        ))}
      </motion.div>
    </motion.section>
  )
}

interface WorkCardProps {
  work: WorkInProgress
  index: number
  onSelect: () => void
}

function WorkCard({ work, index, onSelect }: WorkCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const isZine = work.type === 'zine'
  const typeColor = isZine ? '#8b6914' : '#6b46c1' // Gold for ZINE, Purple for Novel
  const typeBgColor = isZine ? 'rgba(139, 105, 20, 0.1)' : 'rgba(107, 70, 193, 0.1)'
  const borderColor = isZine ? 'rgba(139, 105, 20, 0.3)' : 'rgba(107, 70, 193, 0.3)'

  return (
    <motion.div
      className="group cursor-pointer"
      data-cursor-hover
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -8,
        scale: 1.02,
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div
        className="relative rounded-xl overflow-hidden backdrop-blur-sm border transition-all duration-400 group-hover:shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${typeBgColor} 0%, rgba(247, 241, 232, 0.9) 100%)`,
          borderColor: isHovered ? typeColor : borderColor,
          boxShadow: isHovered ? `0 20px 40px -12px ${typeColor}40` : "0 8px 20px -5px rgba(0, 0, 0, 0.1)"
        }}
      >
        {/* Type indicator */}
        <div className="absolute top-3 left-3 z-10">
          <div 
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: typeColor,
              color: '#ffffff'
            }}
          >
            {isZine ? <BookOpen className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {isZine ? 'ZINE' : 'Novel'}
          </div>
        </div>

        {/* Cover area */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {work.cover ? (
            <motion.img
              src={work.cover}
              alt={work.title}
              className="w-full h-full object-cover"
              animate={{
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <motion.div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${typeBgColor} 0%, ${typeColor}20 100%)`
              }}
              animate={{
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{ duration: 0.4 }}
            >
              {isZine ? (
                <BookOpen className="w-12 h-12" style={{ color: typeColor, opacity: 0.6 }} />
              ) : (
                <FileText className="w-12 h-12" style={{ color: typeColor, opacity: 0.6 }} />
              )}
            </motion.div>
          )}

          {/* Edit overlay */}
          <motion.div
            className="absolute inset-0 bg-black/40 flex items-center justify-center"
            animate={{
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-white/90 rounded-lg">
              <Edit3 className="w-4 h-4" style={{ color: typeColor }} />
              <span className="text-sm font-medium" style={{ color: typeColor }}>
                編集を続ける
              </span>
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-4">
          <motion.h3
            className="font-bold text-base mb-2 line-clamp-2"
            animate={{
              color: isHovered ? typeColor : "#4a3c28",
            }}
            transition={{ duration: 0.3 }}
          >
            {work.title}
          </motion.h3>

          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "#8b7355" }}>
            <Calendar className="w-3 h-3" />
            <span>
              {work.lastModified && !isNaN(new Date(work.lastModified).getTime()) 
                ? format(new Date(work.lastModified), "yyyy/MM/dd HH:mm")
                : "日付不明"
              }
            </span>
          </div>

          {work.progress !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs mb-1" style={{ color: "#8b7355" }}>
                <span>進捗</span>
                <span>{work.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: typeColor }}
                  animate={{ width: `${work.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-transparent"
          animate={{
            borderColor: isHovered ? typeColor : "transparent",
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  )
}