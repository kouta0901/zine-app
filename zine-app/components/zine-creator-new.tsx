"use client"

import { motion } from "framer-motion"
import { useState, useRef } from "react"
import {
  ArrowLeft,
  Save,
  Eye,
  User,
  LandmarkIcon as Landscape,
  MessageCircle,
  Palette,
  Target,
  Settings,
  BookOpen,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ZineCreatorProps {
  onBack: () => void
}

interface Element {
  id: string
  type: "text" | "image" | "shape"
  x: number
  y: number
  width: number
  height: number
  content?: string
  src?: string
  color?: string
  fontSize?: number
  pageId: string
}

interface Page {
  id: string
  elements: Element[]
  title: string
}

interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
}

type CreatorMode = "zine" | "novel"
type MenuSection = "concept" | "ai-writer" | "worldview" | "writer-review" | "style" | "onepoint"

type TextSelection = {
  start: number
  end: number
  text: string
}

type ReviewSuggestion = {
  id: string
  originalText: string
  suggestedText: string
  reason: string
  applied: boolean
}

export function ZineCreator({ onBack }: ZineCreatorProps) {
  const [mode, setMode] = useState<CreatorMode>("zine")
  const [activeMenuSection, setActiveMenuSection] = useState<MenuSection | null>(null)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [pages, setPages] = useState<Page[]>([{ id: "page1", elements: [], title: "Page 1-2" }])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [zineTitle, setZineTitle] = useState("")
  const [novelContent, setNovelContent] = useState("")
  const [bookTheme, setBookTheme] = useState<"light" | "sepia" | "dark">("light")
  const [currentNovelPage, setCurrentNovelPage] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [selectedText, setSelectedText] = useState<TextSelection | null>(null)
  const [reviewSuggestions, setReviewSuggestions] = useState<ReviewSuggestion[]>([])
  const [reviewChatMessages, setReviewChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      content:
        "こんにちは！私はあなたの作品をレビューするAI作家です。文章の改善点や表現のアドバイスをお手伝いします。修正したい箇所を選択するか、直接ご相談ください。",
      timestamp: new Date(),
    },
  ])
  const [reviewChatInput, setReviewChatInput] = useState("")
  const [inlineSuggestions, setInlineSuggestions] = useState<{ [key: string]: ReviewSuggestion }>({})
  const [styleMessages, setStyleMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [onepointMessages, setOnepointMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [styleInput, setStyleInput] = useState("")
  const [onepointInput, setOnepointInput] = useState("")

  const currentPage = pages[currentPageIndex]

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

  const currentMenuSections = mode === "zine" ? zineMenuSections : novelMenuSections

  const themeStyles = {
    light: {
      background: "#FAF3E5",
      text: "#2C2C2C",
      accent: "#A25B5B",
      border: "#E5DCC9",
      shadow: "rgba(0,0,0,0.15)",
      pageBackground: "#FEFCF7",
    },
    sepia: {
      background: "#F4EAD0",
      text: "#3B3222",
      accent: "#A25B5B",
      border: "#D4C4A8",
      shadow: "rgba(59,50,34,0.2)",
      pageBackground: "#F8F2E3",
    },
    dark: {
      background: "#2A2520",
      text: "#E8E0D6",
      accent: "#A25B5B",
      border: "#3D3530",
      shadow: "rgba(0,0,0,0.4)",
      pageBackground: "#1F1B17",
    },
  }

  const currentTheme = themeStyles[bookTheme]

  const handleMenuSectionClick = (sectionId: MenuSection) => {
    setActiveMenuSection(sectionId)
    if (mode === "zine" && ["concept", "ai-writer", "worldview"].includes(sectionId)) {
      setShowConfigPanel(true)
    }
  }

  const handleTextSelection = () => {
    if (typeof window === "undefined") return

    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString()
      const range = selection.getRangeAt(0)
      setSelectedText({
        start: range.startOffset,
        end: range.endOffset,
        text: selectedText,
      })
    }
  }

  const handleReviewChatSend = () => {
    if (!reviewChatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: reviewChatInput,
      timestamp: new Date(),
    }

    setReviewChatMessages((prev) => [...prev, userMessage])

    setTimeout(() => {
      let aiResponse = ""

      if (selectedText && reviewChatInput.includes("シリアス")) {
        const modifiedText = selectedText.text.replace("彼女は立ち止まった", "彼女は重い足取りで立ち止まった")
        const suggestion = {
          id: Date.now().toString(),
          originalText: selectedText.text,
          suggestedText: modifiedText,
          reason: "よりシリアスな表現に変更",
          applied: false,
        }
        aiResponse = `「${selectedText.text}」をよりシリアスな表現に変更しました。`

        setInlineSuggestions((prev) => ({
          ...prev,
          [selectedText.text]: suggestion,
        }))
      } else {
        aiResponse = "どの部分を修正したいか、テキストを選択してから指示してください。"
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiResponse,
        timestamp: new Date(),
      }

      setReviewChatMessages((prev) => [...prev, aiMessage])
    }, 1000)

    setReviewChatInput("")
  }

  const applyInlineSuggestion = (originalText: string) => {
    const suggestion = inlineSuggestions[originalText]
    if (suggestion) {
      setNovelContent((prev) => prev.replace(originalText, suggestion.suggestedText))
      setInlineSuggestions((prev) => {
        const updated = { ...prev }
        delete updated[originalText]
        return updated
      })
    }
  }

  const rejectInlineSuggestion = (originalText: string) => {
    setInlineSuggestions((prev) => {
      const updated = { ...prev }
      delete updated[originalText]
      return updated
    })
  }

  const renderTextWithSuggestions = (text: string) => {
    const parts = []
    let lastIndex = 0

    Object.keys(inlineSuggestions).forEach((originalText) => {
      const index = text.indexOf(originalText, lastIndex)
      if (index !== -1) {
        if (index > lastIndex) {
          parts.push(text.slice(lastIndex, index))
        }

        parts.push(
          <span key={originalText} className="relative">
            <span className="bg-yellow-200/30 px-1 rounded">{originalText}</span>
            <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded-r">
              <div className="text-red-700 text-sm mb-2">修正案: {inlineSuggestions[originalText].suggestedText}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => applyInlineSuggestion(originalText)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                >
                  適用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rejectInlineSuggestion(originalText)}
                  className="text-xs px-3 py-1"
                >
                  却下
                </Button>
              </div>
            </div>
          </span>,
        )

        lastIndex = index + originalText.length
      }
    })

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Input
                placeholder="Untitled ZINE"
                value={zineTitle}
                onChange={(e) => setZineTitle(e.target.value)}
                className="bg-transparent border-none text-xl font-bold text-white placeholder:text-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <Button
                  variant={mode === "zine" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("zine")}
                  className={mode === "zine" ? "bg-purple-600 text-white" : "text-white hover:bg-white/10"}
                >
                  ZINE
                </Button>
                <Button
                  variant={mode === "novel" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("novel")}
                  className={mode === "novel" ? "bg-purple-600 text-white" : "text-white hover:bg-white/10"}
                >
                  小説化
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
                className="text-white hover:bg-white/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                {isPreview ? "Edit" : "Preview"}
              </Button>

              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="pt-20 h-full flex">
        {/* Left Menu */}
        {!isPreview && (
          <motion.div
            className="w-64 bg-gray-900/50 backdrop-blur-sm border-r border-white/10 flex flex-col"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="p-4 border-b border-white/10">
              <h2
                className="text-xl font-bold text-white mb-4 cursor-pointer hover:text-purple-400 transition-colors"
                onClick={() => setActiveMenuSection(null)}
              >
                {mode === "zine" ? "ZINE Mode" : "Novel Mode"}
              </h2>
              <div className="flex flex-col gap-2">
                {currentMenuSections.map((section) => {
                  const Icon = section.icon
                  return (
                    <Button
                      key={section.id}
                      variant={activeMenuSection === section.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleMenuSectionClick(section.id)}
                      className={`justify-start text-sm ${
                        activeMenuSection === section.id ? "bg-purple-600 text-white" : "text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {section.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {mode === "novel" && activeMenuSection === "writer-review" ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {reviewChatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.type === "user" ? "bg-purple-600 text-white" : "bg-gray-700 text-white"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    {selectedText && (
                      <div className="mb-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-sm">
                        <div className="text-blue-400 text-xs mb-1">選択中のテキスト</div>
                        <div className="text-white">「{selectedText.text}」</div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={reviewChatInput}
                        onChange={(e) => setReviewChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleReviewChatSend()}
                        placeholder="修正したい箇所や相談内容を入力..."
                        className="flex-1 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50"
                      />
                      <Button onClick={handleReviewChatSend} size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : mode === "novel" && activeMenuSection === "style" ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {styleMessages.length === 0 ? (
                      <div className="text-white/70 text-sm">
                        <p>文体を調整できます。気になる箇所を選択して修正してください。</p>
                      </div>
                    ) : (
                      styleMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              message.role === "user" ? "bg-purple-600 text-white" : "bg-gray-700 text-white"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={styleInput}
                        onChange={(e) => setStyleInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && styleInput.trim()) {
                            setStyleMessages(prev => [
                              ...prev,
                              { role: "user", content: styleInput },
                              { role: "assistant", content: "文体の修正案を提示します。" }
                            ]);
                            setStyleInput("");
                          }
                        }}
                        placeholder="文体について相談..."
                        className="flex-1 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50"
                      />
                      <Button 
                        onClick={() => {
                          if (styleInput.trim()) {
                            setStyleMessages(prev => [
                              ...prev,
                              { role: "user", content: styleInput },
                              { role: "assistant", content: "文体の修正案を提示します。" }
                            ]);
                            setStyleInput("");
                          }
                        }}
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : mode === "novel" && activeMenuSection === "onepoint" ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {onepointMessages.length === 0 ? (
                      <div className="text-white/70 text-sm">
                        <p>ワンポイントアドバイスを受けられます。</p>
                      </div>
                    ) : (
                      onepointMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              message.role === "user" ? "bg-purple-600 text-white" : "bg-gray-700 text-white"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={onepointInput}
                        onChange={(e) => setOnepointInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && onepointInput.trim()) {
                            setOnepointMessages(prev => [
                              ...prev,
                              { role: "user", content: onepointInput },
                              { role: "assistant", content: "アドバイスを提供します。" }
                            ]);
                            setOnepointInput("");
                          }
                        }}
                        placeholder="アドバイスを求める..."
                        className="flex-1 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50"
                      />
                      <Button 
                        onClick={() => {
                          if (onepointInput.trim()) {
                            setOnepointMessages(prev => [
                              ...prev,
                              { role: "user", content: onepointInput },
                              { role: "assistant", content: "アドバイスを提供します。" }
                            ]);
                            setOnepointInput("");
                          }
                        }}
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-white/70 text-sm">
                  {mode === "zine" ? (
                    <p>各項目をクリックして設定を行ってください。</p>
                  ) : (
                    <p>小説編集機能を選択してください。</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          {mode === "novel" ? (
            <div className="w-full max-w-6xl mx-auto perspective-1000">
              <motion.div
                className="relative"
                initial={{ opacity: 0, rotateY: -15 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                {/* Book Controls */}
                <div className="absolute -top-12 right-0 flex items-center gap-2 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBookTheme("light")}
                    className={`w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 ${bookTheme === "light" ? "ring-2 ring-purple-500" : ""}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBookTheme("sepia")}
                    className={`w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 ${bookTheme === "sepia" ? "ring-2 ring-purple-500" : ""}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBookTheme("dark")}
                    className={`w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 ${bookTheme === "dark" ? "ring-2 ring-purple-500" : ""}`}
                  />
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 ml-2">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </div>

                {/* Book Container */}
                <div
                  className="relative w-full max-w-6xl mx-auto"
                  style={{
                    background: `
                      radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.1) 100%),
                      #E9E1D3
                    `,
                    minHeight: "600px",
                    borderRadius: "8px",
                    padding: "60px 40px",
                  }}
                >
                  <div
                    className="relative mx-auto rounded-lg overflow-hidden"
                    style={{
                      width: "900px",
                      height: "600px",
                      background: `
                        linear-gradient(180deg, 
                          rgba(255,255,255,0.4) 0%, 
                          rgba(255,255,255,0.1) 20%, 
                          rgba(255,255,255,0.05) 50%, 
                          rgba(0,0,0,0.05) 80%, 
                          rgba(0,0,0,0.1) 100%
                        ),
                        ${currentTheme.pageBackground}
                      `,
                      boxShadow: `
                        0 0 0 1px rgba(0,0,0,0.1),
                        0 20px 40px -10px rgba(0,0,0,0.3),
                        inset 0 1px 0 rgba(255,255,255,0.3)
                      `,
                      zIndex: 1,
                    }}
                  >
                    {/* Center binding */}
                    <div
                      className="absolute left-1/2 top-0 bottom-0 w-1 transform -translate-x-1/2 z-30"
                      style={{
                        background: `linear-gradient(180deg, 
                          rgba(0,0,0,0.3) 0%, 
                          rgba(0,0,0,0.1) 20%, 
                          rgba(0,0,0,0.05) 50%, 
                          rgba(0,0,0,0.1) 80%, 
                          rgba(0,0,0,0.3) 100%
                        )`,
                        boxShadow: `
                          -2px 0 4px rgba(0,0,0,0.2),
                          2px 0 4px rgba(0,0,0,0.2)
                        `,
                      }}
                    />

                    {/* Page content container */}
                    <div className="flex h-full relative z-10">
                      {/* Left page */}
                      <div className="w-1/2 pr-4 relative">
                        <div className="px-12 py-20 h-full">
                          <div
                            className="text-base leading-8 whitespace-pre-wrap cursor-text"
                            style={{
                              color: currentTheme.text,
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              lineHeight: "2.2",
                              textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                            onMouseUp={handleTextSelection}
                          >
                            {novelContent
                              ? renderTextWithSuggestions(novelContent)
                              : renderTextWithSuggestions(`　夕暮れの街角で、彼女は立ち止まった。オレンジ色の光が建物の窓を染め、遠くから聞こえる車の音が都市の鼓動のように響いている。

　「もう戻れないのね」

　彼女の声は風に混じって消えていく。手に握りしめた古い写真は、もう色褪せて誰の顔かもわからない。それでも、その温もりだけは確かに残っていた。`)}
                          </div>
                        </div>
                      </div>

                      {/* Right page */}
                      <div className="w-1/2 pl-4 relative">
                        <div className="px-12 py-20 h-full">
                          <div
                            className="text-base leading-8 whitespace-pre-wrap"
                            style={{
                              color: currentTheme.text,
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              lineHeight: "2.2",
                              textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                          >
                            {`　角の向こうから現れた猫が、彼女の足元で鳴いた。まるで何かを伝えようとするように。

　「あなたも一人なのね」

　彼女は膝を折り、猫の頭を優しく撫でた。猫は目を細めて喉を鳴らす。この瞬間だけは、時間が止まったようだった。`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-4">
                <span className="text-white font-medium min-w-[120px] text-center">{currentPage.title}</span>
              </div>

              <motion.div
                className="relative"
                style={{
                  width: 900,
                  height: 700,
                }}
                initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: `
                         radial-gradient(ellipse at center, rgba(139, 69, 19, 0.1) 0%, rgba(101, 67, 33, 0.2) 100%),
                         linear-gradient(45deg, #8B4513 0%, #A0522D 25%, #CD853F 50%, #D2B48C 75%, #F5DEB3 100%)
                       `,
                    backgroundSize: "400px 400px, 100% 100%",
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    ref={canvasRef}
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      width: 700,
                      height: 500,
                      filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                  >
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: `
                          radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,255,255,0.9) 0%, rgba(253,252,249,0.8) 40%, rgba(248,246,243,0.7) 100%),
                          linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)
                        `,
                        backgroundColor: "#FDFCF9",
                      }}
                    />

                    <div
                      className="absolute left-1/2 top-0 bottom-0 transform -translate-x-0.5"
                      style={{
                        width: "3px",
                        background:
                          "linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.15) 100%)",
                        boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)",
                      }}
                    />

                    {currentPage.elements.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-gray-400 text-lg font-light tracking-wide">
                          ページに要素を追加してください
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ZineCreator
