"use client"

import { motion } from "framer-motion"
import { useRef, useState, useCallback } from "react"
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
  onAddTextAt?: (x: number, y: number) => void
  onAddImageAt?: (x: number, y: number) => void
}

export function ZineCanvas({
  currentPage,
  selectedElement,
  setSelectedElement,
  updateElement,
  draggedElement,
  setDraggedElement,
  dragOffset,
  setDragOffset,
  onAddTextAt,
  onAddImageAt
}: ZineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(0.6) // Start with smaller zoom to fit screen
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const minZoom = 0.3
  const maxZoom = 2

  // Handle zoom with wheel/trackpad
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Check if it's a pinch gesture (ctrlKey indicates pinch on trackpad)
    // Also detect if deltaY is small and ctrlKey is present (macOS trackpad pinch)
    if (e.ctrlKey || (Math.abs(e.deltaY) < 50 && e.ctrlKey)) {
      e.preventDefault()
      const delta = -e.deltaY * 0.01
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta))
      setZoom(newZoom)
    }
  }, [zoom, minZoom, maxZoom])

  // Handle touch gestures for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      // Calculate distance between two fingers
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      // Store initial distance if not set
      if (!canvasRef.current?.dataset.initialDistance) {
        canvasRef.current!.dataset.initialDistance = distance.toString()
        canvasRef.current!.dataset.initialZoom = zoom.toString()
      } else {
        const initialDistance = parseFloat(canvasRef.current.dataset.initialDistance)
        const initialZoom = parseFloat(canvasRef.current.dataset.initialZoom)
        const scale = distance / initialDistance
        const newZoom = Math.max(minZoom, Math.min(maxZoom, initialZoom * scale))
        setZoom(newZoom)
      }
    }
  }, [zoom, minZoom, maxZoom])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2 && canvasRef.current) {
      canvasRef.current.dataset.initialDistance = ""
      canvasRef.current.dataset.initialZoom = ""
    }
  }, [])

  // Handle pan operations
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Start panning if not dragging an element
    if (!draggedElement && e.button === 0) {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }, [draggedElement])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y
      
      setPanOffset(prev => ({
        x: prev.x + deltaX / zoom,
        y: prev.y + deltaY / zoom
      }))
      
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }, [isPanning, lastPanPoint, zoom])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Handle mouse move for dragging and panning
  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle panning first
    handlePanMove(e)
    
    // Then handle element dragging
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

  // Handle click to open add menu when not on element
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    // If we were dragging, do not open menu
    if (draggedElement) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMenuPos({ x, y })
    setMenuOpen(true)
  }

  const placeTextHere = () => {
    setMenuOpen(false)
    if (onAddTextAt) {
      onAddTextAt(menuPos.x, menuPos.y)
    }
  }

  const placeImageHere = () => {
    setMenuOpen(false)
    if (onAddImageAt) {
      onAddImageAt(menuPos.x, menuPos.y)
    }
  }

  return (
    <div className="relative">
      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-10 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm font-medium">
        {Math.round(zoom * 100)}%
      </div>
      
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
        <div className="absolute inset-0 flex items-center justify-center p-2 overflow-hidden">
          <motion.div
            className="relative rounded-xl"
            style={{
              width: 1400,
              height: 900,
              filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.4))",
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.1s ease-out",
              cursor: !draggedElement ? (isPanning ? "grabbing" : "grab") : "default"
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            onMouseDown={handlePanStart}
            onMouseMove={handleMouseMove}
            onMouseUp={() => {
              setDraggedElement(null)
              handlePanEnd()
            }}
            onMouseLeave={() => {
              setDraggedElement(null)
              handlePanEnd()
            }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
              ref={canvasRef}
              className="absolute inset-0 p-8"
              onClick={handleCanvasClick}
            >
              {/* Render page elements */}
              {currentPage.elements.map((element) => (
                <div
                  key={element.id}
                  className={`absolute cursor-move border-2 ${
                    selectedElement === element.id ? "border-purple-500 shadow-lg" : "border-transparent"
                  } hover:border-purple-300 ${draggedElement === element.id ? "transition-none" : "transition-colors duration-150"}`}
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
            {/* Context menu for add */}
            {menuOpen && (
              <div
                className="absolute bg-white/95 rounded-md shadow-lg border z-50"
                style={{ left: menuPos.x + 8, top: menuPos.y + 8, borderColor: "#e5dcc9" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col">
                  <button className="px-3 py-2 text-sm hover:bg-amber-50 text-gray-700 text-left" onClick={placeTextHere}>テキストを追加</button>
                  <button className="px-3 py-2 text-sm hover:bg-amber-50 text-gray-700 text-left" onClick={placeImageHere}>画像を追加</button>
                  <button className="px-3 py-2 text-xs hover:bg-amber-50 text-gray-500 text-left" onClick={() => setMenuOpen(false)}>閉じる</button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}