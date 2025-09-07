import { motion } from "framer-motion"
import { X, ImageIcon, Download, Eye, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface CoverGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  isGenerating: boolean
  coverImageUrl: string | null
  onGenerate: () => void
  novelTitle?: string
}

export function CoverGenerationModal({ 
  isOpen, 
  onClose, 
  isGenerating, 
  coverImageUrl, 
  onGenerate,
  novelTitle = "あなたの小説"
}: CoverGenerationModalProps) {
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isGenerating) {
      setShowProgress(true)
      setProgress(0)
      
      // プログレスバーのアニメーション
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 500)

      return () => clearInterval(interval)
    } else if (coverImageUrl) {
      setProgress(100)
      setTimeout(() => setShowProgress(false), 1000)
    }
  }, [isGenerating, coverImageUrl])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}>
      <motion.div
        className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2c1810 0%, #3d2417 15%, #4a2c1a 30%, #3d2417 70%, #2c1810 100%)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)"
        }}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "rgba(218, 165, 32, 0.2)" }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#daa520" }}>
              表紙画像生成
            </h2>
            <p className="text-sm mt-1" style={{ color: "#a0896c" }}>
              「{novelTitle}」の表紙を作成
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-amber-900/20"
            style={{ color: "#daa520" }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Generation Status */}
            <div className="space-y-6">
              {!coverImageUrl && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-8 rounded-xl border-2 border-dashed"
                  style={{ borderColor: "rgba(218, 165, 32, 0.3)", background: "rgba(218, 165, 32, 0.05)" }}
                >
                  <ImageIcon className="w-16 h-16 mx-auto mb-4" style={{ color: "#daa520" }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#daa520" }}>
                    表紙画像を生成します
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "#a0896c" }}>
                    AIが小説の内容を解析して、魅力的な表紙デザインを作成します
                  </p>
                  <Button
                    onClick={onGenerate}
                    className="text-white font-medium"
                    style={{
                      background: "linear-gradient(135deg, #8b6914 0%, #a0751f 50%, #b8860b 100%)"
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    表紙を生成
                  </Button>
                </motion.div>
              )}

              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-8 rounded-xl"
                  style={{ background: "rgba(218, 165, 32, 0.1)" }}
                >
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1.5, repeat: Infinity }
                    }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
                    style={{ 
                      background: "linear-gradient(135deg, #8b6914 0%, #daa520 50%, #b8860b 100%)",
                      color: "white"
                    }}
                  >
                    <ImageIcon size={40} />
                  </motion.div>
                  
                  <h3 className="text-xl font-semibold mb-3" style={{ color: "#daa520" }}>
                    AIが表紙画像を生成中...
                  </h3>
                  <p className="text-sm mb-6" style={{ color: "#a0896c" }}>
                    小説の内容を解析して、魅力的な表紙デザインを作成しています
                  </p>

                  {showProgress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs" style={{ color: "#a0896c" }}>
                        <span>進行状況</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: "rgba(139, 105, 20, 0.3)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, #8b6914 0%, #daa520 100%)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-xs mt-4" style={{ color: "#8b7355" }}>
                    🎨 Powered by Gemini 2.5 Flash Image
                  </p>
                </motion.div>
              )}

              {coverImageUrl && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-6 rounded-xl"
                  style={{ background: "rgba(34, 197, 94, 0.1)" }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                       style={{ background: "rgba(34, 197, 94, 0.2)" }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      ✅
                    </motion.div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#22c55e" }}>
                    表紙画像が生成されました！
                  </h3>
                  <p className="text-sm" style={{ color: "#a0896c" }}>
                    右側で生成された表紙をご確認ください
                  </p>
                </motion.div>
              )}
            </div>

            {/* Right Side - Image Preview */}
            <div className="flex items-center justify-center">
              {coverImageUrl ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative"
                >
                  <div className="relative p-4 rounded-2xl" style={{ background: "rgba(218, 165, 32, 0.1)" }}>
                    <img 
                      src={coverImageUrl} 
                      alt="Generated Book Cover"
                      className="rounded-xl shadow-2xl"
                      style={{
                        width: "300px",
                        height: "420px",
                        objectFit: "cover",
                        border: "3px solid rgba(218, 165, 32, 0.4)"
                      }}
                    />
                    <div className="absolute -top-2 -right-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                        style={{ background: "#22c55e", color: "white" }}
                      >
                        ✓
                      </motion.div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600 text-amber-600 hover:bg-amber-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      プレビュー
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600 text-amber-600 hover:bg-amber-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      ダウンロード
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center w-80 h-80 rounded-xl border-2 border-dashed"
                     style={{ borderColor: "rgba(218, 165, 32, 0.3)" }}>
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4" style={{ color: "rgba(218, 165, 32, 0.4)" }} />
                    <p className="text-sm" style={{ color: "#8b7355" }}>
                      表紙画像はここに表示されます
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: "rgba(218, 165, 32, 0.2)" }}>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="border-amber-600 text-amber-600 hover:bg-amber-50"
          >
            {coverImageUrl ? "完了" : "キャンセル"}
          </Button>
          {coverImageUrl && !isGenerating && (
            <Button
              onClick={onGenerate}
              className="text-white font-medium"
              style={{
                background: "linear-gradient(135deg, #8b6914 0%, #a0751f 50%, #b8860b 100%)"
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              再生成
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}