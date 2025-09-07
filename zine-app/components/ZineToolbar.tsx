import { motion } from "framer-motion"
import { ArrowLeft, Save, Eye, ChevronLeft, ChevronRight, Plus, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreatorMode } from "@/types/zine"

interface ZineToolbarProps {
  onBack: () => void
  zineTitle: string
  setZineTitle: (title: string) => void
  mode: CreatorMode
  setMode: (mode: CreatorMode) => void
  onSave: () => void
  isSaving: boolean
  // Page navigation props for ZINE mode
  currentPageIndex?: number
  totalPages?: number
  onPreviousPage?: () => void
  onNextPage?: () => void
  onAddPage?: () => void
  // Novel page navigation props for novel mode
  currentNovelPage?: number
  totalNovelPages?: number
  onPreviousNovelPage?: () => void
  onNextNovelPage?: () => void
  // Cover generation props for novel mode
  onCoverGeneration?: () => void
  isGeneratingCover?: boolean
  hasNovelContent?: boolean
}

export function ZineToolbar({
  onBack,
  zineTitle,
  setZineTitle,
  mode,
  setMode,
  onSave,
  isSaving,
  currentPageIndex,
  totalPages,
  onPreviousPage,
  onNextPage,
  onAddPage,
  currentNovelPage,
  totalNovelPages,
  onPreviousNovelPage,
  onNextNovelPage,
  onCoverGeneration,
  isGeneratingCover,
  hasNovelContent
}: ZineToolbarProps) {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
      style={{
        background: "rgba(245, 237, 225, 0.85)",
        borderColor: "rgba(139, 119, 95, 0.2)"
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-opacity-80 hover:text-opacity-100 transition-all duration-200"
              style={{ color: "#4a3c28" }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
            
            <Input
              placeholder="無題のZINE"
              value={zineTitle}
              onChange={(e) => setZineTitle(e.target.value)}
              className="text-xl font-bold border-none bg-transparent focus:outline-none"
              style={{
                color: "#4a3c28",
                fontWeight: "700"
              }}
            />
            
            {/* Page Navigation for ZINE mode moved below editor */}
            
            {/* Novel Page Navigation */}
            {mode === "novel" && currentNovelPage && totalNovelPages && totalNovelPages > 0 && (
              <div className="flex items-center gap-2 ml-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPreviousNovelPage}
                  disabled={currentNovelPage === 1}
                  className="text-opacity-80 hover:text-opacity-100 transition-all duration-200"
                  style={{ color: currentNovelPage === 1 ? "#ccc" : "#4a3c28" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm px-3 whitespace-nowrap" style={{ color: "#8b7355", writingMode: "horizontal-tb" }}>
                  見開き {currentNovelPage} / {Math.ceil(totalNovelPages / 2)}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNextNovelPage}
                  disabled={currentNovelPage >= Math.ceil(totalNovelPages / 2)}
                  className="text-opacity-80 hover:text-opacity-100 transition-all duration-200"
                  style={{ color: currentNovelPage >= Math.ceil(totalNovelPages / 2) ? "#ccc" : "#4a3c28" }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Save Button */}
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="text-white border-0 font-medium shadow-sm"
              style={{
                background: "linear-gradient(135deg, #8b6914 0%, #a0751f 50%, #b8860b 100%)"
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "保存中..." : "保存"}
            </Button>
            
            {/* Cover Generation Button - Only show in novel mode */}
            {mode === "novel" && onCoverGeneration && (
              <Button
                size="sm"
                onClick={onCoverGeneration}
                disabled={isGeneratingCover || !hasNovelContent}
                className={`text-white border-0 font-medium shadow-sm ${(!hasNovelContent && !isGeneratingCover) ? 'opacity-50' : ''}`}
                style={{
                  background: (!hasNovelContent && !isGeneratingCover) 
                    ? "linear-gradient(135deg, #6b5b47 0%, #7a6652 50%, #8b7355 100%)"
                    : "linear-gradient(135deg, #8b6914 0%, #a0751f 50%, #b8860b 100%)"
                }}
                title={!hasNovelContent ? "まず小説を生成してから表紙を作成できます" : "小説の表紙画像を生成"}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {isGeneratingCover ? "生成中..." : "表紙生成"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}