"use client"

import React from "react"
import { motion } from "framer-motion"
import { useRef, useState, useCallback, useEffect } from "react"
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
  const [resizingElement, setResizingElement] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [initialResize, setInitialResize] = useState({ width: 0, height: 0, x: 0, y: 0, mouseX: 0, mouseY: 0 })
  
  // Improved zoom and touch handling
  const touchState = useRef({ initialDistance: 0, initialZoom: 0, lastDistance: 0 })
  const minZoom = 0.2
  const maxZoom = 3

  // Handle zoom with wheel/trackpad - properly handle passive events
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Check if we're over the canvas area
    const isOverCanvas = (e.target as HTMLElement).closest('.relative.rounded-xl') !== null
    
    if (isOverCanvas) {
      // For passive events, don't use preventDefault, just update zoom
      const delta = -e.deltaY * 0.01
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta))
      setZoom(newZoom)
    }
  }, [zoom, minZoom, maxZoom])
  
  // Add direct event listener for non-passive wheel events
  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return
    
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = -e.deltaY * 0.01
      setZoom(prevZoom => Math.max(minZoom, Math.min(maxZoom, prevZoom + delta)))
    }
    
    canvasElement.addEventListener('wheel', handleNativeWheel, { passive: false })
    
    return () => {
      canvasElement.removeEventListener('wheel', handleNativeWheel)
    }
  }, [minZoom, maxZoom])

  // Handle touch gestures for mobile - improved pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      touchState.current = {
        initialDistance: distance,
        initialZoom: zoom,
        lastDistance: distance
      }
    }
  }, [zoom])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      if (touchState.current.initialDistance > 0) {
        const scale = distance / touchState.current.initialDistance
        const newZoom = Math.max(minZoom, Math.min(maxZoom, touchState.current.initialZoom * scale))
        setZoom(newZoom)
        touchState.current.lastDistance = distance
      }
    }
  }, [minZoom, maxZoom])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchState.current = { initialDistance: 0, initialZoom: 0, lastDistance: 0 }
    }
  }, [])

  // Handle pan operations
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking on empty canvas area (not on an element)
    const target = e.target as HTMLElement
    const isCanvasClick = target === canvasRef.current || target.closest('[data-canvas-bg]')
    
    if (isCanvasClick && !draggedElement && e.button === 0) {
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

  // Handle mouse move for dragging, resizing and panning
  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle element resizing first (highest priority)
    if (resizingElement && canvasRef.current) {
      const element = currentPage.elements.find(el => el.id === resizingElement)
      if (element) {
        const deltaX = (e.clientX - initialResize.mouseX) / zoom
        const deltaY = (e.clientY - initialResize.mouseY) / zoom
        
        let newWidth = initialResize.width
        let newHeight = initialResize.height
        let newX = initialResize.x
        let newY = initialResize.y
        
        // Calculate new dimensions based on resize handle
        if (resizeHandle?.includes('right')) {
          newWidth = Math.max(50, initialResize.width + deltaX)
        }
        if (resizeHandle?.includes('left')) {
          newWidth = Math.max(50, initialResize.width - deltaX)
          newX = initialResize.x + deltaX
          if (newWidth <= 50) newX = initialResize.x + initialResize.width - 50
        }
        if (resizeHandle?.includes('bottom')) {
          newHeight = Math.max(50, initialResize.height + deltaY)
        }
        if (resizeHandle?.includes('top')) {
          newHeight = Math.max(50, initialResize.height - deltaY)
          newY = initialResize.y + deltaY
          if (newHeight <= 50) newY = initialResize.y + initialResize.height - 50
        }
        
        // Maintain aspect ratio for images when using corner handles
        if (element.type === 'image' && resizeHandle && 
            (resizeHandle.includes('top') || resizeHandle.includes('bottom')) &&
            (resizeHandle.includes('left') || resizeHandle.includes('right'))) {
          const aspectRatio = initialResize.width / initialResize.height
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio
          } else {
            newWidth = newHeight * aspectRatio
          }
        }
        
        updateElement(resizingElement, { 
          width: newWidth, 
          height: newHeight, 
          x: newX, 
          y: newY 
        })
      }
      e.preventDefault()
      e.stopPropagation()
    } else if (draggedElement && canvasRef.current) {
      // Handle element dragging
      const canvasRect = canvasRef.current.getBoundingClientRect()
      // Account for zoom when calculating position
      const scaledX = (e.clientX - canvasRect.left) / zoom - dragOffset.x
      const scaledY = (e.clientY - canvasRect.top) / zoom - dragOffset.y
      
      // Constrain to canvas bounds
      const element = currentPage.elements.find(el => el.id === draggedElement)
      if (element) {
        const maxX = (canvasRect.width / zoom) - element.width
        const maxY = (canvasRect.height / zoom) - element.height
        const constrainedX = Math.max(0, Math.min(scaledX, maxX))
        const constrainedY = Math.max(0, Math.min(scaledY, maxY))
        
        updateElement(draggedElement, { x: constrainedX, y: constrainedY })
      }
      e.preventDefault()
      e.stopPropagation()
    } else if (isPanning) {
      // Only handle panning if not dragging an element
      handlePanMove(e)
    }
  }

  // Handle click to open add menu when not on element
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    
    // Check if clicking on canvas background (not on an element)
    const target = e.target as HTMLElement
    const isElementClick = target.closest('[data-element]')
    
    // Only open menu if clicking on empty space
    if (!isElementClick && !draggedElement && !isPanning) {
      const rect = canvasRef.current.getBoundingClientRect()
      // Account for zoom when calculating menu position
      const x = (e.clientX - rect.left) / zoom
      const y = (e.clientY - rect.top) / zoom
      setMenuPos({ x, y })
      setMenuOpen(true)
    }
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
    <div className="relative w-full h-full">
      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-10 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm font-medium">
        {Math.round(zoom * 100)}%
      </div>
      
      {/* ZINE Creation Workspace */}
      <motion.div
        className="relative w-full h-full"
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
              transformOrigin: "center center",
              cursor: !draggedElement ? (isPanning ? "grabbing" : "grab") : "default"
            }}
            animate={{ 
              opacity: 1, 
              y: panOffset.y,
              scale: zoom,
              x: panOffset.x
            }}
            initial={{ opacity: 0, y: 20, scale: zoom }}
            transition={{ 
              opacity: { delay: 0.2, duration: 0.6 },
              scale: { duration: isPanning ? 0 : 0.1 },
              x: { duration: isPanning ? 0 : 0.1 },
              y: { duration: isPanning ? 0 : 0.1 }
            }}
            onMouseDown={handlePanStart}
            onMouseMove={handleMouseMove}
            onMouseUp={() => {
              setDraggedElement(null)
              setResizingElement(null)
              handlePanEnd()
            }}
            onMouseLeave={() => {
              setDraggedElement(null)
              setResizingElement(null)
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
              data-canvas-bg
              onClick={handleCanvasClick}
            >
              {/* Render page elements */}
              {currentPage.elements.map((element) => (
                <div
                  key={element.id}
                  data-element
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
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedElement(element.id)
                  }}
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
                    e.stopPropagation()
                    setDraggedElement(element.id)
                    setSelectedElement(element.id)
                    // Calculate offset within the element accounting for zoom
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDragOffset({
                      x: (e.clientX - rect.left) / zoom,
                      y: (e.clientY - rect.top) / zoom,
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
                    <>
                      <img
                        src={element.src}
                        alt="ZINE element"
                        className="w-full h-full object-cover rounded-lg shadow-md"
                        draggable={false}
                      />
                      {/* Resize handles for selected images */}
                      {selectedElement === element.id && (
                        <>
                          {/* Corner handles */}
                          <div
                            className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 rounded-full cursor-nw-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('top-left')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                          <div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full cursor-ne-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('top-right')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                          <div
                            className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-500 rounded-full cursor-sw-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('bottom-left')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                          <div
                            className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full cursor-se-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('bottom-right')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                          {/* Edge handles */}
                          <div
                            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-n-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('top')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                          <div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-s-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('bottom')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                          <div
                            className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-w-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('left')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                          <div
                            className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-e-resize"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setResizingElement(element.id)
                              setResizeHandle('right')
                              setInitialResize({
                                width: element.width,
                                height: element.height,
                                x: element.x,
                                y: element.y,
                                mouseX: e.clientX,
                                mouseY: e.clientY
                              })
                            }}
                          />
                        </>
                      )}
                    </>
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