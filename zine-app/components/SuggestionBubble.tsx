import React, { useEffect, useState, useRef } from "react"
import ReactDOM from "react-dom"

interface SuggestionBubbleProps {
  targetElement: HTMLElement | null
  originalText: string
  suggestedText: string
  reason: string
  onApply: () => void
  onReject: () => void
}

export const SuggestionBubble: React.FC<SuggestionBubbleProps> = ({
  targetElement,
  originalText,
  suggestedText,
  reason,
  onApply,
  onReject,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [arrowPosition, setArrowPosition] = useState("bottom")
  const bubbleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!targetElement || !bubbleRef.current) return

    const calculatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      const bubbleWidth = 320
      const bubbleHeight = bubbleRef.current?.offsetHeight || 200
      const padding = 10
      const arrowHeight = 12

      let left = rect.left + rect.width / 2 - bubbleWidth / 2
      let top = rect.top - bubbleHeight - arrowHeight
      let arrow = "bottom"

      // 左端チェック
      if (left < padding) {
        left = padding
      }

      // 右端チェック
      if (left + bubbleWidth > window.innerWidth - padding) {
        left = window.innerWidth - bubbleWidth - padding
      }

      // 上端チェック（下に表示）
      if (top < padding) {
        top = rect.bottom + arrowHeight
        arrow = "top"
      }

      // 下端チェック
      if (arrow === "top" && top + bubbleHeight > window.innerHeight - padding) {
        // スクロール可能にするか、高さを調整
        const maxHeight = window.innerHeight - top - padding
        if (bubbleRef.current) {
          bubbleRef.current.style.maxHeight = `${maxHeight}px`
          bubbleRef.current.style.overflowY = "auto"
        }
      }

      setPosition({ top, left })
      setArrowPosition(arrow)
    }

    calculatePosition()

    // スクロールやリサイズ時に再計算
    const handleReposition = () => calculatePosition()
    window.addEventListener("scroll", handleReposition, true)
    window.addEventListener("resize", handleReposition)

    return () => {
      window.removeEventListener("scroll", handleReposition, true)
      window.removeEventListener("resize", handleReposition)
    }
  }, [targetElement, suggestedText])

  if (!targetElement) return null

  const bubbleContent = (
    <div
      ref={bubbleRef}
      className="absolute bg-white border-2 border-red-400 rounded-lg shadow-xl p-4"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        fontSize: "13px",
        lineHeight: "1.4",
        minWidth: "280px",
        maxWidth: "320px",
        zIndex: 99999,
      }}
    >
      {/* Triangle arrow */}
      <div
        className="absolute"
        style={{
          ...(arrowPosition === "bottom"
            ? {
                bottom: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "10px solid #ef4444",
              }
            : {
                top: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderBottom: "10px solid #ef4444",
              }),
          width: "0",
          height: "0",
        }}
      />

      <div className="text-red-600 font-semibold mb-2 text-sm flex items-center gap-1">
        💡 修正案
      </div>
      <div className="text-gray-800 mb-3 break-words font-medium">
        {suggestedText}
      </div>
      {reason && (
        <div className="text-gray-600 text-xs mb-3 border-t pt-2">
          {reason}
        </div>
      )}
      <div className="flex gap-2 flex-col sm:flex-row">
        <button
          onClick={onApply}
          className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs font-medium"
        >
          ✓ 適用
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-xs font-medium"
        >
          ✕ 却下
        </button>
      </div>
    </div>
  )

  // Portalを使用してbody直下にレンダリング
  return ReactDOM.createPortal(bubbleContent, document.body)
}