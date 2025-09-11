"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Edit, BookOpen, FileText, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreatorMode } from "@/types/zine"

interface EditModeSelectorProps {
  onSelectMode: (mode: CreatorMode) => void
  onClose: () => void
}

export function EditModeSelector({ onSelectMode, onClose }: EditModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleModeSelect = (mode: CreatorMode) => {
    onSelectMode(mode)
    setIsOpen(false)
    onClose()
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className="text-white hover:bg-white/10"
      >
        <Edit className="w-4 h-4 mr-2" />
        編集
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <motion.div
              className="absolute top-full right-0 mt-2 w-56 z-50"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-2">
                  <button
                    onClick={() => handleModeSelect("zine")}
                    className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <BookOpen className="w-4 h-4 mr-3 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">ZINEモードで編集</div>
                      <div className="text-sm text-gray-500">ビジュアル編集でページを作成</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleModeSelect("novel")}
                    className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-3 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">小説モードで編集</div>
                      <div className="text-sm text-gray-500">テキスト編集で小説を執筆</div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}