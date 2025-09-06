import { motion } from "framer-motion"
import { Sparkles, Target } from "lucide-react"

interface LoadingScreensProps {
  isGeneratingNovel: boolean
  isModifyingStyle: boolean
  isApplyingOnepoint: boolean
}

export function LoadingScreens({ isGeneratingNovel, isModifyingStyle, isApplyingOnepoint }: LoadingScreensProps) {
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
    </>
  )
}