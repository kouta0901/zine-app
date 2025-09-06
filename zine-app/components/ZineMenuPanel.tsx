"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { 
  BookOpen, 
  Sparkles, 
  Eye, 
  Type, 
  ImageIcon, 
  X,
  Target,
  User,
  LandmarkIcon as Landscape,
  MessageCircle,
  Palette,
  Send,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreatorMode, MenuSection, Element, ChatMessage } from "@/types/zine"

interface ZineMenuPanelProps {
  mode: CreatorMode
  activeMenuSection: string | null
  setActiveMenuSection: (section: string | null) => void
  activeNovelSection: string | null
  setActiveNovelSection: (section: string | null) => void
  hasZineContent: boolean
  showZineExamples: boolean
  setShowZineExamples: (show: boolean) => void
  showConfigPanel: boolean
  setShowConfigPanel: (show: boolean) => void
  selectedElement: string | null
  onMenuSectionClick: (sectionId: MenuSection) => void
  onAddTextElement: () => void
  onAddImageElement: () => void
  onDeleteElement: (id: string) => void
  onNovelize: () => void
  // Writer Review Panel props
  reviewChatMessages: ChatMessage[]
  reviewChatInput: string
  setReviewChatInput: (input: string) => void
  onSendReviewMessage: () => void
  // Style Panel props
  onStyleModify: (style: string) => void
  isModifyingStyle: boolean
  // Onepoint Panel props  
  onOnepointModify: (option: string) => void
  isApplyingOnepoint: boolean
}

const zineMenuSections = [
  { id: "concept" as MenuSection, label: "コンセプト", icon: Target },
  { id: "ai-writer" as MenuSection, label: "AI作家", icon: User },
  { id: "worldview" as MenuSection, label: "世界観", icon: Landscape },
]

const novelMenuSections = [
  { id: "writer-review" as MenuSection, label: "作家レビュー", icon: MessageCircle },
  { id: "style" as MenuSection, label: "文体", icon: Palette },
  { id: "onepoint" as MenuSection, label: "ワンポイント", icon: Target },
]

