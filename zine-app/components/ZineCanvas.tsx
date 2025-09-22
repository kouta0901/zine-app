"use client"

import React from "react"
import { motion } from "framer-motion"
import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react"
import html2canvas from "html2canvas"
import { Element, Page } from "@/types/zine"

export interface ZineCanvasHandle {
  captureAsImage: () => Promise<string>
  startEditingElement: (elementId: string) => void
}

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
  onEditingChange?: (elementId: string | null) => void
}

export const ZineCanvas = forwardRef<ZineCanvasHandle, ZineCanvasProps>(({
  currentPage,
  selectedElement,
  setSelectedElement,
  updateElement,
  draggedElement,
  setDraggedElement,
  dragOffset,
  setDragOffset,
  onAddTextAt,
  onAddImageAt,
  onEditingChange
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1.0) // Start with 100% zoom
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [resizingElement, setResizingElement] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [initialResize, setInitialResize] = useState({ width: 0, height: 0, x: 0, y: 0, mouseX: 0, mouseY: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 1400, height: 900 })
  const [editingElement, setEditingElement] = useState<string | null>(null)
  
  // Page boundaries definition (in original 1400px canvas space)
  const PAGE_BOUNDARIES = {
    leftPage: { start: 0, end: 680 },
    centerBinding: { start: 680, end: 720 }, // 40px no-go zone
    rightPage: { start: 720, end: 1400 }
  }
  
  // Improved zoom and touch handling
  const touchState = useRef({ initialDistance: 0, initialZoom: 0, lastDistance: 0 })
  const minZoom = 0.2
  const maxZoom = 3
  
  // Calculate responsive canvas size based on viewport
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const aspectRatio = 1400 / 900
        const padding = 40 // Padding around canvas
        
        let newWidth = containerRect.width - padding * 2
        let newHeight = containerRect.height - padding * 2
        
        // Maintain aspect ratio
        if (newWidth / newHeight > aspectRatio) {
          newWidth = newHeight * aspectRatio
        } else {
          newHeight = newWidth / aspectRatio
        }
        
        // Set minimum and maximum sizes
        newWidth = Math.max(800, Math.min(1600, newWidth))
        newHeight = Math.max(514, Math.min(1029, newHeight))
        
        setCanvasSize({ width: newWidth, height: newHeight })
        
        // Start with 100% zoom (1.0) for better visibility
        setZoom(1.0)
      }
    }
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

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

  // Helper function to check if element crosses page boundary
  const crossesPageBoundary = (x: number, width: number) => {
    const leftEnd = x + width
    // Check if element crosses into center binding area
    return (x < PAGE_BOUNDARIES.centerBinding.end && leftEnd > PAGE_BOUNDARIES.centerBinding.start)
  }
  
  // Helper function to constrain element to avoid page crossing
  const constrainToPage = (x: number, width: number) => {
    // If element starts in left page
    if (x < PAGE_BOUNDARIES.centerBinding.start) {
      // Constrain to left page
      const maxX = PAGE_BOUNDARIES.leftPage.end - width
      return Math.min(x, maxX)
    }
    // If element starts in right page
    else {
      // Ensure it doesn't go into center binding
      return Math.max(x, PAGE_BOUNDARIES.rightPage.start)
    }
  }
  
  // Convert between canvas coordinates and scaled coordinates
  const scaleCoordinate = (value: number, isWidth: boolean = false) => {
    const scaleFactor = canvasSize.width / 1400
    return value * scaleFactor
  }
  
  const unscaleCoordinate = (value: number, isWidth: boolean = false) => {
    const scaleFactor = canvasSize.width / 1400
    return value / scaleFactor
  }

  // Handle mouse move for dragging, resizing and panning
  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle element resizing first (highest priority)
    if (resizingElement && canvasRef.current) {
      const element = currentPage.elements.find(el => el.id === resizingElement && el.pageId === currentPage.id)
      if (element) {
        const scaleFactor = canvasSize.width / 1400
        const deltaX = (e.clientX - initialResize.mouseX) / (zoom * scaleFactor)
        const deltaY = (e.clientY - initialResize.mouseY) / (zoom * scaleFactor)
        
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
        
        // Prevent resizing across page boundary
        if (crossesPageBoundary(newX, newWidth)) {
          // Limit width to not cross boundary
          if (newX < PAGE_BOUNDARIES.centerBinding.start) {
            newWidth = Math.min(newWidth, PAGE_BOUNDARIES.leftPage.end - newX)
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
      const scaleFactor = canvasSize.width / 1400
      // Account for zoom and scale when calculating position
      const scaledX = (e.clientX - canvasRect.left) / (zoom * scaleFactor) - dragOffset.x
      const scaledY = (e.clientY - canvasRect.top) / (zoom * scaleFactor) - dragOffset.y
      
      // Constrain to canvas bounds
      const element = currentPage.elements.find(el => el.id === draggedElement && el.pageId === currentPage.id)
      if (element) {
        const maxX = 1400 - element.width
        const maxY = 900 - element.height
        let constrainedX = Math.max(0, Math.min(scaledX, maxX))
        const constrainedY = Math.max(0, Math.min(scaledY, maxY))
        
        // Apply page boundary constraints
        constrainedX = constrainToPage(constrainedX, element.width)
        
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
      const scaleFactor = canvasSize.width / 1400
      // Account for zoom and scale when calculating menu position
      const x = (e.clientX - rect.left) / (zoom * scaleFactor)
      const y = (e.clientY - rect.top) / (zoom * scaleFactor)
      setMenuPos({ x, y })
      setMenuOpen(true)
      // Deselect any selected element when clicking on empty space
      setSelectedElement(null)
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

  // Capture functionality for image generation
  const captureAsImage = useCallback(async (): Promise<string> => {
    console.log('🎯 Starting ZineCanvas capture...')
    
    if (!containerRef.current) {
      throw new Error('Canvas container not found')
    }

    // Store current transform state
    const originalZoom = zoom
    const originalPanOffset = { ...panOffset }

    try {
      // Temporarily reset zoom and pan for capture
      console.log('📐 Resetting zoom and pan for capture')
      setZoom(1.0)
      setPanOffset({ x: 0, y: 0 })

      // Wait for the transform to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Capture only the ZINE content area (data-canvas-bg div) to exclude UI elements
      const canvasElement = canvasRef.current

      if (!canvasElement) {
        throw new Error('ZINE content area not found')
      }

      console.log('📸 Capturing canvas element with html2canvas')
      
      // Capture with html2canvas - optimized for smaller file size and content-only capture
      const canvas = await html2canvas(canvasElement as HTMLElement, {
        scale: 1, // Reduced from 2 to 1 for smaller file size while maintaining quality
        backgroundColor: '#FFFEF9', // Set explicit background instead of null
        useCORS: true,
        allowTaint: true,
        logging: false, // Reduce console noise
        ignoreElements: (element) => {
          // Skip elements that might contain problematic CSS or UI elements
          return element.tagName === 'STYLE' ||
                 element.classList?.contains('ignore-capture') ||
                 element.closest('[data-zoom-indicator]') !== null ||
                 element.closest('[data-page-boundary]') !== null
        },
        onclone: (clonedDoc) => {
          // Replace oklch colors with compatible colors in cloned document
          const style = clonedDoc.createElement('style')
          style.textContent = `
            * {
              background-color: var(--fallback-bg, inherit) !important;
              color: var(--fallback-color, inherit) !important;
              border-color: var(--fallback-border, inherit) !important;
            }
          `
          clonedDoc.head.appendChild(style)
          
          // Ensure all images are loaded in the cloned document
          const images = clonedDoc.querySelectorAll('img')
          images.forEach((img) => {
            if (img.src) {
              img.crossOrigin = 'anonymous'
            }
          })
        }
      })

      // Use JPEG format with compression for significantly smaller file size
      const base64 = canvas.toDataURL('image/jpeg', 0.7) // JPEG with 70% quality for good balance
      
      // Log approximate file size for monitoring
      const sizeInKB = Math.round((base64.length * 3) / 4 / 1024)
      console.log(`📏 Captured image size: ~${sizeInKB}KB`)
      console.log('✅ Successfully captured ZineCanvas')
      
      return base64

    } catch (error) {
      console.error('❌ ZineCanvas capture failed:', error)
      throw new Error(`キャンバスのキャプチャに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      // Restore original transform state
      console.log('🔄 Restoring original zoom and pan')
      setZoom(originalZoom)
      setPanOffset(originalPanOffset)
    }
  }, [zoom, panOffset, canvasSize])

  // Function to start editing an element
  const startEditingElement = useCallback((elementId: string) => {
    setEditingElement(elementId)
    onEditingChange?.(elementId)
    setTimeout(() => {
      const element = document.querySelector(`[data-element] div[contenteditable="true"]`)
      if (element) {
        ;(element as HTMLElement).focus()
      }
    }, 0)
  }, [onEditingChange])

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    captureAsImage,
    startEditingElement
  }), [captureAsImage, startEditingElement])

  return (
    <div ref={containerRef} className="relative w-full h-full">
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
              width: canvasSize.width,
              height: canvasSize.height,
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

            {/* Center binding with shadow and visual guide */}
            <div
              className="absolute top-4 bottom-4"
              style={{
                left: `${(PAGE_BOUNDARIES.centerBinding.start / 1400) * 100}%`,
                width: `${((PAGE_BOUNDARIES.centerBinding.end - PAGE_BOUNDARIES.centerBinding.start) / 1400) * 100}%`,
                background: "linear-gradient(90deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.08) 100%)",
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.2), 0 0 10px rgba(0,0,0,0.15)",
                borderLeft: "1px dashed rgba(139, 69, 19, 0.2)",
                borderRight: "1px dashed rgba(139, 69, 19, 0.2)",
                pointerEvents: "none",
                zIndex: 10
              }}
            />
            
            {/* Page boundary indicators */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: 0,
                width: `${(PAGE_BOUNDARIES.leftPage.end / 1400) * 100}%`,
                borderRight: "1px dotted rgba(139, 69, 19, 0.1)",
                pointerEvents: "none"
              }}
            />
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: `${(PAGE_BOUNDARIES.rightPage.start / 1400) * 100}%`,
                right: 0,
                borderLeft: "1px dotted rgba(139, 69, 19, 0.1)",
                pointerEvents: "none"
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
              {currentPage.elements.filter(element => element.pageId === currentPage.id).map((element) => {
                const scaleFactor = canvasSize.width / 1400
                const isInCenterBinding = crossesPageBoundary(element.x, element.width)
                
                return (
                  <div
                    key={element.id}
                    data-element
                    className={`absolute cursor-move border-2 ${
                      selectedElement === element.id ? "border-purple-500 shadow-lg" : "border-transparent"
                    } hover:border-purple-300 ${draggedElement === element.id ? "transition-none" : "transition-colors duration-150"} ${
                      isInCenterBinding ? "opacity-50" : ""
                    }`}
                    style={{
                      left: scaleCoordinate(element.x),
                      top: scaleCoordinate(element.y),
                      width: scaleCoordinate(element.width),
                      height: scaleCoordinate(element.height),
                      zIndex: draggedElement === element.id ? 1000 : 1,
                    }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedElement(element.id)
                  }}
                  onDoubleClick={() => {
                    if (element.type === "text") {
                      setEditingElement(element.id)
                      onEditingChange?.(element.id)
                    }
                  }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDraggedElement(element.id)
                      setSelectedElement(element.id)
                      // Calculate offset within the element accounting for zoom and scale
                      const rect = e.currentTarget.getBoundingClientRect()
                      const scaleFactor = canvasSize.width / 1400
                      setDragOffset({
                        x: (e.clientX - rect.left) / (zoom * scaleFactor),
                        y: (e.clientY - rect.top) / (zoom * scaleFactor),
                      })
                    }}
                  onMouseUp={() => {
                    setDraggedElement(null)
                  }}
                >
                  {element.type === "text" && (
                    <div
                      contentEditable={editingElement === element.id}
                      suppressContentEditableWarning={true}
                      className={`w-full h-full flex items-center justify-center p-3 bg-white/90 rounded-lg shadow-sm border border-gray-200 ${
                        editingElement === element.id ? 'outline-none ring-2 ring-purple-400' : ''
                      }`}
                      style={{
                        fontSize: element.fontSize,
                        color: element.color,
                        fontWeight: "500",
                      }}
                      onBlur={(e) => {
                        if (editingElement === element.id) {
                          const newContent = e.target.textContent || ""
                          updateElement(element.id, { content: newContent })
                          setEditingElement(null)
                          onEditingChange?.(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (editingElement === element.id) {
                          // 編集中は全てのキーイベントをここで処理
                          e.stopPropagation()
                          
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            ;(e.target as HTMLElement).blur()
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            setEditingElement(null)
                            onEditingChange?.(null)
                          }
                          // その他のキー（Backspace, Delete, 文字入力など）は自然な動作を許可
                        }
                      }}
                      onClick={(e) => {
                        if (editingElement === element.id) {
                          e.stopPropagation()
                        }
                      }}
                      onMouseDown={(e) => {
                        if (editingElement === element.id) {
                          e.stopPropagation()
                        }
                      }}
                    >
                      {element.content}
                    </div>
                  )}
                  
                  {/* Resize handles for selected text elements */}
                  {selectedElement === element.id && element.type === "text" && (
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
                        className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-n-resize"
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
                        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-s-resize"
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
                        className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-w-resize"
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
                        className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full cursor-e-resize"
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
                )
              })}

              {/* Empty state with modern design */}
              {currentPage.elements.filter(element => element.pageId === currentPage.id).length === 0 && (
                <div className="absolute inset-0 flex">
                  <div 
                    className="flex items-center justify-center"
                    style={{ width: `${(PAGE_BOUNDARIES.leftPage.end / 1400) * 100}%` }}
                  >
                  </div>
                  <div 
                    className="flex items-center justify-center"
                    style={{ 
                      width: `${((1400 - PAGE_BOUNDARIES.rightPage.start) / 1400) * 100}%`,
                      marginLeft: `${(PAGE_BOUNDARIES.rightPage.start / 1400) * 100}%`
                    }}
                  >
                  </div>
                </div>
              )}
            </div>
            {/* Context menu for add */}
            {menuOpen && (
              <div
                className="absolute bg-white/95 rounded-md shadow-lg border z-50"
                style={{ 
                  left: scaleCoordinate(menuPos.x) + 8, 
                  top: scaleCoordinate(menuPos.y) + 8, 
                  borderColor: "#e5dcc9" 
                }}
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
})

ZineCanvas.displayName = 'ZineCanvas'