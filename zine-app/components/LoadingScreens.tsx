import { motion } from "framer-motion"
import { Sparkles, Target, ImageIcon, Palette } from "lucide-react"

interface LoadingScreensProps {
  isGeneratingNovel: boolean
  isModifyingStyle: boolean
  isApplyingOnepoint: boolean
  isGeneratingCover?: boolean
  isApplyingReview?: boolean
}

export function LoadingScreens({ isGeneratingNovel, isModifyingStyle, isApplyingOnepoint, isGeneratingCover, isApplyingReview }: LoadingScreensProps) {
  return (
    <>
      {/* 小説生成ローディング画面 */}
      {isGeneratingNovel && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(74, 60, 40, 0.8)" }}>
          <motion.div
            className="rounded-xl p-8 max-w-md text-center"
            style={{
              background: "linear-gradient(135deg, rgba(247, 241, 232, 0.95) 0%, rgba(241, 229, 199, 0.95) 100%)",
              border: "1px solid rgba(139, 115, 85, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Sparkles className="w-12 h-12" style={{ color: "#8b6914" }} />
              </motion.div>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: "#4a3c28" }}>小説を生成中...</h3>
            <p className="text-sm mb-4" style={{ color: "#8b7355" }}>
              あなたのZINEを素敵な小説に変換しています。
              少々お待ちください。
            </p>
            <div className="flex justify-center space-x-2">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* 文体修正ローディング画面 */}
      {isModifyingStyle && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(74, 60, 40, 0.8)" }}>
          <motion.div
            className="rounded-xl p-8 max-w-md text-center"
            style={{
              background: "linear-gradient(135deg, rgba(247, 241, 232, 0.95) 0%, rgba(241, 229, 199, 0.95) 100%)",
              border: "1px solid rgba(139, 115, 85, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Sparkles className="w-12 h-12" style={{ color: "#8b6914" }} />
              </motion.div>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: "#4a3c28" }}>小説全体の文体を調整中...</h3>
            <p className="text-sm mb-4" style={{ color: "#8b7355" }}>
              選択された文体に合わせて小説全体を調整しています。
            </p>
            <div className="flex justify-center space-x-2">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* ワンポイントアドバイス適用ローディング画面 */}
      {isApplyingOnepoint && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(74, 60, 40, 0.8)" }}>
          <motion.div
            className="rounded-xl p-8 max-w-md text-center"
            style={{
              background: "linear-gradient(135deg, rgba(247, 241, 232, 0.95) 0%, rgba(241, 229, 199, 0.95) 100%)",
              border: "1px solid rgba(139, 115, 85, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Target className="w-12 h-12" style={{ color: "#8b6914" }} />
              </motion.div>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: "#4a3c28" }}>小説全体にアドバイスを適用中...</h3>
            <p className="text-sm mb-4" style={{ color: "#8b7355" }}>
              ワンポイントアドバイスを小説全体に反映しています。
            </p>
            <div className="flex justify-center space-x-2">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* 表紙画像生成ローディング画面 */}
      {isGeneratingCover && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(74, 60, 40, 0.8)" }}>
          <motion.div
            className="rounded-xl p-8 max-w-md text-center"
            style={{
              background: "linear-gradient(135deg, rgba(247, 241, 232, 0.95) 0%, rgba(241, 229, 199, 0.95) 100%)",
              border: "1px solid rgba(139, 115, 85, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity }
                }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ 
                  background: "linear-gradient(135deg, #8b6914 0%, #daa520 50%, #b8860b 100%)",
                  color: "white"
                }}
              >
                <ImageIcon size={32} />
              </motion.div>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: "#4a3c28" }}>AIが表紙画像を生成中...</h3>
            <p className="text-sm mb-4" style={{ color: "#8b7355" }}>
              小説の内容を解析して、魅力的な表紙デザインを作成しています。
            </p>
            <div className="flex justify-center space-x-2">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "#daa520" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "#b8860b" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
            </div>
            <p className="text-xs mt-4" style={{ color: "#a0896c" }}>
              🎨 Powered by Gemini 2.5 Flash Image
            </p>
          </motion.div>
        </div>
      )}

      {/* 作家レビュー適用ローディング画面 */}
      {isApplyingReview && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(74, 60, 40, 0.8)" }}>
          <motion.div
            className="rounded-xl p-8 max-w-md text-center"
            style={{
              background: "linear-gradient(135deg, rgba(247, 241, 232, 0.95) 0%, rgba(241, 229, 199, 0.95) 100%)",
              border: "1px solid rgba(139, 115, 85, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Palette className="w-12 h-12" style={{ color: "#8b6914" }} />
              </motion.div>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: "#4a3c28" }}>選択テキストをレビュー中...</h3>
            <p className="text-sm mb-4" style={{ color: "#8b7355" }}>
              AIが指定された指示に従って、選択されたテキストを修正しています。
            </p>
            <div className="flex justify-center space-x-2">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#8b6914" }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}