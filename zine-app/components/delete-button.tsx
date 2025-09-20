"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Trash2 } from "lucide-react"

interface DeleteButtonProps {
  onDelete: () => void
  title?: string
  isVisible: boolean
  className?: string
}

export function DeleteButton({ onDelete, title = "この作品", isVisible, className = "" }: DeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent parent click handler
    setShowConfirm(true)
  }

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      await onDelete()
      setShowConfirm(false) // Close dialog on success
    } catch (error) {
      console.error("Delete failed:", error)
      // Keep dialog open on error so user can see what happened
      // TODO: Show error message in dialog
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(false)
  }

  return (
    <>
      {/* Delete Button */}
      <motion.button
        className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center ${className}`}
        onClick={handleClick}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isVisible ? 1 : 0, 
          scale: isVisible ? 1 : 0.8 
        }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        disabled={isDeleting}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      >
        <Trash2 className="w-4 h-4" />
      </motion.button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "linear-gradient(135deg, #fef7ed 0%, #f7f1e8 100%)",
              color: "#4a3c28"
            }}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-lg font-bold mb-2">作品を削除しますか？</h3>
              <p className="text-sm text-gray-600 mb-6">
                「{title}」を削除します。この操作は取り消せません。
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "削除中..." : "削除"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}