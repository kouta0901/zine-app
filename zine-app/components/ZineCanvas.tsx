"use client"

import { motion } from "framer-motion"
import { useRef, useState } from "react"
import { Element, Page } from "@/types/zine"

interface ZineCanvasProps {
  currentPage: Page
  selectedElement: string | null
  setSelectedElement: (id: string | null) => void
  updateElement: (id: string, updates: Partial<Element>) => void
  draggedElement: string | null
  setDraggedElement: (id: string | null) => void
  dragOffset: { x: number; y: number }
  setDragOffset: (offset: { x: number; y: number }) => void
}

export function ZineCanvas({
  currentPage,
  selectedElement,
  setSelectedElement,
  updateElement,
  draggedElement,
  setDraggedElement,
  dragOffset,
  setDragOffset
}: ZineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedElement && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const newX = e.clientX - canvasRect.left - dragOffset.x
      const newY = e.clientY - canvasRect.top - dragOffset.y
      
      // Constrain to canvas bounds
      const element = currentPage.elements.find(el => el.id === draggedElement)
      if (element) {
        const constrainedX = Math.max(0, Math.min(newX, canvasRect.width - element.width))
        const constrainedY = Math.max(0, Math.min(newY, canvasRect.height - element.height))
        
        updateElement(draggedElement, { x: constrainedX, y: constrainedY })
      }
    }
  }

  return (
    <div className="relative">
      {/* ZINE Creation Workspace */}
      <motion.div
        className="relative"
        style={{ width: 900, height: 700 }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Table/Desk background */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `
              linear-gradient(135deg, #d2b48c 0%, #daa520 20%, #cd853f 40%, #d2b48c 60%, #f4a460 80%, #daa520 100%),
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(139, 115, 85, 0.1) 2px,
                rgba(139, 115, 85, 0.1) 4px
              )
            `,
            boxShadow: `
              inset 0 0 100px rgba(139, 69, 19, 0.1),
              inset 0 2px 4px rgba(255, 248, 220, 0.3),
              0 8px 32px rgba(139, 69, 19, 0.2)
            `,
          }}
        />
        
        {/* Wood grain texture overlay */}
        <div
          className="absolute inset-0 rounded-2xl opacity-30"
          style={{
            background: `
              repeating-linear-gradient(
                90deg,
                rgba(101, 67, 33, 0.1) 0px,
                rgba(139, 115, 85, 0.05) 20px,
                rgba(101, 67, 33, 0.1) 40px,
                rgba(160, 135, 108, 0.05) 60px
              )
            `
          }}
        />

        {/* ZINE Pages Container */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <motion.div
            ref={canvasRef}
            className="relative rounded-xl overflow-hidden"
            style={{
              width: 800,
              height: 600,
              filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.4))",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {/* Paper texture background with subtle shadows */}
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: `
                  radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,255,255,0.98) 0%, rgba(253,252,249,0.95) 40%, rgba(248,246,243,0.92) 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.02) 100%)
                `,
                backgroundColor: "#FFFEF9",
                boxShadow: `
                  inset 0 0 20px rgba(139, 115, 85, 0.05),
                  0 4px 8px rgba(139, 69, 19, 0.1)
                `
              }}
            />

            {/* Center binding with shadow */}
            <div
              className="absolute left-1/2 top-4 bottom-4 transform -translate-x-0.5"
              style={{
                width: "4px",
                background: "linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.2) 100%)",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.15), 0 0 5px rgba(0,0,0,0.1)",
                borderRadius: "2px",
              }}
            />

            {/* Page content area */}
            <div 
              className="absolute inset-0 p-4"
              onMouseMove={handleMouseMove}
              onMouseUp={() => setDraggedElement(null)}
              onMouseLeave={() => setDraggedElement(null)}
            >
              {/* Render page elements */}
              {currentPage.elements.map((element) => (
                <div
                  key={element.id}
                  className={`absolute cursor-move border-2 ${
                    selectedElement === element.id ? "border-purple-500 shadow-lg" : "border-transparent"
                  } hover:border-purple-300 transition-all duration-200`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    zIndex: draggedElement === element.id ? 1000 : 1,
                  }}
                  onClick={() => setSelectedElement(element.id)}
                  onDoubleClick={() => {
                    if (element.type === "text") {
                      const newContent = prompt("テキストを編集:", element.content || "")
                      if (newContent !== null) {
                        updateElement(element.id, { content: newContent })
                      }
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setDraggedElement(element.id)
                    setSelectedElement(element.id)
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDragOffset({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    })
                  }}
                  onMouseUp={() => {
                    setDraggedElement(null)
                  }}
                >
                  {element.type === "text" && (
                    <div
                      className="w-full h-full flex items-center justify-center p-3 bg-white/90 rounded-lg shadow-sm border border-gray-200"
                      style={{
                        fontSize: element.fontSize,
                        color: element.color,
                        fontWeight: "500",
                      }}
                    >
                      {element.content}
                    </div>
                  )}
                  {element.type === "image" && (
                    <img
                      src={element.src}
                      alt="ZINE element"
                      className="w-full h-full object-cover rounded-lg shadow-md"
                      draggable={false}
                    />
                  )}
                  {element.type === "shape" && (
                    <div
                      className="w-full h-full shadow-md"
                      style={{
                        backgroundColor: element.color,
                        borderRadius: element.content === "circle" ? "50%" : "8px",
                      }}
                    />
                  )}
                </div>
              ))}

              {/* Empty state with modern design */}
              {currentPage.elements.length === 0 && (
                <div className="absolute inset-0 flex">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-lg font-medium mb-2">左ページ</div>
                      <div className="text-sm opacity-70">ここに要素を配置します</div>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-lg font-medium mb-2">右ページ</div>
                      <div className="text-sm opacity-70">テキストや画像をドラッグ&ドロップ</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}