export function ZineMenuPanel({
  mode,
  activeMenuSection,
  setActiveMenuSection,
  activeNovelSection, 
  setActiveNovelSection,
  hasZineContent,
  showZineExamples,
  setShowZineExamples,
  showConfigPanel,
  setShowConfigPanel,
  selectedElement,
  onMenuSectionClick,
  onAddTextElement,
  onAddImageElement,
  onDeleteElement,
  onNovelize,
  reviewChatMessages,
  reviewChatInput,
  setReviewChatInput,
  onSendReviewMessage,
  onStyleModify,
  isModifyingStyle,
  onOnepointModify,
  isApplyingOnepoint
}: ZineMenuPanelProps) {

  const styleOptions = [
    "丁寧語", "関西弁", "古風な口調", "現代的な口調", "詩的な表現",
    "シンプルな文体", "情緒的な文体", "ミステリアスな雰囲気"
  ]

  const onepointOptions = [
    "もっと感動的に", "より緊張感を", "ユーモアを加えて", "ロマンチックに",
    "アクション要素を", "心理描写を深く", "会話を増やして", "風景描写を豊かに"
  ]

  const renderWriterReviewPanel = () => (
    <div className="h-full flex flex-col">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {reviewChatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === "user"
                  ? "text-white"
                  : "border"
              }`}
              style={{
                background: message.type === "user" 
                  ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" 
                  : "rgba(255, 253, 250, 0.9)",
                borderColor: message.type === "ai" ? "rgba(139, 115, 85, 0.3)" : "transparent",
                color: message.type === "ai" ? "#4a3c28" : "#ffffff"
              }}
            >
              <p className="text-sm">{message.content}</p>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
        <div className="flex gap-2">
          <Input
            placeholder="作品について相談する..."
            value={reviewChatInput}
            onChange={(e) => setReviewChatInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                onSendReviewMessage()
              }
            }}
            className="flex-1"
          />
          <Button 
            onClick={onSendReviewMessage}
            size="sm"
            disabled={!reviewChatInput.trim()}
            style={{
              background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)",
              color: "#ffffff"
            }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  const renderStylePanel = () => (
    <div className="space-y-4">
      <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>小説全体の文体修正</h3>
      
      <div className="space-y-2">
        <h4 className="text-sm" style={{ color: "#8b7355" }}>よく使われる修正</h4>
        <div className="grid grid-cols-2 gap-2">
          {styleOptions.map((option) => (
            <Button
              key={option}
              variant="outline"
              size="sm"
              className="text-xs"
              style={{
                color: "#8b7355",
                borderColor: "rgba(139, 115, 85, 0.3)",
                backgroundColor: "transparent"
              }}
              onClick={() => onStyleModify(option)}
              disabled={isModifyingStyle}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderOnepointPanel = () => (
    <div className="space-y-4">
      <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>小説全体のワンポイント修正</h3>
      
      <div className="space-y-2">
        <h4 className="text-sm" style={{ color: "#8b7355" }}>雰囲気の調整</h4>
        <div className="grid grid-cols-2 gap-2">
          {onepointOptions.map((option) => (
            <Button
              key={option}
              variant="outline"
              size="sm"
              className="text-xs"
              style={{
                color: "#8b7355",
                borderColor: "rgba(139, 115, 85, 0.3)",
                backgroundColor: "transparent"
              }}
              onClick={() => onOnepointModify(option)}
              disabled={isApplyingOnepoint}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <motion.div
      className="w-80 backdrop-blur-sm border-r p-6"
      style={{
        background: "rgba(247, 241, 232, 0.9)",
        borderColor: "rgba(139, 115, 85, 0.3)"
      }}
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      {mode === "zine" ? (
        <div className="space-y-4">
          <div className="mb-6">
            <h2
              className="text-2xl font-bold mb-2 flex items-center gap-2 cursor-pointer transition-colors"
              style={{ color: "#4a3c28" }}
              onClick={() => {
                setShowConfigPanel(false)
                setActiveMenuSection(null)
              }}
            >
              <BookOpen className="w-6 h-6" />
              ZINE Mode
            </h2>
            <p className="text-sm" style={{ color: "#8b7355" }}>雑誌のようなビジュアル作品を作成</p>
          </div>

          {!hasZineContent && (
            <div className="mb-6 p-4 rounded-lg border" style={{
              background: "rgba(241, 229, 199, 0.6)",
              borderColor: "rgba(139, 115, 85, 0.3)"
            }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold" style={{ color: "#4a3c28" }}>ZINEの例</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowZineExamples(true)}
                  className="hover:bg-amber-100"
                  style={{ color: "#8b7355" }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  詳しく見る
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded border text-xs text-center" style={{
                  background: "rgba(255, 253, 250, 0.8)",
                  borderColor: "rgba(139, 115, 85, 0.3)",
                  color: "#4a3c28"
                }}>
                  <div className="bg-blue-500/30 h-8 mb-1 rounded"></div>
                  フォトエッセイ
                </div>
                <div className="p-2 rounded border text-xs text-center" style={{
                  background: "rgba(255, 253, 250, 0.8)",
                  borderColor: "rgba(139, 115, 85, 0.3)",
                  color: "#4a3c28"
                }}>
                  <div className="bg-green-500/30 h-8 mb-1 rounded"></div>
                  アートブック
                </div>
                <div className="p-2 rounded border text-xs text-center" style={{
                  background: "rgba(255, 253, 250, 0.8)",
                  borderColor: "rgba(139, 115, 85, 0.3)",
                  color: "#4a3c28"
                }}>
                  <div className="bg-pink-500/30 h-8 mb-1 rounded"></div>
                  詩集
                </div>
                <div className="p-2 rounded border text-xs text-center" style={{
                  background: "rgba(255, 253, 250, 0.8)",
                  borderColor: "rgba(139, 115, 85, 0.3)",
                  color: "#4a3c28"
                }}>
                  <div className="bg-purple-500/30 h-8 mb-1 rounded"></div>
                  イラスト集
                </div>
              </div>
            </div>
          )}

          {/* Menu sections */}
          <div className="space-y-2">
            {zineMenuSections.map((section) => (
              <Button
                key={section.id}
                variant={activeMenuSection === section.id ? "default" : "ghost"}
                className="w-full justify-start"
                style={{
                  background: activeMenuSection === section.id ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" : "transparent",
                  color: activeMenuSection === section.id ? "#fffdf7" : "#8b7355"
                }}
                onClick={() => onMenuSectionClick(section.id)}
              >
                <section.icon className="w-4 h-4 mr-2" />
                {section.label}
              </Button>
            ))}
          </div>

          {!showConfigPanel && (
            <>
              <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#4a3c28" }}>ツール</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    style={{
                      color: "#8b7355",
                      borderColor: "rgba(139, 115, 85, 0.3)",
                      backgroundColor: "transparent"
                    }}
                    onClick={onAddTextElement}
                  >
                    <Type className="w-4 h-4 mr-2" />
                    テキスト追加
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    style={{
                      color: "#8b7355",
                      borderColor: "rgba(139, 115, 85, 0.3)",
                      backgroundColor: "transparent"
                    }}
                    onClick={onAddImageElement}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    画像追加
                  </Button>
                </div>
              </div>

              {selectedElement && (
                <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "#4a3c28" }}>選択中の要素</h3>
                  <div className="space-y-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => onDeleteElement(selectedElement)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      削除
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
            <Button
              onClick={onNovelize}
              className="w-full text-white"
              style={{
                background: "linear-gradient(135deg, #8b6914 0%, #a0751f 50%, #b8860b 100%)"
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              小説化する
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: "#4a3c28" }}>
              <Sparkles className="w-6 h-6" />
              小説モード
            </h2>
            <p className="text-sm" style={{ color: "#8b7355" }}>ZINEを小説として編集・執筆</p>
          </div>

          {/* Novel menu sections */}
          <div className="space-y-2">
            {novelMenuSections.map((section) => (
              <Button
                key={section.id}
                variant={activeNovelSection === section.id ? "default" : "ghost"}
                className="w-full justify-start"
                style={{
                  background: activeNovelSection === section.id ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" : "transparent",
                  color: activeNovelSection === section.id ? "#fffdf7" : "#8b7355"
                }}
                onClick={() => setActiveNovelSection(activeNovelSection === section.id ? null : section.id)}
              >
                <section.icon className="w-4 h-4 mr-2" />
                {section.label}
              </Button>
            ))}
          </div>

          {/* Novel panels */}
          {activeNovelSection === "writer-review" && renderWriterReviewPanel()}
          {activeNovelSection === "style" && renderStylePanel()}
          {activeNovelSection === "onepoint" && renderOnepointPanel()}
        </div>
      )}
    </motion.div>
  )
}