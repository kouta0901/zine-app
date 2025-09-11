import { motion } from "framer-motion"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TextSuggestion {
  id: string
  originalText: string
  suggestedText: string
  position: { x: number, y: number, width: number, height: number }
  instruction: string
  timestamp: Date
}

interface SuggestionBubbleProps {
  suggestion: TextSuggestion
  onApply: (suggestionId: string) => void
  onCancel: (suggestionId: string) => void
}

export function SuggestionBubble({ suggestion, onApply, onCancel }: SuggestionBubbleProps) {
  const { position, originalText, suggestedText, instruction, id } = suggestion
  
  // Calculate bubble position with viewport considerations
  const calculatePosition = () => {
    const bubbleWidth = 350
    const bubbleHeight = 200
    const offset = 10
    
    let x = position.x + position.width + offset
    let y = position.y
    
    // Adjust if bubble would go off screen
    if (x + bubbleWidth > window.innerWidth) {
      x = position.x - bubbleWidth - offset
    }
    
    if (y + bubbleHeight > window.innerHeight) {
      y = position.y - bubbleHeight + position.height
    }
    
    // Ensure bubble stays within viewport
    x = Math.max(10, Math.min(x, window.innerWidth - bubbleWidth - 10))
    y = Math.max(10, Math.min(y, window.innerHeight - bubbleHeight - 10))
    
    return { x, y }
  }
  
  const finalPosition = calculatePosition()
  
  return (
    <motion.div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: finalPosition.x,
        top: finalPosition.y,
        maxWidth: '350px',
      }}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Arrow pointing to selected text */}
      <div 
        className="absolute w-3 h-3 transform rotate-45"
        style={{
          left: finalPosition.x > position.x ? '-6px' : 'calc(100% - 6px)',
          top: '20px',
          background: "rgba(247, 241, 232, 0.98)",
          border: "1px solid rgba(139, 115, 85, 0.3)",
          borderRight: finalPosition.x > position.x ? 'none' : '1px solid rgba(139, 115, 85, 0.3)',
          borderBottom: finalPosition.x > position.x ? 'none' : '1px solid rgba(139, 115, 85, 0.3)',
        }}
      />
      
      {/* Main bubble content */}
      <div
        className="rounded-xl shadow-lg border backdrop-blur-sm"
        style={{
          background: "rgba(247, 241, 232, 0.98)",
          borderColor: "rgba(139, 115, 85, 0.3)",
          boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.15)"
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(139, 115, 85, 0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "#8b6914" }} />
            <span className="text-sm font-medium" style={{ color: "#8b6914" }}>
              修正提案
            </span>
          </div>
          <p className="text-xs" style={{ color: "#8b7355" }}>
            「{instruction}」の指示による修正
          </p>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Original text */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#6b5b47" }}>
              元のテキスト:
            </label>
            <div 
              className="text-sm p-2 rounded border"
              style={{ 
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.2)",
                color: "#4a3c28"
              }}
            >
              "{originalText}"
            </div>
          </div>
          
          {/* Suggested text */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "#6b5b47" }}>
              修正提案:
            </label>
            <div 
              className="text-sm p-2 rounded border"
              style={{ 
                background: "rgba(34, 197, 94, 0.1)",
                borderColor: "rgba(34, 197, 94, 0.2)",
                color: "#4a3c28"
              }}
            >
              "{suggestedText}"
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: "rgba(139, 115, 85, 0.2)" }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(id)}
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
          >
            <X className="w-3 h-3 mr-1" />
            キャンセル
          </Button>
          <Button
            size="sm"
            onClick={() => onApply(id)}
            className="flex-1 text-white font-medium"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)"
            }}
          >
            <Check className="w-3 h-3 mr-1" />
            適用
          </Button>
        </div>
      </div>
    </motion.div>
  )
}